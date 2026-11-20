/**
 * Registration and access (spec accounts-access AC4–AC10).
 * accessUserRoutes: the signed-in person (details, admin request, overview).
 * accessAdminRoutes: super-admin only (registered under platformRoutes, which checks the role for /v1/admin/*).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../config.js';
import { core, inParty, statePool } from '../db/pools.js';
import { audit, membershipsOf } from '../lib/access.js';
import { ApiError, invalid, notFound } from '../lib/errors.js';
import { Mobile, parse, PartNo, Uuid } from '../lib/http.js';
import { approveVolunteer, customerById, rejectVolunteer } from '../lib/members.js';
import { notify, superAdmins } from '../lib/notify.js';
import { adminAccessOf, grantAssemblies, grantState, revokeState } from '../lib/scopes.js';

const State = z.string().regex(/^[A-Z]{2}$/);
const AcNos = z.array(z.number().int().min(1).max(999)).min(1).max(300);
const Reason = z.string().trim().min(2).max(200);

/** AC4: nothing else works until name and mobile are filled in. */
export async function requireProfile(userId: string, opts: { nameLater?: boolean } = {}) {
  const r = await core.query<{ mobile: string | null; name: string }>('SELECT mobile, name FROM users WHERE id = $1', [userId]);
  const u = r.rows[0];
  if (!u?.mobile || (!opts.nameLater && !u.name?.trim())) throw invalid('profile_required', 'Fill in your name and mobile number first.');
}

async function checkAcs(stateCode: string, acNos: number[]) {
  const pool = await statePool(stateCode).catch(() => { throw invalid('state_unknown', 'Pick a state from the list.'); });
  const r = await pool.query<{ ac_no: number }>('SELECT ac_no FROM assembly_constituencies WHERE ac_no = ANY($1::smallint[])', [acNos]);
  if (r.rowCount !== new Set(acNos).size) throw invalid('ac_unknown', 'Pick assemblies from the list.');
}

const areaText = (r: { whole_state: boolean; state_code: string; ac_nos: number[] }) =>
  r.whole_state ? `${r.state_code.trim()} (whole state)` : `${r.state_code.trim()} ${r.ac_nos.join(', ')}`;

type ReqRow = {
  id: string; user_id: string; name: string; mobile: string | null; email: string | null; party_id: string | null; party_name: string;
  state_code: string; whole_state: boolean; ac_nos: number[]; designation: string; note: string | null; status: string;
  reason: string | null; created_at: Date; decided_at: Date | null;
};
const reqOut = (r: ReqRow) => ({
  id: r.id, userId: r.user_id, name: r.name, mobile: r.mobile, email: r.email, partyId: r.party_id, partyName: r.party_name,
  stateCode: r.state_code.trim(), wholeState: r.whole_state, acNos: r.ac_nos, designation: r.designation, note: r.note,
  status: r.status, reason: r.reason, createdAt: r.created_at, decidedAt: r.decided_at,
});
const REQ_SELECT = `SELECT a.*, u.name, u.mobile, u.email FROM access_requests a JOIN users u ON u.id = a.user_id`;

export async function latestRequestOf(userId: string) {
  const r = await core.query<ReqRow>(`${REQ_SELECT} WHERE a.user_id = $1 ORDER BY a.created_at DESC LIMIT 1`, [userId]);
  return r.rows[0] ? reqOut(r.rows[0]) : null;
}

