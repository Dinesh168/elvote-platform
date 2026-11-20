/**
 * Polling day (spec docs/specs/polling-day.md): which election applies, the at-booth check, alerts, the admin page.
 * Only the latest position per volunteer is kept (no trail), plus status changes; both are deleted 30 days after the poll.
 */
import { core, statePool } from '../db/pools.js';
import { forbidden } from './errors.js';
import type { Membership } from './access.js';
import { sendPush, pushEnabled } from './push.js';

const TZ = 'Asia/Kolkata';
export const MAX_ACCURACY_M = 100; // PD4: poorer readings are ignored
export const AWAY_MIN_GAP_MS = 60_000; // PD4: two readings beyond the distance, at least a minute apart
export const STILL_AWAY_MIN = 15; // PD5
export const NOT_REPORTING_MIN = 10; // PD5
export const KEEP_DAYS = 30; // O1

export interface Election {
  id: string; kind: string; name: string; date: string; opensAt: string; closesAt: string; acNos: number[] | null; status: string; inWindow: boolean;
}
type ElectionRow = { id: string; kind: string; name: string; date: string; opens_at: string; closes_at: string; ac_nos: number[] | null; status: string; in_window: boolean };
export const ELECTION_COLS = `id, kind, name, to_char(poll_date, 'YYYY-MM-DD') AS date, to_char(opens_at, 'HH24:MI') AS opens_at, to_char(closes_at, 'HH24:MI') AS closes_at,
  ac_nos, status, (status <> 'cancelled' AND poll_date = (now() AT TIME ZONE '${TZ}')::date
    AND (now() AT TIME ZONE '${TZ}')::time >= opens_at AND (now() AT TIME ZONE '${TZ}')::time < closes_at) AS in_window`;
export const toElection = (r: ElectionRow): Election => ({
  id: r.id, kind: r.kind, name: r.name, date: r.date, opensAt: r.opens_at, closesAt: r.closes_at, acNos: r.ac_nos, status: r.status, inWindow: r.in_window,
});

/** S1: the next election that is not over yet for this AC (cancelled and finished ones are skipped). */
export async function electionFor(stateCode: string, acNo: number): Promise<Election | null> {
  const pool = await statePool(stateCode);
  const r = await pool.query<ElectionRow>(
    `SELECT ${ELECTION_COLS} FROM elections
      WHERE status NOT IN ('cancelled','done') AND (ac_nos IS NULL OR $1 = ANY(ac_nos))
        AND (poll_date + closes_at) > (now() AT TIME ZONE '${TZ}')
      ORDER BY poll_date, opens_at LIMIT 1`, [acNo]);
  return r.rows[0] ? toElection(r.rows[0]) : null;
}

/** What the phone needs to start polling day on its own, even offline (`/v1/me`). */
export async function pollingDayOf(ms: Membership[]) {
  const cache = new Map<string, Promise<Election | null>>();
  return Promise.all(ms.map(async (m) => {
    const k = `${m.stateCode}:${m.acNo}`;
    if (!cache.has(k)) cache.set(k, electionFor(m.stateCode, m.acNo));
    const e = await cache.get(k)!;
    return e ? { electionId: e.id, name: e.name, date: e.date, opensAt: e.opensAt, closesAt: e.closesAt, radiusM: m.boothRadiusM } : null;
  }));
}

// ---------- the at-booth check ----------

