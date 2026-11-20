/**
 * Voter-roll upload (super-admin only): file → staging rows → checks → super-admin confirms → merge.
 * CSV or XLSX with a header row. Column names (any case): part_no, booth_name, locality, sno, epic, name,
 * relation (S/o, W/o, D/o or F/H), relative_name, gender, age, house_no, section_no, section, mobile, lat, lng.
 */
import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import type pg from 'pg';
import { core, inParty, statePool } from '../db/pools.js';

export const COLUMNS = ['part_no', 'booth_name', 'locality', 'sno', 'epic', 'name', 'relation', 'relative_name', 'gender', 'age', 'house_no', 'section_no', 'section', 'mobile', 'lat', 'lng'] as const;
type Raw = Partial<Record<(typeof COLUMNS)[number], string>>;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

export async function readTable(fileName: string, buf: Buffer): Promise<string[][]> {
  if (/\.xlsx$/i.test(fileName)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    const out: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (r) => {
      const vals = (r.values as unknown[]).slice(1).map((v) => (v == null ? '' : typeof v === 'object' && v && 'text' in v ? String((v as { text: unknown }).text) : String(v)));
      out.push(vals);
    });
    return out;
  }
  return parseCsv(buf.toString('utf8').replace(/^﻿/, ''));
}

/** Validates one row; returns normalised data or an error message. */
export function checkRow(r: Raw): { data?: Record<string, unknown>; error?: string } {
  const need = (k: keyof Raw) => (r[k] ?? '').trim();
  const part = Number(need('part_no'));
  const sno = Number(need('sno'));
  const epic = need('epic').toUpperCase();
  const name = need('name');
  if (!Number.isInteger(part) || part < 1 || part > 9999) return { error: 'part_no must be a number 1–9999' };
  if (!Number.isInteger(sno) || sno < 1) return { error: 'sno must be a positive number' };
  if (!/^[A-Z]{2,4}\d{5,10}$/.test(epic)) return { error: 'EPIC looks wrong' };
  if (name.length < 2) return { error: 'name is missing' };
  const g = need('gender').toUpperCase();
  const gender = g.startsWith('F') ? 'F' : g.startsWith('M') ? 'M' : g ? 'T' : '';
  if (!gender) return { error: 'gender is missing' };
  const ageS = need('age');
  const age = ageS ? Number(ageS) : null;
  if (age != null && (!Number.isInteger(age) || age < 18 || age > 125)) return { error: 'age must be 18–125' };
  const relS = need('relation').toUpperCase().replace(/[^A-Z]/g, '');
  const relation = relS === 'WO' || relS === 'H' || relS === 'HUSBAND' ? 'H' : relS === 'MO' || relS === 'M' || relS === 'MOTHER' ? 'M' : relS === 'O' ? 'O' : 'F';
  const mob = need('mobile').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  const lat = need('lat') ? Number(need('lat')) : null;
  const lng = need('lng') ? Number(need('lng')) : null;
  return {
    data: {
      part_no: part, booth_name: need('booth_name') || `Booth ${part}`, locality: need('locality') || null, sno, epic, name, relation,
      relative_name: need('relative_name') || null, gender, age, house_no: need('house_no') || null,
      section_no: need('section_no') ? Number(need('section_no')) || null : null, section: need('section') || need('locality') || null,
      mobile: /^[6-9]\d{9}$/.test(mob) ? mob : null,
      lat: lat != null && Number.isFinite(lat) ? lat : null, lng: lng != null && Number.isFinite(lng) ? lng : null,
    },
  };
}

export async function stageImport(opts: { stateCode: string; acNo: number; acName?: string; fileName: string; buf: Buffer; userId: string }) {
  const pool = await statePool(opts.stateCode);
  const sha = createHash('sha256').update(opts.buf).digest('hex');
  const job = await pool.query<{ id: string }>(
    `INSERT INTO import_jobs (kind, ac_no, ac_name, file_name, file_sha256, status, created_by, started_at) VALUES ('voter_roll', $1, $2, $3, $4, 'validating', $5, now()) RETURNING id`,
    [opts.acNo, opts.acName ?? null, opts.fileName, sha, opts.userId]);
  const jobId = job.rows[0].id;
  try {
    const table = await readTable(opts.fileName, opts.buf);
    const header = (table[0] ?? []).map((h) => h.trim().toLowerCase().replace(/[\s.]+/g, '_'));
    const idx = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(c)]));
    const missing = ['part_no', 'sno', 'epic', 'name', 'gender'].filter((c) => idx[c] < 0);
    if (missing.length) {
      await pool.query(`UPDATE import_jobs SET status = 'failed', message = $2, finished_at = now() WHERE id = $1`, [jobId, `Missing columns: ${missing.join(', ')}`]);
      return jobId;
    }
    const seen = new Set<string>();
    let ok = 0, bad = 0;
    const batch: unknown[][] = [];
    for (let i = 1; i < table.length; i++) {
      const raw: Raw = {};
      for (const c of COLUMNS) if (idx[c] >= 0) raw[c] = table[i][idx[c]] ?? '';
      let { data, error } = checkRow(raw);
      if (data && seen.has(data.epic as string)) { error = 'EPIC repeated in this file'; data = undefined; }
      if (data) { seen.add(data.epic as string); ok++; } else bad++;
      batch.push([jobId, i + 1, JSON.stringify(data ?? raw), error ?? null]);
      if (batch.length >= 1000) await flush(pool, batch);
    }
    await flush(pool, batch);
    await pool.query(`UPDATE import_jobs SET status = $2, rows_total = $3, rows_ok = $4, rows_failed = $5, message = $6 WHERE id = $1`,
      [jobId, ok ? 'ready' : 'failed', ok + bad, ok, bad, ok ? null : 'No valid rows']);
  } catch (e) {
    await pool.query(`UPDATE import_jobs SET status = 'failed', message = $2, finished_at = now() WHERE id = $1`, [jobId, `Could not read the file: ${(e as Error).message.slice(0, 200)}`]);
  }
  return jobId;
}

