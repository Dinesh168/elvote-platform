/**
 * Map & Trend, Win plan, my progress and reminders (spec docs/specs/map-trend.md).
 * Super-admin: upload / list / delete past results (registered inside platformRoutes, which checks super-admin).
 * Admin: trend, results map, win plan, remind — always scoped to the caller's own AC.
 * Volunteer: own booth's last result and own progress only.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { allStateCodes, core, inParty, statePool } from '../db/pools.js';
import { actorRole, audit, requireBooth, requireMembership, type Membership } from '../lib/access.js';
import { invalid, notFound, tooMany } from '../lib/errors.js';
import { parse, PartNo, Uuid } from '../lib/http.js';
import { areaOf, notify, type NoticeType } from '../lib/notify.js';
import {
  areaYear, groupOf, loadAc, neededNow, parseResultsCsv, partiesOf, pickParty, saveResults, type AcResults, type BoothYear,
} from '../lib/pastResults.js';

const Mid = z.object({ mid: Uuid });
const State = z.string().regex(/^[A-Z]{2}$/);
const Party = z.string().trim().min(1).max(40);

async function stateOk(code: string) {
  if (!(await allStateCodes()).includes(code)) throw invalid('unknown_state', 'Unknown state.');
  return statePool(code);
}

/** Super-admin routes; the caller (platformRoutes) has already checked the super-admin. */
export async function pastResultsAdminRoutes(app: FastifyInstance) {
  app.post('/v1/admin/past-results', { bodyLimit: 25 * 1024 * 1024 }, async (req) => {
    const b = parse(z.object({ stateCode: State, csv: z.string().min(1).max(25 * 1024 * 1024), sample: z.boolean().default(false) }), req.body);
    const pool = await stateOk(b.stateCode);
    const { rows, parties } = parseResultsCsv(b.csv);
    const acs = [...new Set(rows.map((r) => r.ac))].sort((x, y) => x - y);
    const known = await pool.query<{ ac_no: number }>('SELECT ac_no FROM assembly_constituencies WHERE ac_no = ANY($1::smallint[])', [acs]);
    const missing = acs.filter((a) => !known.rows.some((k) => k.ac_no === a));
    if (missing.length) throw invalid('invalid_csv', `AC ${missing.join(', ')} is not set up in ${b.stateCode}.`);
    await saveResults(pool, rows, req.userId, b.sample);
    const years = [...new Set(rows.map((r) => r.year))].sort((x, y) => x - y);
    await audit({ actor: req.userId, role: 'super_admin', action: 'past_results.upload', stateCode: b.stateCode, details: { rows: rows.length, acs, years, sample: b.sample } });
    return { rows: rows.length, acs, years, parties };
  });

  app.get('/v1/admin/past-results', async (req) => {
    const q = parse(z.object({ state: State }), req.query);
    const pool = await stateOk(q.state);
    const r = await pool.query<{ ac_no: number; year: number; booths: number; sample: boolean; loaded_at: Date }>(
      `SELECT ac_no, year, count(*)::int AS booths, bool_or(is_sample) AS sample, max(loaded_at) AS loaded_at
         FROM past_booth_results GROUP BY ac_no, year ORDER BY ac_no, year`);
    return { items: r.rows.map((x) => ({ acNo: x.ac_no, year: x.year, booths: x.booths, sample: x.sample, loadedAt: x.loaded_at.toISOString() })) };
  });

  app.delete('/v1/admin/past-results', async (req) => {
    const q = parse(z.object({ state: State, ac: z.coerce.number().int().min(1).max(999), year: z.coerce.number().int().min(1950).max(2100) }), req.query);
    const pool = await stateOk(q.state);
    const r = await pool.query('DELETE FROM past_booth_results WHERE ac_no = $1 AND year = $2', [q.ac, q.year]);
    if (!r.rowCount) throw notFound();
    await audit({ actor: req.userId, role: 'super_admin', action: 'past_results.delete', stateCode: q.state, acNo: q.ac, details: { year: q.year, booths: r.rowCount } });
    return { deleted: r.rowCount };
  });
}

export async function teamParty(m: Membership) {
  const r = await core.query<{ short_name: string | null; name: string }>('SELECT short_name, name FROM parties WHERE id = $1', [m.partyId]);
  return { short: r.rows[0]?.short_name ?? null, name: r.rows[0]?.name ?? m.partyName };
}

