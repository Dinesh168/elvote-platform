/**
 * Deterministic sample data (synthetic names; no real voter data).
 * States PB (AC 66 Rampur, AC 50 Nawanpind) and HR (AC 12 Sonpur); 2 parties; fixed test logins (OTP 123456):
 *   9000000001 super-admin · 9000000002 admin party 1 (AC 66 + AC 50) · 9000000003 volunteer Suresh Kumar (AC 66, booths 112, 113)
 *   9000000004 admin party 2 (AC 66) · 9000000005 admin party 2 (HR AC 12)
 * Usage: npm run db:seed   (wipes and re-creates sample rows)
 */
import path from 'node:path';
import pg from 'pg';
import { createHash } from 'node:crypto';
import { superUrl } from '../src/config.js';
import { dbNames } from './migrate.js';
import { revokeSampleSuperAdmin, seedAllowed } from './seed-guard.js';

pg.types.setTypeParser(20, (v) => v);

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261119);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const DAY = 86_400_000;
const NOW = Date.now();

const MALE = ['Gurpreet', 'Harjit', 'Balwinder', 'Sukhdev', 'Rajinder', 'Amarjit', 'Jaswant', 'Kuldeep', 'Manjit', 'Paramjit', 'Ramesh', 'Suresh', 'Rakesh', 'Vijay', 'Anil', 'Sunil', 'Mohan', 'Satnam', 'Davinder', 'Harpal', 'Jagdish', 'Narinder', 'Pawan', 'Sandeep', 'Amandeep', 'Lakhwinder', 'Rohit', 'Aman', 'Karan', 'Arjun'];
const FEMALE = ['Sunita', 'Neha', 'Manpreet', 'Harpreet', 'Jasvir', 'Kamaljit', 'Paramjit', 'Rajwant', 'Satwant', 'Simran', 'Navneet', 'Gurmeet', 'Kiran', 'Pooja', 'Rekha', 'Asha', 'Sarita', 'Baljit', 'Amandeep', 'Sukhwinder', 'Ramandeep', 'Jaspreet', 'Komal', 'Priya', 'Anju', 'Seema', 'Mandeep', 'Rupinder'];
const SURNAME_PB = ['Singh', 'Kaur', 'Sharma', 'Kumar', 'Sandhu', 'Gill', 'Dhillon', 'Sidhu', 'Brar', 'Grewal', 'Verma', 'Bajwa'];
const SURNAME_HR = ['Yadav', 'Sharma', 'Kumar', 'Malik', 'Dahiya', 'Hooda', 'Sangwan', 'Rathi', 'Jakhar', 'Saini', 'Verma', 'Devi'];
const BOOTH_KIND = ['Govt. School', 'Primary School', 'Govt. Sr. Sec. School', 'Panchayat Ghar', 'Community Centre', 'Govt. High School', 'Dharamshala'];
const VILLAGES: Record<number, string[]> = {
  66: ['Rampur', 'Kheri', 'Bhagwanpura', 'Dhanaula', 'Saidpur', 'Kotla', 'Mehma'],
  50: ['Nawanpind', 'Chak Kalan', 'Bhulla', 'Sangatpur', 'Rurka', 'Jandiala'],
  12: ['Sonpur', 'Madina', 'Kharkhoda', 'Rohna', 'Bhainswal', 'Nidana'],
};

type St = { code: string; db: string; stateNo: number };
const AC_PLAN = [
  { state: 'PB', ac: 66, name: 'Rampur', nameLocal: 'ਰਾਮਪੁਰ', district: 'PB21', districtName: 'Rampur', parts: Array.from({ length: 25 }, (_, i) => 101 + i) },
  { state: 'PB', ac: 50, name: 'Nawanpind', nameLocal: 'ਨਵਾਂਪਿੰਡ', district: 'PB12', districtName: 'Jalandhar Rural', parts: Array.from({ length: 20 }, (_, i) => 1 + i) },
  { state: 'HR', ac: 12, name: 'Sonpur', nameLocal: 'सोनपुर', district: 'HR05', districtName: 'Sonipat', parts: Array.from({ length: 12 }, (_, i) => 1 + i) },
];

