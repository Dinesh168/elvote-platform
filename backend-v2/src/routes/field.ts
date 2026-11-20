/** Routes used by volunteers (scoped to their booths) and by admins (whole AC): booths, voters, tasks, changes. */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { core, inParty, statePool } from '../db/pools.js';
import { requireBooth, requireFeature, requireMembership } from '../lib/access.js';
import { applyChange, Patch } from '../lib/changes.js';
import { ApiError, notFound } from '../lib/errors.js';
import { Mobile, parse, PartNo, Uuid, VoterId } from '../lib/http.js';
import { currentElectionId } from '../lib/stats.js';
import { VISIBLE } from '../lib/imports.js';
import { DRIVE_NAMES, toVoter, VOTER_SELECT, type VoterRow } from '../lib/voters.js';

const Mid = z.object({ mid: Uuid });

// Patch: see lib/changes.ts

export async function fieldRoutes(app: FastifyInstance) {
  app.get('/v1/m/:mid/booths', async (req) => {
    const { mid } = parse(Mid, req.params);
    const m = await requireMembership(req.userId, mid);
    const pool = await statePool(m.stateCode);
    const r = await pool.query<{ part_no: number; name: string; name_local: string | null; locality: string; locality_local: string | null; address: string | null; address_local: string | null; lat: string | null; lng: string | null; voters_count: number }>(
      `SELECT part_no, name, name_local, locality, locality_local, address, address_local, lat, lng, voters_count FROM booths
        WHERE ac_no = $1 AND deleted_at IS NULL AND ($2::boolean OR part_no = ANY($3::smallint[])) ORDER BY part_no`,
      [m.acNo, m.role === 'admin', m.booths],
    );
    return r.rows.map((b) => ({
      no: b.part_no, name: b.name, village: b.locality, lat: b.lat ? Number(b.lat) : null, lng: b.lng ? Number(b.lng) : null, voters: b.voters_count,
      ...(b.name_local ? { nameLocal: b.name_local } : {}), ...(b.locality_local ? { villageLocal: b.locality_local } : {}),
      ...(b.address ? { address: b.address } : {}), ...(b.address_local ? { addressLocal: b.address_local } : {}),
    }));
  });

  /** Full list of a booth's voters, or only voters changed since `since` (phone cache sync). */
  app.get('/v1/m/:mid/voters', async (req) => {
    const { mid } = parse(Mid, req.params);
    const q = parse(z.object({ booth: PartNo, since: z.string().datetime().optional() }), req.query);
    const m = await requireMembership(req.userId, mid);
    requireBooth(m, q.booth);
    const pool = await statePool(m.stateCode);
    return inParty(pool, m.partyId, async (c) => {
      const el = (await currentElectionId(c)) ?? '00000000-0000-0000-0000-000000000000';
      const params: unknown[] = [m.partyId, el, m.acNo, q.booth];
      let since = '';
      if (q.since) {
        params.push(q.since);
        since = ` AND (c.updated_at > $5 OR pm.marked_at > $5 OR pm.undone_at > $5 OR v.updated_at > $5)`;
      }
      const r = await c.query<VoterRow>(`${VOTER_SELECT} WHERE v.ac_no = $3 AND v.part_no = $4 AND v.${VISIBLE}${since} ORDER BY v.sno`, params);
      return { serverTime: new Date().toISOString(), voters: r.rows.map(toVoter) };
    });
  });

  /** Search across the member's scope by name, EPIC, house number or age. */
  app.get('/v1/m/:mid/search', async (req) => {
    const { mid } = parse(Mid, req.params);
    const q = parse(z.object({ q: z.string().trim().min(1).max(60) }), req.query);
    const m = await requireMembership(req.userId, mid);
    const pool = await statePool(m.stateCode);
    return inParty(pool, m.partyId, async (c) => {
      const el = (await currentElectionId(c)) ?? '00000000-0000-0000-0000-000000000000';
      const params: unknown[] = [m.partyId, el, m.acNo, m.role === 'admin', m.booths];
      let cond: string;
      if (/^\d{1,3}$/.test(q.q)) { params.push(Number(q.q)); params.push(q.q); cond = `(v.age = $6 OR v.house_no = $7)`; }
      else if (/^[A-Za-z]{2,4}\d{3,}/.test(q.q)) { params.push(q.q.toUpperCase() + '%'); cond = `v.epic LIKE $6`; }
      else {
        // L3: English or regional name, or relative's name
        params.push(`%${q.q.replace(/[%_\\]/g, '\\$&')}%`);
        cond = `(v.name ILIKE $6 OR v.name_local ILIKE $6 OR v.relative_name ILIKE $6 OR v.relative_name_local ILIKE $6)`;
      }
      const r = await c.query<VoterRow>(
        `${VOTER_SELECT} WHERE v.ac_no = $3 AND ($4::boolean OR v.part_no = ANY($5::smallint[])) AND v.${VISIBLE} AND ${cond}
         ORDER BY v.part_no, v.sno LIMIT 100`, params);
      return r.rows.map(toVoter);
    });
  });

  app.get('/v1/m/:mid/tasks', async (req) => {
    const { mid } = parse(Mid, req.params);
    const m = await requireMembership(req.userId, mid);
    if (!m.features.tasks) return []; // C3: tasks off → no tasks (Home still works)
    const pool = await statePool(m.stateCode);
    return inParty(pool, m.partyId, async (c) => {
      const r = await c.query<{ id: string; kind: string; custom_name: string | null; segment: Record<string, unknown>; starts_on: string; ends_on: string; scope: string; assign: string; parts: number[] | null; assigned: boolean }>(
        `SELECT d.id, d.kind, d.custom_name, d.segment, to_char(d.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(d.ends_on, 'YYYY-MM-DD') AS ends_on, d.scope, d.assign,
                (SELECT array_agg(DISTINCT b.part_no) FROM drive_scope s
                   LEFT JOIN zone_booths zb ON zb.zone_id = s.zone_id
                   JOIN booths b ON b.id = COALESCE(s.booth_id, zb.booth_id)
                  WHERE s.drive_id = d.id) AS parts,
                EXISTS (SELECT 1 FROM drive_assignees a WHERE a.drive_id = d.id AND a.user_id = $3) AS assigned
           FROM drives d
          WHERE d.party_id = $1 AND d.ac_no = $2 AND d.deleted_at IS NULL AND d.ends_on >= current_date - 30
          ORDER BY d.ends_on`,
        [m.partyId, m.acNo, m.userId],
      );
      const out = [];
      for (const d of r.rows) {
        if (d.assign === 'selected' && !d.assigned && m.role !== 'admin') continue;
        const scopeParts = d.scope === 'all' ? null : d.parts ?? [];
        const booths = m.role === 'admin' ? scopeParts ?? [] : m.booths.filter((b) => !scopeParts || scopeParts.includes(b));
        if (m.role !== 'admin' && booths.length === 0) continue;
        out.push({ id: d.id, kind: d.kind, name: d.kind === 'other' ? d.custom_name ?? 'Other' : DRIVE_NAMES[d.kind], booths, criteria: d.segment, startDate: d.starts_on, dueDate: d.ends_on });
      }
      return out;
    });
  });

  /** One change to one voter. Idempotent on opId (the phone may resend after a network drop). */
  app.post('/v1/m/:mid/voters/:voterId/changes', async (req) => {
    const { mid, voterId } = parse(z.object({ mid: Uuid, voterId: VoterId }), req.params);
    const b = parse(z.object({ opId: Uuid, clientAt: z.string().datetime().optional(), patch: Patch }), req.body);
    const m = await requireMembership(req.userId, mid);
    const pool = await statePool(m.stateCode);
    return inParty(pool, m.partyId, async (c) => {
      const el = await currentElectionId(c);
      await applyChange(c, m, el, { opId: b.opId, voterId, clientAt: b.clientAt, patch: b.patch });
      const r = await c.query<VoterRow>(`${VOTER_SELECT} WHERE v.ac_no = $3 AND v.id = $4`, [m.partyId, el ?? '00000000-0000-0000-0000-000000000000', m.acNo, voterId]);
      return toVoter(r.rows[0]);
    });
  });

  /**
   * S4 batch sync: up to 100 queued changes, applied in order in one transaction.
   * A permanent problem with one change is reported for that change only (S5); the others still apply.
   * `unsent` = changes still waiting on the phone after this batch (S9 admin view).
   */
  app.post('/v1/m/:mid/changes/batch', async (req) => {
    const { mid } = parse(Mid, req.params);
    const b = parse(z.object({
      ops: z.array(z.object({ opId: Uuid, voterId: VoterId, clientAt: z.string().datetime().optional(), patch: z.unknown() })).min(1).max(100),
      unsent: z.number().int().min(0).max(1_000_000).optional(),
    }), req.body);
    const m = await requireMembership(req.userId, mid);
    const pool = await statePool(m.stateCode);
    const results = await inParty(pool, m.partyId, async (c) => {
      const el = await currentElectionId(c);
      const out: { opId: string; status: 'ok' | 'duplicate' | 'error'; code?: string; message?: string }[] = [];
      for (const op of b.ops) {
        const patch = Patch.safeParse(op.patch);
        if (!patch.success) { out.push({ opId: op.opId, status: 'error', code: 'invalid', message: patch.error.issues[0]?.message ?? 'Invalid change' }); continue; }
        await c.query('SAVEPOINT op');
        try {
          const r = await applyChange(c, m, el, { opId: op.opId, voterId: op.voterId, clientAt: op.clientAt, patch: patch.data });
          await c.query('RELEASE SAVEPOINT op');
          out.push({ opId: op.opId, status: r.status });
        } catch (e) {
          await c.query('ROLLBACK TO SAVEPOINT op');
          if (e instanceof ApiError && e.status < 500) out.push({ opId: op.opId, status: 'error', code: e.code, message: e.message });
          else throw e; // unexpected: fail the whole batch, the phone keeps everything and retries
        }
      }
      return out;
    });
    await core.query('UPDATE memberships SET last_sync_at = now(), unsent = $2 WHERE id = $1', [m.id, b.unsent ?? 0]);
    return { results };
  });

  /** Branding for the voter slip and app header (any approved member). */
  app.get('/v1/m/:mid/branding', async (req) => {
    const { mid } = parse(Mid, req.params);
    const m = await requireMembership(req.userId, mid);
    requireFeature(m, 'slip');
    const r = await core.query<{ app_name: string | null; candidate_name: string | null; ballot_no: number | null; brand_colour: string | null }>(
      'SELECT app_name, candidate_name, ballot_no, brand_colour FROM party_constituencies WHERE id = $1', [m.partyAcId]);
    const pool = await statePool(m.stateCode);
    const el = await pool.query<{ name: string; poll_date: string }>(
      `SELECT name, to_char(poll_date, 'YYYY-MM-DD') AS poll_date FROM elections WHERE status IN ('polling','upcoming') ORDER BY (status = 'polling') DESC, poll_date LIMIT 1`);
    const b = r.rows[0];
    return {
      candidatePhotoUrl: m.look.candidatePhotoUrl, slogan: m.look.slogan, logoUrl: m.look.logoUrl, slipShareText: m.look.slipShareText,
      partyName: m.partyName, appName: b.app_name, candidateName: b.candidate_name, ballotNo: b.ballot_no, brandColour: b.brand_colour,
      electionName: el.rows[0]?.name ?? null, pollDate: el.rows[0]?.poll_date ?? null,
    };
  });

  /** A volunteer at the booth sets its location once (GPS). */
  app.put('/v1/m/:mid/booths/:no/location', async (req) => {
    const { mid, no } = parse(z.object({ mid: Uuid, no: PartNo }), req.params);
    const b = parse(z.object({ lat: z.number().min(6).max(38), lng: z.number().min(68).max(98) }), req.body);
    const m = await requireMembership(req.userId, mid);
    // Admins fix booth locations from the polling-day page (spec polling-day S2) whatever the plan.
    if (m.role !== 'admin') requireFeature(m, 'boothGps');
    requireBooth(m, no);
    const pool = await statePool(m.stateCode);
    const r = await pool.query(`UPDATE booths SET lat = $3, lng = $4, location_source = $6, location_set_by = $5, updated_at = now() WHERE ac_no = $1 AND part_no = $2 AND deleted_at IS NULL`,
      [m.acNo, no, b.lat, b.lng, m.userId, m.role === 'admin' ? 'edited' : 'gps']);
    if (!r.rowCount) throw notFound();
    return { ok: true };
  });

}