/** Metres between two points (haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type Status = 'checking' | 'at_booth' | 'away' | 'location_off' | 'no_booth_location';
export type EventKind = 'left' | 'still_away' | 'returned' | 'location_off' | 'location_on';
export interface Prev {
  status: Status; overCount: number; overSince: Date | null; awaySince: Date | null; stillAlerted: boolean; readingAt: Date | null;
  distanceM: number | null; partNo: number | null;
}
export interface Reading { permission: 'granted' | 'foreground' | 'denied' | 'off'; lat?: number; lng?: number; accuracy?: number; at: Date }
export interface Judged extends Omit<Prev, 'readingAt'> { readingAt: Date | null; usable: boolean; event: EventKind | null }

/** V2 + PD4: decides the new status from the previous one and a reading. Pure, so the same rules are easy to test. */
export function judge(prev: Prev | null, rd: Reading, booths: { no: number; lat: number; lng: number }[], radiusM: number, now = new Date()): Judged {
  const base = {
    status: prev?.status ?? 'checking', overCount: prev?.overCount ?? 0, overSince: prev?.overSince ?? null, awaySince: prev?.awaySince ?? null,
    stillAlerted: prev?.stillAlerted ?? false, readingAt: prev?.readingAt ?? null, distanceM: prev?.distanceM ?? null, partNo: prev?.partNo ?? null,
  } as Judged;
  const reset = { overCount: 0, overSince: null, awaySince: null, stillAlerted: false };
  const wasOff = prev?.status === 'location_off';
  if (rd.permission === 'denied' || rd.permission === 'off') {
    return { ...base, ...reset, status: 'location_off', usable: false, event: wasOff ? null : 'location_off' };
  }
  const usable = typeof rd.lat === 'number' && typeof rd.lng === 'number' && (rd.accuracy ?? Infinity) <= MAX_ACCURACY_M
    && (!prev?.readingAt || rd.at > prev.readingAt);
  if (!usable) {
    return { ...base, status: wasOff || !prev ? 'checking' : base.status, usable: false, event: wasOff ? 'location_on' : null };
  }
  const here = { lat: rd.lat!, lng: rd.lng! };
  if (!booths.length) {
    return { ...base, ...reset, status: 'no_booth_location', readingAt: rd.at, distanceM: null, partNo: null, usable: true, event: wasOff ? 'location_on' : null };
  }
  let best = { no: booths[0].no, d: Infinity };
  for (const b of booths) {
    const d = distanceM(here, b);
    if (d < best.d) best = { no: b.no, d };
  }
  const d = Math.round(best.d);
  const at = { readingAt: rd.at, distanceM: d, partNo: best.no, usable: true };
  if (d <= radiusM) {
    const event: EventKind | null = prev?.status === 'away' ? 'returned' : wasOff ? 'location_on' : null;
    return { ...base, ...reset, ...at, status: 'at_booth', event };
  }
  const overCount = base.overCount + 1;
  const overSince = base.overSince ?? rd.at;
  if (prev?.status === 'away') return { ...base, ...at, overCount, overSince, status: 'away', event: null };
  if (overCount >= 2 && rd.at.getTime() - overSince.getTime() >= AWAY_MIN_GAP_MS) {
    return { ...base, ...at, overCount, overSince, status: 'away', awaySince: now, stillAlerted: false, event: 'left' };
  }
  return { ...base, ...at, overCount, overSince, status: prev?.status === 'at_booth' ? 'at_booth' : 'checking', event: wasOff ? 'location_on' : null };
}

