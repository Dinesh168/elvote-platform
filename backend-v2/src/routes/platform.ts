/** Super-admin routes: parties, party ACs, admins, super-admins, totals across states, roll upload, clear data. */
import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../config.js';
import { allStateCodes, core, inParty, statePool } from '../db/pools.js';
import { audit, checkLimit, requireSuperAdmin } from '../lib/access.js';
import { invalid, notFound } from '../lib/errors.js';
import { DateStr, Mobile, parse, Uuid } from '../lib/http.js';
import { heldRows, mergeImport, stageImport } from '../lib/imports.js';
import { stateLang } from '../lib/lang.js';
import { createCustomer } from '../lib/scopes.js';
import { accessAdminRoutes } from './access.js';
import { customerRoutes } from './customers.js';
import { pollingAdminRoutes } from './polling.js';

const State = z.string().regex(/^[A-Z]{2}$/);
const Email = z.string().trim().toLowerCase().email('Enter a valid email address').max(200);

/**
 * Finds or creates the person a super-admin adds (admin or super-admin). With Google/email sign-in the email is the
 * key, because Google verified it; a mobile is not verified, so it is accepted only in local/test sign-in mode
 * (spec accounts-access AC12).
 */
async function personFor(b: { email?: string; mobile?: string; name: string }): Promise<string> {
  if (b.email) {
    const found = await core.query<{ id: string }>('SELECT id FROM users WHERE lower(email) = $1 AND deleted_at IS NULL', [b.email]);
    if (found.rowCount) {
      await core.query(`UPDATE users SET name = CASE WHEN name = '' THEN $2 ELSE name END, updated_at = now() WHERE id = $1`, [found.rows[0].id, b.name]);
      return found.rows[0].id;
    }
    return (await core.query<{ id: string }>('INSERT INTO users (email, name) VALUES ($1,$2) RETURNING id', [b.email, b.name])).rows[0].id;
  }
  if (!b.mobile) throw invalid('email_required', 'Enter the person’s Google or sign-in email.');
  if (env.AUTH_MODE === 'firebase') throw invalid('email_required', 'Add people by their Google or sign-in email.');
  return (await core.query<{ id: string }>(
    `INSERT INTO users (mobile, name) VALUES ($1,$2) ON CONFLICT (mobile) DO UPDATE SET name = CASE WHEN users.name = '' THEN EXCLUDED.name ELSE users.name END RETURNING id`,
    [b.mobile, b.name])).rows[0].id;
}

