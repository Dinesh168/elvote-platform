/** Party admin routes (one party × AC). Every number comes from the pre-computed counters. */
import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { z } from 'zod';
import { approveVolunteer, rejectVolunteer } from '../lib/members.js';
import { core, inParty, statePool } from '../db/pools.js';
import { traceVoter } from '../lib/trace.js';
import { actorRole, audit, checkLimit, requireFeature, requireMembership, type FeatureKey, type Membership } from '../lib/access.js';
import { sha256 } from '../lib/auth.js';
import { saveImage } from '../lib/images.js';
import { invalid, notFound } from '../lib/errors.js';
import { DateStr, parse, PartNo, Uuid } from '../lib/http.js';
import { DRIVE_NAMES, DRIVE_SEGMENTS, segmentSql, type Segment } from '../lib/voters.js';
import { areaYear, autoStrength, loadAc, pickParty } from '../lib/pastResults.js';
import { teamParty } from './results.js';

const Mid = z.object({ mid: Uuid });
const COUNTER_COLS = ['total', 'met', 'our', 'target', 'opp', 'moved', 'with_mobile', 'our_mobile', 'target_mobile', 'opp_mobile', 'houses', 'houses_visited',
  'houses_with_mobile', 'our_houses', 'target_houses', 'opp_houses', 'first_time', 'young', 'mid', 'senior', 'male', 'female', 'third', 'help_needed',
  'voted', 'our_voted', 'target_voted', 'opp_voted', 'help_voted', 'died', 'not_found'] as const;
type Counters = Record<(typeof COUNTER_COLS)[number], number>;
const SUMS = COUNTER_COLS.map((c) => `COALESCE(sum(s.${c}), 0)::int AS ${c}`).join(', ');
const camel = (s: string) => s.replace(/_([a-z])/g, (_, x: string) => x.toUpperCase());
const toCamel = (c: Counters) => Object.fromEntries(Object.entries(c).map(([k, v]) => [camel(k), v]));

async function admin(req: { userId: string; params: unknown }, feature?: FeatureKey) {
  const { mid } = parse(Mid, req.params);
  const m = await requireMembership(req.userId, mid, 'admin');
  if (feature) requireFeature(m, feature);
  return { m, pool: await statePool(m.stateCode) };
}

/** Booth filter for a dashboard scope (zone or single booth) → SQL on alias `s` (stats_booth). */
function scopeSql(params: unknown[], zone?: string, booth?: number, area?: string) {
  let sql = '';
  if (zone) { params.push(zone); sql += ` AND s.booth_id IN (SELECT booth_id FROM zone_booths WHERE zone_id = $${params.length})`; }
  // spec easy-redesign B2: area (tehsil / ward) set by the super-admin per booth
  if (area) { params.push(area); sql += ` AND s.booth_id IN (SELECT id FROM booths WHERE area = $${params.length})`; }
  if (booth) { params.push(booth); sql += ` AND s.part_no = $${params.length}`; }
  return sql;
}

/** Worked-out strength per booth for this team (spec real-demo-data B3); an admin's own setting overrides it. */
async function strengthOf(pool: pg.Pool, m: Membership) {
  const res = await loadAc(pool, m.acNo);
  const party = pickParty(res, undefined, await teamParty(m));
  const auto = autoStrength(res, party, m.resultMargin);
  const fn = (part: number, set: string | null) => (set ? { strength: set, strengthSource: 'admin' as const } : { strength: auto.get(part) ?? 'M', strengthSource: 'auto' as const });
  // spec map-results M3: last election per booth for this team's party (year, our %, main rival, margin, votes).
  const year = [...res.keys()].sort((a, b) => a - b).at(-1);
  const last = new Map<number, { year: number; party: string; ours: number; oursVotes: number; rival: string | null; rivalPct: number; rivalVotes: number; margin: number }>();
  if (party && year) {
    for (const b of res.get(year)!.values()) {
      const a = areaYear([b], party);
      const rival = Object.entries(a.votes).filter(([k]) => k !== party).sort((x, y) => y[1] - x[1])[0];
      last.set(b.part, { year, party, ours: a.ours, oursVotes: a.oursVotes, rival: rival?.[0] ?? null, rivalPct: rival ? a.shares[rival[0]] ?? 0 : 0, rivalVotes: a.rivalVotes, margin: a.margin });
    }
  }
  return Object.assign(fn, { auto, last });
}

/** spec booth-map M4: volunteers per booth with the first one's name and mobile (the admin calls them from the map). */
async function volunteersByBooth(m: Membership): Promise<Map<number, { n: number; name: string; mobile: string | null }>> {
  const r = await core.query<{ part_no: number; n: number; name: string; mobile: string | null }>(
    `SELECT DISTINCT ON (mb.part_no) mb.part_no, count(*) OVER (PARTITION BY mb.part_no)::int AS n, u.name, u.mobile
       FROM memberships ms JOIN membership_booths mb ON mb.membership_id = ms.id JOIN users u ON u.id = ms.user_id
      WHERE ms.party_constituency_id = $1 AND ms.status = 'approved' AND ms.role = 'volunteer'
      ORDER BY mb.part_no, ms.created_at`,
    [m.partyAcId],
  );
  return new Map(r.rows.map((x) => [x.part_no, { n: x.n, name: x.name, mobile: x.mobile }]));
}

async function workersByBooth(m: Membership): Promise<Map<number, number>> {
  const r = await core.query<{ part_no: number; n: number }>(
    `SELECT mb.part_no, count(*)::int AS n FROM memberships ms JOIN membership_booths mb ON mb.membership_id = ms.id
      WHERE ms.party_constituency_id = $1 AND ms.status = 'approved' AND ms.role = 'volunteer' GROUP BY mb.part_no`,
    [m.partyAcId],
  );
  return new Map(r.rows.map((x) => [x.part_no, x.n]));
}