async function context(req: { userId: string; params: unknown }, role?: 'admin') {
  const { mid } = parse(Mid, req.params);
  const m = await requireMembership(req.userId, mid, role);
  const pool = await statePool(m.stateCode);
  return { m, pool, res: await loadAc(pool, m.acNo) };
}

const years = (res: AcResults) => [...res.keys()].sort((a, b) => a - b);
const boothsIn = (res: AcResults, year: number, parts?: Set<number>) => [...(res.get(year)?.values() ?? [])].filter((b) => !parts || parts.has(b.part));

/** Current roll size and canvassing "ours" per booth for this team. */
async function today(pool: Awaited<ReturnType<typeof statePool>>, m: Membership) {
  const voters = await pool.query<{ part_no: number; voters_count: number }>('SELECT part_no, voters_count FROM booths WHERE ac_no = $1 AND deleted_at IS NULL', [m.acNo]);
  const ours = await inParty(pool, m.partyId, (c) => c.query<{ part_no: number; our: number; met: number; total: number }>(
    'SELECT part_no, our, met, total FROM stats_booth WHERE party_id = $1 AND ac_no = $2', [m.partyId, m.acNo]));
  return {
    voters: new Map(voters.rows.map((x) => [x.part_no, x.voters_count])),
    stats: new Map(ours.rows.map((x) => [x.part_no, x])),
  };
}

async function zonesOf(pool: Awaited<ReturnType<typeof statePool>>, m: Membership) {
  const r = await inParty(pool, m.partyId, (c) => c.query<{ id: string; number: number; name: string; part_no: number | null }>(
    `SELECT z.id, z.number, z.name, b.part_no FROM zones z LEFT JOIN zone_booths zb ON zb.zone_id = z.id LEFT JOIN booths b ON b.id = zb.booth_id
      WHERE z.party_id = $1 AND z.ac_no = $2 ORDER BY z.number, b.part_no`, [m.partyId, m.acNo]));
  const zones = new Map<string, { name: string; number: number; parts: Set<number> }>();
  for (const x of r.rows) {
    let z = zones.get(x.id);
    if (!z) zones.set(x.id, (z = { name: x.name, number: x.number, parts: new Set() }));
    if (x.part_no !== null) z.parts.add(x.part_no);
  }
  return zones;
}

/** Series for an area: per year shares, ours, winner; plus swing and last margin. */
function series(res: AcResults, party: string, parts?: Set<number>) {
  const ys = years(res).map((year) => ({ year, booths: boothsIn(res, year, parts) })).filter((y) => y.booths.length);
  const rows = ys.map((y) => ({ year: y.year, ...areaYear(y.booths, party) }));
  const last = rows.at(-1);
  const prev = rows.at(-2);
  return {
    rows,
    years: rows.map((r) => ({ year: r.year, total: r.total, votes: r.votes, shares: r.shares, ours: r.ours, winner: r.winner, margin: r.margin, estimated: r.estimated })),
    swing: last && prev ? Math.round((last.ours - prev.ours) * 10) / 10 : null,
    last,
  };
}

function child(res: AcResults, party: string, key: string, name: string, parts?: Set<number>, t = 100) {
  const s = series(res, party, parts);
  return { key, name, ours: s.last?.ours ?? null, swing: s.swing, winner: s.last?.winner ?? null, margin: s.last?.margin ?? null, group: s.last ? groupOf(s.last.margin, t) : null };
}

const boothChildren = (res: AcResults, party: string, parts: Iterable<number>, t = 100) => {
  const lastYear = years(res).at(-1);
  const names = new Map<number, string>();
  for (const y of years(res)) for (const b of res.get(y)!.values()) names.set(b.part, b.name ?? `Booth ${b.part}`);
  return [...parts].filter((p) => names.has(p)).sort((a, b) => a - b)
    .map((p) => child(res, party, String(p), names.get(p)!, new Set([p]), t))
    .filter(() => lastYear !== undefined);
};

