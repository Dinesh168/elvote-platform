import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { core, statePool } from '../db/pools.js';
import { isSuperAdmin, membershipsOf } from '../lib/access.js';
import { requestDeletion, sendDeletionCode } from '../lib/account.js';
import { pollingDayOf } from '../lib/presence.js';
import { sha256 } from '../lib/auth.js';
import { invalid } from '../lib/errors.js';
import { parse, PartNo } from '../lib/http.js';

export async function meRoutes(app: FastifyInstance) {
  app.get('/v1/me', async (req) => {
    const u = await core.query<{ id: string; mobile: string; name: string; lang: string }>('SELECT id, mobile, name, lang FROM users WHERE id = $1', [req.userId]);
    const user = u.rows[0];
    const [sup, ms] = await Promise.all([isSuperAdmin(req.userId), membershipsOf(req.userId)]);
    const days = await pollingDayOf(ms);
    return {
      user: { id: user.id, mobile: user.mobile, name: user.name, lang: user.lang },
      isSuperAdmin: sup,
      memberships: ms.map((m, i) => ({
        id: m.id, role: m.role, status: m.status, partyId: m.partyId, partyName: m.partyName, partyAcId: m.partyAcId,
        stateCode: m.stateCode, acNo: m.acNo, acName: m.acName, booths: m.booths, maxZones: m.maxZones, zoneCount: m.zoneCount,
        active: m.active, features: m.features, look: m.look, sync: m.sync,
        boothRadiusM: m.boothRadiusM, pollingDay: days[i],
      })),
    };
  });

  app.patch('/v1/me', async (req) => {
    const b = parse(z.object({ name: z.string().trim().min(2).max(80).optional(), lang: z.enum(['en', 'pa', 'hi']).optional() }), req.body);
    await core.query('UPDATE users SET name = COALESCE($2, name), lang = COALESCE($3, lang), updated_at = now() WHERE id = $1', [req.userId, b.name ?? null, b.lang ?? null]);
    return { ok: true };
  });

  /** Account deletion (spec account-deletion AD1/AD2). */
  /** Phone push token (spec polling-day A1). A token moves to whoever signs in on that phone. */
  app.put('/v1/me/push-token', async (req) => {
    const b = parse(z.object({ token: z.string().trim().min(10).max(200), platform: z.enum(['android', 'ios', 'web']) }), req.body);
    await core.query(
      `INSERT INTO push_tokens (token, user_id, platform) VALUES ($1,$2,$3)
       ON CONFLICT (token) DO UPDATE SET user_id = $2, platform = $3, updated_at = now()`, [b.token, req.userId, b.platform]);
    return { ok: true };
  });
  app.delete('/v1/me/push-token', async (req) => {
    const q = parse(z.object({ token: z.string().max(200) }), req.query);
    await core.query('DELETE FROM push_tokens WHERE token = $1 AND user_id = $2', [q.token, req.userId]);
    return { ok: true };
  });

  app.post('/v1/me/delete/code', async (req) => sendDeletionCode(req.userId));

  app.post('/v1/me/delete', async (req) => {
    const b = parse(z.object({
      confirm: z.string().max(20),
      code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code').optional(),
      idToken: z.string().min(20).max(4096).optional(),
    }), req.body);
    return requestDeletion(req.userId, b);
  });

  /** Checks a join code and returns the AC and its booths, so the volunteer can pick booths. */
  app.post('/v1/join/check', async (req) => {
    const { code } = parse(z.object({ code: z.string().trim().min(4).max(20) }), req.body);
    const pc = await findCode(code);
    const pool = await statePool(pc.state_code);
    const booths = await pool.query<{ part_no: number; name: string; locality: string }>(
      'SELECT part_no, name, locality FROM booths WHERE ac_no = $1 AND deleted_at IS NULL ORDER BY part_no', [pc.ac_no],
    );
    return { partyName: pc.party_name, acNo: pc.ac_no, acName: pc.ac_name, booths: booths.rows.map((b) => ({ no: b.part_no, name: b.name, village: b.locality })) };
  });

  app.post('/v1/join', async (req) => {
    const b = parse(z.object({
      code: z.string().trim().min(4).max(20),
      name: z.string().trim().min(2).max(80),
      epic: z.string().trim().max(20).optional(),
      booths: z.array(PartNo).min(1).max(10),
    }), req.body);
    const pc = await findCode(b.code);
    const pool = await statePool(pc.state_code);
    const valid = await pool.query<{ part_no: number }>('SELECT part_no FROM booths WHERE ac_no = $1 AND part_no = ANY($2::smallint[])', [pc.ac_no, b.booths]);
    if (valid.rowCount !== new Set(b.booths).size) throw invalid('booth_invalid', 'Pick booths from the list.');
    await core.query('UPDATE users SET name = $2, epic = COALESCE($3, epic), updated_at = now() WHERE id = $1', [req.userId, b.name, b.epic ?? null]);
    const m = await core.query<{ id: string; status: string }>(
      `INSERT INTO memberships (user_id, party_constituency_id, role, status) VALUES ($1, $2, 'volunteer', 'pending')
       ON CONFLICT (user_id, party_constituency_id) DO UPDATE
         SET status = CASE WHEN memberships.status IN ('rejected','removed') THEN 'pending' ELSE memberships.status END,
             reject_reason = NULL, requested_at = now(), updated_at = now()
       RETURNING id, status`,
      [req.userId, pc.id],
    );
    if (m.rows[0].status === 'pending') {
      await core.query('DELETE FROM membership_booths WHERE membership_id = $1', [m.rows[0].id]);
      for (const no of new Set(b.booths)) await core.query('INSERT INTO membership_booths (membership_id, part_no, requested) VALUES ($1,$2,true)', [m.rows[0].id, no]);
    }
    await core.query('UPDATE join_codes SET used_count = used_count + 1 WHERE code_hash = $1', [sha256(b.code.toUpperCase())]);
    return { membershipId: m.rows[0].id, status: m.rows[0].status };
  });
}

async function findCode(code: string) {
  const r = await core.query<{ id: string; state_code: string; ac_no: number; ac_name: string; party_name: string }>(
    `SELECT pc.id, trim(pc.state_code) AS state_code, pc.ac_no, pc.ac_name, p.name AS party_name
       FROM join_codes j JOIN party_constituencies pc ON pc.id = j.party_constituency_id AND pc.deleted_at IS NULL AND pc.status = 'active'
       JOIN parties p ON p.id = pc.party_id
      WHERE j.code_hash = $1 AND j.revoked_at IS NULL AND (j.expires_at IS NULL OR j.expires_at > now())
        AND (j.max_uses IS NULL OR j.used_count < j.max_uses)`,
    [sha256(code.toUpperCase())],
  );
  if (!r.rowCount) throw invalid('code_invalid', 'This code is not valid.');
  return r.rows[0];
}
