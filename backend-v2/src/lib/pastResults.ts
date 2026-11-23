/**
 * Past election results (spec docs/specs/map-trend.md T1–T6, W1): CSV parsing for the super-admin upload and the
 * aggregates the admin screens read. Results are public aggregate data per booth; no voter rows are involved.
 */
import type pg from 'pg';
import { invalid } from './errors.js';

export interface ParsedRow {
  ac: number; part: number; year: number; name: string | null; district: string | null; tehsil: string | null; village: string | null;
  total: number; electors: number | null; votes: Record<string, number>;
  /** Votes estimated, not from Form 20 (spec real-demo-data B1). */
  estimated?: boolean;
}

export const MAX_ROWS = 50_000;

/** Splits one CSV line (RFC 4180 quotes). */
function cells(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
const COLS: Record<string, string[]> = {
  ac: ['acno', 'ac', 'acnumber'],
  part: ['pollingstationnumber', 'partno', 'boothno', 'psno', 'pollingstationno'],
  year: ['year'],
  name: ['pollingstationname', 'boothname'],
  district: ['district'],
  tehsil: ['tehsil'],
  village: ['village'],
  total: ['totalvotes'],
  electors: ['currentvoters', 'electors', 'totalelectors'],
  note: ['datanote', 'note', 'estimated'],
};

/** Parses an election-trend CSV. Throws 422 `invalid_csv` naming the first bad line; returns rows and party codes. */
export function parseResultsCsv(text: string): { rows: ParsedRow[]; parties: string[] } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const head = cells(lines[0] ?? '');
  const idx: Record<string, number> = {};
  head.forEach((h, i) => {
    const n = norm(h);
    for (const [k, names] of Object.entries(COLS)) if (idx[k] === undefined && names.includes(n)) idx[k] = i;
  });
  const partyCols = head
    .map((h, i) => ({ h, i }))
    .filter((x) => / votes$/i.test(x.h) && norm(x.h) !== 'totalvotes')
    .map((x) => ({ code: x.h.replace(/ votes$/i, '').trim(), i: x.i }));
  const missing = ['ac', 'part', 'year'].filter((k) => idx[k] === undefined);
  if (missing.length || !partyCols.length) {
    throw invalid('invalid_csv', `Line 1: the file needs columns AC No., POLLING STATION-NUMBER, Year and at least one "<PARTY> Votes" column.`);
  }
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();
  for (let n = 1; n < lines.length; n++) {
    if (!lines[n].trim()) continue;
    if (rows.length >= MAX_ROWS) throw invalid('invalid_csv', `The file has more than ${MAX_ROWS} rows. Split it by assembly.`);
    const c = cells(lines[n]);
    const line = n + 1;
    const int = (v: string | undefined, what: string, opt = false): number | null => {
      const s = (v ?? '').replace(/,/g, '');
      if (s === '' && opt) return null;
      if (s === '') return 0;
      if (!/^\d+$/.test(s)) throw invalid('invalid_csv', `Line ${line}: ${what} must be a whole number (found "${v}").`);
      return Number(s);
    };
    const ac = int(c[idx.ac], 'AC No.')!;
    const part = int(c[idx.part], 'polling station number')!;
    const year = int(c[idx.year], 'Year')!;
    if (ac < 1 || ac > 999 || part < 1 || part > 9999 || year < 1950 || year > 2100) throw invalid('invalid_csv', `Line ${line}: AC, booth or year is out of range.`);
    const key = `${ac}/${year}/${part}`;
    if (seen.has(key)) throw invalid('invalid_csv', `Line ${line}: booth ${part} of AC ${ac} appears twice for ${year}.`);
    seen.add(key);
    const votes: Record<string, number> = {};
    for (const p of partyCols) votes[p.code] = int(c[p.i], `${p.code} Votes`)!;
    const sum = Object.values(votes).reduce((a, x) => a + x, 0);
    const text = (k: string) => (idx[k] !== undefined && c[idx[k]] ? c[idx[k]].slice(0, 200) : null);
    rows.push({
      ac, part, year, name: text('name'), district: text('district'), tehsil: text('tehsil'), village: text('village'),
      total: (idx.total !== undefined ? int(c[idx.total], 'Total Votes', true) : null) || sum,
      electors: idx.electors !== undefined ? int(c[idx.electors], 'Current Voters', true) : null, votes,
      estimated: idx.note !== undefined && /estimat|dummy|^(yes|true|1)$/i.test(c[idx.note] ?? ''),
    });
  }
  if (!rows.length) throw invalid('invalid_csv', 'Line 2: the file has no data rows.');
  return { rows, parties: partyCols.map((p) => p.code).sort() };
}