async function connect(db: string) {
  const c = new pg.Client({ connectionString: superUrl(db) });
  await c.connect();
  return c;
}

/** Inserts rows in chunks with one multi-VALUES statement per chunk. */
async function insertMany(c: pg.Client, table: string, cols: string[], rows: unknown[][], chunk = 1000) {
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const params: unknown[] = [];
    const values = part.map((r) => `(${r.map((v) => { params.push(v); return `$${params.length}`; }).join(',')})`).join(',');
    await c.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${values}`, params);
  }
}

export async function seed() {
  const names = dbNames();
  const allowed = seedAllowed({ nodeEnv: process.env.NODE_ENV, argv: process.argv, coreDb: names.core });
  if (!allowed.ok) throw new Error(allowed.reason);
  const coreC = await connect(names.core);
  const stateC = new Map<string, pg.Client>();
  for (const s of names.states as unknown as St[]) stateC.set(s.code, await connect(s.db));

  // ---- wipe sample rows (keeps schema, shards, states) ----
  await coreC.query(`TRUNCATE audit_log, sessions, otp_attempts, join_codes, membership_booths, memberships, platform_admins,
                     party_constituencies, parties, users RESTART IDENTITY CASCADE`);
  for (const c of stateC.values()) {
    await c.query(`TRUNCATE stats_dirty, stats_booth_daily, stats_booth, import_staging, import_jobs, drive_assignees, drive_scope, drives,
                   zone_booths, zones, booth_party_info, poll_marks, applied_ops, contact_events, voter_contacts, voter_sensitive, voters,
                   roll_versions, booths, elections, assembly_constituencies, districts CASCADE`);
  }

  // ---- core: users, parties, party ACs ----
  const user = async (mobile: string, name: string) =>
    (await coreC.query<{ id: string }>('INSERT INTO users (mobile, name) VALUES ($1,$2) RETURNING id', [mobile, name])).rows[0].id;
  const superId = await user('9000000001', 'Platform Owner');
  await coreC.query('INSERT INTO platform_admins (user_id) VALUES ($1)', [superId]);
  const amit = await user('9000000002', 'Amit Mehta');
  const suresh = await user('9000000003', 'Suresh Kumar');
  const rekha = await user('9000000004', 'Rekha Sharma');
  const vikram = await user('9000000005', 'Vikram Malik');

  const party = async (name: string, short: string) =>
    (await coreC.query<{ id: string }>('INSERT INTO parties (name, short_name, created_by) VALUES ($1,$2,$3) RETURNING id', [name, short, superId])).rows[0].id;
  const p1 = await party('Jan Vikas Party', 'JVP');
  const p2 = await party('Lok Sewa Dal', 'LSD');

  const pac = async (partyId: string, st: string, ac: number, acName: string, zones: number, brand: string, cand: string, ballot: number) =>
    (await coreC.query<{ id: string }>(
      `INSERT INTO party_constituencies (party_id, state_code, ac_no, ac_name, max_zones, zone_count, app_name, candidate_name, ballot_no, brand_colour, regional_lang,
                                         languages, candidate_slogan, candidate_message, slip_share_text)
       VALUES ($1,$2,$3,$4,10,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [partyId, st, ac, acName, zones, partyId === p1 ? `JVP ${acName}` : 'LSD Connect', cand, ballot, brand, st === 'PB' ? 'pa' : 'en',
       st === 'PB' ? ['pa', 'en'] : ['en'],
       partyId === p1 ? 'Har ghar vikas, har hath kaam' : 'Sewa hi sankalp',
       `Thank you for working for ${cand}. Every voter you meet counts.`,
       `Dear {name}, your serial no. is {sno} at booth {booth}. Please vote on {date}. — ${cand}`],
    )).rows[0].id;
  const pc1_66 = await pac(p1, 'PB', 66, 'Rampur', 10, '#15803D', 'Harjit Singh Sandhu', 3);
  const pc1_50 = await pac(p1, 'PB', 50, 'Nawanpind', 8, '#15803D', 'Kamaljit Kaur Gill', 3);
  const pc2_66 = await pac(p2, 'PB', 66, 'Rampur', 6, '#0E7490', 'Rajinder Kumar Verma', 7);
  const pc2_12 = await pac(p2, 'HR', 12, 'Sonpur', 10, '#0E7490', 'Sunil Dahiya', 7);

  const member = async (userId: string, pcId: string, role: 'admin' | 'volunteer', status: string, booths: number[], requested = false) => {
    const m = (await coreC.query<{ id: string }>(
      `INSERT INTO memberships (user_id, party_constituency_id, role, status, decided_by, decided_at, requested_at)
       VALUES ($1,$2,$3,$4,$5,$6, now() - make_interval(days => $7)) RETURNING id`,
      [userId, pcId, role, status, status === 'approved' ? superId : null, status === 'approved' ? new Date(NOW - 20 * DAY) : null, int(0, 3)],
    )).rows[0].id;
    for (const b of booths) await coreC.query('INSERT INTO membership_booths (membership_id, part_no, requested) VALUES ($1,$2,$3)', [m, b, requested]);
    return m;
  };
  await member(amit, pc1_66, 'admin', 'approved', []);
  await member(amit, pc1_50, 'admin', 'approved', []);
  await member(suresh, pc1_66, 'volunteer', 'approved', [112, 113]);
  await member(rekha, pc2_66, 'admin', 'approved', []);
  await member(vikram, pc2_12, 'admin', 'approved', []);

  // Volunteers per party AC: approved ones cover the booths; a few pending requests.
  const workers = new Map<string, Map<number, string[]>>(); // pcId → part → userIds
  workers.set(pc1_66, new Map([[112, [suresh]], [113, [suresh]]]));
  let mob = 9811000000;
  const addVolunteers = async (pcId: string, parts: number[], surnames: string[], approved: number, pending: number) => {
    const map = workers.get(pcId) ?? new Map<number, string[]>();
    workers.set(pcId, map);
    const free = parts.filter((p) => !map.has(p));
    for (let i = 0; i < approved; i++) {
      const female = rnd() < 0.35;
      const id = await user(String(mob++), `${pick(female ? FEMALE : MALE)} ${pick(surnames)}`);
      const booths = [free[(i * 2) % free.length], free[(i * 2 + 1) % free.length]].filter((x, j, a) => a.indexOf(x) === j);
      await member(id, pcId, 'volunteer', 'approved', booths);
      for (const b of booths) map.set(b, [...(map.get(b) ?? []), id]);
    }
    for (let i = 0; i < pending; i++) {
      const id = await user(String(mob++), `${pick(MALE)} ${pick(surnames)}`);
      await member(id, pcId, 'volunteer', 'pending', [pick(parts)], true);
    }
  };
  await addVolunteers(pc1_66, AC_PLAN[0].parts, SURNAME_PB, 14, 3);
  await addVolunteers(pc1_50, AC_PLAN[1].parts, SURNAME_PB, 9, 2);
  await addVolunteers(pc2_66, AC_PLAN[0].parts, SURNAME_PB, 8, 1);
  await addVolunteers(pc2_12, AC_PLAN[2].parts, SURNAME_HR, 6, 2);

  for (const [pcId, code] of [[pc1_66, 'RAMPUR24'], [pc1_50, 'NAWAN50'], [pc2_66, 'LSD66'], [pc2_12, 'SONPUR12']] as const) {
    await coreC.query('INSERT INTO join_codes (party_constituency_id, code_hash, hint, created_by) VALUES ($1,$2,$3,$4)', [pcId, sha(code), code.slice(-2), superId]);
  }

  // ---- state DBs: geography, roll ----
  const partyAcs = [
    { pc: pc1_66, party: p1, state: 'PB', ac: 66, contactRate: 0.42, admin: amit },
    { pc: pc1_50, party: p1, state: 'PB', ac: 50, contactRate: 0.3, admin: amit },
    { pc: pc2_66, party: p2, state: 'PB', ac: 66, contactRate: 0.2, admin: rekha },
    { pc: pc2_12, party: p2, state: 'HR', ac: 12, contactRate: 0.35, admin: vikram },
  ];
  const counts: Record<string, number> = {};

  for (const plan of AC_PLAN) {
    const c = stateC.get(plan.state)!;
    const st = (names.states as unknown as St[]).find((s) => s.code === plan.state)!;
    await c.query('INSERT INTO districts (code, name) VALUES ($1,$2) ON CONFLICT DO NOTHING', [plan.district, plan.districtName]);
    await c.query('INSERT INTO assembly_constituencies (ac_no, name, name_local, district_code) VALUES ($1,$2,$3,$4)', [plan.ac, plan.name, plan.nameLocal, plan.district]);
    await c.query('SELECT ensure_ac($1::smallint)', [plan.ac]);
    const roll = (await c.query<{ id: string }>(`INSERT INTO roll_versions (ac_no, source_name, published_on) VALUES ($1, 'Sample roll 2026', '2026-01-06') RETURNING id`, [plan.ac])).rows[0].id;
    const surnames = plan.state === 'HR' ? SURNAME_HR : SURNAME_PB;
    let epicNo = 1000000 + plan.ac * 10000;

    for (const part of plan.parts) {
      const village = part === 112 || part === 113 ? 'Rampur' : pick(VILLAGES[plan.ac]);
      const kind = part === 112 ? 'Govt. School' : part === 113 ? 'Primary School' : pick(BOOTH_KIND);
      const lat = (plan.state === 'PB' ? 30.9 : 29.0) + rnd() * 0.25;
      const lng = (plan.state === 'PB' ? 75.6 : 76.9) + rnd() * 0.25;
      const target = part === 112 ? 1200 : part === 113 ? 1054 : int(800, 1300);
      const booth = (await c.query<{ id: string }>(
        `INSERT INTO booths (ac_no, part_no, name, locality, address, lat, lng, location_source, voters_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'upload',$8) RETURNING id`,
        [plan.ac, part, `${kind}, ${village}`, village, `${kind}, ${village}, ${plan.districtName}`, lat.toFixed(6), lng.toFixed(6), target],
      )).rows[0].id;

      const rows: unknown[][] = [];
      let sno = 1;
      let house = int(1, 40);
      while (sno <= target) {
        const size = Math.min(int(1, 6), target - sno + 1);
        const fam = pick(surnames);
        const head = `${pick(MALE)} ${plan.state === 'PB' ? (rnd() < 0.7 ? 'Singh' : fam) : fam}`;
        const section = 1 + Math.floor((sno - 1) / 300);
        for (let k = 0; k < size; k++) {
          let name: string, gender: 'M' | 'F' | 'T', relation: 'F' | 'H', relative: string, age: number;
          if (k === 0) { name = head; gender = 'M'; relation = 'F'; relative = `${pick(MALE)} ${head.split(' ')[1]}`; age = int(38, 82); }
          else if (k === 1) { gender = 'F'; name = `${pick(FEMALE)} ${plan.state === 'PB' ? 'Kaur' : 'Devi'}`; relation = 'H'; relative = head; age = int(34, 76); }
          else {
            gender = rnd() < 0.003 ? 'T' : rnd() < 0.5 ? 'M' : 'F';
            name = gender === 'F' ? `${pick(FEMALE)} ${plan.state === 'PB' ? 'Kaur' : fam}` : `${pick(MALE)} ${head.split(' ')[1]}`;
            relation = 'F'; relative = head; age = rnd() < 0.12 ? int(18, 20) : int(21, 40);
          }
          const epic = `${plan.state}${String.fromCharCode(65 + (plan.ac % 26))}${epicNo++}`;
          const mobile = rnd() < 0.15 ? String(int(7000000000, 9999999999)) : null;
          rows.push([plan.ac, part, booth, sno, epic, name, relation, relative, gender, age, String(house), section, village, mobile, roll]);
          sno++;
        }
        house += int(1, 2);
      }
      await insertMany(c, 'voters', ['ac_no', 'part_no', 'booth_id', 'sno', 'epic', 'name', 'relation', 'relative_name', 'gender', 'age', 'house_no', 'section_no', 'section', 'mobile', 'roll_version_id'], rows);
      counts[`${plan.state}-${plan.ac}`] = (counts[`${plan.state}-${plan.ac}`] ?? 0) + rows.length;
    }
  }

  // Elections
  const elections: Record<string, string> = {};
  for (const [code, c] of stateC) {
    const r = await c.query<{ id: string }>(
      `INSERT INTO elections (kind, name, poll_date, status) VALUES ('assembly', $1, $2, 'upcoming') RETURNING id`,
      [code === 'PB' ? 'Punjab Assembly 2027' : 'Haryana Assembly 2029', code === 'PB' ? '2027-02-14' : '2029-10-05'],
    );
    elections[code] = r.rows[0].id;
  }

  // ---- party data: zones, strength, contacts, events, poll marks, drives ----
  for (const pa of partyAcs) {
    const c = stateC.get(pa.state)!;
    const plan = AC_PLAN.find((x) => x.ac === pa.ac)!;
    const zc = (await coreC.query<{ zone_count: number }>('SELECT zone_count FROM party_constituencies WHERE id = $1', [pa.pc])).rows[0].zone_count;
    const booths = (await c.query<{ id: string; part_no: number }>('SELECT id, part_no FROM booths WHERE ac_no = $1 ORDER BY part_no', [pa.ac])).rows;
    const zoneIds: string[] = [];
    for (let z = 1; z <= zc; z++) {
      zoneIds.push((await c.query<{ id: string }>('INSERT INTO zones (party_id, ac_no, number, name) VALUES ($1,$2,$3,$4) RETURNING id', [pa.party, pa.ac, z, `Z${z}`])).rows[0].id);
    }
    for (const [i, b] of booths.entries()) {
      // Spread booths evenly: every zone gets ⌊n/zc⌋ or ⌈n/zc⌉ booths, in part-number order.
      await c.query('INSERT INTO zone_booths (party_id, booth_id, zone_id) VALUES ($1,$2,$3)', [pa.party, b.id, zoneIds[Math.floor((i * zc) / booths.length)]]);
      await c.query('INSERT INTO booth_party_info (party_id, booth_id, strength) VALUES ($1,$2,$3)', [pa.party, b.id, pick(['S', 'S', 'M', 'W', 'W'] as const)]);
    }

    const wk = workers.get(pa.pc)!;
    const voters = (await c.query<{ id: string; part_no: number; sno: number; age: number; gender: string }>(
      'SELECT id, part_no, sno, age, gender FROM voters WHERE ac_no = $1 ORDER BY part_no, sno', [pa.ac],
    )).rows;
    const contacts: unknown[][] = [];
    const events: unknown[][] = [];
    const marks: unknown[][] = [];
    for (const v of voters) {
      // Earlier serial numbers are contacted more often (volunteers work in order), which gives a realistic "next voter".
      const bias = v.part_no === 112 || v.part_no === 113 ? (v.sno < 600 ? 0.75 : 0.12) : 1;
      if (rnd() > pa.contactRate * (bias === 1 ? 1 : bias / pa.contactRate * 0.5)) continue;
      const g = rnd();
      const group = g < 0.6 ? 'our' : g < 0.85 ? 'target' : 'opp';
      const moved = rnd() < 0.04 ? 'moved' : 'here';
      const help = rnd() < 0.08;
      const mobile = rnd() < 0.5 ? String(int(7000000000, 9999999999)) : null;
      const daysAgo = Math.floor(Math.pow(rnd(), 1.6) * 14);
      const at = new Date(NOW - daysAgo * DAY - int(0, 10 * 3600) * 1000);
      const by = pick(wk.get(v.part_no) ?? [pa.admin]);
      contacts.push([pa.party, pa.ac, v.id, v.part_no, group, moved, help, mobile, at, at, by]);
      events.push([at, at, pa.party, pa.ac, v.part_no, v.id, by, JSON.stringify({ group, ...(mobile ? { mobile: true } : {}) })]);
      if (pa.pc === pc1_66 && rnd() < 0.35) marks.push([elections[pa.state], pa.party, pa.ac, v.id, v.part_no, by, new Date(NOW - int(1, 6) * 3600_000)]);
    }
    await insertMany(c, 'voter_contacts', ['party_id', 'ac_no', 'voter_id', 'part_no', 'group_code', 'residence', 'needs_help', 'mobile', 'first_contacted_at', 'last_contacted_at', 'last_contacted_by'], contacts);
    await insertMany(c, 'contact_events', ['at', 'client_at', 'party_id', 'ac_no', 'part_no', 'voter_id', 'user_id', 'change'], events);
    await insertMany(c, 'poll_marks', ['election_id', 'party_id', 'ac_no', 'voter_id', 'part_no', 'marked_by', 'marked_at'], marks);

    // Drives
    const drive = async (kind: string, name: string | null, segment: object, startOff: number, endOff: number, scope: 'all' | 'zones' | 'booths', scopeIds: string[]) => {
      const d = (await c.query<{ id: string }>(
        `INSERT INTO drives (party_id, ac_no, kind, custom_name, segment, starts_on, ends_on, scope, created_by)
         VALUES ($1,$2,$3,$4,$5, current_date + $6::int, current_date + $7::int, $8, $9) RETURNING id`,
        [pa.party, pa.ac, kind, name, JSON.stringify(segment), startOff, endOff, scope, pa.admin],
      )).rows[0].id;
      for (const id of scopeIds) await c.query(`INSERT INTO drive_scope (drive_id, ${scope === 'zones' ? 'zone_id' : 'booth_id'}) VALUES ($1,$2)`, [d, id]);
    };
    if (pa.pc === pc1_66) {
      await drive('women', null, { gender: 'F' }, -10, 20, 'zones', zoneIds.slice(0, 5));
      await drive('first_time', null, { ageMin: 18, ageMax: 20 }, -5, 25, 'all', []);
      const b112 = booths.filter((b) => b.part_no === 112 || b.part_no === 113).map((b) => b.id);
      await drive('senior', null, { ageMin: 60 }, -20, -1, 'booths', b112);
    } else {
      await drive('young', null, { ageMin: 18, ageMax: 34 }, -7, 21, 'all', []);
    }

    // Counters
    for (const b of booths) await c.query('INSERT INTO stats_dirty (party_id, booth_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [pa.party, b.id]);
    void plan;
  }

  for (const c of stateC.values()) await c.query('ANALYZE');
  if (process.argv.includes('--demo')) await revokeSampleSuperAdmin(coreC); // AC12: no sample logins on a server
  await coreC.end();
  for (const c of stateC.values()) await c.end();
  return counts;
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  const t = Date.now();
  seed()
    .then(async (counts) => {
      const { processDirty } = await import('../src/lib/stats.js');
      const { closeAll } = await import('../src/db/pools.js');
      let n = 0;
      for (let k; (k = await processDirty(500)); ) n += k;
      await closeAll();
      console.log('Voters per AC:', counts, `· counters for ${n} party-booths · ${((Date.now() - t) / 1000).toFixed(1)} s`);
      console.log('Logins (OTP 123456): 9000000001 super-admin · 9000000002 admin · 9000000003 volunteer · 9000000004 / 9000000005 party-2 admins');
    })
    .catch((e) => {
      console.error('Seed failed:', e);
      process.exit(1);
    });
}
