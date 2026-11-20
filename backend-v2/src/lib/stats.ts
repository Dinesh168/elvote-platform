/**
 * Booth counters. Writes mark a booth "dirty"; the worker recomputes dirty booths every few seconds.
 * A booth is ~1,000 voters, so one recompute is a few milliseconds.
 */
import type pg from 'pg';
import { allStateCodes, inParty, statePool } from '../db/pools.js';

/** Current election of a state DB (polling day marks belong to it). */
export async function currentElectionId(c: pg.PoolClient | pg.Pool): Promise<string | null> {
  const r = await c.query<{ id: string }>(
    `SELECT id FROM elections WHERE status IN ('polling','upcoming') ORDER BY (status = 'polling') DESC, poll_date LIMIT 1`,
  );
  return r.rows[0]?.id ?? null;
}

const RECOMPUTE = `
WITH v AS (
  SELECT v.id, v.age, v.gender, v.house_no, COALESCE(c.mobile, v.mobile) AS mobile,
         c.group_code, c.residence, c.needs_help, c.first_contacted_at,
         (pm.voter_id IS NOT NULL AND pm.undone_at IS NULL) AS voted
    FROM voters v
    LEFT JOIN voter_contacts c ON c.party_id = $1::uuid AND c.ac_no = v.ac_no AND c.voter_id = v.id
    LEFT JOIN poll_marks pm ON pm.election_id = $3::uuid AND pm.party_id = $1::uuid AND pm.ac_no = v.ac_no AND pm.voter_id = v.id
   WHERE v.booth_id = $2::uuid AND v.status <> 'deleted' AND v.ac_no = (SELECT ac_no FROM booths WHERE id = $2)
), h AS (
  SELECT house_no,
         count(*) FILTER (WHERE first_contacted_at IS NOT NULL) AS visited,
         count(*) FILTER (WHERE mobile IS NOT NULL) AS mob,
         count(*) FILTER (WHERE group_code = 'our') AS o,
         count(*) FILTER (WHERE group_code = 'target') AS t,
         count(*) FILTER (WHERE group_code = 'opp') AS p
    FROM v GROUP BY house_no
)
INSERT INTO stats_booth AS s (party_id, booth_id, ac_no, part_no, total, met, our, target, opp, moved,
  with_mobile, our_mobile, target_mobile, opp_mobile, houses, houses_visited, houses_with_mobile, our_houses, target_houses, opp_houses,
  first_time, young, mid, senior, male, female, third, help_needed, voted, our_voted, target_voted, opp_voted, help_voted, updated_at)
SELECT $1::uuid, b.id, b.ac_no, b.part_no,
  (SELECT count(*) FROM v),
  (SELECT count(*) FROM v WHERE group_code IS NOT NULL),
  (SELECT count(*) FROM v WHERE group_code = 'our'),
  (SELECT count(*) FROM v WHERE group_code = 'target'),
  (SELECT count(*) FROM v WHERE group_code = 'opp'),
  (SELECT count(*) FROM v WHERE residence = 'moved'),
  (SELECT count(*) FROM v WHERE mobile IS NOT NULL),
  (SELECT count(*) FROM v WHERE mobile IS NOT NULL AND group_code = 'our'),
  (SELECT count(*) FROM v WHERE mobile IS NOT NULL AND group_code = 'target'),
  (SELECT count(*) FROM v WHERE mobile IS NOT NULL AND group_code = 'opp'),
  (SELECT count(*) FROM h),
  (SELECT count(*) FROM h WHERE visited > 0),
  (SELECT count(*) FROM h WHERE mob > 0),
  (SELECT count(*) FROM h WHERE o + t + p > 0 AND o > t AND o > p),
  (SELECT count(*) FROM h WHERE o + t + p > 0 AND NOT (o > t AND o > p) AND NOT (p > t AND p > o)),
  (SELECT count(*) FROM h WHERE o + t + p > 0 AND p > t AND p > o),
  (SELECT count(*) FROM v WHERE age BETWEEN 18 AND 20),
  (SELECT count(*) FROM v WHERE age BETWEEN 18 AND 34),
  (SELECT count(*) FROM v WHERE age BETWEEN 35 AND 59),
  (SELECT count(*) FROM v WHERE age >= 60),
  (SELECT count(*) FROM v WHERE gender = 'M'),
  (SELECT count(*) FROM v WHERE gender = 'F'),
  (SELECT count(*) FROM v WHERE gender = 'T'),
  (SELECT count(*) FROM v WHERE needs_help),
  (SELECT count(*) FROM v WHERE voted),
  (SELECT count(*) FROM v WHERE voted AND group_code = 'our'),
  (SELECT count(*) FROM v WHERE voted AND group_code = 'target'),
  (SELECT count(*) FROM v WHERE voted AND group_code = 'opp'),
  (SELECT count(*) FROM v WHERE voted AND needs_help),
  now()
FROM booths b WHERE b.id = $2
ON CONFLICT (party_id, booth_id) DO UPDATE SET
  total = EXCLUDED.total, met = EXCLUDED.met, our = EXCLUDED.our, target = EXCLUDED.target, opp = EXCLUDED.opp, moved = EXCLUDED.moved,
  with_mobile = EXCLUDED.with_mobile, our_mobile = EXCLUDED.our_mobile, target_mobile = EXCLUDED.target_mobile, opp_mobile = EXCLUDED.opp_mobile,
  houses = EXCLUDED.houses, houses_visited = EXCLUDED.houses_visited, houses_with_mobile = EXCLUDED.houses_with_mobile,
  our_houses = EXCLUDED.our_houses, target_houses = EXCLUDED.target_houses, opp_houses = EXCLUDED.opp_houses,
  first_time = EXCLUDED.first_time, young = EXCLUDED.young, mid = EXCLUDED.mid, senior = EXCLUDED.senior,
  male = EXCLUDED.male, female = EXCLUDED.female, third = EXCLUDED.third, help_needed = EXCLUDED.help_needed,
  voted = EXCLUDED.voted, our_voted = EXCLUDED.our_voted, target_voted = EXCLUDED.target_voted, opp_voted = EXCLUDED.opp_voted,
  help_voted = EXCLUDED.help_voted, updated_at = now()`;