export async function accessUserRoutes(app: FastifyInstance) {
  // AC4: Your details.
  app.patch('/v1/me/profile', async (req) => {
    const b = parse(z.object({ name: z.string().trim().min(2).max(80), mobile: Mobile, lang: z.enum(['en', 'pa', 'hi']).optional() }), req.body);
    await core.query('UPDATE users SET name = $2, mobile = $3, lang = COALESCE($4, lang), updated_at = now() WHERE id = $1',
      [req.userId, b.name, b.mobile, b.lang ?? null]).catch((e: { code?: string }) => {
      if (e.code === '23505') throw new ApiError(409, 'mobile_taken', 'This mobile number is already used by another account. Sign in with that account, or ask your admin.');
      throw e;
    });
    return { ok: true };
  });

  // AC6: admin request.
  app.post('/v1/access-requests', async (req) => {
    await requireProfile(req.userId);
    const b = parse(z.object({
      partyId: Uuid.optional(),
      partyName: z.string().trim().min(2).max(100),
      stateCode: State,
      wholeState: z.boolean().optional(),
      acNos: AcNos.optional(),
      designation: z.string().trim().min(2).max(80),
      note: z.string().trim().max(300).optional(),
    }), req.body);
    if (!b.wholeState && !b.acNos?.length) throw invalid('area_required', 'Pick the whole state or at least one assembly.');
    if (b.acNos?.length && !b.wholeState) await checkAcs(b.stateCode, b.acNos);
    const recent = await core.query<{ n: number }>(`SELECT count(*)::int AS n FROM access_requests WHERE user_id = $1 AND created_at > now() - interval '1 hour'`, [req.userId]);
    if (recent.rows[0].n >= 5) throw new ApiError(429, 'too_many', 'Too many requests. Try again later.');
    const r = await core.query<{ id: string }>(
      `INSERT INTO access_requests (user_id, party_id, party_name, state_code, whole_state, ac_nos, designation, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [req.userId, b.partyId ?? null, b.partyName, b.stateCode, !!b.wholeState, b.wholeState ? [] : [...new Set(b.acNos)], b.designation, b.note ?? null],
    ).catch((e: { code?: string }) => {
      if (e.code === '23505') throw new ApiError(409, 'request_open', 'You already have a request waiting. Withdraw it first to send a new one.');
      throw e;
    });
    await audit({ actor: req.userId, role: 'self', action: 'access.request', stateCode: b.stateCode, entity: 'access_request', entityId: r.rows[0].id });
    const u = await core.query<{ name: string }>('SELECT name FROM users WHERE id = $1', [req.userId]);
    await notify(await superAdmins(), 'admin_request', {
      name: u.rows[0].name, party: b.partyName, area: areaText({ whole_state: !!b.wholeState, state_code: b.stateCode, ac_nos: b.acNos ?? [] }),
    });
    return { id: r.rows[0].id };
  });

  app.delete('/v1/access-requests/:id', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const r = await core.query(`UPDATE access_requests SET status = 'withdrawn' WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING id`, [id, req.userId]);
    if (!r.rowCount) throw notFound();
    await audit({ actor: req.userId, role: 'self', action: 'access.withdraw', entity: 'access_request', entityId: id });
    return { ok: true };
  });

  // AC9: one row per assembly the person administers.
  app.get('/v1/me/overview', async (req) => {
    const ms = (await membershipsOf(req.userId)).filter((m) => m.role === 'admin' && m.status === 'approved');
    const counts = await core.query<{ party_constituency_id: string; volunteers: number; pending: number }>(
      `SELECT party_constituency_id,
              count(*) FILTER (WHERE role = 'volunteer' AND status = 'approved')::int AS volunteers,
              count(*) FILTER (WHERE status = 'pending')::int AS pending
         FROM memberships WHERE party_constituency_id = ANY($1::uuid[]) GROUP BY party_constituency_id`, [ms.map((m) => m.partyAcId)]);
    const cnt = new Map(counts.rows.map((c) => [c.party_constituency_id, c]));
    const pct = new Map<string, number>();
    for (const st of [...new Set(ms.map((m) => m.stateCode))]) {
      const pool = await statePool(st);
      const mine = ms.filter((m) => m.stateCode === st);
      // Only this person's own (party, assembly) pairs are read.
      const r = await inParty(pool, 'ALL', (c) => c.query<{ party_id: string; ac_no: number; total: number; met: number }>(
        `SELECT party_id, ac_no, sum(total)::int AS total, sum(met)::int AS met FROM stats_booth
          WHERE (party_id, ac_no) IN (SELECT * FROM unnest($1::uuid[], $2::smallint[])) GROUP BY party_id, ac_no`,
        [mine.map((m) => m.partyId), mine.map((m) => m.acNo)]));
      for (const x of r.rows) pct.set(`${x.party_id}:${x.ac_no}`, x.total ? Math.round((x.met / x.total) * 100) : 0);
    }
    return {
      rows: ms.map((m) => ({
        membershipId: m.id, partyName: m.partyName, stateCode: m.stateCode, acNo: m.acNo, acName: m.acName,
        volunteers: cnt.get(m.partyAcId)?.volunteers ?? 0, pending: cnt.get(m.partyAcId)?.pending ?? 0,
        contactedPct: pct.get(`${m.partyId}:${m.acNo}`) ?? 0, active: m.active,
      })),
    };
  });

  // AC6: lists for the admin request form (public information: states, assembly names, party names).
  app.get('/v1/catalog/states', async () => {
    const r = await core.query<{ code: string; name: string; name_local: string | null }>('SELECT trim(code) AS code, name, name_local FROM states ORDER BY name');
    return r.rows.map((x) => ({ code: x.code, name: x.name, nameLocal: x.name_local }));
  });
  app.get('/v1/catalog/acs', async (req) => {
    const q = parse(z.object({ state: State }), req.query);
    const pool = await statePool(q.state).catch(() => { throw invalid('state_unknown', 'Pick a state from the list.'); });
    const r = await pool.query<{ ac_no: number; name: string; name_local: string | null }>('SELECT ac_no, name, name_local FROM assembly_constituencies ORDER BY ac_no');
    return r.rows.map((x) => ({ acNo: x.ac_no, name: x.name, nameLocal: x.name_local }));
  });
  app.get('/v1/catalog/parties', async () => {
    const r = await core.query<{ id: string; name: string }>('SELECT id, name FROM parties WHERE deleted_at IS NULL ORDER BY name');
    return r.rows;
  });

  // AC11: the browser needs the public VAPID key to subscribe (public, no sign-in).
  app.get('/v1/push/vapid-key', async () => {
    if (!env.VAPID_PUBLIC_KEY) throw notFound();
    return { key: env.VAPID_PUBLIC_KEY };
  });
}

export async function accessAdminRoutes(app: FastifyInstance) {
  // AC7: admin requests.
  app.get('/v1/admin/access-requests', async (req) => {
    const q = parse(z.object({ status: z.enum(['pending', 'approved', 'rejected', 'withdrawn', 'all']).default('pending') }), req.query);
    const r = await core.query<ReqRow>(
      `${REQ_SELECT} WHERE ($1 = 'all' OR a.status = $1) ORDER BY (a.status = 'pending') DESC, a.created_at DESC LIMIT 500`, [q.status]);
    return r.rows.map(reqOut);
  });

  app.post('/v1/admin/access-requests/:id/approve', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const b = parse(z.object({
      partyId: Uuid.optional(),
      newPartyName: z.string().trim().min(2).max(100).optional(),
      stateCode: State,
      wholeState: z.boolean().optional(),
      acNos: AcNos.optional(),
      createMissing: z.boolean().optional(),
    }), req.body);
    const ar = await core.query<ReqRow>(`${REQ_SELECT} WHERE a.id = $1`, [id]);
    const row = ar.rows[0];
    if (!row) throw notFound();
    if (row.status !== 'pending') throw invalid('not_pending', 'This request was already decided.');
    if (!b.wholeState && !b.acNos?.length) throw invalid('area_required', 'Pick the whole state or at least one assembly.');
    let partyId = b.partyId;
    if (!partyId) {
      if (!b.newPartyName) throw invalid('party_required', 'Pick a party or create one.');
      partyId = (await core.query<{ id: string }>('INSERT INTO parties (name, created_by) VALUES ($1,$2) RETURNING id', [b.newPartyName, req.userId])).rows[0].id;
      await audit({ actor: req.userId, role: 'super_admin', action: 'party.create', partyId, entity: 'party', entityId: partyId });
    }
    if (b.wholeState) await grantState(req.userId, row.user_id, partyId, b.stateCode);
    else await grantAssemblies(req.userId, row.user_id, partyId, b.stateCode, b.acNos!, b.createMissing);
    await core.query(`UPDATE access_requests SET status = 'approved', party_id = $2, decided_by = $3, decided_at = now() WHERE id = $1`, [id, partyId, req.userId]);
    await audit({ actor: req.userId, role: 'super_admin', action: 'access.approve', partyId, stateCode: b.stateCode, entity: 'access_request', entityId: id, details: { wholeState: !!b.wholeState, acNos: b.acNos ?? [] } });
    const p = await core.query<{ name: string }>('SELECT name FROM parties WHERE id = $1', [partyId]);
    await notify([row.user_id], 'approved', { party: p.rows[0].name, area: areaText({ whole_state: !!b.wholeState, state_code: b.stateCode, ac_nos: b.acNos ?? [] }) });
    return { ok: true, partyId };
  });

  app.post('/v1/admin/access-requests/:id/reject', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const b = parse(z.object({ reason: Reason }), req.body);
    const r = await core.query<{ user_id: string }>(
      `UPDATE access_requests SET status = 'rejected', reason = $2, decided_by = $3, decided_at = now() WHERE id = $1 AND status = 'pending' RETURNING user_id`,
      [id, b.reason, req.userId]);
    if (!r.rowCount) throw notFound();
    await audit({ actor: req.userId, role: 'super_admin', action: 'access.reject', entity: 'access_request', entityId: id });
    await notify([r.rows[0].user_id], 'rejected', { reason: b.reason });
    return { ok: true };
  });

  // AC8: admin access of a user.
  app.get('/v1/admin/users/:id/admin-access', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    return adminAccessOf(id);
  });

  app.post('/v1/admin/users/:id/admin-access', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const b = parse(z.object({ partyId: Uuid, stateCode: State, wholeState: z.boolean().optional(), acNos: AcNos.optional(), createMissing: z.boolean().optional() }), req.body);
    const u = await core.query('SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (!u.rowCount) throw notFound();
    if (b.wholeState) await grantState(req.userId, id, b.partyId, b.stateCode);
    else if (b.acNos?.length) await grantAssemblies(req.userId, id, b.partyId, b.stateCode, b.acNos, b.createMissing);
    else throw invalid('area_required', 'Pick the whole state or at least one assembly.');
    return adminAccessOf(id);
  });

  app.delete('/v1/admin/users/:id/admin-access/state/:partyId/:state', async (req) => {
    const p = parse(z.object({ id: Uuid, partyId: Uuid, state: State }), req.params);
    if (!(await revokeState(req.userId, p.id, p.partyId, p.state))) throw notFound();
    return adminAccessOf(p.id);
  });

  // AC10: volunteer requests of one customer, decided by the super-admin.
  app.get('/v1/admin/customers/:id/requests', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const r = await core.query<{ id: string; user_id: string; name: string; mobile: string | null; email: string | null; requested_at: Date; booths: number[] }>(
      `SELECT ms.id, u.id AS user_id, u.name, u.mobile, u.email, ms.requested_at,
              COALESCE(array_agg(mb.part_no ORDER BY mb.part_no) FILTER (WHERE mb.part_no IS NOT NULL), '{}') AS booths
         FROM memberships ms JOIN users u ON u.id = ms.user_id LEFT JOIN membership_booths mb ON mb.membership_id = ms.id
        WHERE ms.party_constituency_id = $1 AND ms.status = 'pending' AND ms.role = 'volunteer'
        GROUP BY ms.id, u.id ORDER BY ms.requested_at`, [id]);
    return r.rows.map((x) => ({ membershipId: x.id, userId: x.user_id, name: x.name, mobile: x.mobile, email: x.email, requestedAt: x.requested_at, booths: x.booths }));
  });

  app.post('/v1/admin/customers/:id/requests/:membershipId/approve', async (req) => {
    const p = parse(z.object({ id: Uuid, membershipId: Uuid }), req.params);
    const b = parse(z.object({ booths: z.array(PartNo).min(1).max(20) }), req.body);
    await approveVolunteer(await customerById(p.id), p.membershipId, b.booths, { userId: req.userId, role: 'super_admin' });
    return { ok: true };
  });

  app.post('/v1/admin/customers/:id/requests/:membershipId/reject', async (req) => {
    const p = parse(z.object({ id: Uuid, membershipId: Uuid }), req.params);
    const b = parse(z.object({ reason: Reason }), req.body);
    await rejectVolunteer(await customerById(p.id), p.membershipId, b.reason, { userId: req.userId, role: 'super_admin' });
    return { ok: true };
  });
}
