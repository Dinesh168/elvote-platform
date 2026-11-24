/** Polling day (spec docs/specs/polling-day.md): volunteer reports, the admin page and alerts, super-admin elections and booth locations. */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { allStateCodes, core, inParty, statePool } from '../db/pools.js';
import { audit, requireFeature, requireMembership } from '../lib/access.js';
import { currentElectionId } from '../lib/stats.js';
import { conflict, invalid, notFound, tooMany } from '../lib/errors.js';
import { DateStr, parse, PartNo, Uuid } from '../lib/http.js';
import { alerts, customerOf, ELECTION_COLS, markSeen, pollingView, report, toElection } from '../lib/presence.js';

const Mid = z.object({ mid: Uuid });
const State = z.string().regex(/^[A-Z]{2}$/);
const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a time like 07:00');
const Lat = z.number().min(6).max(38);
const Lng = z.number().min(68).max(98);

/** Volunteer and admin routes (scoped by membership). */
/**
 * spec security-fixes SF2: polling-day find shows the whole assembly, so one person may look up at most
 * FIND_PER_MIN times a minute (enough to serve a queue, too slow to copy the roll). Per API process.
 */
const FIND_PER_MIN = 30;
const finds = new Map<string, { n: number; at: number }>();
export function limitFind(userId: string) {
  const now = Date.now();
  const h = finds.get(userId);
  if (!h || now - h.at > 60_000) {
    if (finds.size > 50_000) finds.clear();
    finds.set(userId, { n: 1, at: now });
    return;
  }
  if (++h.n > FIND_PER_MIN) throw tooMany('find_rate', 'Too many searches. Wait a minute and try again.');
}