const DAILY = `
INSERT INTO stats_booth_daily (party_id, booth_id, ac_no, day, contacted)
SELECT $1::uuid, $2::uuid, b.ac_no, (e.at AT TIME ZONE 'Asia/Kolkata')::date, count(DISTINCT e.voter_id)
  FROM contact_events e JOIN booths b ON b.id = $2
 WHERE e.party_id = $1 AND e.ac_no = b.ac_no AND e.part_no = b.part_no AND e.at > now() - interval '30 days'
 GROUP BY 1, 2, 3, 4
ON CONFLICT (party_id, booth_id, day) DO UPDATE SET contacted = EXCLUDED.contacted`;

export async function recomputeBooth(c: pg.PoolClient, partyId: string, boothId: string, electionId: string | null) {
  await c.query(RECOMPUTE, [partyId, boothId, electionId ?? '00000000-0000-0000-0000-000000000000']);
  await c.query(DAILY, [partyId, boothId]);
}

/** Processes dirty booths in every state DB. Returns how many booths were recomputed. */
export async function processDirty(limit = 200): Promise<number> {
  let n = 0;
  for (const code of await allStateCodes()) {
    const pool = await statePool(code);
    n += await inParty(pool, 'ALL', async (c) => {
      const dirty = await c.query<{ party_id: string; booth_id: string }>(
        `DELETE FROM stats_dirty WHERE (party_id, booth_id) IN (
           SELECT party_id, booth_id FROM stats_dirty ORDER BY marked_at LIMIT $1 FOR UPDATE SKIP LOCKED)
         RETURNING party_id, booth_id`,
        [limit],
      );
      if (!dirty.rowCount) return 0;
      const el = await currentElectionId(c);
      for (const d of dirty.rows) await recomputeBooth(c, d.party_id, d.booth_id, el);
      return dirty.rowCount;
    });
  }
  return n;
}
