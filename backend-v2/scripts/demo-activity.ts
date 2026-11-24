/**
 * Pitch-ready, realistic demo (spec demo-activity D1–D6, R1–R4, F1–F6). Demo / local / test databases only, with --demo.
 * Re-running replaces the earlier demo activity of every team (voters, booths and results stay).
 *
 * R1 ~25–35 % met three weeks in; ahead where the team was strong and where volunteers are active, some booths barely started.
 * R2 a few volunteers do most of the work, some are quiet (nothing for 3+ days); morning / evening visits, lower Sundays,
 *    a pick-up in the last week.
 * R3 a house mostly votes together; groups follow the booth's last result. R4 ~3 % moved, 1 % died, 1 % not found,
 *    elderly marked "needs help"; new 18–20 voters picked up by the New-voters task.
 * F1 volunteers approved / waiting / rejected (with reasons) / removed; F2 admin access requests; F3 4 tasks; F4 zones,
 *    3 strength overrides, last sync / unsent; F5 reminders sent to quiet volunteers, candidate text.
 * People are made up (email @demo.invalid, no phone, cannot sign in). Voter mobiles are the clearly fake 0000000000.
 * Usage: npx tsx scripts/demo-activity.ts --demo
 */
import pg from 'pg';
import { superUrl } from '../src/config.js';
import { autoStrength, loadAc, pickParty } from '../src/lib/pastResults.js';
import { processDirty } from '../src/lib/stats.js';
import { closeAll } from '../src/db/pools.js';
import { dbNames } from './migrate.js';
import { seedAllowed } from './seed-guard.js';

const PB = ['Gurpreet Singh', 'Harjit Kaur', 'Manpreet Singh', 'Simran Kaur', 'Jaswinder Singh', 'Navneet Kaur', 'Kuldeep Singh', 'Amandeep Kaur', 'Baljit Singh',
  'Rajwinder Kaur', 'Sukhwinder Singh', 'Paramjit Kaur', 'Ranjit Singh', 'Harpreet Kaur', 'Satnam Singh', 'Gurmeet Kaur', 'Rakesh Kumar', 'Sunita Rani', 'Vijay Sharma',
  'Neelam Devi', 'Ashok Kumar', 'Pooja Sharma', 'Jagdeep Singh', 'Kamaljit Kaur', 'Harpal Singh', 'Manjit Kaur', 'Navdeep Singh', 'Rekha Rani', 'Gurdev Singh', 'Jasvir Kaur',
  'Tejinder Singh', 'Balwinder Kaur', 'Inderjit Singh', 'Sandeep Kaur', 'Lakhwinder Singh', 'Mohinder Pal', 'Ravinder Kaur', 'Pritpal Singh', 'Charanjit Kaur', 'Bhupinder Singh'];
const UP = ['Ramesh Yadav', 'Sunita Devi', 'Suresh Gupta', 'Geeta Singh', 'Rajesh Verma', 'Kamla Devi', 'Mukesh Pandey', 'Asha Tiwari', 'Dinesh Rai', 'Usha Yadav',
  'Santosh Kumar', 'Pushpa Devi', 'Anil Chauhan', 'Rekha Gupta', 'Sunil Singh', 'Anita Verma', 'Vinod Tiwari', 'Savitri Devi', 'Ashok Yadav', 'Kiran Singh',
  'Ram Prakash', 'Neha Pandey', 'Shyam Lal', 'Pooja Rai', 'Rakesh Chauhan', 'Priyanka Singh', 'Pankaj Yadav', 'Manju Devi', 'Ajay Gupta', 'Manoj Kumar',
  'Brijesh Mishra', 'Sarita Yadav', 'Umesh Prasad', 'Lalita Devi', 'Arvind Singh', 'Shanti Devi', 'Deepak Rai', 'Mamta Gupta', 'Sanjay Verma', 'Radha Devi'];
const CANDIDATE: Record<string, [string, string]> = { PB: ['Harjinder Singh Dhillon', 'Har ghar tak, har vote tak'], UP: ['Rajendra Prasad Singh', 'Sabka saath, har booth saath'] };
const DAYS = 21;
const ZONES = 6;
const MIX = { S: [0.55, 0.27, 0.18], M: [0.38, 0.32, 0.3], W: [0.24, 0.26, 0.5] } as const;
const REJECT = ['Not from this area', 'Duplicate request', 'Not a party worker'];