export async function pollingRoutes(app: FastifyInstance) {
  /** V2: the phone reports permission and, when allowed, its position. */
  app.post('/v1/m/:mid/presence', async (req) => {
    const { mid } = parse(Mid, req.params);
    const b = parse(z.object({
      permission: z.enum(['granted', 'foreground', 'denied', 'off']),
      lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional(),
      accuracy: z.number().min(0).max(100_000).optional(), at: z.string().datetime(), background: z.boolean().optional(),
    }), req.body);
    const m = await requireMembership(req.userId, mid);
    // Phone clocks in the future count as now (same rule as sync-modes SD4).
    const at = new Date(Math.min(Date.parse(b.at), Date.now() + 5 * 60_000));
    return report(m, { permission: b.permission, lat: b.lat, lng: b.lng, accuracy: b.accuracy, at }, (e) => req.log.warn({ err: e.message }, 'push failed'));
  });

  /**
   * spec flow-fixes P1: polling day: find any voter of the assembly by EPIC, or booth + S.No. Other booths show only what is
   * needed to mark Voted (no group, phone or notes).
   */
  app.get('/v1/m/:mid/polling/find', async (req) => {
    const { mid } = parse(Mid, req.params);
    const q = parse(z.object({
      q: z.string().trim().min(1).max(60).optional(),
      epic: z.string().trim().toUpperCase().min(4).max(20).optional(),
      part: PartNo.optional(),
      sno: z.coerce.number().int().min(1).max(9999).optional(),
    }).refine((x) => !!x.q || !!x.epic || (x.part != null && x.sno != null), { message: 'Type an EPIC number, a name or a serial number.' }), req.query);
    // spec admin-views P1: one box. Digits = S.No in every booth; letters + digits = EPIC; otherwise a name (English or regional).
    let mode: 'epic' | 'sno' | 'name' | 'partsno' = q.epic ? 'epic' : 'partsno';
    let term: string | number | null = q.epic ?? null;
    if (q.q) {
      const x = q.q.trim();
      if (/^\d{1,4}$/.test(x)) { mode = 'sno'; term = Number(x); }
      else if (/^[A-Za-z]{2,4}\/?\d{4,10}$/.test(x.replace(/\s/g, ''))) { mode = 'epic'; term = x.replace(/\s/g, '').toUpperCase(); }
      else if (x.length >= 2) { mode = 'name'; term = `%${x.replace(/[%_\\]/g, (ch) => `\\${ch}`)}%`; }
      else throw invalid('find_query', 'Type at least 2 letters of the name.');
    }
    const m = await requireMembership(req.userId, mid);
    requireFeature(m, 'poll');
    limitFind(req.userId);
    const pool = await statePool(m.stateCode);
    return inParty(pool, m.partyId, async (c) => {
      const el = await currentElectionId(c);
      const r = await c.query<{ id: string; sno: number; part_no: number; name: string; name_local: string | null; relation: string | null; relative_name: string | null; age: number | null; gender: string | null; booth_name: string; voted: boolean }>(
        `SELECT v.id::text, v.sno, v.part_no, v.name, v.name_local, v.relation, v.relative_name, v.age, v.gender, b.name AS booth_name,
                EXISTS (SELECT 1 FROM poll_marks pm WHERE pm.election_id = $2 AND pm.ac_no = v.ac_no AND pm.voter_id = v.id AND pm.undone_at IS NULL) AS voted
           FROM voters v JOIN booths b ON b.id = v.booth_id
          WHERE v.ac_no = $1 AND v.status IN ('active','added')
            AND CASE $3::text
                  WHEN 'epic' THEN v.epic = $4
                  WHEN 'sno' THEN v.sno = $5::int
                  WHEN 'name' THEN (v.name ILIKE $4 OR v.name_local ILIKE $4)
                  ELSE v.part_no = $6 AND v.sno = $5::int END
          ORDER BY v.part_no, v.sno LIMIT 50`,
        [m.acNo, el ?? '00000000-0000-0000-0000-000000000000', mode, typeof term === 'string' ? term : null,
         mode === 'sno' ? term : q.sno ?? null, q.part ?? null]);
      return {
        items: r.rows.map((v) => ({
          id: v.id, sno: v.sno, part: v.part_no, boothName: v.booth_name, name: v.name, nameLocal: v.name_local, relation: v.relation,
          relative: v.relative_name, age: v.age, gender: v.gender, voted: v.voted, own: m.role === 'admin' || m.booths.includes(v.part_no),
        })),
      };
    });
  });

  /** A2: the admin's polling-day page. */
  app.get('/v1/m/:mid/polling', async (req) => {
    const { mid } = parse(Mid, req.params);
    const m = await requireMembership(req.userId, mid, 'admin');
    return pollingView({ id: m.partyAcId, stateCode: m.stateCode, acNo: m.acNo, radiusM: m.boothRadiusM }, m.id);
  });

  /** A1: alert list with the unseen count. */
  app.get('/v1/m/:mid/polling/alerts', async (req) => {
    const { mid } = parse(Mid, req.params);
    const m = await requireMembership(req.userId, mid, 'admin');
    return alerts(m.partyAcId, m.id);
  });
  app.post('/v1/m/:mid/polling/alerts/seen', async (req) => {
    const { mid } = parse(Mid, req.params);
    const m = await requireMembership(req.userId, mid, 'admin');
    await markSeen(m.id);
    return { ok: true };
  });
}

const ElectionBody = z.object({
  kind: z.enum(['assembly', 'parliament', 'local', 'bye']),
  name: z.string().trim().min(3).max(80),
  pollDate: DateStr,
  acNos: z.array(z.number().int().min(1).max(999)).min(1).max(500).nullable(),
  opensAt: Time,
  closesAt: Time,
  status: z.enum(['upcoming', 'polling', 'done', 'cancelled']),
});
const todayIst = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

async function checkElection(stateCode: string, e: { pollDate: string; acNos: number[] | null; opensAt: string; closesAt: string; status: string }, selfId?: string) {
  if (e.closesAt <= e.opensAt) throw invalid('window_invalid', 'Voting must close after it opens.');
  const pool = await statePool(stateCode);
  if (e.acNos) {
    const r = await pool.query<{ ac_no: number }>('SELECT ac_no FROM assembly_constituencies WHERE ac_no = ANY($1)', [e.acNos]);
    const known = new Set(r.rows.map((x) => x.ac_no));
    const bad = e.acNos.filter((n) => !known.has(n));
    if (bad.length) throw invalid('ac_unknown', `No assembly ${bad.join(', ')} in this state.`);
  }
  if (e.status === 'cancelled') return;
  const c = await pool.query<{ name: string }>(
    `SELECT name FROM elections WHERE poll_date = $1 AND status <> 'cancelled' AND ($2::uuid IS NULL OR id <> $2::uuid)
        AND (ac_nos IS NULL OR $3::smallint[] IS NULL OR ac_nos && $3::smallint[]) LIMIT 1`,
    [e.pollDate, selfId ?? null, e.acNos]);
  if (c.rowCount) throw conflict('election_clash', `“${c.rows[0].name}” is already on this date for these assemblies.`);
}