/** V2: a volunteer's phone reports. Stored only inside the polling-day window (O1). */
export async function report(m: Membership, rd: Reading, log?: (e: Error) => void) {
  if (m.role !== 'volunteer') throw forbidden();
  const e = await electionFor(m.stateCode, m.acNo);
  if (!e || !e.inWindow) return { stored: false, status: null };
  const pool = await statePool(m.stateCode);
  const b = await pool.query<{ part_no: number; lat: string; lng: string }>(
    `SELECT part_no, lat, lng FROM booths WHERE ac_no = $1 AND part_no = ANY($2) AND lat IS NOT NULL AND lng IS NOT NULL AND deleted_at IS NULL`,
    [m.acNo, m.booths]);
  const booths = b.rows.map((x) => ({ no: x.part_no, lat: Number(x.lat), lng: Number(x.lng) }));
  let j: Judged;
  const c = await core.connect();
  try {
    await c.query('BEGIN');
    const p = await c.query<{ status: Status; over_count: number; over_since: Date | null; away_since: Date | null; still_alerted: boolean; reading_at: Date | null; distance_m: number | null; part_no: number | null; poll_date: string }>(
      `SELECT status, over_count, over_since, away_since, still_alerted, reading_at, distance_m, part_no, to_char(poll_date, 'YYYY-MM-DD') AS poll_date
         FROM field_presence WHERE membership_id = $1 FOR UPDATE`, [m.id]);
    const row = p.rows[0];
    const prev: Prev | null = row && row.poll_date === e.date ? {
      status: row.status, overCount: row.over_count, overSince: row.over_since, awaySince: row.away_since, stillAlerted: row.still_alerted,
      readingAt: row.reading_at, distanceM: row.distance_m, partNo: row.part_no,
    } : null;
    j = judge(prev, rd, booths, m.boothRadiusM);
    await c.query(
      `INSERT INTO field_presence (membership_id, party_constituency_id, election_id, poll_date, permission, status, lat, lng, accuracy_m, distance_m, part_no,
                                   reading_at, over_count, over_since, away_since, still_alerted, reported_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
       ON CONFLICT (membership_id) DO UPDATE SET party_constituency_id = $2, election_id = $3, poll_date = $4, permission = $5, status = $6,
         lat = COALESCE($7, field_presence.lat), lng = COALESCE($8, field_presence.lng), accuracy_m = COALESCE($9, field_presence.accuracy_m),
         distance_m = $10, part_no = $11, reading_at = $12, over_count = $13, over_since = $14, away_since = $15, still_alerted = $16, reported_at = now()`,
      [m.id, m.partyAcId, e.id, e.date, rd.permission, j.status, j.usable ? rd.lat : null, j.usable ? rd.lng : null, j.usable ? Math.round(rd.accuracy ?? 0) : null,
        j.distanceM, j.partNo, j.readingAt, j.overCount, j.overSince, j.awaySince, j.stillAlerted]);
    if (j.event) await c.query(
      `INSERT INTO presence_events (party_constituency_id, membership_id, poll_date, kind, part_no, distance_m) VALUES ($1,$2,$3,$4,$5,$6)`,
      [m.partyAcId, m.id, e.date, j.event, j.partNo, j.distanceM]);
    await c.query('COMMIT');
  } catch (err) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    c.release();
  }
  // Tell the admins after the commit; a failed push never fails the report.
  if (j.event) await notifyNew(m.id, log).catch((err: Error) => log?.(err));
  return { stored: true, status: j.status, distanceM: j.distanceM, partNo: j.partNo };
}

// ---------- alerts (A1) ----------

const TEXT: Record<'en' | 'pa', Record<EventKind, (n: string, no: number | null) => string> & { body: (d: number | null, t: string) => string }> = {
  en: {
    left: (n, no) => `${n} left Booth ${no ?? ''}`.trim(),
    still_away: (n, no) => `${n} is still away from Booth ${no ?? ''}`.trim(),
    returned: (n, no) => `${n} is back at Booth ${no ?? ''}`.trim(),
    location_off: (n) => `${n} turned location off`,
    location_on: (n) => `${n} turned location on`,
    body: (d, t) => (d != null ? `${d} m away · ${t}` : t),
  },
  pa: {
    left: (n, no) => `${n} ਬੂਥ ${no ?? ''} ਤੋਂ ਦੂਰ ਚਲਾ ਗਿਆ`,
    still_away: (n, no) => `${n} ਹਾਲੇ ਵੀ ਬੂਥ ${no ?? ''} ਤੋਂ ਦੂਰ ਹੈ`,
    returned: (n, no) => `${n} ਬੂਥ ${no ?? ''} 'ਤੇ ਵਾਪਸ ਆ ਗਿਆ`,
    location_off: (n) => `${n} ਨੇ ਲੋਕੇਸ਼ਨ ਬੰਦ ਕਰ ਦਿੱਤੀ`,
    location_on: (n) => `${n} ਨੇ ਲੋਕੇਸ਼ਨ ਚਾਲੂ ਕੀਤੀ`,
    body: (d, t) => (d != null ? `${d} ਮੀਟਰ ਦੂਰ · ${t}` : t),
  },
};
const PUSHED: EventKind[] = ['left', 'still_away', 'returned', 'location_off'];

/** Pushes events not pushed yet for this volunteer (at most one call in flight per event thanks to `pushed_at`). */
async function notifyNew(volunteerMid: string, log?: (e: Error) => void) {
  if (!pushEnabled()) return;
  const ev = await core.query<{ id: string; kind: EventKind; part_no: number | null; distance_m: number | null; at: Date; pc: string; name: string }>(
    `UPDATE presence_events e SET pushed_at = now() FROM memberships m JOIN users u ON u.id = m.user_id
      WHERE e.membership_id = $1 AND e.pushed_at IS NULL AND m.id = e.membership_id
      RETURNING e.id, e.kind, e.part_no, e.distance_m, e.at, e.party_constituency_id AS pc, u.name`, [volunteerMid]);
  await pushEvents(ev.rows, log);
}