async function flush(pool: pg.Pool, batch: unknown[][]) {
  if (!batch.length) return;
  const params: unknown[] = [];
  const values = batch.map((r) => `(${r.map((v) => { params.push(v); return `$${params.length}`; }).join(',')})`).join(',');
  await pool.query(`INSERT INTO import_staging (job_id, row_no, data, error) VALUES ${values}`, params);
  batch.length = 0;
}

/** Merges a ready job into booths + voters, then rebuilds counters for every party in that AC. */
export async function mergeImport(stateCode: string, jobId: string) {
  const pool = await statePool(stateCode);
  const job = (await pool.query<{ ac_no: number; ac_name: string | null; file_name: string }>('SELECT ac_no, ac_name, file_name FROM import_jobs WHERE id = $1', [jobId])).rows[0];
  await pool.query(`UPDATE import_jobs SET status = 'merging' WHERE id = $1`, [jobId]);
  try {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`INSERT INTO assembly_constituencies (ac_no, name) VALUES ($1, $2) ON CONFLICT (ac_no) DO NOTHING`, [job.ac_no, job.ac_name ?? `AC ${job.ac_no}`]);
      await c.query('SELECT ensure_ac($1::smallint)', [job.ac_no]);
      const roll = (await c.query<{ id: string }>(`INSERT INTO roll_versions (ac_no, source_name, import_job_id) VALUES ($1,$2,$3) RETURNING id`, [job.ac_no, job.file_name, jobId])).rows[0].id;
      await c.query(
        `INSERT INTO booths (ac_no, part_no, name, locality, lat, lng, location_source)
         SELECT DISTINCT ON ((data->>'part_no')::smallint) $2, (data->>'part_no')::smallint, data->>'booth_name', data->>'locality',
                (data->>'lat')::numeric, (data->>'lng')::numeric, CASE WHEN data->>'lat' IS NOT NULL THEN 'upload' END
           FROM import_staging WHERE job_id = $1 AND error IS NULL ORDER BY (data->>'part_no')::smallint, row_no
         ON CONFLICT (ac_no, part_no) DO UPDATE SET name = EXCLUDED.name, locality = COALESCE(EXCLUDED.locality, booths.locality),
           lat = COALESCE(EXCLUDED.lat, booths.lat), lng = COALESCE(EXCLUDED.lng, booths.lng), updated_at = now()`, [jobId, job.ac_no]);
      await c.query(
        `INSERT INTO voters (ac_no, part_no, booth_id, sno, epic, name, relation, relative_name, gender, age, house_no, section_no, section, mobile, roll_version_id, status)
         SELECT $2, (s.data->>'part_no')::smallint, b.id, (s.data->>'sno')::int, s.data->>'epic', s.data->>'name', s.data->>'relation', s.data->>'relative_name',
                s.data->>'gender', (s.data->>'age')::smallint, s.data->>'house_no', (s.data->>'section_no')::smallint, s.data->>'section', s.data->>'mobile', $3, 'added'
           FROM import_staging s JOIN booths b ON b.ac_no = $2 AND b.part_no = (s.data->>'part_no')::smallint
          WHERE s.job_id = $1 AND s.error IS NULL
         ON CONFLICT (ac_no, epic) DO UPDATE SET part_no = EXCLUDED.part_no, booth_id = EXCLUDED.booth_id, sno = EXCLUDED.sno, name = EXCLUDED.name,
           relation = EXCLUDED.relation, relative_name = EXCLUDED.relative_name, gender = EXCLUDED.gender, age = EXCLUDED.age, house_no = EXCLUDED.house_no,
           section_no = EXCLUDED.section_no, section = EXCLUDED.section, mobile = COALESCE(EXCLUDED.mobile, voters.mobile), roll_version_id = EXCLUDED.roll_version_id,
           status = 'active', updated_at = now()`, [jobId, job.ac_no, roll]);
      await c.query(`UPDATE booths b SET voters_count = (SELECT count(*) FROM voters v WHERE v.ac_no = b.ac_no AND v.booth_id = b.id AND v.status <> 'deleted') WHERE b.ac_no = $1`, [job.ac_no]);
      await c.query(`UPDATE import_jobs SET status = 'done', finished_at = now() WHERE id = $1`, [jobId]);
      await c.query('DELETE FROM import_staging WHERE job_id = $1 AND error IS NULL', [jobId]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
    // Rebuild counters for every party working in this AC.
    const parties = await core.query<{ party_id: string }>(`SELECT party_id FROM party_constituencies WHERE state_code = $1 AND ac_no = $2 AND deleted_at IS NULL`, [stateCode, job.ac_no]);
    await inParty(pool, 'ALL', async (c) => {
      for (const p of parties.rows) {
        await c.query(`INSERT INTO stats_dirty (party_id, booth_id) SELECT $1, id FROM booths WHERE ac_no = $2 ON CONFLICT DO NOTHING`, [p.party_id, job.ac_no]);
      }
    });
  } catch (e) {
    await pool.query(`UPDATE import_jobs SET status = 'failed', message = $2, finished_at = now() WHERE id = $1`, [jobId, (e as Error).message.slice(0, 300)]);
  }
}