/** Replaces every (ac, year) present in `rows` inside one transaction. */
export async function saveResults(pool: pg.Pool, rows: ParsedRow[], userId: string, sample: boolean) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const pairs = [...new Set(rows.map((r) => `${r.ac}/${r.year}`))].map((k) => k.split('/').map(Number));
    await c.query(
      `DELETE FROM past_booth_results p USING unnest($1::smallint[], $2::smallint[]) AS x(ac, yr) WHERE p.ac_no = x.ac AND p.year = x.yr`,
      [pairs.map((p) => p[0]), pairs.map((p) => p[1])]);
    for (let i = 0; i < rows.length; i += 5000) {
      const part = rows.slice(i, i + 5000);
      await c.query(
        `INSERT INTO past_booth_results (ac_no, year, part_no, booth_name, district, tehsil, village, total_votes, electors, is_sample, loaded_by, is_estimated)
         SELECT a, y, p, n, d, t, v, tv, e, $10, $11, est FROM unnest($1::smallint[], $2::smallint[], $3::smallint[], $4::text[], $5::text[], $6::text[], $7::text[], $8::int[], $9::int[], $12::boolean[])
           AS x(a, y, p, n, d, t, v, tv, e, est)`,
        [part.map((r) => r.ac), part.map((r) => r.year), part.map((r) => r.part), part.map((r) => r.name), part.map((r) => r.district),
          part.map((r) => r.tehsil), part.map((r) => r.village), part.map((r) => r.total), part.map((r) => r.electors), sample, userId, part.map((r) => !!r.estimated)]);
      const v = part.flatMap((r) => Object.entries(r.votes).map(([code, n]) => [r.ac, r.year, r.part, code, n] as const));
      await c.query(
        `INSERT INTO past_party_votes (ac_no, year, part_no, party_code, votes)
         SELECT * FROM unnest($1::smallint[], $2::smallint[], $3::smallint[], $4::text[], $5::int[])`,
        [v.map((x) => x[0]), v.map((x) => x[1]), v.map((x) => x[2]), v.map((x) => x[3]), v.map((x) => x[4])]);
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

export interface BoothYear { part: number; name: string | null; village: string | null; total: number; electors: number | null; sample: boolean; estimated: boolean; votes: Record<string, number> }
/** year → part → booth result, for one AC. */
export type AcResults = Map<number, Map<number, BoothYear>>;

export async function loadAc(pool: pg.Pool, acNo: number): Promise<AcResults> {
  const r = await pool.query<{ year: number; part_no: number; booth_name: string | null; village: string | null; total_votes: number; electors: number | null; is_sample: boolean; is_estimated: boolean; party_code: string; votes: number }>(
    `SELECT b.year, b.part_no, b.booth_name, b.village, b.total_votes, b.electors, b.is_sample, b.is_estimated, v.party_code, v.votes
       FROM past_booth_results b JOIN past_party_votes v USING (ac_no, year, part_no)
      WHERE b.ac_no = $1 ORDER BY b.year, b.part_no`, [acNo]);
  const out: AcResults = new Map();
  for (const x of r.rows) {
    let y = out.get(x.year);
    if (!y) out.set(x.year, (y = new Map()));
    let b = y.get(x.part_no);
    if (!b) y.set(x.part_no, (b = { part: x.part_no, name: x.booth_name, village: x.village, total: x.total_votes, electors: x.electors, sample: x.is_sample, estimated: x.is_estimated, votes: {} }));
    b.votes[x.party_code] = x.votes;
  }
  return out;
}

export const partiesOf = (res: AcResults) => [...new Set([...res.values()].flatMap((y) => [...y.values()].flatMap((b) => Object.keys(b.votes))))].sort();

/** Picks the party: the requested code when it exists, else the team party (short name, then name), else the top party. */
export function pickParty(res: AcResults, wanted: string | undefined, team: { short: string | null; name: string }): string | null {
  const codes = partiesOf(res);
  if (!codes.length) return null;
  const find = (s: string | null | undefined) => (s ? codes.find((c) => c.toLowerCase() === s.trim().toLowerCase()) : undefined);
  const hit = find(wanted) ?? find(team.short) ?? find(team.name);
  if (hit) return hit;
  const last = [...res.keys()].sort().at(-1)!;
  const sum = sumVotes([...res.get(last)!.values()]);
  return Object.entries(sum).sort((a, b) => b[1] - a[1])[0][0];
}

export function sumVotes(booths: BoothYear[]): Record<string, number> {
  const s: Record<string, number> = {};
  for (const b of booths) for (const [k, v] of Object.entries(b.votes)) s[k] = (s[k] ?? 0) + v;
  return s;
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

/** One area (a set of booths) in one year, from the point of view of `party`. */
export function areaYear(booths: BoothYear[], party: string) {
  const votes = sumVotes(booths);
  const total = booths.reduce((a, b) => a + b.total, 0) || Object.values(votes).reduce((a, x) => a + x, 0);
  const shares = Object.fromEntries(Object.entries(votes).map(([k, v]) => [k, pct(v, total)]));
  const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const ours = votes[party] ?? 0;
  const rival = sorted.find(([k]) => k !== party)?.[1] ?? 0;
  const electors = booths.every((b) => b.electors) ? booths.reduce((a, b) => a + (b.electors ?? 0), 0) : null;
  const estimated = booths.filter((b) => b.estimated).length;
  return { total, votes, shares, ours: pct(ours, total), oursVotes: ours, winner: sorted[0]?.[0] ?? null, margin: ours - rival, rivalVotes: rival, electors, estimated };
}

/** Safe / swing / tough by the last margin (decision D6). */
export const groupOf = (margin: number): 'safe' | 'swing' | 'tough' => (margin >= 100 ? 'safe' : margin < -100 ? 'tough' : 'swing');

/** Votes needed now: the strongest rival's last votes + 1, scaled to today's roll when both sizes are known. */
export function neededNow(rivalVotes: number, lastElectors: number | null, currentVoters: number) {
  const scale = lastElectors && currentVoters ? currentVoters / lastElectors : 1;
  return Math.ceil((rivalVotes + 1) * scale);
}

/** Booth strength from the last election for this party (spec real-demo-data B3, D3): S won by ≥ 100, W lost by > 100, else M. */
export function autoStrength(res: AcResults, party: string | null): Map<number, 'S' | 'M' | 'W'> {
  const out = new Map<number, 'S' | 'M' | 'W'>();
  if (!party) return out;
  for (const year of [...res.keys()].sort((a, b) => a - b)) {
    for (const b of res.get(year)!.values()) {
      const g = groupOf(areaYear([b], party).margin);
      out.set(b.part, g === 'safe' ? 'S' : g === 'tough' ? 'W' : 'M');
    }
  }
  return out;
}
