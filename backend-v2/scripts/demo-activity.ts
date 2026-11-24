/**
 * Pitch-ready demo activity (spec demo-activity D1–D6). Demo / local / test databases only, and only with --demo.
 * For every team: booth area from the election data's tehsil, 6 zones named after their main village, ~30 made-up
 * volunteers (no phone, no email that reaches anyone, cannot sign in), three weeks of canvassing that follows each booth's
 * last result, three tasks, two admin strength overrides. Replaces earlier demo activity of these teams. No voter phones.
 * Usage: npx tsx scripts/demo-activity.ts --demo
 */
import pg from 'pg';
import { superUrl } from '../src/config.js';
import { autoStrength, loadAc, pickParty } from '../src/lib/pastResults.js';
import { processDirty } from '../src/lib/stats.js';
import { closeAll } from '../src/db/pools.js';
import { dbNames } from './migrate.js';
import { seedAllowed } from './seed-guard.js';

const PB_NAMES = ['Gurpreet Singh', 'Harjit Kaur', 'Manpreet Singh', 'Simran Kaur', 'Jaswinder Singh', 'Navneet Kaur', 'Kuldeep Singh', 'Amandeep Kaur', 'Baljit Singh',
  'Rajwinder Kaur', 'Sukhwinder Singh', 'Paramjit Kaur', 'Ranjit Singh', 'Harpreet Kaur', 'Satnam Singh', 'Gurmeet Kaur', 'Rakesh Kumar', 'Sunita Rani', 'Vijay Sharma',
  'Neelam Devi', 'Ashok Kumar', 'Pooja Sharma', 'Jagdeep Singh', 'Kamaljit Kaur', 'Harpal Singh', 'Manjit Kaur', 'Navdeep Singh', 'Rekha Rani', 'Gurdev Singh', 'Jasvir Kaur'];
const UP_NAMES = ['Ramesh Yadav', 'Sunita Devi', 'Suresh Gupta', 'Geeta Singh', 'Rajesh Verma', 'Kamla Devi', 'Mukesh Pandey', 'Asha Tiwari', 'Dinesh Rai', 'Usha Yadav',
  'Santosh Kumar', 'Pushpa Devi', 'Anil Chauhan', 'Rekha Gupta', 'Sunil Singh', 'Anita Verma', 'Vinod Tiwari', 'Savitri Devi', 'Ashok Yadav', 'Kiran Singh',
  'Ram Prakash', 'Neha Pandey', 'Shyam Lal', 'Pooja Rai', 'Rakesh Chauhan', 'Priyanka Singh', 'Pankaj Yadav', 'Manju Devi', 'Ajay Gupta', 'Manoj Kumar'];
const DAYS = 21;
const ZONES = 6;
// Our / Target / Opp share of met voters by the booth's last result (S won by margin+, M close, W lost by margin+).
const MIX = { S: [0.55, 0.27, 0.18], M: [0.38, 0.32, 0.3], W: [0.24, 0.26, 0.5] } as const;

let seed = 2027;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const shuffle = <T,>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