export async function adminRoutes(app: FastifyInstance) {
  app.get('/v1/m/:mid/dashboard', async (req) => {
    const { m, pool } = await admin(req);
    const q = parse(z.object({ zone: Uuid.optional(), booth: PartNo.optional(), area: z.string().trim().min(1).max(80).optional() }), req.query);
    const workers = await workersByBooth(m);
    const sOf = await strengthOf(pool, m);
    return inParty(pool, m.partyId, async (c) => {
      const params: unknown[] = [m.partyId, m.acNo];
      const scope = scopeSql(params, q.zone, q.booth, q.area);
      const tot = (await c.query<Counters>(`SELECT ${SUMS} FROM stats_booth s WHERE s.party_id = $1 AND s.ac_no = $2${scope}`, params)).rows[0];

      const booths = await c.query<{ part_no: number; strength: string | null; total: number; met: number }>(
        `SELECT s.part_no, bp.strength, s.total, s.met FROM stats_booth s LEFT JOIN booth_party_info bp ON bp.party_id = s.party_id AND bp.booth_id = s.booth_id
          WHERE s.party_id = $1 AND s.ac_no = $2${scope}`, params);
      const strength = { S: 0, M: 0, W: 0 };
      let withWorker = 0;
      for (const b of booths.rows) {
        strength[sOf(b.part_no, b.strength).strength as 'S' | 'M' | 'W']++;
        if (workers.get(b.part_no)) withWorker++;
      }

      const zones = await c.query<{ id: string; number: number; name: string; total: number; met: number; booths: number }>(
        `SELECT z.id, z.number, z.name, COALESCE(sum(s.total), 0)::int AS total, COALESCE(sum(s.met), 0)::int AS met, count(s.booth_id)::int AS booths
           FROM zones z LEFT JOIN zone_booths zb ON zb.zone_id = z.id
           LEFT JOIN stats_booth s ON s.party_id = z.party_id AND s.booth_id = zb.booth_id
          WHERE z.party_id = $1 AND z.ac_no = $2 GROUP BY z.id ORDER BY z.number`, [m.partyId, m.acNo]);

      const tParams: unknown[] = [m.partyId, m.acNo];
      const tScope = scopeSql(tParams, q.zone, q.booth, q.area).replaceAll('s.part_no', 'b.part_no').replaceAll('s.booth_id', 'b.id');
      const trend = await c.query<{ day: string; contacted: number }>(
        `SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COALESCE(sum(s.contacted), 0)::int AS contacted
           FROM generate_series(current_date - 6, current_date, interval '1 day') AS d(day)
           LEFT JOIN (stats_booth_daily s JOIN booths b ON b.id = s.booth_id) ON s.day = d.day::date AND s.party_id = $1 AND s.ac_no = $2${tScope}
          GROUP BY d.day ORDER BY d.day`, tParams);

      const top = await c.query<{ user_id: string; contacted: number; today: number }>(
        `SELECT user_id, count(DISTINCT voter_id)::int AS contacted,
                count(DISTINCT voter_id) FILTER (WHERE at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')::int AS today
           FROM contact_events WHERE party_id = $1 AND ac_no = $2 AND at > now() - interval '30 days'
          GROUP BY user_id ORDER BY contacted DESC LIMIT 10`, [m.partyId, m.acNo]);
      const names = await namesOf(top.rows.map((t) => t.user_id));

      // spec map-trend Y1: yesterday vs the day before (India time), and the best booth yesterday.
      const ist = `(at AT TIME ZONE 'Asia/Kolkata')::date`;
      const day0 = `(now() AT TIME ZONE 'Asia/Kolkata')::date`;
      const yd = await c.query<{ d: number; met: number; ours: number }>(
        `SELECT (${day0} - ${ist})::int AS d, count(DISTINCT voter_id)::int AS met, count(DISTINCT voter_id) FILTER (WHERE change->>'group' = 'our')::int AS ours
           FROM contact_events WHERE party_id = $1 AND ac_no = $2 AND at > now() - interval '3 days' AND (${day0} - ${ist}) IN (1, 2) GROUP BY 1`, [m.partyId, m.acNo]);
      const best = await c.query<{ part_no: number; n: number }>(
        `SELECT part_no, count(DISTINCT voter_id)::int AS n FROM contact_events
          WHERE party_id = $1 AND ac_no = $2 AND at > now() - interval '3 days' AND (${day0} - ${ist}) = 1 GROUP BY part_no ORDER BY 2 DESC, 1 LIMIT 1`, [m.partyId, m.acNo]);
      const y1 = yd.rows.find((x) => x.d === 1) ?? { met: 0, ours: 0 };
      const y2 = yd.rows.find((x) => x.d === 2) ?? { met: 0, ours: 0 };
      const change = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);
      // Quiet volunteers: approved, no meeting for 3 days or more (or never).
      const vols = await core.query<{ user_id: string; name: string; booths: number[] }>(
        `SELECT ms.user_id, u.name, COALESCE(array_agg(mb.part_no ORDER BY mb.part_no) FILTER (WHERE mb.part_no IS NOT NULL), '{}') AS booths
           FROM memberships ms JOIN users u ON u.id = ms.user_id LEFT JOIN membership_booths mb ON mb.membership_id = ms.id AND NOT mb.requested
          WHERE ms.party_constituency_id = $1 AND ms.role = 'volunteer' AND ms.status = 'approved' GROUP BY ms.user_id, u.name`, [m.partyAcId]);
      const lastAt = await c.query<{ user_id: string; last: Date }>(
        `SELECT user_id, max(at) AS last FROM contact_events WHERE party_id = $1 AND ac_no = $2 AND user_id = ANY($3::uuid[]) GROUP BY user_id`,
        [m.partyId, m.acNo, vols.rows.map((v) => v.user_id)]);
      const lastOf = new Map(lastAt.rows.map((x) => [x.user_id, x.last]));
      const quiet = vols.rows
        .map((v) => { const l = lastOf.get(v.user_id); return { userId: v.user_id, name: v.name, booths: v.booths, days: l ? Math.floor((Date.now() - l.getTime()) / 86_400_000) : null }; })
        .filter((v) => v.days === null || v.days >= 3)
        .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999));

      const today = trend.rows.at(-1)?.contacted ?? 0;
      return {
        yesterday: { met: y1.met, metChange: change(y1.met, y2.met), ours: y1.ours, oursChange: change(y1.ours, y2.ours), bestBooth: best.rows[0]?.part_no ?? null },
        quiet,
        scope: { zone: q.zone ?? null, booth: q.booth ?? null, acNo: m.acNo, acName: m.acName },
        visitedToday: today,
        totals: toCamel(tot),
        pollingStations: { total: booths.rowCount, strong: strength.S, moderate: strength.M, weak: strength.W, withWorker, withoutWorker: (booths.rowCount ?? 0) - withWorker },
        charts: {
          groups: { our: tot.our, target: tot.target, opp: tot.opp, notMet: tot.total - tot.met },
          ages: { firstTime: tot.first_time, young: tot.young, mid: tot.mid, senior: tot.senior },
          strength,
          houses: { our: tot.our_houses, target: tot.target_houses, opp: tot.opp_houses, notVisited: tot.houses - tot.houses_visited },
          zones: zones.rows.map((z) => ({ id: z.id, name: z.name, booths: z.booths, total: z.total, met: z.met, pct: z.total ? Math.round((z.met / z.total) * 1000) / 10 : 0 })),
          trend: trend.rows,
        },
        topWorkers: top.rows.map((t) => ({ userId: t.user_id, name: names.get(t.user_id) ?? '', contacted: t.contacted, today: t.today })),
      };
    });
  });

  /**
   * spec easy-redesign B2: every counter per booth (Complete data table, Compare booths, place pages) for the whole
   * assembly, a zone, an area or one booth, plus the 14-day work per booth and the team per booth.
   */
  app.get('/v1/m/:mid/booth-stats', async (req) => {
    const { m, pool } = await admin(req);
    const q = parse(z.object({ zone: Uuid.optional(), area: z.string().trim().min(1).max(80).optional(), booth: PartNo.optional() }), req.query);
    const team = await core.query<{ part_no: number; vols: number }>(
      `SELECT mb.part_no, count(DISTINCT ms.id)::int AS vols FROM memberships ms JOIN membership_booths mb ON mb.membership_id = ms.id
        WHERE ms.party_constituency_id = $1 AND ms.status = 'approved' AND ms.role = 'volunteer' AND NOT mb.requested GROUP BY mb.part_no`, [m.partyAcId]);
    const vols = new Map(team.rows.map((x) => [x.part_no, x.vols]));
    const sOf = await strengthOf(pool, m);
    return inParty(pool, m.partyId, async (c) => {
      const params: unknown[] = [m.partyId, m.acNo];
      const scope = scopeSql(params, q.zone, q.booth, q.area);
      const r = await c.query<Counters & { part_no: number; name: string; area: string | null; zone_id: string | null; zone: string | null; lat: string | null; lng: string | null }>(
        `SELECT s.*, b.name, b.area, b.lat, b.lng, z.id AS zone_id, z.name AS zone FROM stats_booth s JOIN booths b ON b.id = s.booth_id
           LEFT JOIN zone_booths zb ON zb.party_id = s.party_id AND zb.booth_id = s.booth_id LEFT JOIN zones z ON z.id = zb.zone_id
          WHERE s.party_id = $1 AND s.ac_no = $2${scope} ORDER BY s.part_no`, params);
      const dParams: unknown[] = [m.partyId, m.acNo];
      const dScope = scopeSql(dParams, q.zone, q.booth, q.area).replaceAll('s.part_no', 'b.part_no');
      const days = await c.query<{ part_no: number; day: string; contacted: number }>(
        `SELECT b.part_no, to_char(s.day, 'YYYY-MM-DD') AS day, s.contacted FROM stats_booth_daily s JOIN booths b ON b.id = s.booth_id
          WHERE s.party_id = $1 AND s.ac_no = $2 AND s.day > current_date - 14${dScope}`, dParams);
      const today = await c.query<{ part_no: number; n: number }>(
        `SELECT part_no, count(DISTINCT voter_id)::int AS n FROM contact_events WHERE party_id = $1 AND ac_no = $2
            AND at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata' GROUP BY part_no`, [m.partyId, m.acNo]);
      const todayOf = new Map(today.rows.map((x) => [x.part_no, x.n]));
      const out = r.rows.map((b) => {
        const counters = Object.fromEntries(COUNTER_COLS.map((k) => [camel(k), b[k]]));
        const last = sOf.last.get(b.part_no);
        return {
          no: b.part_no, name: b.name, area: b.area, zoneId: b.zone_id, zone: b.zone, lat: b.lat ? Number(b.lat) : null, lng: b.lng ? Number(b.lng) : null,
          ...counters, volunteers: vols.get(b.part_no) ?? 0, metToday: todayOf.get(b.part_no) ?? 0, lastMargin: last ? last.margin : null,
        };
      });
      return { booths: out, days: days.rows.map((d) => ({ booth: d.part_no, day: d.day, contacted: d.contacted })) };
    });
  });

  app.get('/v1/m/:mid/booth-table', async (req) => {
    const { m, pool } = await admin(req);
    const q = parse(z.object({ zone: Uuid.optional() }), req.query);
    const workers = await workersByBooth(m);
    const sOf = await strengthOf(pool, m);
    return inParty(pool, m.partyId, async (c) => {
      const params: unknown[] = [m.partyId, m.acNo];
      const scope = scopeSql(params, q.zone);
      const r = await c.query<Counters & { part_no: number; name: string; strength: string | null; zone: string | null; area: string | null; village: string | null }>(
        `SELECT s.*, b.name, b.area, b.locality AS village, bp.strength, z.name AS zone FROM stats_booth s JOIN booths b ON b.id = s.booth_id
           LEFT JOIN booth_party_info bp ON bp.party_id = s.party_id AND bp.booth_id = s.booth_id
           LEFT JOIN zone_booths zb ON zb.party_id = s.party_id AND zb.booth_id = s.booth_id LEFT JOIN zones z ON z.id = zb.zone_id
          WHERE s.party_id = $1 AND s.ac_no = $2${scope} ORDER BY s.part_no`, params);
      return r.rows.map((b) => ({
        no: b.part_no, name: b.name, zone: b.zone, area: b.area, village: b.village, ...sOf(b.part_no, b.strength), workers: workers.get(b.part_no) ?? 0,
        total: b.total, met: b.met, houses: b.houses, housesVisited: b.houses_visited, withMobile: b.with_mobile, our: b.our, target: b.target, opp: b.opp,
      }));
    });
  });

  app.put('/v1/m/:mid/booths/:no/strength', async (req) => {
    const { m, pool } = await admin(req);
    const { no } = parse(z.object({ mid: Uuid, no: PartNo }), req.params);
    const b = parse(z.object({ strength: z.enum(['S', 'M', 'W']) }), req.body);
    await inParty(pool, m.partyId, async (c) => {
      const booth = await c.query<{ id: string }>('SELECT id FROM booths WHERE ac_no = $1 AND part_no = $2', [m.acNo, no]);
      if (!booth.rowCount) throw notFound();
      await c.query(`INSERT INTO booth_party_info (party_id, booth_id, strength, updated_by) VALUES ($1,$2,$3,$4)
                     ON CONFLICT (party_id, booth_id) DO UPDATE SET strength = EXCLUDED.strength, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [m.partyId, booth.rows[0].id, b.strength, m.userId]);
    });
    return { ok: true };
  });

  /** spec real-demo-data B3: back to the worked-out strength. */
  app.delete('/v1/m/:mid/booths/:no/strength', async (req) => {
    const { m, pool } = await admin(req);
    const { no } = parse(z.object({ mid: Uuid, no: PartNo }), req.params);
    await inParty(pool, m.partyId, (c) => c.query(
      'DELETE FROM booth_party_info WHERE party_id = $1 AND booth_id IN (SELECT id FROM booths WHERE ac_no = $2 AND part_no = $3)', [m.partyId, m.acNo, no]));
    return { ok: true };
  });

  // ---------- Zones ----------
  app.get('/v1/m/:mid/zones', async (req) => {
    const { m, pool } = await admin(req, 'zones');
    return inParty(pool, m.partyId, async (c) => {
      const z = await c.query<{ id: string; number: number; name: string; booths: number[] | null }>(
        `SELECT z.id, z.number, z.name, array_agg(b.part_no ORDER BY b.part_no) FILTER (WHERE b.part_no IS NOT NULL) AS booths
           FROM zones z LEFT JOIN zone_booths zb ON zb.zone_id = z.id LEFT JOIN booths b ON b.id = zb.booth_id
          WHERE z.party_id = $1 AND z.ac_no = $2 GROUP BY z.id ORDER BY z.number`, [m.partyId, m.acNo]);
      const un = await c.query<{ part_no: number }>(
        `SELECT b.part_no FROM booths b WHERE b.ac_no = $2 AND b.deleted_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM zone_booths zb WHERE zb.party_id = $1 AND zb.booth_id = b.id) ORDER BY b.part_no`, [m.partyId, m.acNo]);
      // spec zones-easy Z2/Z3: every booth with name, village and zone (the tick list), and met / total per zone.
      const all = await c.query<{ part_no: number; name: string; village: string | null; zone_id: string | null; total: number; met: number }>(
        `SELECT b.part_no, b.name, b.locality AS village, zb.zone_id, COALESCE(s.total, 0) AS total, COALESCE(s.met, 0) AS met
           FROM booths b LEFT JOIN zone_booths zb ON zb.party_id = $1 AND zb.booth_id = b.id
           LEFT JOIN stats_booth s ON s.party_id = $1 AND s.booth_id = b.id
          WHERE b.ac_no = $2 AND b.deleted_at IS NULL ORDER BY b.part_no`, [m.partyId, m.acNo]);
      const sums = new Map<string, { total: number; met: number }>();
      for (const b of all.rows) if (b.zone_id) { const x = sums.get(b.zone_id) ?? { total: 0, met: 0 }; x.total += b.total; x.met += b.met; sums.set(b.zone_id, x); }
      return {
        maxZones: m.maxZones, zoneCount: m.zoneCount,
        zones: z.rows.map((x) => ({ ...x, booths: x.booths ?? [], total: sums.get(x.id)?.total ?? 0, met: sums.get(x.id)?.met ?? 0 })),
        unassigned: un.rows.map((x) => x.part_no),
        allBooths: all.rows.map((b) => ({ no: b.part_no, name: b.name, village: b.village, zoneId: b.zone_id })),
      };
    });
  });

  app.put('/v1/m/:mid/zones/count', async (req) => {
    const { m, pool } = await admin(req, 'zones');
    const { count } = parse(z.object({ count: z.number().int().min(1) }), req.body);
    if (count > m.maxZones) throw invalid('zones_over_max', `You can use at most ${m.maxZones} zones.`);
    await inParty(pool, m.partyId, async (c) => {
      await c.query('DELETE FROM zones WHERE party_id = $1 AND ac_no = $2 AND number > $3', [m.partyId, m.acNo, count]);
      for (let n = 1; n <= count; n++) {
        await c.query('INSERT INTO zones (party_id, ac_no, number, name) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [m.partyId, m.acNo, n, `Z${n}`]);
      }
    });
    await core.query('UPDATE party_constituencies SET zone_count = $2, updated_at = now() WHERE id = $1', [m.partyAcId, count]);
    await audit({ actor: m.userId, role: actorRole(m), action: 'zones.count', partyId: m.partyId, stateCode: m.stateCode, acNo: m.acNo, details: { from: m.zoneCount, to: count } });
    return { ok: true, zoneCount: count };
  });

  /** spec zones-easy Z1: split all booths into `count` zones of equal size, in booth-number order (replaces the zones). */
  app.post('/v1/m/:mid/zones/split', async (req) => {
    const { m, pool } = await admin(req, 'zones');
    const { count } = parse(z.object({ count: z.number().int().min(1).max(50) }), req.body);
    if (count > m.maxZones) throw invalid('zones_over_max', `You can use at most ${m.maxZones} zones.`);
    await inParty(pool, m.partyId, async (c) => {
      const old = await c.query<{ number: number; name: string }>('SELECT number, name FROM zones WHERE party_id = $1 AND ac_no = $2', [m.partyId, m.acNo]);
      const names = new Map(old.rows.map((x) => [x.number, x.name]));
      await c.query('DELETE FROM zone_booths WHERE party_id = $1 AND booth_id IN (SELECT id FROM booths WHERE ac_no = $2)', [m.partyId, m.acNo]);
      await c.query('DELETE FROM zones WHERE party_id = $1 AND ac_no = $2 AND number > $3', [m.partyId, m.acNo, count]);
      const ids: string[] = [];
      for (let n = 1; n <= count; n++) {
        const r = await c.query<{ id: string }>(
          `INSERT INTO zones (party_id, ac_no, number, name) VALUES ($1,$2,$3,$4)
           ON CONFLICT (party_id, ac_no, number) DO UPDATE SET name = zones.name RETURNING id`, [m.partyId, m.acNo, n, names.get(n) ?? `Z${n}`]);
        ids.push(r.rows[0].id);
      }
      const booths = await c.query<{ id: string }>('SELECT id FROM booths WHERE ac_no = $1 AND deleted_at IS NULL ORDER BY part_no', [m.acNo]);
      const per = Math.ceil(booths.rows.length / count) || 1;
      for (let i = 0; i < booths.rows.length; i++) {
        await c.query('INSERT INTO zone_booths (party_id, booth_id, zone_id) VALUES ($1,$2,$3)', [m.partyId, booths.rows[i].id, ids[Math.min(count - 1, Math.floor(i / per))]]);
      }
    });
    await core.query('UPDATE party_constituencies SET zone_count = $2, updated_at = now() WHERE id = $1', [m.partyAcId, count]);
    await audit({ actor: m.userId, role: actorRole(m), action: 'zones.split', partyId: m.partyId, stateCode: m.stateCode, acNo: m.acNo, details: { count } });
    return { ok: true, zoneCount: count };
  });

  /** spec zones-easy Z2: delete one zone; its booths become "without a zone"; later zones move up one number (names kept). */
  app.delete('/v1/m/:mid/zones/:zoneId', async (req) => {
    const { m, pool } = await admin(req, 'zones');
    const { zoneId } = parse(z.object({ mid: Uuid, zoneId: Uuid }), req.params);
    let count = 0;
    await inParty(pool, m.partyId, async (c) => {
      const d = await c.query<{ number: number }>('DELETE FROM zones WHERE id = $1 AND party_id = $2 AND ac_no = $3 RETURNING number', [zoneId, m.partyId, m.acNo]);
      if (!d.rowCount) throw notFound('zone_not_found');
      await c.query('DELETE FROM zone_booths WHERE party_id = $1 AND zone_id = $2', [m.partyId, zoneId]);
      const rest = await c.query<{ id: string }>('SELECT id FROM zones WHERE party_id = $1 AND ac_no = $2 ORDER BY number', [m.partyId, m.acNo]);
      // renumber in two steps so the UNIQUE (party, ac, number) never clashes
      await c.query('UPDATE zones SET number = number + 1000 WHERE party_id = $1 AND ac_no = $2', [m.partyId, m.acNo]);
      for (let i = 0; i < rest.rows.length; i++) await c.query('UPDATE zones SET number = $2 WHERE id = $1', [rest.rows[i].id, i + 1]);
      count = rest.rows.length;
    });
    await core.query('UPDATE party_constituencies SET zone_count = $2, updated_at = now() WHERE id = $1', [m.partyAcId, count]);
    await audit({ actor: m.userId, role: actorRole(m), action: 'zones.delete', partyId: m.partyId, stateCode: m.stateCode, acNo: m.acNo, details: { zoneId } });
    return { ok: true, zoneCount: count };
  });

  app.patch('/v1/m/:mid/zones/:zoneId', async (req) => {
    const { m, pool } = await admin(req, 'zones');
    const { zoneId } = parse(z.object({ mid: Uuid, zoneId: Uuid }), req.params);
    const b = parse(z.object({ name: z.string().trim().min(1).max(40) }), req.body);
    await inParty(pool, m.partyId, (c) => c.query('UPDATE zones SET name = $3 WHERE id = $1 AND party_id = $2', [zoneId, m.partyId, b.name]));
    return { ok: true };
  });

  app.put('/v1/m/:mid/zones/booths', async (req) => {
    const { m, pool } = await admin(req, 'zones');
    const b = parse(z.object({ booths: z.array(PartNo).min(1).max(500), zoneId: Uuid.nullable() }), req.body);
    await inParty(pool, m.partyId, async (c) => {
      if (b.zoneId) {
        const z0 = await c.query('SELECT 1 FROM zones WHERE id = $1 AND party_id = $2 AND ac_no = $3', [b.zoneId, m.partyId, m.acNo]);
        if (!z0.rowCount) throw notFound('zone_not_found');
      }
      const ids = await c.query<{ id: string }>('SELECT id FROM booths WHERE ac_no = $1 AND part_no = ANY($2::smallint[])', [m.acNo, b.booths]);
      for (const { id } of ids.rows) {
        if (b.zoneId) await c.query(`INSERT INTO zone_booths (party_id, booth_id, zone_id) VALUES ($1,$2,$3) ON CONFLICT (party_id, booth_id) DO UPDATE SET zone_id = EXCLUDED.zone_id`, [m.partyId, id, b.zoneId]);
        else await c.query('DELETE FROM zone_booths WHERE party_id = $1 AND booth_id = $2', [m.partyId, id]);
      }
    });
    await audit({ actor: m.userId, role: actorRole(m), action: 'zones.booths', partyId: m.partyId, stateCode: m.stateCode, acNo: m.acNo, details: { booths: b.booths.length } });
    return { ok: true };
  });

  // ---------- Team ----------
  app.get('/v1/m/:mid/team', async (req) => {
    const { m, pool } = await admin(req);
    const q = parse(z.object({ status: z.enum(['pending', 'approved', 'rejected']).default('approved'), q: z.string().trim().max(40).optional() }), req.query);
    const params: unknown[] = [m.partyAcId, q.status];
    let search = '';
    if (q.q) { params.push(`%${q.q.replace(/[%_\\]/g, '\\$&')}%`); search = ` AND (u.name ILIKE $3 OR u.mobile LIKE $3)`; }
    const r = await core.query<{ id: string; user_id: string; name: string; mobile: string; epic: string | null; role: string; status: string; requested_at: Date; reject_reason: string | null; booths: number[]; last_sync_at: Date | null; unsent: number | null }>(
      `SELECT ms.id, u.id AS user_id, u.name, u.mobile, u.epic, ms.role, ms.status, ms.requested_at, ms.reject_reason, ms.last_sync_at, ms.unsent,
              COALESCE(array_agg(mb.part_no ORDER BY mb.part_no) FILTER (WHERE mb.part_no IS NOT NULL), '{}') AS booths
         FROM memberships ms JOIN users u ON u.id = ms.user_id LEFT JOIN membership_booths mb ON mb.membership_id = ms.id
        WHERE ms.party_constituency_id = $1 AND ms.status = $2${search}
        GROUP BY ms.id, u.id ORDER BY ms.role, u.name`, params);
    const activity = await inParty(pool, m.partyId, (c) => c.query<{ user_id: string; total: number; today: number }>(
      `SELECT user_id, count(DISTINCT voter_id)::int AS total,
              count(DISTINCT voter_id) FILTER (WHERE at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')::int AS today
         FROM contact_events WHERE party_id = $1 AND ac_no = $2 AND user_id = ANY($3::uuid[]) GROUP BY user_id`,
      [m.partyId, m.acNo, r.rows.map((x) => x.user_id)]));
    const act = new Map(activity.rows.map((a) => [a.user_id, a]));
    return r.rows.map((x) => ({
      membershipId: x.id, userId: x.user_id, name: x.name, mobile: x.mobile, epic: x.epic, role: x.role, status: x.status,
      requestedAt: x.requested_at, rejectReason: x.reject_reason, booths: x.booths,
      contactedToday: act.get(x.user_id)?.today ?? 0, contactedTotal: act.get(x.user_id)?.total ?? 0,
      lastSyncAt: x.last_sync_at ? x.last_sync_at.toISOString() : null, unsent: x.unsent ?? 0,
    }));
  });

  app.post('/v1/m/:mid/team/:membershipId/approve', async (req) => {
    const { m } = await admin(req);
    const { membershipId } = parse(z.object({ mid: Uuid, membershipId: Uuid }), req.params);
    const b = parse(z.object({ booths: z.array(PartNo).min(1).max(20) }), req.body);
    await approveVolunteer(m, membershipId, b.booths, { userId: m.userId, role: actorRole(m) });
    return { ok: true };
  });

  app.post('/v1/m/:mid/team/:membershipId/reject', async (req) => {
    const { m } = await admin(req);
    const { membershipId } = parse(z.object({ mid: Uuid, membershipId: Uuid }), req.params);
    const b = parse(z.object({ reason: z.string().trim().min(2).max(200) }), req.body);
    await rejectVolunteer(m, membershipId, b.reason, { userId: m.userId, role: actorRole(m) });
    return { ok: true };
  });

  // ---------- Home banner (spec onboarding-branding OB8) ----------
  app.post('/v1/m/:mid/banner', async (req) => {
    const { m } = await admin(req);
    const url = await saveImage(req, 2 * 1024 * 1024);
    await core.query('UPDATE party_constituencies SET banner_url = $2, updated_at = now() WHERE id = $1', [m.partyAcId, url]);
    await audit({ actor: m.userId, role: actorRole(m), action: 'customer.banner_set', partyId: m.partyId, stateCode: m.stateCode, acNo: m.acNo, entity: 'party_ac', entityId: m.partyAcId });
    return { url };
  });

  app.delete('/v1/m/:mid/banner', async (req) => {
    const { m } = await admin(req);
    await core.query('UPDATE party_constituencies SET banner_url = NULL, updated_at = now() WHERE id = $1', [m.partyAcId]);
    await audit({ actor: m.userId, role: actorRole(m), action: 'customer.banner_remove', partyId: m.partyId, stateCode: m.stateCode, acNo: m.acNo, entity: 'party_ac', entityId: m.partyAcId });
    return { ok: true };
  });

  // ---------- Join code ----------
  app.post('/v1/m/:mid/join-code', async (req) => {
    const { m } = await admin(req);
    const code = randomBytes(6).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase().padEnd(8, '7');
    await core.query('UPDATE join_codes SET revoked_at = now() WHERE party_constituency_id = $1 AND revoked_at IS NULL', [m.partyAcId]);
    await core.query('INSERT INTO join_codes (party_constituency_id, code_hash, hint, created_by) VALUES ($1,$2,$3,$4)', [m.partyAcId, sha256(code), code.slice(-2), m.userId]);
    await audit({ actor: m.userId, role: actorRole(m), action: 'joincode.new', partyId: m.partyId, stateCode: m.stateCode, acNo: m.acNo });
    return { code }; // shown once; only the hash is stored
  });

  // ---------- Drives ----------
  app.get('/v1/m/:mid/drives', async (req) => {
    const { m, pool } = await admin(req, 'tasks');
    return inParty(pool, m.partyId, async (c) => {
      const d = await c.query<{ id: string; kind: string; custom_name: string | null; segment: Segment; starts_on: string; ends_on: string; scope: string }>(
        `SELECT id, kind, custom_name, segment, to_char(starts_on, 'YYYY-MM-DD') AS starts_on, to_char(ends_on, 'YYYY-MM-DD') AS ends_on, scope
           FROM drives WHERE party_id = $1 AND ac_no = $2 AND deleted_at IS NULL ORDER BY starts_on DESC`, [m.partyId, m.acNo]);
      const out = [];
      for (const x of d.rows) out.push({ ...(await driveProgress(c, m, x)) });
      return out;
    });
  });

  app.post('/v1/m/:mid/drives', async (req) => {
    const { m, pool } = await admin(req, 'tasks');
    const b = parse(z.object({
      kind: z.enum(['women', 'first_time', 'young', 'target', 'our', 'senior', 'migrated', 'other']),
      customName: z.string().trim().min(2).max(60).optional(),
      segment: z.object({ gender: z.enum(['M', 'F', 'T']).optional(), ageMin: z.number().int().min(18).max(120).optional(), ageMax: z.number().int().min(18).max(120).optional() }).optional(),
      startsOn: DateStr, endsOn: DateStr,
      scope: z.enum(['all', 'zones', 'booths']),
      zoneIds: z.array(Uuid).max(50).optional(),
      booths: z.array(PartNo).max(500).optional(),
    }).refine((x) => x.kind !== 'other' || !!x.customName, 'Type a name for "Other"').refine((x) => x.endsOn >= x.startsOn, 'End date is before the start date'), req.body);
    const segment = b.kind === 'other' ? b.segment ?? {} : DRIVE_SEGMENTS[b.kind];
    const id = await inParty(pool, m.partyId, async (c) => {
      const r = await c.query<{ id: string }>(
        `INSERT INTO drives (party_id, ac_no, kind, custom_name, segment, starts_on, ends_on, scope, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [m.partyId, m.acNo, b.kind, b.kind === 'other' ? b.customName : null, JSON.stringify(segment), b.startsOn, b.endsOn, b.scope, m.userId]);
      const did = r.rows[0].id;
      if (b.scope === 'zones') {
        const zs = await c.query<{ id: string }>('SELECT id FROM zones WHERE party_id = $1 AND ac_no = $2 AND id = ANY($3::uuid[])', [m.partyId, m.acNo, b.zoneIds ?? []]);
        if (!zs.rowCount) throw invalid('scope_empty', 'Pick at least one zone.');
        for (const z0 of zs.rows) await c.query('INSERT INTO drive_scope (drive_id, zone_id) VALUES ($1,$2)', [did, z0.id]);
      } else if (b.scope === 'booths') {
        const bs = await c.query<{ id: string }>('SELECT id FROM booths WHERE ac_no = $1 AND part_no = ANY($2::smallint[])', [m.acNo, b.booths ?? []]);
        if (!bs.rowCount) throw invalid('scope_empty', 'Pick at least one booth.');
        for (const b0 of bs.rows) await c.query('INSERT INTO drive_scope (drive_id, booth_id) VALUES ($1,$2)', [did, b0.id]);
      }
      return did;
    });
    await audit({ actor: m.userId, role: actorRole(m), action: 'drive.create', partyId: m.partyId, stateCode: m.stateCode, acNo: m.acNo, entity: 'drive', entityId: id });
    return { id };
  });

  app.delete('/v1/m/:mid/drives/:driveId', async (req) => {
    const { m, pool } = await admin(req, 'tasks');
    const { driveId } = parse(z.object({ mid: Uuid, driveId: Uuid }), req.params);
    await inParty(pool, m.partyId, (c) => c.query('UPDATE drives SET deleted_at = now() WHERE id = $1 AND party_id = $2', [driveId, m.partyId]));
    await audit({ actor: m.userId, role: actorRole(m), action: 'drive.delete', partyId: m.partyId, stateCode: m.stateCode, acNo: m.acNo, entity: 'drive', entityId: driveId });
    return { ok: true };
  });

  // ---------- Polling day ----------
  app.get('/v1/m/:mid/poll', async (req) => {
    const { m, pool } = await admin(req, 'poll');
    return inParty(pool, m.partyId, async (c) => {
      const tot = (await c.query<Counters>(`SELECT ${SUMS} FROM stats_booth s WHERE s.party_id = $1 AND s.ac_no = $2`, [m.partyId, m.acNo])).rows[0];
      const zones = await c.query<{ name: string; total: number; voted: number }>(
        `SELECT z.name, COALESCE(sum(s.total), 0)::int AS total, COALESCE(sum(s.voted), 0)::int AS voted FROM zones z
           LEFT JOIN zone_booths zb ON zb.zone_id = z.id LEFT JOIN stats_booth s ON s.party_id = z.party_id AND s.booth_id = zb.booth_id
          WHERE z.party_id = $1 AND z.ac_no = $2 GROUP BY z.id ORDER BY z.number`, [m.partyId, m.acNo]);
      const booths = await c.query<{ part_no: number; name: string; total: number; voted: number; our: number; our_voted: number; help_needed: number; help_voted: number }>(
        `SELECT s.part_no, b.name, s.total, s.voted, s.our, s.our_voted, s.help_needed, s.help_voted FROM stats_booth s JOIN booths b ON b.id = s.booth_id
          WHERE s.party_id = $1 AND s.ac_no = $2 ORDER BY (s.voted::float / NULLIF(s.total, 0)) NULLS FIRST, s.part_no`, [m.partyId, m.acNo]);
      const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
      return {
        total: tot.total, voted: tot.voted, pct: pct(tot.voted, tot.total),
        notVoted: { our: tot.our - tot.our_voted, target: tot.target - tot.target_voted, opp: tot.opp - tot.opp_voted },
        helpPending: tot.help_needed - tot.help_voted,
        zones: zones.rows.map((z) => ({ name: z.name, total: z.total, voted: z.voted, pct: pct(z.voted, z.total) })),
        booths: booths.rows.map((b) => ({ no: b.part_no, name: b.name, total: b.total, voted: b.voted, pct: pct(b.voted, b.total), ourNotVoted: b.our - b.our_voted, helpPending: b.help_needed - b.help_voted })),
      };
    });
  });

  // ---------- Map ----------
  app.get('/v1/m/:mid/map', async (req) => {
    const { m, pool } = await admin(req, 'map');
    const sOf = await strengthOf(pool, m);
    const vols = await volunteersByBooth(m);
    return inParty(pool, m.partyId, async (c) => {
      const r = await c.query<{ part_no: number; name: string; lat: string | null; lng: string | null; total: number; met: number; our: number; target: number; opp: number; strength: string | null; zone: string | null }>(
        `SELECT b.part_no, b.name, b.lat, b.lng, COALESCE(s.total, 0) AS total, COALESCE(s.met, 0) AS met, COALESCE(s.our, 0) AS our, COALESCE(s.target, 0) AS target, COALESCE(s.opp, 0) AS opp,
                bp.strength, z.name AS zone
           FROM booths b LEFT JOIN stats_booth s ON s.party_id = $1 AND s.booth_id = b.id
           LEFT JOIN booth_party_info bp ON bp.party_id = $1 AND bp.booth_id = b.id
           LEFT JOIN zone_booths zb ON zb.party_id = $1 AND zb.booth_id = b.id LEFT JOIN zones z ON z.id = zb.zone_id
          WHERE b.ac_no = $2 AND b.deleted_at IS NULL ORDER BY b.part_no`, [m.partyId, m.acNo]);
      // spec booth-map: + volunteers, first volunteer to call, last-result group (S won by 100+, M close, W lost by 100+).
      return r.rows.map((b) => {
        const v = vols.get(b.part_no);
        return {
          no: b.part_no, name: b.name, lat: b.lat ? Number(b.lat) : null, lng: b.lng ? Number(b.lng) : null, total: b.total, met: b.met, our: b.our, target: b.target, opp: b.opp,
          ...sOf(b.part_no, b.strength), zone: b.zone, pct: b.total ? Math.round((b.met / b.total) * 1000) / 10 : 0,
          workers: v?.n ?? 0, contact: v ? { name: v.name, mobile: v.mobile } : null, result: sOf.auto.get(b.part_no) ?? null,
          last: sOf.last.get(b.part_no) ?? null,
        };
      });
    });
  });

  // Branding moved to the super-admin (spec customer-cms CD2): no admin settings routes.

  /** C9 vote trace for this party in this AC: by EPIC, or booth + serial no. */
  app.get('/v1/m/:mid/trace', async (req) => {
    const { m } = await admin(req);
    const q = parse(z.object({ epic: z.string().trim().min(3).max(20).optional(), booth: z.coerce.number().int().min(1).max(999).optional(), sno: z.coerce.number().int().min(1).max(5000).optional() }), req.query);
    if (q.epic) return traceVoter(m.stateCode, m.acNo, { epic: q.epic }, m.partyId);
    if (q.booth && q.sno) return traceVoter(m.stateCode, m.acNo, { booth: q.booth, sno: q.sno }, m.partyId);
    throw invalid('trace_query', 'Enter the EPIC number, or booth and serial number.');
  });

  /** spec bilingual-roll U6/U9: the roll in use, new voters, and voters not in the latest roll. */
  // spec usability-r2 A2: surnames of the assembly (last word of the name) with counts. Aggregates only.
  app.get('/v1/m/:mid/surnames', async (req) => {
    const { m, pool } = await admin(req);
    const q = parse(z.object({ zone: Uuid.optional(), booth: PartNo.optional() }), req.query);
    const params: unknown[] = [m.partyId, m.acNo];
    let where = '';
    if (q.booth) { params.push(q.booth); where += ` AND v.part_no = $${params.length}`; }
    if (q.zone) { params.push(q.zone); where += ` AND v.booth_id IN (SELECT booth_id FROM zone_booths WHERE party_id = $1 AND zone_id = $${params.length})`; }
    return inParty(pool, m.partyId, async (c) => {
      const r = await c.query<{ surname: string; total: number; met: number; our: number; target: number; opp: number }>(
        `SELECT regexp_replace(trim(v.name), '^.*\\s', '') AS surname, count(*)::int AS total,
                count(*) FILTER (WHERE c.first_contacted_at IS NOT NULL OR c.group_code IS NOT NULL)::int AS met,
                count(*) FILTER (WHERE c.group_code = 'our')::int AS our,
                count(*) FILTER (WHERE c.group_code = 'target')::int AS target,
                count(*) FILTER (WHERE c.group_code = 'opp')::int AS opp
           FROM voters v LEFT JOIN voter_contacts c ON c.party_id = $1 AND c.ac_no = v.ac_no AND c.voter_id = v.id
          WHERE v.ac_no = $2 AND v.status IN ('active','added')${where}
          GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 3000`, params);
      const voters = r.rows.reduce((a, x) => a + x.total, 0);
      return { voters, surnames: r.rows.map((x) => ({ surname: x.surname, total: x.total, met: x.met, our: x.our, target: x.target, opp: x.opp })) };
    });
  });

  app.get('/v1/m/:mid/roll', async (req) => {
    const { m, pool } = await admin(req);
    const rv = await pool.query<{ kind: string; published_on: string | null; created_at: Date }>(
      `SELECT kind, to_char(published_on, 'YYYY-MM-DD') AS published_on, created_at FROM roll_versions WHERE ac_no = $1 AND is_current ORDER BY created_at DESC LIMIT 1`, [m.acNo]);
    const counts = await pool.query<{ not_in_roll: number; new_count: number }>(
      `SELECT count(*) FILTER (WHERE status = 'not_in_roll')::int AS not_in_roll, count(*) FILTER (WHERE is_new AND status IN ('active','added'))::int AS new_count
         FROM voters WHERE ac_no = $1`, [m.acNo]);
    const list = await pool.query<{ epic: string; name: string; name_local: string | null; part_no: number; sno: number }>(
      `SELECT epic, name, name_local, part_no, sno FROM voters WHERE ac_no = $1 AND status = 'not_in_roll' ORDER BY part_no, sno LIMIT 500`, [m.acNo]);
    const r = rv.rows[0];
    return {
      kind: r?.kind ?? null, publishedOn: r?.published_on ?? null, appliedAt: r?.created_at.toISOString() ?? null,
      notInRoll: counts.rows[0].not_in_roll, newCount: counts.rows[0].new_count,
      notInRollList: list.rows.map((x) => ({ epic: x.epic, name: x.name, nameLocal: x.name_local, booth: x.part_no, sno: x.sno })),
    };
  });
}