export async function platformRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (req) => {
    if (req.url.startsWith('/v1/admin/')) await requireSuperAdmin(req.userId);
  });
  await customerRoutes(app);
  await accessAdminRoutes(app);
  await pollingAdminRoutes(app);

  app.get('/v1/admin/overview', async () => {
    const pcs = await core.query<{ id: string; party_id: string; party_name: string; state_code: string; ac_no: number; ac_name: string; max_zones: number; zone_count: number; status: string; admins: number; volunteers: number; pending: number }>(
      `SELECT pc.id, pc.party_id, p.name AS party_name, trim(pc.state_code) AS state_code, pc.ac_no, pc.ac_name, pc.max_zones, pc.zone_count, pc.status,
              count(m.id) FILTER (WHERE m.role = 'admin' AND m.status = 'approved')::int AS admins,
              count(m.id) FILTER (WHERE m.role = 'volunteer' AND m.status = 'approved')::int AS volunteers,
              count(m.id) FILTER (WHERE m.status = 'pending')::int AS pending
         FROM party_constituencies pc JOIN parties p ON p.id = pc.party_id LEFT JOIN memberships m ON m.party_constituency_id = pc.id
        WHERE pc.deleted_at IS NULL GROUP BY pc.id, p.id ORDER BY p.name, pc.state_code, pc.ac_no`);
    const states = await core.query<{ code: string; name: string; name_local: string }>('SELECT trim(code) AS code, name, name_local FROM states ORDER BY code');
    const stateOut = [];
    const stats = new Map<string, { total: number; met: number; voted: number }>();
    for (const code of await allStateCodes()) {
      const pool = await statePool(code);
      const geo = (await pool.query<{ acs: number; booths: number; voters: number }>(
        `SELECT (SELECT count(*) FROM assembly_constituencies)::int AS acs, (SELECT count(*) FROM booths WHERE deleted_at IS NULL)::int AS booths,
                (SELECT COALESCE(sum(voters_count), 0) FROM booths WHERE deleted_at IS NULL)::int AS voters`)).rows[0];
      const s = await inParty(pool, 'ALL', (c) => c.query<{ party_id: string; ac_no: number; total: number; met: number; voted: number }>(
        `SELECT party_id, ac_no, sum(total)::int AS total, sum(met)::int AS met, sum(voted)::int AS voted FROM stats_booth GROUP BY party_id, ac_no`));
      for (const r of s.rows) stats.set(`${r.party_id}:${code}:${r.ac_no}`, r);
      const st = states.rows.find((x) => x.code === code);
      stateOut.push({ code, name: st?.name ?? code, nameLocal: st?.name_local, ...geo });
    }
    return {
      states: stateOut,
      partyAcs: pcs.rows.map((p) => {
        const s = stats.get(`${p.party_id}:${p.state_code}:${p.ac_no}`);
        return { id: p.id, partyId: p.party_id, partyName: p.party_name, stateCode: p.state_code, acNo: p.ac_no, acName: p.ac_name, maxZones: p.max_zones,
          zoneCount: p.zone_count, status: p.status, admins: p.admins, volunteers: p.volunteers, pending: p.pending,
          voters: s?.total ?? 0, met: s?.met ?? 0, voted: s?.voted ?? 0 };
      }),
    };
  });

  app.get('/v1/admin/acs', async (req) => {
    const q = parse(z.object({ state: State }), req.query);
    const pool = await statePool(q.state);
    const def = await stateLang(q.state);
    const r = await pool.query<{ ac_no: number; name: string; name_local: string | null; regional_lang: string | null; booths: number; voters: number }>(
      `SELECT a.ac_no, a.name, a.name_local, a.regional_lang, count(b.id)::int AS booths, COALESCE(sum(b.voters_count), 0)::int AS voters
         FROM assembly_constituencies a LEFT JOIN booths b ON b.ac_no = a.ac_no AND b.deleted_at IS NULL GROUP BY a.ac_no ORDER BY a.ac_no`);
    return r.rows.map((x) => ({ acNo: x.ac_no, name: x.name, nameLocal: x.name_local, regionalLang: x.regional_lang ?? def, booths: x.booths, voters: x.voters }));
  });

  /** L1: data language of one assembly (Hindi or Punjabi). */
  app.patch('/v1/admin/acs/:state/:ac', async (req) => {
    const p = parse(z.object({ state: State, ac: z.coerce.number().int().min(1).max(999) }), req.params);
    const b = parse(z.object({ regionalLang: z.enum(['hi', 'pa']).optional(), nameLocal: z.string().trim().max(80).optional() }).strict(), req.body);
    const pool = await statePool(p.state);
    const r = await pool.query(`UPDATE assembly_constituencies SET regional_lang = COALESCE($2, regional_lang), name_local = COALESCE($3, name_local) WHERE ac_no = $1`,
      [p.ac, b.regionalLang ?? null, b.nameLocal ?? null]);
    if (!r.rowCount) throw notFound();
    await audit({ actor: req.userId, role: 'super_admin', action: 'ac.update', stateCode: p.state, acNo: p.ac, details: { fields: Object.keys(b) } });
    return { ok: true };
  });

  // ---------- Parties ----------
  app.get('/v1/admin/parties', async () => {
    const r = await core.query<{ id: string; name: string; short_name: string | null; acs: number }>(
      `SELECT p.id, p.name, p.short_name, count(pc.id)::int AS acs FROM parties p
         LEFT JOIN party_constituencies pc ON pc.party_id = p.id AND pc.deleted_at IS NULL
        WHERE p.deleted_at IS NULL GROUP BY p.id ORDER BY p.name`);
    return r.rows.map((p) => ({ id: p.id, name: p.name, shortName: p.short_name, acs: p.acs }));
  });

  app.post('/v1/admin/parties', async (req) => {
    const b = parse(z.object({ name: z.string().trim().min(2).max(80), shortName: z.string().trim().min(1).max(12).optional() }), req.body);
    const r = await core.query<{ id: string }>('INSERT INTO parties (name, short_name, created_by) VALUES ($1,$2,$3) RETURNING id', [b.name, b.shortName ?? null, req.userId]);
    await audit({ actor: req.userId, role: 'super_admin', action: 'party.create', partyId: r.rows[0].id, entity: 'party', entityId: r.rows[0].id });
    return { id: r.rows[0].id };
  });

  // ---------- Party × AC ----------
  app.post('/v1/admin/party-acs', async (req) => {
    const b = parse(z.object({ partyId: Uuid, stateCode: State, acNo: z.number().int().min(1).max(999), maxZones: z.number().int().min(1).max(50).default(10) }), req.body);
    return { id: await createCustomer(req.userId, b.partyId, b.stateCode, b.acNo, b.maxZones) };
  });

  app.patch('/v1/admin/party-acs/:id', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const b = parse(z.object({ maxZones: z.number().int().min(1).max(50).optional(), status: z.enum(['active', 'paused', 'closed']).optional() }).strict(), req.body);
    const cur = await core.query<{ zone_count: number; party_id: string; state_code: string; ac_no: number }>('SELECT zone_count, party_id, trim(state_code) AS state_code, ac_no FROM party_constituencies WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (!cur.rowCount) throw notFound();
    if (b.maxZones != null && b.maxZones < cur.rows[0].zone_count) {
      throw invalid('max_below_used', `The admin uses ${cur.rows[0].zone_count} zones. Ask them to reduce zones first, or set at least ${cur.rows[0].zone_count}.`);
    }
    await core.query('UPDATE party_constituencies SET max_zones = COALESCE($2, max_zones), status = COALESCE($3, status), updated_at = now() WHERE id = $1', [id, b.maxZones ?? null, b.status ?? null]);
    const p = cur.rows[0];
    await audit({ actor: req.userId, role: 'super_admin', action: 'partyac.update', partyId: p.party_id, stateCode: p.state_code, acNo: p.ac_no, entity: 'party_ac', entityId: id, details: b });
    return { ok: true };
  });

  /** Deletes one party's canvassing data in one AC. The shared roll and other parties are untouched. */
  app.post('/v1/admin/party-acs/:id/clear', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const b = parse(z.object({ passKey: z.string().min(4).max(100), confirmAcNo: z.number().int() }), req.body);
    const expected = Buffer.from(process.env.CLEAR_PASS_KEY ?? 'local-clear-key');
    const given = Buffer.from(b.passKey);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw invalid('passkey_wrong', 'The pass key is wrong.');
    const pc = await core.query<{ party_id: string; state_code: string; ac_no: number }>('SELECT party_id, trim(state_code) AS state_code, ac_no FROM party_constituencies WHERE id = $1', [id]);
    if (!pc.rowCount) throw notFound();
    const { party_id: partyId, state_code: stateCode, ac_no: acNo } = pc.rows[0];
    if (b.confirmAcNo !== acNo) throw invalid('confirm_mismatch', `Type ${acNo} to confirm.`);
    const pool = await statePool(stateCode);
    const counts = await inParty(pool, partyId, async (c) => {
      const a = await c.query('DELETE FROM voter_contacts WHERE party_id = $1 AND ac_no = $2', [partyId, acNo]);
      const e = await c.query('DELETE FROM contact_events WHERE party_id = $1 AND ac_no = $2', [partyId, acNo]);
      const p = await c.query('DELETE FROM poll_marks WHERE party_id = $1 AND ac_no = $2', [partyId, acNo]);
      await c.query('DELETE FROM stats_booth_daily WHERE party_id = $1 AND ac_no = $2', [partyId, acNo]);
      await c.query('INSERT INTO stats_dirty (party_id, booth_id) SELECT $1, id FROM booths WHERE ac_no = $2 ON CONFLICT DO NOTHING', [partyId, acNo]);
      return { contacts: a.rowCount, events: e.rowCount, pollMarks: p.rowCount };
    });
    await audit({ actor: req.userId, role: 'super_admin', action: 'partyac.clear', partyId, stateCode, acNo, entity: 'party_ac', entityId: id, details: counts });
    return { ok: true, ...counts };
  });

  // ---------- Admin users ----------
  app.post('/v1/admin/admins', async (req) => {
    const b = parse(z.object({ mobile: Mobile.optional(), email: Email.optional(), name: z.string().trim().min(2).max(80), partyAcId: Uuid }), req.body);
    const u = { rows: [{ id: await personFor(b) }] };
    const pc = await core.query<{ party_id: string; state_code: string; ac_no: number }>('SELECT party_id, trim(state_code) AS state_code, ac_no FROM party_constituencies WHERE id = $1', [b.partyAcId]);
    if (!pc.rowCount) throw notFound();
    const existing = await core.query<{ id: string }>(`SELECT id FROM memberships WHERE user_id = $1 AND party_constituency_id = $2 AND role = 'admin' AND status = 'approved'`, [u.rows[0].id, b.partyAcId]);
    if (!existing.rowCount) await checkLimit(b.partyAcId, 'admin');
    await core.query(
      `INSERT INTO memberships (user_id, party_constituency_id, role, status, decided_by, decided_at) VALUES ($1,$2,'admin','approved',$3, now())
       ON CONFLICT (user_id, party_constituency_id) DO UPDATE SET role = 'admin', status = 'approved', decided_by = $3, decided_at = now(), updated_at = now()`,
      [u.rows[0].id, b.partyAcId, req.userId]);
    const p = pc.rows[0];
    await audit({ actor: req.userId, role: 'super_admin', action: 'admin.add', partyId: p.party_id, stateCode: p.state_code, acNo: p.ac_no, entity: 'user', entityId: u.rows[0].id });
    return { userId: u.rows[0].id };
  });

  app.get('/v1/admin/admins', async () => {
    const r = await core.query<{ user_id: string; name: string; mobile: string; party_name: string; state_code: string; ac_no: number; ac_name: string; party_ac_id: string }>(
      `SELECT u.id AS user_id, u.name, u.mobile, p.name AS party_name, trim(pc.state_code) AS state_code, pc.ac_no, pc.ac_name, pc.id AS party_ac_id
         FROM memberships m JOIN users u ON u.id = m.user_id JOIN party_constituencies pc ON pc.id = m.party_constituency_id JOIN parties p ON p.id = pc.party_id
        WHERE m.role = 'admin' AND m.status = 'approved' ORDER BY p.name, pc.ac_no, u.name`);
    return r.rows.map((x) => ({ userId: x.user_id, name: x.name, mobile: x.mobile, partyName: x.party_name, stateCode: x.state_code, acNo: x.ac_no, acName: x.ac_name, partyAcId: x.party_ac_id }));
  });

  // ---------- Super-admins ----------
  app.get('/v1/admin/super-admins', async () => {
    const r = await core.query<{ user_id: string; name: string; mobile: string | null; email: string | null; created_at: Date }>(
      `SELECT u.id AS user_id, u.name, u.mobile, u.email, pa.created_at FROM platform_admins pa JOIN users u ON u.id = pa.user_id WHERE pa.revoked_at IS NULL ORDER BY pa.created_at`);
    return r.rows.map((x) => ({ userId: x.user_id, name: x.name, mobile: x.mobile, email: x.email, since: x.created_at }));
  });

  app.post('/v1/admin/super-admins', async (req) => {
    const b = parse(z.object({ mobile: Mobile.optional(), email: Email.optional(), name: z.string().trim().min(2).max(80) }), req.body);
    const u = { rows: [{ id: await personFor(b) }] };
    await core.query(`INSERT INTO platform_admins (user_id, created_by) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET revoked_at = NULL, created_by = $2`, [u.rows[0].id, req.userId]);
    await audit({ actor: req.userId, role: 'super_admin', action: 'superadmin.add', entity: 'user', entityId: u.rows[0].id });
    return { userId: u.rows[0].id };
  });

  app.delete('/v1/admin/super-admins/:userId', async (req) => {
    const { userId } = parse(z.object({ userId: Uuid }), req.params);
    const active = await core.query<{ n: number }>('SELECT count(*)::int AS n FROM platform_admins WHERE revoked_at IS NULL');
    if (active.rows[0].n <= 1) throw invalid('last_super_admin', 'At least one super-admin must remain.');
    const r = await core.query('UPDATE platform_admins SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
    if (!r.rowCount) throw notFound();
    await audit({ actor: req.userId, role: 'super_admin', action: 'superadmin.remove', entity: 'user', entityId: userId });
    return { ok: true };
  });

  // ---------- Roll upload ----------
  app.post('/v1/admin/imports', async (req) => {
    const file = await req.file({ limits: { fileSize: 60 * 1024 * 1024 } });
    if (!file) throw invalid('file_missing', 'Choose a CSV or XLSX file.');
    if (!/\.(csv|xlsx)$/i.test(file.filename)) throw invalid('file_type', 'Only .csv or .xlsx files.');
    const buf = await file.toBuffer();
    const fields = Object.fromEntries(Object.entries(file.fields).map(([k, v]) => [k, (v as { value?: string }).value]));
    const b = parse(z.object({
      stateCode: State, acNo: z.coerce.number().int().min(1).max(999), acName: z.string().trim().max(80).optional(), acNameLocal: z.string().trim().max(80).optional(),
      rollKind: z.enum(['draft', 'final', 'supplement']).optional(), publishedOn: DateStr.optional(),
    }), fields);
    const jobId = await stageImport({ ...b, fileName: file.filename, buf, userId: req.userId });
    await audit({ actor: req.userId, role: 'super_admin', action: 'import.upload', stateCode: b.stateCode, acNo: b.acNo, entity: 'import', entityId: jobId, details: { bytes: buf.length } });
    return { jobId, stateCode: b.stateCode };
  });

  app.get('/v1/admin/imports', async (req) => {
    const q = parse(z.object({ state: State }), req.query);
    const pool = await statePool(q.state);
    const r = await pool.query(`SELECT id, ac_no, file_name, status, rows_total, rows_ok, rows_failed, message, created_at, finished_at FROM import_jobs ORDER BY created_at DESC LIMIT 50`);
    return r.rows;
  });

  app.get('/v1/admin/imports/:id', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const q = parse(z.object({ state: State }), req.query);
    const pool = await statePool(q.state);
    const job = await pool.query<Record<string, unknown> & { summary: ({ lists?: Record<string, unknown> } & Record<string, unknown>) | null }>(
      `SELECT id, ac_no, ac_name, file_name, status, rows_total, rows_ok, rows_failed, message, created_at, finished_at, roll_kind,
              to_char(published_on, 'YYYY-MM-DD') AS published_on, summary FROM import_jobs WHERE id = $1`, [id]);
    if (!job.rowCount) throw notFound();
    const errors = await pool.query<{ row_no: number; error: string }>('SELECT row_no, error FROM import_staging WHERE job_id = $1 AND error IS NOT NULL ORDER BY row_no LIMIT 100', [id]);
    const { summary, ...rest } = job.rows[0];
    const { lists, ...counts } = summary ?? {};
    // U3/U7: counts, lists, and the held rows with the decisions taken so far.
    return {
      ...rest, summary: summary ? counts : null, lists: summary ? { ...lists, held: await heldRows(pool, id) } : null,
      errors: errors.rows.map((e) => ({ row: e.row_no, error: e.error })),
    };
  });

  app.post('/v1/admin/imports/:id/confirm', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const q = parse(z.object({ state: State }), req.query);
    const pool = await statePool(q.state);
    const job = await pool.query<{ status: string; ac_no: number }>('SELECT status, ac_no FROM import_jobs WHERE id = $1', [id]);
    if (!job.rowCount) throw notFound();
    if (job.rows[0].status !== 'ready') throw invalid('not_ready', 'This upload is not ready to merge.');
    const open = await pool.query('SELECT 1 FROM import_held WHERE job_id = $1 AND decision IS NULL LIMIT 1', [id]);
    if (open.rowCount) throw invalid('held_undecided', 'Choose Move or Reject for every voter that belongs to another assembly.');
    await audit({ actor: req.userId, role: 'super_admin', action: 'import.confirm', stateCode: q.state, acNo: job.rows[0].ac_no, entity: 'import', entityId: id });
    const work = mergeImport(q.state, id);
    if (env.NODE_ENV === 'test') await work; // background in dev/prod; awaited in tests
    return { ok: true, status: 'merging' };
  });

  /** U3: cancel a checked upload; nothing changes. */
  app.post('/v1/admin/imports/:id/cancel', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const q = parse(z.object({ state: State }), req.query);
    const pool = await statePool(q.state);
    const r = await pool.query<{ ac_no: number }>(`UPDATE import_jobs SET status = 'cancelled', finished_at = now() WHERE id = $1 AND status IN ('ready','failed') RETURNING ac_no`, [id]);
    if (!r.rowCount) throw invalid('not_cancellable', 'This upload can no longer be cancelled.');
    await pool.query('DELETE FROM import_staging WHERE job_id = $1', [id]);
    await audit({ actor: req.userId, role: 'super_admin', action: 'import.cancel', stateCode: q.state, acNo: r.rows[0].ac_no, entity: 'import', entityId: id });
    return { ok: true };
  });

  /** U7: Move or Reject for rows whose EPIC belongs to another assembly. */
  app.post('/v1/admin/imports/:id/held', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const q = parse(z.object({ state: State }), req.query);
    const b = parse(z.union([
      z.object({ all: z.enum(['move', 'reject']) }),
      z.object({ decisions: z.array(z.object({ rowNo: z.number().int().min(1), decision: z.enum(['move', 'reject']) })).min(1).max(5000) }),
    ]), req.body);
    const pool = await statePool(q.state);
    const job = await pool.query<{ status: string }>('SELECT status FROM import_jobs WHERE id = $1', [id]);
    if (!job.rowCount) throw notFound();
    if (job.rows[0].status !== 'ready') throw invalid('not_ready', 'This upload is not waiting for a decision.');
    if ('all' in b) await pool.query('UPDATE import_held SET decision = $2 WHERE job_id = $1', [id, b.all]);
    else await pool.query(
      `UPDATE import_held h SET decision = x.decision FROM jsonb_to_recordset($2::jsonb) AS x(row_no int, decision text) WHERE h.job_id = $1 AND h.row_no = x.row_no`,
      [id, JSON.stringify(b.decisions.map((d) => ({ row_no: d.rowNo, decision: d.decision })))]);
    return { held: await heldRows(pool, id) };
  });
}