async function main() {
  const names = dbNames();
  const ok = seedAllowed({ nodeEnv: process.env.NODE_ENV, argv: process.argv, coreDb: names.core });
  if (!ok.ok) throw new Error(ok.reason);
  const core = new pg.Client({ connectionString: superUrl(names.core) });
  await core.connect();
  const states = new Map<string, pg.Pool>();
  for (const s of names.states) states.set(s.code, new pg.Pool({ connectionString: superUrl(s.db), max: 2 }));
  try {
    const teams = (await core.query<{ id: string; party_id: string; state: string; ac_no: number; short: string | null; pname: string; margin: number }>(
      `SELECT pc.id, pc.party_id, trim(pc.state_code) AS state, pc.ac_no, p.short_name AS short, p.name AS pname, pc.result_margin AS margin
         FROM party_constituencies pc JOIN parties p ON p.id = pc.party_id WHERE pc.deleted_at IS NULL ORDER BY pc.ac_no`)).rows;
    const sup = (await core.query<{ user_id: string }>('SELECT user_id FROM platform_admins WHERE revoked_at IS NULL LIMIT 1')).rows[0]?.user_id;
    if (!sup) throw new Error('No super-admin to own the demo tasks.');

    for (const tm of teams) {
      const db = states.get(tm.state);
      if (!db) continue;
      const P = tm.party_id;
      const ac = tm.ac_no;

      // ---- clean earlier demo activity of this team (voters and booths stay) ----
      for (const sql of ['DELETE FROM contact_events WHERE party_id = $1 AND ac_no = $2', 'DELETE FROM voter_contacts WHERE party_id = $1 AND ac_no = $2',
        'DELETE FROM stats_booth_daily WHERE party_id = $1 AND ac_no = $2', 'DELETE FROM stats_booth WHERE party_id = $1 AND ac_no = $2',
        'DELETE FROM zone_booths WHERE party_id = $1 AND booth_id IN (SELECT id FROM booths WHERE ac_no = $2)', 'DELETE FROM zones WHERE party_id = $1 AND ac_no = $2',
        'DELETE FROM booth_party_info WHERE party_id = $1 AND booth_id IN (SELECT id FROM booths WHERE ac_no = $2)',
        'DELETE FROM drive_assignees WHERE drive_id IN (SELECT id FROM drives WHERE party_id = $1 AND ac_no = $2)',
        'DELETE FROM drive_scope WHERE drive_id IN (SELECT id FROM drives WHERE party_id = $1 AND ac_no = $2)', 'DELETE FROM drives WHERE party_id = $1 AND ac_no = $2']) {
        await db.query(sql, [P, ac]);
      }
      const old = await core.query<{ user_id: string }>(
        `DELETE FROM memberships m USING users u WHERE m.user_id = u.id AND m.party_constituency_id = $1 AND u.email LIKE '%@demo.invalid' RETURNING m.user_id`, [tm.id]);
      if (old.rowCount) await core.query(`DELETE FROM users WHERE id = ANY($1) AND email LIKE '%@demo.invalid'`, [old.rows.map((x) => x.user_id)]);

      // ---- D1 area from the election data's tehsil ----
      const area = await db.query(
        `UPDATE booths b SET area = r.tehsil FROM (SELECT DISTINCT ON (part_no) part_no, tehsil FROM past_booth_results
            WHERE ac_no = $1 AND tehsil IS NOT NULL AND tehsil <> '' ORDER BY part_no, year DESC) r
          WHERE b.ac_no = $1 AND b.part_no = r.part_no`, [ac]);

      const booths = (await db.query<{ id: string; part_no: number; locality: string | null }>(
        'SELECT id, part_no, locality FROM booths WHERE ac_no = $1 AND deleted_at IS NULL ORDER BY part_no', [ac])).rows;
      const res = await loadAc(db, ac);
      const auto = autoStrength(res, pickParty(res, undefined, { short: tm.short, name: tm.pname }), tm.margin ?? 100);

      // ---- D2 six zones in booth order, named after their main village ----
      const per = Math.ceil(booths.length / ZONES);
      const zoneOf = new Map<number, string>();
      for (let z = 0; z < ZONES; z++) {
        const part = booths.slice(z * per, (z + 1) * per);
        if (!part.length) continue;
        const count = new Map<string, number>();
        for (const b of part) if (b.locality) count.set(b.locality, (count.get(b.locality) ?? 0) + 1);
        const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        const name = (top ? `${top}` : `Zone ${z + 1}`).slice(0, 40);
        const id = (await db.query<{ id: string }>('INSERT INTO zones (party_id, ac_no, number, name) VALUES ($1,$2,$3,$4) RETURNING id', [P, ac, z + 1, name])).rows[0].id;
        for (const b of part) { await db.query('INSERT INTO zone_booths (party_id, booth_id, zone_id) VALUES ($1,$2,$3)', [P, b.id, id]); zoneOf.set(b.part_no, id); }
      }
      await core.query('UPDATE party_constituencies SET zone_count = $2, max_zones = GREATEST(max_zones, $2) WHERE id = $1', [tm.id, ZONES]);

      // ---- D3 ~30 made-up volunteers covering ~75 % of booths (1–3 booths each) ----
      const pool = tm.state === 'UP' ? UP_NAMES : PB_NAMES;
      const covered = shuffle(booths.map((b) => b.part_no)).slice(0, Math.round(booths.length * 0.75)).sort((a, b) => a - b);
      const vols: { id: string; booths: number[] }[] = [];
      const nVol = Math.min(30, covered.length);
      for (let i = 0; i < nVol; i++) {
        const uid = (await core.query<{ id: string }>('INSERT INTO users (email, name) VALUES ($1,$2) RETURNING id', [`demo.vol.${tm.state.toLowerCase()}${ac}.${tm.id.slice(-6)}.${i + 1}@demo.invalid`, pool[i % pool.length]])).rows[0].id;
        const mid = (await core.query<{ id: string }>(
          `INSERT INTO memberships (user_id, party_constituency_id, role, status, source, decided_by, decided_at, requested_at)
           VALUES ($1,$2,'volunteer','approved','direct',$3, now() - interval '25 days', now() - interval '26 days') RETURNING id`, [uid, tm.id, sup])).rows[0].id;
        vols.push({ id: uid, booths: [] });
        void mid;
      }
      covered.forEach((no, i) => vols[i % vols.length].booths.push(no));
      for (const v of vols) {
        const m = await core.query<{ id: string }>('SELECT id FROM memberships WHERE user_id = $1 AND party_constituency_id = $2', [v.id, tm.id]);
        for (const no of v.booths) await core.query('INSERT INTO membership_booths (membership_id, part_no, approved_by) VALUES ($1,$2,$3)', [m.rows[0].id, no, sup]);
      }
      const volOf = new Map<number, string>();
      for (const v of vols) for (const no of v.booths) volOf.set(no, v.id);

      // ---- D4 three weeks of canvassing that follows the last result ----
      let met = 0;
      for (const b of booths) {
        const g = auto.get(b.part_no) ?? 'M';
        const mix = MIX[g];
        const metP = (volOf.has(b.part_no) ? 0.38 : 0.12) + rnd() * 0.22;
        const by = volOf.get(b.part_no) ?? vols[Math.floor(rnd() * vols.length)].id;
        const r = await db.query(
          `INSERT INTO voter_contacts (party_id, ac_no, voter_id, part_no, group_code, residence, needs_help, first_contacted_at, last_contacted_at, last_contacted_by)
           SELECT $1, v.ac_no, v.id, v.part_no,
                  CASE WHEN x.r < $4 THEN 'our' WHEN x.r < $4 + $5 THEN 'target' ELSE 'opp' END,
                  CASE WHEN x.r2 < 0.03 THEN 'moved' WHEN x.r2 < 0.038 THEN 'died' WHEN x.r2 < 0.045 THEN 'not_found' ELSE 'here' END,
                  (COALESCE(v.age, 0) >= 75 AND x.r3 < 0.45),
                  x.ts, x.ts, $6
             FROM voters v
             CROSS JOIN LATERAL (SELECT random() AS r, random() AS r2, random() AS r3,
                                        now() - (power(random(), 1.7) * interval '${DAYS} days') AS ts, random() AS pick) x
            WHERE v.ac_no = $2 AND v.part_no = $3 AND v.status IN ('active','added') AND x.pick < $7`,
          [P, ac, b.part_no, mix[0], mix[1], by, metP]);
        met += r.rowCount ?? 0;
      }
      await db.query(
        `INSERT INTO contact_events (at, client_at, party_id, ac_no, part_no, voter_id, user_id, change)
         SELECT first_contacted_at, first_contacted_at, party_id, ac_no, part_no, voter_id, last_contacted_by,
                jsonb_strip_nulls(jsonb_build_object('group', group_code, 'residence', NULLIF(residence, 'here'), 'needsHelp', NULLIF(needs_help, false)))
           FROM voter_contacts WHERE party_id = $1 AND ac_no = $2`, [P, ac]);

      // ---- D5 three running tasks ----
      for (const [kind, name, segment, start, end] of [['senior', null, { ageMin: 60 }, -14, 10], ['first_time', null, { ageMin: 18, ageMax: 20 }, -7, 14], ['other', 'Door to door', {}, -21, 20]] as const) {
        await db.query(
          `INSERT INTO drives (party_id, ac_no, kind, custom_name, segment, starts_on, ends_on, scope, created_by)
           VALUES ($1,$2,$3,$4,$5,(now() AT TIME ZONE 'Asia/Kolkata')::date + $6::int,(now() AT TIME ZONE 'Asia/Kolkata')::date + $7::int,'all',$8)`,
          [P, ac, kind, name, JSON.stringify(segment), start, end, sup]);
      }

      // ---- D6 two admin overrides: a won booth judged Weak now, a lost booth judged Strong now ----
      const won = booths.find((b) => auto.get(b.part_no) === 'S');
      const lost = booths.find((b) => auto.get(b.part_no) === 'W');
      if (won) await db.query('INSERT INTO booth_party_info (party_id, booth_id, strength, updated_by) VALUES ($1,$2,$3,$4)', [P, won.id, 'W', sup]);
      if (lost) await db.query('INSERT INTO booth_party_info (party_id, booth_id, strength, updated_by) VALUES ($1,$2,$3,$4)', [P, lost.id, 'S', sup]);

      await db.query('INSERT INTO stats_dirty (party_id, booth_id) SELECT $1, id FROM booths WHERE ac_no = $2 ON CONFLICT DO NOTHING', [P, ac]);
      console.log(`${tm.state} AC ${ac}: area on ${area.rowCount} booths · ${ZONES} zones · ${vols.length} volunteers on ${covered.length}/${booths.length} booths · ${met} voters met · 3 tasks · overrides ${won ? won.part_no : '-'}→W ${lost ? lost.part_no : '-'}→S`);
    }
    let n = 0;
    for (let k; (k = await processDirty(500)) > 0;) n += k;
    console.log(`stats recomputed for ${n} booths`);
  } finally {
    await core.end();
    for (const p of states.values()) await p.end();
    await closeAll();
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
