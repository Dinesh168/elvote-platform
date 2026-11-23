/**
 * Resets the demo to the real-data set (spec docs/specs/real-demo-data.md): real parties, PB AC 50 Rupnagar and UP AC 361
 * Ballia Nagar with real booths, locations and 2022 results; voters with made-up names (prepared on the owner's PC by
 * prep_real_demo.py). Keeps users and super-admins; removes all teams, voters and canvassing (D5).
 * Usage: npx tsx scripts/load-real-demo.ts <real-demo.json> --demo     (production: demo_ databases only)
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { superUrl } from '../src/config.js';
import { closeAll, statePool } from '../src/db/pools.js';
import { processDirty } from '../src/lib/stats.js';
import { saveResults, type ParsedRow } from '../src/lib/pastResults.js';
import { dbNames } from './migrate.js';
import { seedAllowed } from './seed-guard.js';

// spec flow-fixes O4: English + regional (…Local) booth texts.
type Booth = { part: number; name: string; nameLocal: string | null; address: string | null; addressLocal: string | null; village: string | null; villageLocal: string | null; lat: number | null; lng: number | null };
type VoterRow = [number, number, string, string, string, string, string, string, string, number | null, string | null, number | null, string | null, (string | null)?];
type Ac = { state: string; ac: number; name: string; nameLocal: string; district: [string, string]; booths: Booth[]; voters: VoterRow[]; results: ParsedRow[]; rollSource: string };

const PARTIES = [
  ['Aam Aadmi Party', 'AAP'], ['Indian National Congress', 'INC'], ['Shiromani Akali Dal', 'SAD'],
  ['Bharatiya Janata Party', 'BJP'], ['Samajwadi Party', 'SP'], ['Bahujan Samaj Party', 'BSP'],
] as const;
const STATE_PARTIES = [['SAD', 'PB'], ['SP', 'UP']] as const;
const TEAMS = [
  { key: 'pb50', party: 'AAP', app: 'AAP Rupnagar', colour: '#0E7490', lang: 'pa', languages: ['pa', 'en'], election: ['Punjab Assembly 2027', '2027-02-14'] },
  { key: 'up361', party: 'BJP', app: 'BJP Ballia Nagar', colour: '#C2410C', lang: 'hi', languages: ['hi', 'en'], election: ['Uttar Pradesh Assembly 2027', '2027-03-01'] },
] as const;

async function connect(db: string) {
  const c = new pg.Client({ connectionString: superUrl(db) });
  await c.connect();
  return c;
}

async function insertMany(c: pg.Client, table: string, cols: string[], rows: unknown[][], chunk = 1000) {
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const params: unknown[] = [];
    const values = part.map((r) => `(${r.map((v) => { params.push(v); return `$${params.length}`; }).join(',')})`).join(',');
    await c.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${values}`, params);
  }
}

export async function loadRealDemo(file: string) {
  const names = dbNames();
  const ok = seedAllowed({ nodeEnv: process.env.NODE_ENV, argv: process.argv, coreDb: names.core });
  if (!ok.ok) throw new Error(ok.reason);
  const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Ac>;
  const core = await connect(names.core);
  const states = new Map<string, pg.Client>();
  for (const s of names.states) states.set(s.code, await connect(s.db));
  try {
    // ---- D5: remove made-up parties, teams and all state data; users and super-admins stay ----
    await core.query('TRUNCATE party_constituencies, parties CASCADE');
    for (const c of states.values()) {
      await c.query(`TRUNCATE stats_dirty, stats_booth_daily, stats_booth, import_staging, import_jobs, drive_assignees, drive_scope, drives,
                     zone_booths, zones, booth_party_info, poll_marks, applied_ops, contact_events, voter_contacts, voter_sensitive, voters,
                     past_party_votes, past_booth_results, roll_versions, booths, elections, assembly_constituencies, districts CASCADE`);
    }
    const sup = (await core.query<{ user_id: string }>('SELECT user_id FROM platform_admins LIMIT 1')).rows[0]?.user_id ?? null;
    const party = new Map<string, string>();
    for (const [name, short] of PARTIES) {
      party.set(short, (await core.query<{ id: string }>('INSERT INTO parties (name, short_name, created_by) VALUES ($1,$2,$3) RETURNING id', [name, short, sup])).rows[0].id);
    }
    // spec party-states: AAP, INC, BJP, BSP are national (no rows); state parties belong to their state.
    for (const [short, st] of STATE_PARTIES) await core.query('INSERT INTO party_states (party_id, state_code) VALUES ($1,$2)', [party.get(short), st]);

    for (const team of TEAMS) {
      const a = data[team.key];
      const c = states.get(a.state)!;
      await c.query('INSERT INTO districts (code, name) VALUES ($1,$2) ON CONFLICT DO NOTHING', a.district);
      await c.query('INSERT INTO assembly_constituencies (ac_no, name, name_local, district_code) VALUES ($1,$2,$3,$4)', [a.ac, a.name, a.nameLocal, a.district[0]]);
      await c.query('SELECT ensure_ac($1::smallint)', [a.ac]);
      const roll = (await c.query<{ id: string }>(`INSERT INTO roll_versions (ac_no, source_name, published_on, kind) VALUES ($1,$2,'2026-01-06','final') RETURNING id`, [a.ac, a.rollSource])).rows[0].id;
      const perPart = new Map<number, number>();
      for (const v of a.voters) perPart.set(v[0], (perPart.get(v[0]) ?? 0) + 1);
      const boothId = new Map<number, string>();
      for (const b of a.booths) {
        const r = await c.query<{ id: string }>(
          `INSERT INTO booths (ac_no, part_no, name, name_local, locality, locality_local, address, address_local, lat, lng, location_source, voters_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
          [a.ac, b.part, b.name.slice(0, 200), b.nameLocal?.slice(0, 200) ?? null, b.village, b.villageLocal, b.address, b.addressLocal, b.lat, b.lng, b.lat ? 'upload' : null, perPart.get(b.part) ?? 0]);
        boothId.set(b.part, r.rows[0].id);
      }
      const rows = a.voters.filter((v) => boothId.has(v[0])).map((v) => [a.ac, v[0], boothId.get(v[0]), v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11], v[12], v[13] ?? null, roll]);
      await insertMany(c, 'voters', ['ac_no', 'part_no', 'booth_id', 'sno', 'epic', 'name', 'name_local', 'relation', 'relative_name', 'relative_name_local', 'gender', 'age', 'house_no', 'section_no', 'section', 'section_local', 'roll_version_id'], rows);
      await c.query(`INSERT INTO elections (kind, name, poll_date, status) VALUES ('assembly', $1, $2, 'upcoming')`, [...team.election]);
      await saveResults(await statePool(a.state), a.results, sup ?? '00000000-0000-0000-0000-000000000000', false);

      // ---- team (customer) ----
      const pid = party.get(team.party)!;
      const pc = (await core.query<{ id: string }>(
        `INSERT INTO party_constituencies (party_id, state_code, ac_no, ac_name, max_zones, zone_count, app_name, brand_colour, regional_lang, languages)
         VALUES ($1,$2,$3,$4,10,5,$5,$6,$7,$8) RETURNING id`, [pid, a.state, a.ac, a.name, team.app, team.colour, team.lang, [...team.languages]])).rows[0].id;
      for (let n = 1; n <= 5; n++) await c.query('INSERT INTO zones (party_id, ac_no, number, name) VALUES ($1,$2,$3,$4)', [pid, a.ac, n, `Z${n}`]);
      await c.query('INSERT INTO stats_dirty (party_id, booth_id) SELECT $1, id FROM booths WHERE ac_no = $2 ON CONFLICT DO NOTHING', [pid, a.ac]);
      console.log(`${a.state} AC ${a.ac} ${a.name}: ${a.booths.length} booths (${a.booths.filter((b) => b.lat).length} located), ${rows.length} voters, ${a.results.length} results · team ${team.app} ${pc}`);
    }
  } finally {
    await core.end();
    for (const c of states.values()) await c.end();
  }
  while (await processDirty(500));
}

if (process.argv[1]?.endsWith('load-real-demo.ts')) {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!file) { console.error('Give the prepared real-demo.json'); process.exit(1); }
  loadRealDemo(file).then(() => closeAll()).catch(async (e) => { console.error(e.message ?? e); await closeAll(); process.exit(1); });
}
