/**
 * Made-up past results for the demo (spec map-trend D5): for every AC that has a customer, three past years per booth,
 * marked is_sample so admins see "Sample data". Real results come only from the super-admin upload.
 * Usage: npm run sample-results -- --demo   (production: only on demo_ databases; replaces earlier sample rows only)
 */
import 'dotenv/config';
import { env } from '../src/config.js';
import { closeAll, core, statePool } from '../src/db/pools.js';
import { saveResults, type ParsedRow } from '../src/lib/pastResults.js';
import { seedAllowed } from './seed-guard.js';

const YEARS = [2012, 2017, 2022];
const RIVALS = ['INC', 'SAD', 'BJP', 'Other'];

/** Small deterministic random (same numbers on every run). */
function rng(seed: number) {
  let x = seed || 1;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
}

export async function sampleResults() {
  const ok = seedAllowed({ nodeEnv: process.env.NODE_ENV, argv: process.argv, coreDb: (process.env.DB_PREFIX ?? '') + env.CORE_DB });
  if (!ok.ok) throw new Error(ok.reason);
  const pcs = await core.query<{ state_code: string; ac_no: number; short_name: string | null; name: string }>(
    `SELECT DISTINCT pc.state_code, pc.ac_no, p.short_name, p.name FROM party_constituencies pc JOIN parties p ON p.id = pc.party_id WHERE p.deleted_at IS NULL ORDER BY 1, 2`);
  const byAc = new Map<string, { state: string; ac: number; parties: Set<string> }>();
  for (const r of pcs.rows) {
    const k = `${r.state_code}/${r.ac_no}`;
    const e = byAc.get(k) ?? { state: r.state_code, ac: r.ac_no, parties: new Set<string>() };
    e.parties.add(r.short_name || r.name);
    byAc.set(k, e);
  }
  for (const e of byAc.values()) {
    const pool = await statePool(e.state);
    const real = await pool.query('SELECT 1 FROM past_booth_results WHERE ac_no = $1 AND NOT is_sample LIMIT 1', [e.ac]);
    if (real.rowCount) { console.log(`${e.state} AC ${e.ac}: real results loaded, skipped`); continue; }
    const booths = await pool.query<{ part_no: number; name: string; locality: string | null; voters_count: number }>(
      'SELECT part_no, name, locality, voters_count FROM booths WHERE ac_no = $1 AND deleted_at IS NULL ORDER BY part_no', [e.ac]);
    if (!booths.rowCount) continue;
    const parties = [...e.parties, ...RIVALS.filter((r) => !e.parties.has(r))];
    const rand = rng(e.ac * 97 + e.state.charCodeAt(0));
    const rows: ParsedRow[] = [];
    for (const b of booths.rows) {
      const lean = rand() * 0.3 - 0.12; // booth leaning for the first team party
      YEARS.forEach((year, yi) => {
        const electors = Math.max(300, Math.round((b.voters_count || 900) * (0.86 + yi * 0.06)));
        const total = Math.round(electors * (0.62 + rand() * 0.12));
        const w = parties.map((p, i) => Math.max(0.02, (i === 0 ? 0.24 + yi * 0.05 + lean : i === 1 ? 0.36 - yi * 0.03 : 0.12) + rand() * 0.1));
        const sum = w.reduce((a, x) => a + x, 0);
        const votes: Record<string, number> = {};
        let used = 0;
        parties.forEach((p, i) => {
          const v = i === parties.length - 1 ? total - used : Math.round((w[i] / sum) * total);
          votes[p] = Math.max(0, v);
          used += votes[p];
        });
        rows.push({ ac: e.ac, part: b.part_no, year, name: b.name, district: null, tehsil: null, village: b.locality, total, electors, votes });
      });
    }
    await saveResults(pool, rows, '00000000-0000-0000-0000-000000000000', true);
    console.log(`${e.state} AC ${e.ac}: ${booths.rowCount} booths × ${YEARS.length} years (sample)`);
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('sample-results.ts')) {
  sampleResults().then(() => closeAll()).catch(async (e) => { console.error(e.message ?? e); await closeAll(); process.exit(1); });
}