/** Super-admin routes (registered inside platformRoutes, so the super-admin check already ran). */
export async function pollingAdminRoutes(app: FastifyInstance) {
  // ---------- S1 elections ----------
  app.get('/v1/admin/elections', async () => {
    const codes = await allStateCodes();
    const names = new Map((await core.query<{ code: string; name: string }>('SELECT trim(code) AS code, name FROM states')).rows.map((x) => [x.code, x.name]));
    const out = [];
    for (const code of codes) {
      const pool = await statePool(code);
      const r = await pool.query(`SELECT ${ELECTION_COLS} FROM elections ORDER BY poll_date DESC`);
      out.push(...r.rows.map((x) => ({ ...toElection(x), stateCode: code, stateName: names.get(code) ?? code })));
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  });

  app.post('/v1/admin/elections', async (req) => {
    const b = parse(ElectionBody.omit({ status: true }).extend({ stateCode: State }), req.body);
    if (!(await allStateCodes()).includes(b.stateCode)) throw invalid('state_unknown', 'Unknown state.');
    if (b.pollDate < todayIst()) throw invalid('date_past', 'The poll date is in the past.');
    await checkElection(b.stateCode, { ...b, status: 'upcoming' });
    const pool = await statePool(b.stateCode);
    const r = await pool.query<{ id: string }>(
      `INSERT INTO elections (kind, name, poll_date, ac_nos, opens_at, closes_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [b.kind, b.name, b.pollDate, b.acNos, b.opensAt, b.closesAt]);
    await audit({ actor: req.userId, role: 'super_admin', action: 'election.create', stateCode: b.stateCode, entity: 'election', entityId: r.rows[0].id, details: { pollDate: b.pollDate } });
    return { id: r.rows[0].id };
  });

  app.patch('/v1/admin/elections/:state/:id', async (req) => {
    const p = parse(z.object({ state: State, id: Uuid }), req.params);
    const b = parse(ElectionBody.partial().strict(), req.body);
    if (!(await allStateCodes()).includes(p.state)) throw notFound();
    const pool = await statePool(p.state);
    const cur = await pool.query(`SELECT ${ELECTION_COLS} FROM elections WHERE id = $1`, [p.id]);
    if (!cur.rowCount) throw notFound();
    const e = toElection(cur.rows[0]);
    const next = { pollDate: b.pollDate ?? e.date, acNos: b.acNos !== undefined ? b.acNos : e.acNos, opensAt: b.opensAt ?? e.opensAt, closesAt: b.closesAt ?? e.closesAt, status: b.status ?? e.status };
    if (b.pollDate && b.pollDate !== e.date && b.pollDate < todayIst()) throw invalid('date_past', 'The poll date is in the past.');
    await checkElection(p.state, next, p.id);
    await pool.query(
      `UPDATE elections SET kind = $2, name = $3, poll_date = $4, ac_nos = $5, opens_at = $6, closes_at = $7, status = $8, updated_at = now() WHERE id = $1`,
      [p.id, b.kind ?? e.kind, b.name ?? e.name, next.pollDate, next.acNos, next.opensAt, next.closesAt, next.status]);
    await audit({ actor: req.userId, role: 'super_admin', action: 'election.update', stateCode: p.state, entity: 'election', entityId: p.id, details: { fields: Object.keys(b) } });
    const r = await pool.query(`SELECT ${ELECTION_COLS} FROM elections WHERE id = $1`, [p.id]);
    return { ...toElection(r.rows[0]), stateCode: p.state };
  });

  // ---------- S2 booth locations ----------
  app.get('/v1/admin/booths', async (req) => {
    const q = parse(z.object({ state: State, ac: z.coerce.number().int().min(1).max(999), missing: z.enum(['0', '1']).optional() }), req.query);
    if (!(await allStateCodes()).includes(q.state)) throw notFound();
    const pool = await statePool(q.state);
    const r = await pool.query<{ part_no: number; name: string; locality: string | null; area: string | null; lat: string | null; lng: string | null; location_source: string | null }>(
      `SELECT part_no, name, locality, area, lat, lng, location_source FROM booths WHERE ac_no = $1 AND deleted_at IS NULL ORDER BY part_no`, [q.ac]);
    const all = r.rows.map((x) => ({ no: x.part_no, name: x.name, locality: x.locality, area: x.area, lat: x.lat != null ? Number(x.lat) : null, lng: x.lng != null ? Number(x.lng) : null, source: x.location_source }));
    const missing = all.filter((x) => x.lat == null || x.lng == null);
    return { items: q.missing === '1' ? missing : all, total: all.length, missing: missing.length };
  });

  app.patch('/v1/admin/booths/:state/:ac/:no', async (req) => {
    const p = parse(z.object({ state: State, ac: z.coerce.number().int().min(1).max(999), no: PartNo }), req.params);
    const b = parse(z.union([z.object({ lat: Lat, lng: Lng }), z.object({ lat: z.null(), lng: z.null() })]), req.body);
    if (!(await allStateCodes()).includes(p.state)) throw notFound();
    const pool = await statePool(p.state);
    const r = await pool.query(
      `UPDATE booths SET lat = $3, lng = $4, location_source = CASE WHEN $3::numeric IS NULL THEN NULL ELSE 'edited' END, location_set_by = $5, updated_at = now()
        WHERE ac_no = $1 AND part_no = $2 AND deleted_at IS NULL`, [p.ac, p.no, b.lat, b.lng, req.userId]);
    if (!r.rowCount) throw notFound();
    return { ok: true };
  });

  /** Bulk: rows from a CSV `part_no,lat,lng`. dryRun = check only. Bad rows are reported by line; good rows are saved. */
  app.post('/v1/admin/booths/locations', async (req) => {
    const b = parse(z.object({
      stateCode: State, acNo: z.number().int().min(1).max(999), dryRun: z.boolean(),
      rows: z.array(z.object({ no: z.number(), lat: z.number(), lng: z.number() })).min(1).max(5000),
    }), req.body);
    if (!(await allStateCodes()).includes(b.stateCode)) throw invalid('state_unknown', 'Unknown state.');
    const pool = await statePool(b.stateCode);
    const known = new Set((await pool.query<{ part_no: number }>('SELECT part_no FROM booths WHERE ac_no = $1 AND deleted_at IS NULL', [b.acNo])).rows.map((x) => x.part_no));
    const errors: { line: number; no: number; error: 'booth_unknown' | 'out_of_range' }[] = [];
    const good: { no: number; lat: number; lng: number }[] = [];
    b.rows.forEach((x, i) => {
      if (!known.has(x.no)) errors.push({ line: i + 1, no: x.no, error: 'booth_unknown' });
      else if (!Lat.safeParse(x.lat).success || !Lng.safeParse(x.lng).success) errors.push({ line: i + 1, no: x.no, error: 'out_of_range' });
      else good.push(x);
    });
    if (b.dryRun || !good.length) return { ok: good.length, errors, saved: 0 };
    await pool.query(
      `UPDATE booths b SET lat = x.lat, lng = x.lng, location_source = 'edited', location_set_by = $3, updated_at = now()
         FROM jsonb_to_recordset($2::jsonb) AS x(no int, lat numeric, lng numeric)
        WHERE b.ac_no = $1 AND b.part_no = x.no AND b.deleted_at IS NULL`, [b.acNo, JSON.stringify(good), req.userId]);
    await audit({ actor: req.userId, role: 'super_admin', action: 'booths.locations', stateCode: b.stateCode, acNo: b.acNo, details: { saved: good.length } });
    return { ok: good.length, errors, saved: good.length };
  });

  // ---------- A2 for the super-admin ----------
  app.get('/v1/admin/customers/:id/polling', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    return pollingView(await customerOf(id).catch(() => { throw notFound(); }));
  });
}