export async function resultsRoutes(app: FastifyInstance) {
  app.get('/v1/m/:mid/trend', async (req) => {
    const { m, pool, res } = await context(req, 'admin');
    const q = parse(z.object({ level: z.enum(['assembly', 'zone', 'booth', 'village']).default('assembly'), key: z.string().trim().max(80).optional(), party: Party.optional() }).passthrough(), req.query);
    const party = pickParty(res, q.party, await teamParty(m));
    const base = { acNo: m.acNo, acName: m.acName, level: q.level, key: q.key ?? null, parties: partiesOf(res), party, sample: [...res.values()].some((y) => [...y.values()].some((b) => b.sample)) };
    if (!party) return { ...base, name: m.acName, years: [], swing: null, margin: null, children: [], closeLosses: [] };

    const allParts = new Set([...res.values()].flatMap((y) => [...y.keys()]));
    let parts: Set<number> | undefined;
    let name = m.acName;
    let children: ReturnType<typeof child>[] = [];
    if (q.level === 'assembly') {
      const zones = await zonesOf(pool, m);
      const zoned = new Set([...zones.values()].flatMap((z) => [...z.parts]));
      if ([...zones.values()].some((z) => z.parts.size)) {
        children = [...zones.entries()].filter(([, z]) => z.parts.size).map(([id, z]) => child(res, party, id, z.name, z.parts, m.resultMargin));
        const none = new Set([...allParts].filter((p) => !zoned.has(p)));
        if (none.size) children.push(child(res, party, 'none', 'No zone', none, m.resultMargin));
      } else children = boothChildren(res, party, allParts, m.resultMargin);
    } else if (q.level === 'zone') {
      if (!q.key) throw invalid('key_required', 'Pick a zone.');
      const zones = await zonesOf(pool, m);
      if (q.key === 'none') {
        const zoned = new Set([...zones.values()].flatMap((z) => [...z.parts]));
        parts = new Set([...allParts].filter((p) => !zoned.has(p)));
        name = 'No zone';
      } else {
        const z = zones.get(q.key);
        if (!z) throw notFound();
        parts = z.parts;
        name = z.name;
      }
      children = boothChildren(res, party, parts, m.resultMargin);
    } else if (q.level === 'village') {
      if (!q.key) {
        const villages = new Map<string, Set<number>>();
        for (const y of res.values()) for (const b of y.values()) if (b.village) (villages.get(b.village) ?? villages.set(b.village, new Set()).get(b.village)!).add(b.part);
        children = [...villages.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([v, p]) => child(res, party, v, v, p, m.resultMargin));
      } else {
        parts = new Set([...res.values()].flatMap((y) => [...y.values()].filter((b) => b.village?.toLowerCase() === q.key!.toLowerCase()).map((b) => b.part)));
        name = q.key;
        children = boothChildren(res, party, parts, m.resultMargin);
      }
    } else {
      const part = PartNo.parse(q.key);
      parts = new Set([part]);
      if (![...res.values()].some((y) => y.has(part))) throw notFound();
      name = [...res.values()].map((y) => y.get(part)?.name).find(Boolean) ?? `Booth ${part}`;
    }

    const s = series(res, party, parts);
    const lastYear = years(res).at(-1)!;
    const closeLosses = boothsIn(res, lastYear, parts).map((b) => ({ part: b.part, ...areaYear([b], party) }))
      .filter((b) => b.margin < 0 && b.margin > -50).map((b) => b.part).sort((a, b) => a - b);
    const out = { ...base, name, years: s.years, swing: s.swing, margin: s.last?.margin ?? null, children, closeLosses };
    if (q.level !== 'booth' || !s.last) return out;
    const part = [...parts!][0];
    const t = await today(pool, m);
    const needed = neededNow(s.last.rivalVotes, s.last.electors, t.voters.get(part) ?? 0);
    const oursFound = t.stats.get(part)?.our ?? 0;
    return { ...out, group: groupOf(s.last.margin, m.resultMargin), toWin: { needed, oursFound, toGo: Math.max(0, needed - oursFound) }, metPct: pctMet(t.stats.get(part)) };
  });

  app.get('/v1/m/:mid/results-map', async (req) => {
    const { m, pool, res } = await context(req, 'admin');
    const q = parse(z.object({ year: z.coerce.number().int().optional(), party: Party.optional() }), req.query);
    const party = pickParty(res, q.party, await teamParty(m));
    const ys = years(res);
    const year = q.year && ys.includes(q.year) ? q.year : ys.at(-1);
    if (!party || !year) return { year: null, years: ys, party, parties: [], booths: [], legend: { won: 0, lost: 0, lostUnder50: 0 } };
    const geo = await pool.query<{ part_no: number; name: string; lat: string | null; lng: string | null }>(
      'SELECT part_no, name, lat, lng FROM booths WHERE ac_no = $1 AND deleted_at IS NULL', [m.acNo]);
    const g = new Map(geo.rows.map((x) => [x.part_no, x]));
    const t = await today(pool, m);
    const prevYear = ys[ys.indexOf(year) - 1];
    const booths = boothsIn(res, year).map((b) => {
      const a = areaYear([b], party);
      const prev = prevYear ? res.get(prevYear)?.get(b.part) : undefined;
      const x = g.get(b.part);
      return {
        partNo: b.part, name: x?.name ?? b.name ?? `Booth ${b.part}`, lat: x?.lat ? Number(x.lat) : null, lng: x?.lng ? Number(x.lng) : null,
        winner: a.winner, ours: a.ours, margin: a.margin, prevOurs: prev ? areaYear([prev], party).ours : null, metPct: pctMet(t.stats.get(b.part)),
      };
    });
    const won = booths.filter((b) => b.margin > 0).length;
    return {
      year, years: ys, party, parties: partiesOf(res), booths,
      legend: { won, lost: booths.length - won, lostUnder50: booths.filter((b) => b.margin <= 0 && b.margin > -50).length },
    };
  });

  app.get('/v1/m/:mid/win-plan', async (req) => {
    const { m, pool, res } = await context(req, 'admin');
    const q = parse(z.object({ party: Party.optional() }), req.query);
    const party = pickParty(res, q.party, await teamParty(m));
    const year = years(res).at(-1);
    const t = await today(pool, m);
    const oursFound = [...t.stats.values()].reduce((a, x) => a + x.our, 0);
    const empty = { booths: [] as number[], count: 0 };
    if (!party || !year) return { year: null, party, needed: null, oursFound, toGo: null, rivalVotes: null, groups: { safe: empty, swing: empty, tough: empty }, uncoveredSwing: [] };
    const all = boothsIn(res, year);
    const area = areaYear(all, party);
    const current = [...t.voters.values()].reduce((a, x) => a + x, 0);
    const needed = neededNow(area.rivalVotes, area.electors, current);
    const groups = { safe: [] as number[], swing: [] as number[], tough: [] as number[] };
    for (const b of all) groups[groupOf(areaYear([b], party).margin, m.resultMargin)].push(b.part);
    const covered = await core.query<{ part_no: number }>(
      `SELECT DISTINCT mb.part_no FROM membership_booths mb JOIN memberships ms ON ms.id = mb.membership_id
        WHERE ms.party_constituency_id = $1 AND ms.role = 'volunteer' AND ms.status = 'approved' AND NOT mb.requested`, [m.partyAcId]);
    const cov = new Set(covered.rows.map((x) => x.part_no));
    const g = (k: keyof typeof groups) => ({ booths: groups[k].sort((a, b) => a - b), count: groups[k].length });
    return {
      year, party, winnerVotes: Math.max(area.oursVotes, area.rivalVotes), rivalVotes: area.rivalVotes, needed, oursFound, toGo: Math.max(0, needed - oursFound),
      groups: { safe: g('safe'), swing: g('swing'), tough: g('tough') }, uncoveredSwing: groups.swing.filter((p) => !cov.has(p)),
    };
  });

  app.get('/v1/m/:mid/my-booth-result', async (req) => {
    const { m, res } = await context(req);
    const q = parse(z.object({ booth: PartNo.optional() }), req.query);
    const part = q.booth ?? m.booths[0];
    if (!part) return null;
    requireBooth(m, part);
    const party = pickParty(res, undefined, await teamParty(m));
    const year = [...years(res)].reverse().find((y) => res.get(y)!.has(part));
    if (!party || !year) return null;
    const a = areaYear([res.get(year)!.get(part)!], party);
    return { year, partNo: part, result: a.margin > 0 ? 'won' : 'lost', margin: Math.abs(a.margin) };
  });

  app.get('/v1/m/:mid/my-progress', async (req) => {
    const { mid } = parse(Mid, req.params);
    const m = await requireMembership(req.userId, mid);
    const pool = await statePool(m.stateCode);
    const target = (await core.query<{ daily_target: number }>('SELECT daily_target FROM party_constituencies WHERE id = $1', [m.partyAcId])).rows[0]?.daily_target ?? 25;
    const day = `(at AT TIME ZONE 'Asia/Kolkata')::date`;
    const today = `(now() AT TIME ZONE 'Asia/Kolkata')::date`;
    return inParty(pool, m.partyId, async (c) => {
      const mine = (await c.query<{ today: number; met: number; phones: number }>(
        `SELECT count(DISTINCT voter_id) FILTER (WHERE ${day} = ${today})::int AS today, count(DISTINCT voter_id)::int AS met,
                count(DISTINCT voter_id) FILTER (WHERE change ? 'mobile')::int AS phones
           FROM contact_events WHERE party_id = $1 AND ac_no = $2 AND user_id = $3 AND source = 'app'`, [m.partyId, m.acNo, req.userId])).rows[0];
      const days = (await c.query<{ d: number }>(
        `SELECT DISTINCT (${today} - ${day})::int AS d FROM contact_events
          WHERE party_id = $1 AND ac_no = $2 AND user_id = $3 AND source = 'app' AND at > now() - interval '90 days' ORDER BY 1`, [m.partyId, m.acNo, req.userId])).rows.map((x) => x.d);
      const set = new Set(days);
      let streak = 0;
      for (let d = set.has(0) ? 0 : 1; set.has(d); d++) streak++;
      let best = 0;
      let run = 0;
      for (let d = 0; d <= 90; d++) { run = set.has(d) ? run + 1 : 0; best = Math.max(best, run); }
      const week = (await c.query<{ user_id: string; n: number }>(
        `SELECT user_id, count(DISTINCT voter_id)::int AS n FROM contact_events
          WHERE party_id = $1 AND ac_no = $2 AND source = 'app' AND at > now() - interval '7 days' GROUP BY user_id`, [m.partyId, m.acNo])).rows;
      const myWeek = week.find((w) => w.user_id === req.userId)?.n ?? 0;
      const team = (await core.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM memberships WHERE party_constituency_id = $1 AND role = 'volunteer' AND status = 'approved'`, [m.partyAcId])).rows[0].n;
      const rank = 1 + week.filter((w) => w.n > myWeek && w.user_id !== req.userId).length;
      return {
        today: mine.today, target, streak, week: myWeek, rank, teamSize: Math.max(team, rank),
        badges: [
          { key: 'met100', earned: mine.met >= 100, have: mine.met, need: 100 },
          { key: 'met500', earned: mine.met >= 500, have: mine.met, need: 500 },
          { key: 'phones50', earned: mine.phones >= 50, have: mine.phones, need: 50 },
          { key: 'streak5', earned: best >= 5, have: best, need: 5 },
        ],
      };
    });
  });

  const TEMPLATES: Record<string, NoticeType> = { booth_needs_you: 'remind_booth', days_left: 'remind_days', call_me: 'remind_call' };
  app.post('/v1/m/:mid/remind', async (req) => {
    const { mid } = parse(Mid, req.params);
    const m = await requireMembership(req.userId, mid, 'admin');
    const b = parse(z.object({ userIds: z.array(Uuid).min(1).max(500), template: z.enum(['booth_needs_you', 'days_left', 'call_me']) }), req.body);
    const team = await core.query<{ user_id: string; last: Date | null }>(
      `SELECT ms.user_id, (SELECT max(r.sent_at) FROM reminders_sent r WHERE r.party_constituency_id = $1 AND r.user_id = ms.user_id) AS last
         FROM memberships ms WHERE ms.party_constituency_id = $1 AND ms.role = 'volunteer' AND ms.status = 'approved' AND ms.user_id = ANY($2::uuid[])`,
      [m.partyAcId, b.userIds]);
    const cutoff = Date.now() - 12 * 3600_000;
    const due = team.rows.filter((x) => !x.last || x.last.getTime() < cutoff).map((x) => x.user_id);
    if (team.rows.length && !due.length) {
      const next = Math.min(...team.rows.map((x) => x.last!.getTime())) + 12 * 3600_000;
      throw tooMany('remind_limit', `Already reminded. You can remind again in ${Math.ceil((next - Date.now()) / 3600_000)} h.`);
    }
    if (due.length) {
      await core.query(
        `INSERT INTO reminders_sent (party_constituency_id, user_id, sent_by, template) SELECT $1, u, $2, $3 FROM unnest($4::uuid[]) AS u`,
        [m.partyAcId, req.userId, b.template, due]);
      const who = (await core.query<{ name: string }>('SELECT name FROM users WHERE id = $1', [req.userId])).rows[0]?.name ?? '';
      void areaOf(m.partyAcId).then((a) => notify(due, TEMPLATES[b.template], { ...a, name: who }));
      await audit({ actor: req.userId, role: actorRole(m), action: 'team.remind', partyId: m.partyId, stateCode: m.stateCode, acNo: m.acNo, details: { count: due.length, template: b.template } });
    }
    return { sent: due.length, skipped: b.userIds.length - due.length };
  });
}

function pctMet(s: { met: number; total: number } | undefined) {
  return s && s.total ? Math.round((s.met / s.total) * 1000) / 10 : 0;
}

export type { BoothYear };