async function pushEvents(rows: { kind: EventKind; part_no: number | null; distance_m: number | null; at: Date; pc: string; name: string }[], log?: (e: Error) => void) {
  for (const e of rows) {
    if (!PUSHED.includes(e.kind)) continue;
    const admins = await core.query<{ token: string; mid: string; lang: string }>(
      `SELECT t.token, m.id AS mid, u.lang FROM memberships m JOIN users u ON u.id = m.user_id JOIN push_tokens t ON t.user_id = m.user_id
        WHERE m.party_constituency_id = $1 AND m.role = 'admin' AND m.status = 'approved'`, [e.pc]);
    const time = e.at.toLocaleTimeString('en-IN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true });
    const msgs = admins.rows.map((a) => {
      const tx = TEXT[a.lang === 'pa' ? 'pa' : 'en'];
      return { to: a.token, title: tx[e.kind](e.name, e.part_no), body: tx.body(e.kind === 'left' || e.kind === 'still_away' ? e.distance_m : null, time), data: { kind: e.kind, mid: a.mid } };
    });
    await sendPush(msgs, log);
  }
}

/** Every minute: "still away" after 15 minutes (once per away spell); delete data 30 days after the poll (O1). */
export async function runPresenceJobs(log?: (e: Error) => void) {
  const r = await core.query<{ membership_id: string; party_constituency_id: string; poll_date: string; part_no: number | null; distance_m: number | null }>(
    `UPDATE field_presence SET still_alerted = true
      WHERE status = 'away' AND NOT still_alerted AND away_since < now() - make_interval(mins => $1)
      RETURNING membership_id, party_constituency_id, poll_date, part_no, distance_m`, [STILL_AWAY_MIN]);
  for (const x of r.rows) {
    await core.query(`INSERT INTO presence_events (party_constituency_id, membership_id, poll_date, kind, part_no, distance_m) VALUES ($1,$2,$3,'still_away',$4,$5)`,
      [x.party_constituency_id, x.membership_id, x.poll_date, x.part_no, x.distance_m]);
    await notifyNew(x.membership_id, log);
  }
  await core.query(`DELETE FROM presence_events WHERE poll_date < current_date - $1::int`, [KEEP_DAYS]);
  await core.query(`DELETE FROM field_presence WHERE poll_date < current_date - $1::int`, [KEEP_DAYS]);
  return r.rowCount ?? 0;
}

// ---------- the polling-day page (A2) ----------

export type ViewStatus = Status | 'not_reporting' | 'not_shared';
export interface Customer { id: string; stateCode: string; acNo: number; radiusM: number }

export async function customerOf(pcId: string): Promise<Customer> {
  const r = await core.query<{ id: string; state_code: string; ac_no: number; booth_radius_m: number }>(
    `SELECT id, trim(state_code) AS state_code, ac_no, booth_radius_m FROM party_constituencies WHERE id = $1 AND deleted_at IS NULL`, [pcId]);
  if (!r.rowCount) throw forbidden();
  const x = r.rows[0];
  return { id: x.id, stateCode: x.state_code, acNo: x.ac_no, radiusM: x.booth_radius_m };
}

export async function pollingView(cu: Customer, seenBy?: string) {
  const e = await electionFor(cu.stateCode, cu.acNo);
  const vols = await core.query<{
    membership_id: string; name: string; mobile: string | null; booths: number[]; status: Status | null; permission: string | null;
    distance_m: number | null; part_no: number | null; lat: string | null; lng: string | null; reported_at: Date | null; stale: boolean | null;
  }>(
    `SELECT m.id AS membership_id, u.name, u.mobile,
            COALESCE((SELECT array_agg(mb.part_no ORDER BY mb.part_no) FROM membership_booths mb WHERE mb.membership_id = m.id), '{}') AS booths,
            f.status, f.permission, f.distance_m, f.part_no, f.lat, f.lng, f.reported_at,
            f.reported_at < now() - make_interval(mins => $3) AS stale
       FROM memberships m JOIN users u ON u.id = m.user_id
       LEFT JOIN field_presence f ON f.membership_id = m.id AND f.poll_date = $2::date
      WHERE m.party_constituency_id = $1 AND m.role = 'volunteer' AND m.status = 'approved'
      ORDER BY u.name`, [cu.id, e?.date ?? '1900-01-01', NOT_REPORTING_MIN]);
  const volunteers = vols.rows.map((v) => {
    const status: ViewStatus = !v.status ? 'not_shared' : v.status !== 'location_off' && v.stale ? 'not_reporting' : v.status;
    return {
      membershipId: v.membership_id, name: v.name, mobile: v.mobile, booths: v.booths, status, permission: v.permission,
      distanceM: v.distance_m, partNo: v.part_no, lat: v.lat != null ? Number(v.lat) : null, lng: v.lng != null ? Number(v.lng) : null,
      reportedAt: v.reported_at?.toISOString() ?? null,
    };
  });
  const pool = await statePool(cu.stateCode);
  const b = await pool.query<{ part_no: number; name: string; lat: string | null; lng: string | null }>(
    `SELECT part_no, name, lat, lng FROM booths WHERE ac_no = $1 AND deleted_at IS NULL ORDER BY part_no`, [cu.acNo]);
  const booths = b.rows.map((x) => {
    const assigned = volunteers.filter((v) => v.booths.includes(x.part_no));
    return {
      no: x.part_no, name: x.name, lat: x.lat != null ? Number(x.lat) : null, lng: x.lng != null ? Number(x.lng) : null,
      volunteers: assigned.length, atBooth: assigned.filter((v) => v.status === 'at_booth' && v.partNo === x.part_no).length,
    };
  });
  const n = (s: ViewStatus) => volunteers.filter((v) => v.status === s).length;
  const tiles = {
    atBooth: n('at_booth'), away: n('away'), notReporting: n('not_reporting'), locationOff: n('location_off'), notShared: n('not_shared'),
    missing: n('no_booth_location'), checking: n('checking'),
    sharing: n('at_booth') + n('away') + n('no_booth_location') + n('checking'),
    unattendedBooths: booths.filter((x) => x.lat != null && x.volunteers > 0 && x.atBooth === 0).length,
    boothsMissingLocation: booths.filter((x) => x.lat == null).length,
  };
  return {
    election: e ? { id: e.id, name: e.name, kind: e.kind, date: e.date, opensAt: e.opensAt, closesAt: e.closesAt } : null,
    inWindow: !!e?.inWindow, radiusM: cu.radiusM, tiles, booths, volunteers,
    unseen: seenBy ? await unseenCount(cu.id, seenBy) : 0,
  };
}

export async function unseenCount(pcId: string, adminMid: string) {
  const r = await core.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM presence_events e
      WHERE e.party_constituency_id = $1 AND e.at > COALESCE((SELECT seen_at FROM presence_seen WHERE membership_id = $2), '-infinity'::timestamptz)`,
    [pcId, adminMid]);
  return r.rows[0].n;
}

export async function alerts(pcId: string, adminMid: string) {
  const r = await core.query<{ id: string; kind: EventKind; membership_id: string; name: string; part_no: number | null; distance_m: number | null; at: Date }>(
    `SELECT e.id, e.kind, e.membership_id, u.name, e.part_no, e.distance_m, e.at
       FROM presence_events e JOIN memberships m ON m.id = e.membership_id JOIN users u ON u.id = m.user_id
      WHERE e.party_constituency_id = $1 ORDER BY e.at DESC, e.id DESC LIMIT 200`, [pcId]);
  return {
    items: r.rows.map((x) => ({ id: x.id, kind: x.kind, membershipId: x.membership_id, name: x.name, partNo: x.part_no, distanceM: x.distance_m, at: x.at.toISOString() })),
    unseen: await unseenCount(pcId, adminMid),
  };
}

export async function markSeen(adminMid: string) {
  await core.query(`INSERT INTO presence_seen (membership_id, seen_at) VALUES ($1, now()) ON CONFLICT (membership_id) DO UPDATE SET seen_at = now()`, [adminMid]);
}