let seed = 2027;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const shuffle = <T,>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

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
    if (!sup) throw new Error('No super-admin to own the demo records.');

    // ---- clean every earlier demo person (and their requests / reminders) ----
    const demoUsers = (await core.query<{ id: string }>(`SELECT id FROM users WHERE email LIKE '%@demo.invalid'`)).rows.map((x) => x.id);
    if (demoUsers.length) {
      await core.query('DELETE FROM reminders_sent WHERE user_id = ANY($1)', [demoUsers]);
      await core.query('DELETE FROM access_requests WHERE user_id = ANY($1)', [demoUsers]);
      await core.query('DELETE FROM memberships WHERE user_id = ANY($1)', [demoUsers]);
      await core.query('DELETE FROM users WHERE id = ANY($1)', [demoUsers]);
    }

    for (const tm of teams) {
      const db = states.get(tm.state);
      if (!db) continue;
      const P = tm.party_id;
      const ac = tm.ac_no;
      const tag = `${tm.state.toLowerCase()}${ac}.${tm.id.slice(-6)}`;
      const pool = shuffle([...(tm.state === 'UP' ? UP : PB)]);
      let nameAt = 0;
      const person = async (role: string, i: number) =>
        (await core.query<{ id: string }>('INSERT INTO users (email, name) VALUES ($1,$2) RETURNING id', [`demo.${role}.${tag}.${i}@demo.invalid`, pool[nameAt++ % pool.length]])).rows[0].id;

      for (const sql of ['DELETE FROM contact_events WHERE party_id = $1 AND ac_no = $2', 'DELETE FROM voter_contacts WHERE party_id = $1 AND ac_no = $2',
        'DELETE FROM stats_booth_daily WHERE party_id = $1 AND ac_no = $2', 'DELETE FROM stats_booth WHERE party_id = $1 AND ac_no = $2',
        'DELETE FROM zone_booths WHERE party_id = $1 AND booth_id IN (SELECT id FROM booths WHERE ac_no = $2)', 'DELETE FROM zones WHERE party_id = $1 AND ac_no = $2',
        'DELETE FROM booth_party_info WHERE party_id = $1 AND booth_id IN (SELECT id FROM booths WHERE ac_no = $2)',
        'DELETE FROM drive_assignees WHERE drive_id IN (SELECT id FROM drives WHERE party_id = $1 AND ac_no = $2)',
        'DELETE FROM drive_scope WHERE drive_id IN (SELECT id FROM drives WHERE party_id = $1 AND ac_no = $2)', 'DELETE FROM drives WHERE party_id = $1 AND ac_no = $2']) {
        await db.query(sql, [P, ac]);
      }

      // ---- D1 area; booths; last result per booth ----
      await db.query(
        `UPDATE booths b SET area = r.tehsil FROM (SELECT DISTINCT ON (part_no) part_no, tehsil FROM past_booth_results
            WHERE ac_no = $1 AND tehsil IS NOT NULL AND tehsil <> '' ORDER BY part_no, year DESC) r
          WHERE b.ac_no = $1 AND b.part_no = r.part_no`, [ac]);
      const booths = (await db.query<{ id: string; part_no: number; locality: string | null }>(
        'SELECT id, part_no, locality FROM booths WHERE ac_no = $1 AND deleted_at IS NULL ORDER BY part_no', [ac])).rows;
      const res = await loadAc(db, ac);
      const auto = autoStrength(res, pickParty(res, undefined, { short: tm.short, name: tm.pname }), tm.margin ?? 100);

      // ---- zones in booth order, named after their main village (unique names) ----
      const per = Math.ceil(booths.length / ZONES);
      const used = new Set<string>();
      for (let z = 0; z < ZONES; z++) {
        const part = booths.slice(z * per, (z + 1) * per);
        if (!part.length) continue;
        const count = new Map<string, number>();
        for (const b of part) if (b.locality) count.set(b.locality, (count.get(b.locality) ?? 0) + 1);
        let name = ([...count.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k).find((k) => !used.has(k)) ?? `Zone ${z + 1}`).slice(0, 40);
        if (used.has(name)) name = `${name.slice(0, 35)} ${z + 1}`;
        used.add(name);
        const id = (await db.query<{ id: string }>('INSERT INTO zones (party_id, ac_no, number, name) VALUES ($1,$2,$3,$4) RETURNING id', [P, ac, z + 1, name])).rows[0].id;
        for (const b of part) await db.query('INSERT INTO zone_booths (party_id, booth_id, zone_id) VALUES ($1,$2,$3)', [P, b.id, id]);
      }
      const cand = CANDIDATE[tm.state] ?? [null, null];
      await core.query(
        `UPDATE party_constituencies SET zone_count = $2, max_zones = GREATEST(max_zones, $2), candidate_name = $3, candidate_slogan = $4,
                candidate_message = $5, daily_target = 25 WHERE id = $1`,
        [tm.id, ZONES, cand[0], cand[1], 'Thank you for every door you knock. Meet each voter, note their view, and come back to the undecided ones.']);

      // ---- F1 volunteers: 30 approved (top / average / quiet), 5 waiting, 3 rejected, 1 removed ----
      const order = shuffle(booths.map((b) => b.part_no));
      const cut = Math.round(booths.length * 0.72);
      const covered = order.slice(0, cut).sort((a, b) => a - b);
      const free = order.slice(cut);
      type Vol = { uid: string; mid: string; tier: 'top' | 'avg' | 'quiet'; booths: number[] };
      const vols: Vol[] = [];
      const nVol = Math.min(30, covered.length);
      for (let i = 0; i < nVol; i++) {
        const tier: Vol['tier'] = i < 6 ? 'top' : i < 25 ? 'avg' : 'quiet';
        const uid = await person('vol', i + 1);
        const syncAgo = tier === 'quiet' ? `${4 + Math.floor(rnd() * 3)} days` : `${Math.floor(rnd() * 20) + 1} hours`;
        const unsent = i === 7 ? 3 : i === 12 ? 12 : 0;
        const mid = (await core.query<{ id: string }>(
          `INSERT INTO memberships (user_id, party_constituency_id, role, status, decided_by, decided_at, requested_at, last_sync_at, unsent)
           VALUES ($1,$2,'volunteer','approved',$3, now() - interval '24 days', now() - interval '25 days' + ($4 || ' hours')::interval, now() - $5::interval, $6) RETURNING id`,
          [uid, tm.id, sup, String(Math.floor(rnd() * 30)), syncAgo, unsent])).rows[0].id;
        vols.push({ uid, mid, tier, booths: [] });
      }
      const slots = vols.flatMap((v) => (v.tier === 'top' ? [v, v, v] : v.tier === 'avg' ? [v, v] : [v]));
      covered.forEach((no, i) => slots[i % slots.length].booths.push(no));
      for (const v of vols) {
        if (!v.booths.length) v.booths.push(covered[Math.floor(rnd() * covered.length)]);
        for (const no of new Set(v.booths)) await core.query('INSERT INTO membership_booths (membership_id, part_no, approved_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [v.mid, no, sup]);
      }
      for (let i = 0; i < 5; i++) {
        const uid = await person('req', i + 1);
        const mid = (await core.query<{ id: string }>(
          `INSERT INTO memberships (user_id, party_constituency_id, role, status, requested_at) VALUES ($1,$2,'volunteer','pending', now() - ($3 || ' hours')::interval) RETURNING id`,
          [uid, tm.id, String(2 + i * 9)])).rows[0].id;
        await core.query('INSERT INTO membership_booths (membership_id, part_no, requested) VALUES ($1,$2,true)', [mid, free[i] ?? covered[i]]);
      }
      for (let i = 0; i < 4; i++) {
        const uid = await person('old', i + 1);
        const removed = i === 3;
        await core.query(
          `INSERT INTO memberships (user_id, party_constituency_id, role, status, requested_at, decided_by, decided_at, reject_reason)
           VALUES ($1,$2,'volunteer',$3, now() - interval '18 days', $4, now() - interval '17 days', $5)`,
          [uid, tm.id, removed ? 'removed' : 'rejected', sup, removed ? null : REJECT[i]]);
      }

      // ---- F2 admin access requests: 2 waiting, 1 approved, 1 rejected ----
      const kinds = ['pending', 'pending', 'approved', 'rejected'] as const;
      for (let i = 0; i < kinds.length; i++) {
        const st = kinds[i];
        const uid = await person('adm', i + 1);
        await core.query(
          `INSERT INTO access_requests (user_id, party_id, party_name, state_code, whole_state, ac_nos, designation, note, status, decided_by, decided_at, reason, created_at)
           VALUES ($1,$2,$3,$4,false,$5,$6,$7,$8,$9,$10,$11, now() - ($12 || ' hours')::interval)`,
          [uid, P, tm.pname, tm.state, [ac], ['Assembly in-charge', 'Booth / sector coordinator', 'District president / office-bearer', 'Possible candidate'][i],
           i === 0 ? 'Handling the campaign office in the town.' : null, st, st === 'pending' ? null : sup, st === 'pending' ? null : new Date(Date.now() - 3 * 86_400_000),
           st === 'rejected' ? 'Please ask through your district president.' : null, String(6 + i * 30)]);
      }

      // ---- R1–R4 canvassing: per house, following the last result and the volunteer's activity ----
      const volOf = new Map<number, Vol>();
      for (const v of vols) for (const no of v.booths) if (!volOf.has(no)) volOf.set(no, v);
      const tops = vols.filter((v) => v.tier === 'top');
      let met = 0;
      for (const b of booths) {
        const g = auto.get(b.part_no) ?? 'M';
        const mix = MIX[g];
        const v = volOf.get(b.part_no);
        const housesP = v
          ? clamp((v.tier === 'top' ? 0.42 : v.tier === 'avg' ? 0.28 : 0.12) + (g === 'S' ? 0.04 : g === 'W' ? -0.03 : 0) + (rnd() - 0.5) * 0.14, 0.05, 0.6)
          : clamp(0.04 + rnd() * 0.06, 0.02, 0.12);
        const minDays = v?.tier === 'quiet' ? 3 : 0;
        const by = v?.uid ?? tops[Math.floor(rnd() * tops.length)]?.uid ?? vols[0].uid;
        const r = await db.query(
          `WITH h AS (
             SELECT COALESCE(v.house_no, v.id::text) AS hk, random() AS hr, random() AS pick,
                    $8::int + floor(power(random(), 1.6) * ($9::int - $8::int))::int AS d,
                    CASE WHEN random() < 0.55 THEN 8 + random() * 4 ELSE 16 + random() * 4 END AS hh
               FROM voters v WHERE v.ac_no = $2 AND v.part_no = $3 AND v.status IN ('active','added')
              GROUP BY 1
           ), hv AS (
             SELECT hk, hr, CASE WHEN extract(dow FROM (now() AT TIME ZONE 'Asia/Kolkata')::date - d) = 0 AND random() < 0.5 THEN d + 1 ELSE d END AS d, hh
               FROM h WHERE pick < $7
           )
           INSERT INTO voter_contacts (party_id, ac_no, voter_id, part_no, group_code, residence, needs_help, mobile, first_contacted_at, last_contacted_at, last_contacted_by)
           SELECT $1, v.ac_no, v.id, v.part_no,
                  CASE WHEN x.same THEN (CASE WHEN hv.hr < $4 THEN 'our' WHEN hv.hr < $4 + $5 THEN 'target' ELSE 'opp' END)
                       ELSE (CASE WHEN x.r < $4 THEN 'our' WHEN x.r < $4 + $5 THEN 'target' ELSE 'opp' END) END,
                  CASE WHEN x.r2 < 0.03 THEN 'moved' WHEN x.r2 < 0.04 THEN 'died' WHEN x.r2 < 0.05 THEN 'not_found' ELSE 'here' END,
                  ((COALESCE(v.age, 0) >= 75 AND x.r3 < 0.45) OR (COALESCE(v.age, 0) BETWEEN 60 AND 74 AND x.r3 < 0.05)),
                  CASE WHEN x.r4 < 0.35 THEN '0000000000' END,
                  x.ts, x.ts, $6
             FROM voters v JOIN hv ON hv.hk = COALESCE(v.house_no, v.id::text)
             CROSS JOIN LATERAL (SELECT random() < 0.82 AS same, random() AS r, random() AS r2, random() AS r3, random() AS r4,
                    LEAST(now() - interval '10 minutes',
                          (((now() AT TIME ZONE 'Asia/Kolkata')::date - hv.d) + make_interval(mins => (hv.hh * 60 + random() * 40)::int)) AT TIME ZONE 'Asia/Kolkata') AS ts) x
            WHERE v.ac_no = $2 AND v.part_no = $3 AND v.status IN ('active','added') AND random() < 0.88`,
          [P, ac, b.part_no, mix[0], mix[1], by, housesP, minDays, DAYS]);
        met += r.rowCount ?? 0;
      }
      await db.query(
        `INSERT INTO contact_events (at, client_at, party_id, ac_no, part_no, voter_id, user_id, change)
         SELECT first_contacted_at, first_contacted_at, party_id, ac_no, part_no, voter_id, last_contacted_by,
                jsonb_strip_nulls(jsonb_build_object('group', group_code, 'residence', NULLIF(residence, 'here'),
                  'needsHelp', NULLIF(needs_help, false), 'mobile', CASE WHEN mobile IS NOT NULL THEN true END))
           FROM voter_contacts WHERE party_id = $1 AND ac_no = $2`, [P, ac]);

      // ---- F3 four tasks: 2 running (one for chosen volunteers), 1 finished, 1 next week ----
      const today = "(now() AT TIME ZONE 'Asia/Kolkata')::date";
      const tasks: [string, string | null, object, number, number, string][] = [
        ['senior', null, { ageMin: 60 }, -14, 10, 'all_in_scope'],
        ['first_time', null, { ageMin: 18, ageMax: 20 }, -7, 14, 'selected'],
        ['women', null, { gender: 'F' }, -25, -4, 'all_in_scope'],
        ['other', 'Door to door', {}, 5, 30, 'all_in_scope'],
      ];
      for (const [kind, name, segment, start, end, assign] of tasks) {
        const d = (await db.query<{ id: string }>(
          `INSERT INTO drives (party_id, ac_no, kind, custom_name, segment, starts_on, ends_on, scope, assign, created_by, created_at)
           VALUES ($1,$2,$3,$4,$5,${today} + $6::int,${today} + $7::int,'all',$8,$9, now() - interval '15 days') RETURNING id`,
          [P, ac, kind, name, JSON.stringify(segment), start, end, assign, sup])).rows[0].id;
        if (assign === 'selected') for (const v of vols.slice(0, 8)) await db.query('INSERT INTO drive_assignees (drive_id, user_id) VALUES ($1,$2)', [d, v.uid]);
      }

      // ---- F4 three overrides: won judged Weak, lost judged Strong, close judged Strong ----
      const pick = (g: string) => booths.find((b) => auto.get(b.part_no) === g && volOf.has(b.part_no)) ?? booths.find((b) => auto.get(b.part_no) === g);
      const overrides: [ReturnType<typeof pick>, string][] = [[pick('S'), 'W'], [pick('W'), 'S'], [pick('M'), 'S']];
      for (const [b, s] of overrides) {
        if (b) await db.query('INSERT INTO booth_party_info (party_id, booth_id, strength, updated_by) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [P, b.id, s, sup]);
      }

      // ---- F5 reminders already sent to the quiet volunteers ----
      for (const v of vols.filter((x) => x.tier === 'quiet')) {
        await core.query(`INSERT INTO reminders_sent (party_constituency_id, user_id, sent_by, template, sent_at) VALUES ($1,$2,$3,'booth_needs_you', now() - interval '26 hours')`, [tm.id, v.uid, sup]);
      }

      await db.query('INSERT INTO stats_dirty (party_id, booth_id) SELECT $1, id FROM booths WHERE ac_no = $2 ON CONFLICT DO NOTHING', [P, ac]);
      const total = (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM voters WHERE ac_no = $1 AND status IN ('active','added')`, [ac])).rows[0].n;
      console.log(`${tm.state} AC ${ac}: ${met}/${total} met (${Math.round((met / Math.max(1, total)) * 100)}%) · ${vols.length} volunteers (6 top, 5 quiet) on ${covered.length}/${booths.length} booths · 5 waiting · 3 rejected · 1 removed · 4 admin requests · 4 tasks · 3 overrides`);
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