/** Drive progress: targeted = segment voters in scope; completed = of those, contacted within the drive dates. */
async function driveProgress(c: pg.PoolClient, m: Membership, d: { id: string; kind: string; custom_name: string | null; segment: Segment; starts_on: string; ends_on: string; scope: string }) {
  const params: unknown[] = [m.partyId, m.acNo, d.id, d.starts_on, d.ends_on];
  const seg = segmentSql(d.segment ?? {}, params);
  const r = await c.query<{ zone: string | null; targeted: number; completed: number }>(
    `WITH scope AS (
       SELECT b.id FROM booths b WHERE b.ac_no = $2 AND (
         NOT EXISTS (SELECT 1 FROM drive_scope s WHERE s.drive_id = $3)
         OR b.id IN (SELECT s.booth_id FROM drive_scope s WHERE s.drive_id = $3 AND s.booth_id IS NOT NULL)
         OR b.id IN (SELECT zb.booth_id FROM drive_scope s JOIN zone_booths zb ON zb.zone_id = s.zone_id WHERE s.drive_id = $3)))
     SELECT z.name AS zone, count(*)::int AS targeted,
            count(*) FILTER (WHERE c.last_contacted_at >= $4::date AND c.last_contacted_at < $5::date + 1)::int AS completed
       FROM voters v
       LEFT JOIN voter_contacts c ON c.party_id = $1 AND c.ac_no = v.ac_no AND c.voter_id = v.id
       LEFT JOIN zone_booths zb ON zb.party_id = $1 AND zb.booth_id = v.booth_id LEFT JOIN zones z ON z.id = zb.zone_id
      WHERE v.ac_no = $2 AND v.status IN ('active','added') AND v.booth_id IN (SELECT id FROM scope)${seg}
      GROUP BY z.name, z.number ORDER BY z.number NULLS LAST`, params);
  const targeted = r.rows.reduce((a, x) => a + x.targeted, 0);
  const completed = r.rows.reduce((a, x) => a + x.completed, 0);
  const today = new Date().toISOString().slice(0, 10);
  const status = today < d.starts_on ? 'not_started' : today > d.ends_on ? 'completed' : 'ongoing';
  const daysLeft = Math.max(0, Math.ceil((Date.parse(d.ends_on) - Date.parse(today)) / 86_400_000));
  return {
    id: d.id, kind: d.kind, name: d.kind === 'other' ? d.custom_name : DRIVE_NAMES[d.kind], segment: d.segment, startsOn: d.starts_on, endsOn: d.ends_on, scope: d.scope,
    status, daysLeft, targeted, completed, pct: targeted ? Math.round((completed / targeted) * 1000) / 10 : 0,
    byZone: r.rows.map((x) => ({ zone: x.zone ?? 'Unassigned', targeted: x.targeted, completed: x.completed, pct: x.targeted ? Math.round((x.completed / x.targeted) * 1000) / 10 : 0 })),
  };
}

async function namesOf(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const r = await core.query<{ id: string; name: string }>('SELECT id, name FROM users WHERE id = ANY($1::uuid[])', [ids]);
  return new Map(r.rows.map((x) => [x.id, x.name]));
}
