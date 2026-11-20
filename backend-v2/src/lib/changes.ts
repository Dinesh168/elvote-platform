/**
 * Applying volunteer changes (spec sync-modes S4–S6). Used by the single-change and the batch endpoints.
 * - Idempotent on opId (applied_ops).
 * - Per-field conflict rule: a change only overwrites a field if its phone time is not older than the
 *   phone time of the value already stored for that field (voter_contacts.field_at).
 * - Polling day: a mark is never undone by an older undo; an older mark does not re-mark a newer undo.
 * - Phone times more than 5 minutes in the future count as now.
 */
import type pg from 'pg';
import { z } from 'zod';
import { requireBooth, requireFeature, type Membership } from './access.js';
import { notFound } from './errors.js';
import { Mobile } from './http.js';

export const Patch = z.object({
  group: z.enum(['our', 'target', 'opp']).nullable().optional(),
  residence: z.enum(['here', 'moved']).optional(),
  needsHelp: z.boolean().optional(),
  mobile: Mobile.nullable().optional(),
  votedAt: z.string().datetime().nullable().optional(),
}).strict().refine((p) => Object.keys(p).length > 0, 'Nothing to change');
export type PatchT = z.infer<typeof Patch>;

export interface Op { opId: string; voterId: string; clientAt?: string; patch: PatchT }

const FUTURE_SLACK_MS = 5 * 60_000;
/** The phone time of a change, sanitised (S6). */
export function changeTime(clientAt?: string): Date {
  const now = Date.now();
  if (!clientAt) return new Date(now);
  const t = Date.parse(clientAt);
  if (Number.isNaN(t) || t > now + FUTURE_SLACK_MS) return new Date(now);
  return new Date(t);
}

const FIELDS = [
  ['group', 'group_code'],
  ['residence', 'residence'],
  ['needsHelp', 'needs_help'],
  ['mobile', 'mobile'],
] as const;

/**
 * spec bilingual-roll U8: a roll update moved this voter to another booth (or out of the roll) after the volunteer saved the
 * change offline. Accept it when the volunteer had the voter's booth at that time, so nothing is lost.
 */
function movedFromMine(m: Membership, v: { part_no: number; prev_part_no: number | null; moved_at: Date | null; hidden_at: Date | null; status: string }, clientAt?: string) {
  if (m.role === 'admin' || !clientAt) return false;
  const at = Date.parse(clientAt);
  if (v.moved_at && v.prev_part_no != null && m.booths.includes(v.prev_part_no) && at < v.moved_at.getTime()) return true;
  if (v.status === 'not_in_roll' && v.hidden_at && m.booths.includes(v.part_no) && at < v.hidden_at.getTime()) return true;
  return false;
}

/**
 * Applies one change inside the caller's transaction (party scope already set).
 * Returns 'duplicate' when this opId was applied before. Throws ApiError for permanent problems.
 */
export async function applyChange(c: pg.PoolClient, m: Membership, electionId: string | null, op: Op): Promise<{ status: 'ok' | 'duplicate'; boothId: string }> {
  const v = await c.query<{ part_no: number; booth_id: string; status: string; prev_part_no: number | null; moved_at: Date | null; hidden_at: Date | null }>(
    'SELECT part_no, booth_id, status, prev_part_no, moved_at, hidden_at FROM voters WHERE ac_no = $1 AND id = $2', [m.acNo, op.voterId]);
  if (!v.rowCount) throw notFound('voter_not_found');
  const { part_no: partNo, booth_id: boothId } = v.rows[0];
  if (!movedFromMine(m, v.rows[0], op.clientAt)) requireBooth(m, partNo);
  const p = op.patch;
  if ('votedAt' in p) requireFeature(m, 'poll');

  const fresh = await c.query('INSERT INTO applied_ops (op_id, party_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [op.opId, m.partyId]);
  if (!fresh.rowCount) return { status: 'duplicate', boothId };
  const at = changeTime(op.clientAt);

  const keys = FIELDS.filter(([k]) => k in p);
  if (keys.length) {
    // For each field: take the new value only if this change is not older than the stored value's change.
    const newer = (k: string) => `(vc.field_at->>'${k}' IS NULL OR $14::timestamptz >= (vc.field_at->>'${k}')::timestamptz)`;
    const take = (k: string, col: string, flag: string) => `${col} = CASE WHEN ${flag} AND ${newer(k)} THEN EXCLUDED.${col} ELSE vc.${col} END`;
    const stamp = keys.map(([k]) => `'${k}', CASE WHEN ${newer(k)} THEN to_jsonb($14::timestamptz) END`).join(', ');
    await c.query(
      `INSERT INTO voter_contacts AS vc (party_id, ac_no, voter_id, part_no, group_code, residence, needs_help, mobile,
                                         first_contacted_at, last_contacted_at, last_contacted_by, field_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'here'), COALESCE($7, false), $8, now(), now(), $9, $15::jsonb)
       ON CONFLICT (party_id, ac_no, voter_id) DO UPDATE SET
         ${take('group', 'group_code', '$10')},
         ${take('residence', 'residence', '$11')},
         ${take('needsHelp', 'needs_help', '$12')},
         ${take('mobile', 'mobile', '$13')},
         field_at = vc.field_at || jsonb_strip_nulls(jsonb_build_object(${stamp})),
         first_contacted_at = COALESCE(vc.first_contacted_at, now()),
         last_contacted_at = now(), last_contacted_by = $9, version = vc.version + 1, updated_at = now()`,
      [m.partyId, m.acNo, op.voterId, partNo, p.group ?? null, p.residence ?? null, p.needsHelp ?? null, p.mobile ?? null, m.userId,
       'group' in p, 'residence' in p, 'needsHelp' in p, 'mobile' in p, at.toISOString(),
       JSON.stringify(Object.fromEntries(keys.map(([k]) => [k, at.toISOString()])))],
    );
  }

  if ('votedAt' in p && electionId) {
    if (p.votedAt) {
      // Mark: new row, or re-mark only if the existing undo is older than this mark.
      await c.query(
        `INSERT INTO poll_marks (election_id, party_id, ac_no, voter_id, part_no, marked_by, marked_at) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (election_id, party_id, ac_no, voter_id) DO UPDATE SET undone_at = NULL, marked_at = EXCLUDED.marked_at, marked_by = EXCLUDED.marked_by
           WHERE poll_marks.undone_at IS NOT NULL AND poll_marks.undone_at <= EXCLUDED.marked_at`,
        [electionId, m.partyId, m.acNo, op.voterId, partNo, m.userId, at],
      );
    } else {
      // Undo: only if the mark is not newer than this undo.
      await c.query(
        `UPDATE poll_marks SET undone_at = $5 WHERE election_id = $1 AND party_id = $2 AND ac_no = $3 AND voter_id = $4 AND undone_at IS NULL AND marked_at <= $5`,
        [electionId, m.partyId, m.acNo, op.voterId, at],
      );
    }
  }

  const change = { ...p, ...(p.mobile ? { mobile: true } : {}) }; // never store the number itself in history
  await c.query(
    `INSERT INTO contact_events (client_at, party_id, ac_no, part_no, voter_id, user_id, change) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [op.clientAt ? at : null, m.partyId, m.acNo, partNo, op.voterId, m.userId, JSON.stringify(change)],
  );
  await c.query('INSERT INTO stats_dirty (party_id, booth_id) VALUES ($1,$2) ON CONFLICT (party_id, booth_id) DO UPDATE SET marked_at = now()', [m.partyId, boothId]);
  return { status: 'ok', boothId };
}
