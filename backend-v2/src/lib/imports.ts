/**
 * Voter-roll upload (super-admin only): file → staging rows → checks → super-admin confirms → merge.
 * CSV or XLSX with a header row. Column names (any case): part_no, booth_name, locality, sno, epic, name,
 * relation (S/o, W/o, D/o or F/H), relative_name, gender, age, house_no, section_no, section, mobile, lat, lng.
 * Optional regional columns (spec bilingual-roll U1): name_local, relative_name_local, section_local, booth_name_local,
 * booth_address, booth_address_local, locality_local.
 * A later file for the same assembly is previewed first (U3) and applied only on confirm; EPIC is the voter's identity.
 */
import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import type pg from 'pg';
import { core, inParty, statePool } from '../db/pools.js';

export const COLUMNS = ['part_no', 'booth_name', 'locality', 'sno', 'epic', 'name', 'relation', 'relative_name', 'gender', 'age', 'house_no', 'section_no', 'section', 'mobile', 'lat', 'lng',
  'name_local', 'relative_name_local', 'section_local', 'booth_name_local', 'booth_address', 'booth_address_local', 'locality_local'] as const;
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
  const opt = (k: keyof Raw) => need(k) || null;
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
      part_no: part, booth_name: need('booth_name') || `Booth ${part}`, locality: opt('locality'), sno, epic, name, relation,
      relative_name: opt('relative_name'), gender, age, house_no: opt('house_no'),
      section_no: need('section_no') ? Number(need('section_no')) || null : null, section: need('section') || need('locality') || null,
      mobile: /^[6-9]\d{9}$/.test(mob) ? mob : null,
      lat: lat != null && Number.isFinite(lat) ? lat : null, lng: lng != null && Number.isFinite(lng) ? lng : null,
      name_local: opt('name_local'), relative_name_local: opt('relative_name_local'), section_local: need('section_local') || need('locality_local') || null,
      booth_name_local: opt('booth_name_local'), booth_address: opt('booth_address'), booth_address_local: opt('booth_address_local'), locality_local: opt('locality_local'),
    },
  };
}

export type RollKind = 'draft' | 'final' | 'supplement';

export async function stageImport(opts: {
  stateCode: string; acNo: number; acName?: string; acNameLocal?: string; rollKind?: RollKind; publishedOn?: string; fileName: string; buf: Buffer; userId: string;
}) {
  const pool = await statePool(opts.stateCode);
  const sha = createHash('sha256').update(opts.buf).digest('hex');
  const job = await pool.query<{ id: string }>(
    `INSERT INTO import_jobs (kind, ac_no, ac_name, ac_name_local, roll_kind, published_on, file_name, file_sha256, status, created_by, started_at)
     VALUES ('voter_roll', $1, $2, $3, $4, $5, $6, $7, 'validating', $8, now()) RETURNING id`,
    [opts.acNo, opts.acName ?? null, opts.acNameLocal ?? null, opts.rollKind ?? 'draft', opts.publishedOn ?? null, opts.fileName, sha, opts.userId]);
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
    const summary = ok ? await preview(pool, jobId, opts.acNo) : null;
    await pool.query(`UPDATE import_jobs SET status = $2, rows_total = $3, rows_ok = $4, rows_failed = $5, message = $6, summary = $7 WHERE id = $1`,
      [jobId, ok ? 'ready' : 'failed', ok + bad, ok, bad, ok ? null : 'No valid rows', summary ? JSON.stringify(summary) : null]);
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

/** Visible voters (lists, counts, search). Hidden ones keep their history (spec bilingual-roll U6). */
export const VISIBLE = `status IN ('active','added')`;
const LIST_MAX = 200;
const S = 'import_staging s';
const SE = (k: string) => `s.data->>'${k}'`;
const SN = (k: string, t: string) => `(s.data->>'${k}')::${t}`;
/** Any detail that a new roll can change (booth is counted separately as "moved"). */
const DETAILS: [string, string][] = [
  ['sno', SN('sno', 'int')], ['name', SE('name')], ['name_local', SE('name_local')], ['relation', SE('relation')],
  ['relative_name', SE('relative_name')], ['relative_name_local', SE('relative_name_local')], ['gender', SE('gender')],
  ['age', SN('age', 'smallint')], ['house_no', SE('house_no')], ['section_no', SN('section_no', 'smallint')],
  ['section', SE('section')], ['section_local', SE('section_local')],
];

/**
 * U2/U3: compares the checked rows with what the assembly has now. Rows whose EPIC is visible in another assembly are
 * held for the super-admin (U7). Nothing is changed in voters.
 */
async function preview(pool: pg.Pool, jobId: string, acNo: number) {
  await pool.query(
    `INSERT INTO import_held (job_id, row_no, epic, other_ac, other_voter_id)
     SELECT DISTINCT ON (s.row_no) s.job_id, s.row_no, ${SE('epic')}, o.ac_no, o.id
       FROM ${S} JOIN voters o ON o.epic = ${SE('epic')} AND o.ac_no <> $2 AND o.${VISIBLE}
      WHERE s.job_id = $1 AND s.error IS NULL
        AND NOT EXISTS (SELECT 1 FROM voters h WHERE h.ac_no = $2 AND h.epic = ${SE('epic')} AND h.${VISIBLE})
      ORDER BY s.row_no, o.ac_no
     ON CONFLICT DO NOTHING`, [jobId, acNo]);
  const differs = DETAILS.map(([col, expr]) => `v.${col} IS DISTINCT FROM ${expr}`).join(' OR ');
  const r = await pool.query<{ cat: string; n: number }>(
    `WITH rows AS (
       SELECT s.row_no, v.status, v.part_no AS old_part, ${SN('part_no', 'smallint')} AS new_part, (${differs}) AS diff, h.row_no IS NOT NULL AS held
         FROM ${S}
         LEFT JOIN voters v ON v.ac_no = $2 AND v.epic = ${SE('epic')}
         LEFT JOIN import_held h ON h.job_id = s.job_id AND h.row_no = s.row_no
        WHERE s.job_id = $1 AND s.error IS NULL)
     SELECT CASE WHEN held THEN 'held'
                 WHEN status IS NULL THEN 'new'
                 WHEN status NOT IN ('active','added') THEN 'back'
                 WHEN old_part <> new_part THEN 'moved'
                 WHEN diff THEN 'changed' ELSE 'unchanged' END AS cat, count(*)::int AS n
       FROM rows GROUP BY 1`, [jobId, acNo]);
  const counts: Record<string, number> = { unchanged: 0, changed: 0, moved: 0, new: 0, back: 0, held: 0 };
  for (const x of r.rows) counts[x.cat] = x.n;
  const notIn = await pool.query<{ epic: string; name: string; part_no: number }>(
    `SELECT v.epic, v.name, v.part_no FROM voters v
      WHERE v.ac_no = $2 AND v.${VISIBLE} AND NOT EXISTS (SELECT 1 FROM ${S} WHERE s.job_id = $1 AND s.error IS NULL AND ${SE('epic')} = v.epic)
      ORDER BY v.part_no, v.sno`, [jobId, acNo]);
  const moved = await pool.query<{ epic: string; name: string; from: number; to: number }>(
    `SELECT v.epic, v.name, v.part_no AS "from", ${SN('part_no', 'smallint')} AS "to"
       FROM ${S} JOIN voters v ON v.ac_no = $2 AND v.epic = ${SE('epic')} AND v.${VISIBLE}
      WHERE s.job_id = $1 AND s.error IS NULL AND v.part_no <> ${SN('part_no', 'smallint')} ORDER BY 3, 4 LIMIT ${LIST_MAX}`, [jobId, acNo]);
  const fresh = await pool.query<{ epic: string; name: string; part: number }>(
    `SELECT ${SE('epic')} AS epic, ${SE('name')} AS name, ${SN('part_no', 'smallint')} AS part FROM ${S}
      WHERE s.job_id = $1 AND s.error IS NULL AND NOT EXISTS (SELECT 1 FROM voters v WHERE v.ac_no = $2 AND v.epic = ${SE('epic')})
        AND NOT EXISTS (SELECT 1 FROM import_held h WHERE h.job_id = s.job_id AND h.row_no = s.row_no)
      ORDER BY s.row_no LIMIT ${LIST_MAX}`, [jobId, acNo]);
  return {
    ...counts, notInRoll: notIn.rowCount ?? 0,
    lists: {
      moved: moved.rows, new: fresh.rows,
      notInRoll: notIn.rows.slice(0, LIST_MAX).map((x) => ({ epic: x.epic, name: x.name, part: x.part_no })),
    },
  };
}

/** The held rows of a job with their decisions (U7). */
export async function heldRows(pool: pg.Pool, jobId: string) {
  const r = await pool.query<{ row_no: number; epic: string; other_ac: number; decision: string | null; name: string }>(
    `SELECT h.row_no, h.epic, h.other_ac, h.decision, s.data->>'name' AS name FROM import_held h
       JOIN import_staging s ON s.job_id = h.job_id AND s.row_no = h.row_no WHERE h.job_id = $1 ORDER BY h.row_no LIMIT 1000`, [jobId]);
  return r.rows.map((x) => ({ rowNo: x.row_no, epic: x.epic, name: x.name, otherAc: x.other_ac, decision: x.decision }));
}

/**
 * Applies a checked job (U4–U7). One roll update per state at a time (advisory lock), all-or-nothing. Party work stays with
 * the voter id; booth moves carry every party's contacts and poll marks; voters missing from the file are hidden, not removed.
 */
export async function mergeImport(stateCode: string, jobId: string) {
  const pool = await statePool(stateCode);
  const job = (await pool.query<{ ac_no: number; ac_name: string | null; ac_name_local: string | null; file_name: string; roll_kind: RollKind; published_on: string | null }>(
    `SELECT ac_no, ac_name, ac_name_local, file_name, roll_kind, to_char(published_on, 'YYYY-MM-DD') AS published_on FROM import_jobs WHERE id = $1`, [jobId])).rows[0];
  const ac = job.ac_no;
  await pool.query(`UPDATE import_jobs SET status = 'merging' WHERE id = $1`, [jobId]);
  const touchedAcs = new Set<number>([ac]);
  try {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.all_parties', 'on', true)`); // contacts and poll marks of every party move with the voter
      await c.query(`SELECT pg_advisory_xact_lock(hashtext('elvote.roll'))`); // U2: one roll update per state at a time
      await c.query(
        `INSERT INTO assembly_constituencies (ac_no, name, name_local) VALUES ($1, $2, $3)
         ON CONFLICT (ac_no) DO UPDATE SET name_local = COALESCE(EXCLUDED.name_local, assembly_constituencies.name_local)`,
        [ac, job.ac_name ?? `AC ${ac}`, job.ac_name_local]);
      await c.query('SELECT ensure_ac($1::smallint)', [ac]);
      const hadVoters = !!(await c.query('SELECT 1 FROM voters WHERE ac_no = $1 LIMIT 1', [ac])).rowCount;
      await c.query('UPDATE roll_versions SET is_current = false WHERE ac_no = $1', [ac]);
      const roll = (await c.query<{ id: string }>(
        `INSERT INTO roll_versions (ac_no, source_name, import_job_id, kind, published_on) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [ac, job.file_name, jobId, job.roll_kind, job.published_on])).rows[0].id;

      // Rows to apply: valid, and not held — or held with "move" (U7).
      await c.query(`CREATE TEMP TABLE apply_rows ON COMMIT DROP AS
        SELECT s.row_no, s.data FROM import_staging s
          LEFT JOIN import_held h ON h.job_id = s.job_id AND h.row_no = s.row_no
         WHERE s.job_id = $1 AND s.error IS NULL AND (h.row_no IS NULL OR h.decision = 'move')`, [jobId]);
      const moves = await c.query<{ other_ac: number }>(
        `UPDATE voters o SET status = 'moved_out', hidden_at = now(), updated_at = now()
           FROM import_held h WHERE h.job_id = $1 AND h.decision = 'move' AND o.ac_no = h.other_ac AND o.id = h.other_voter_id
         RETURNING h.other_ac`, [jobId]);
      for (const x of moves.rows) touchedAcs.add(x.other_ac);
      // A row whose EPIC became visible in another assembly since the preview is skipped (EPIC stays unique in the state).
      await c.query(
        `DELETE FROM apply_rows a WHERE NOT EXISTS (SELECT 1 FROM voters h WHERE h.ac_no = $1 AND h.epic = a.data->>'epic' AND h.${VISIBLE})
           AND EXISTS (SELECT 1 FROM voters o WHERE o.epic = a.data->>'epic' AND o.ac_no <> $1 AND o.${VISIBLE})`, [ac]);

      await c.query(
        `INSERT INTO booths (ac_no, part_no, name, name_local, address, address_local, locality, locality_local, lat, lng, location_source)
         SELECT DISTINCT ON ((data->>'part_no')::smallint) $1, (data->>'part_no')::smallint, data->>'booth_name', data->>'booth_name_local',
                data->>'booth_address', data->>'booth_address_local', data->>'locality', data->>'locality_local',
                (data->>'lat')::numeric, (data->>'lng')::numeric, CASE WHEN data->>'lat' IS NOT NULL THEN 'upload' END
           FROM apply_rows ORDER BY (data->>'part_no')::smallint, row_no
         ON CONFLICT (ac_no, part_no) DO UPDATE SET name = EXCLUDED.name, name_local = COALESCE(EXCLUDED.name_local, booths.name_local),
           address = COALESCE(EXCLUDED.address, booths.address), address_local = COALESCE(EXCLUDED.address_local, booths.address_local),
           locality = COALESCE(EXCLUDED.locality, booths.locality), locality_local = COALESCE(EXCLUDED.locality_local, booths.locality_local),
           lat = COALESCE(EXCLUDED.lat, booths.lat), lng = COALESCE(EXCLUDED.lng, booths.lng), updated_at = now()`, [ac]);
      await c.query(
        `INSERT INTO voters (ac_no, part_no, booth_id, sno, epic, name, name_local, relation, relative_name, relative_name_local, gender, age,
                             house_no, section_no, section, section_local, mobile, roll_version_id, status, is_new)
         SELECT $1, (a.data->>'part_no')::smallint, b.id, (a.data->>'sno')::int, a.data->>'epic', a.data->>'name', a.data->>'name_local', a.data->>'relation',
                a.data->>'relative_name', a.data->>'relative_name_local', a.data->>'gender', (a.data->>'age')::smallint, a.data->>'house_no',
                (a.data->>'section_no')::smallint, a.data->>'section', a.data->>'section_local', a.data->>'mobile', $2, 'added', $3
           FROM apply_rows a JOIN booths b ON b.ac_no = $1 AND b.part_no = (a.data->>'part_no')::smallint
         ON CONFLICT (ac_no, epic) DO UPDATE SET
           prev_part_no = CASE WHEN voters.part_no <> EXCLUDED.part_no THEN voters.part_no ELSE voters.prev_part_no END,
           moved_at = CASE WHEN voters.part_no <> EXCLUDED.part_no THEN now() ELSE voters.moved_at END,
           part_no = EXCLUDED.part_no, booth_id = EXCLUDED.booth_id, sno = EXCLUDED.sno, name = EXCLUDED.name, name_local = EXCLUDED.name_local,
           relation = EXCLUDED.relation, relative_name = EXCLUDED.relative_name, relative_name_local = EXCLUDED.relative_name_local, gender = EXCLUDED.gender,
           age = EXCLUDED.age, house_no = EXCLUDED.house_no, section_no = EXCLUDED.section_no, section = EXCLUDED.section, section_local = EXCLUDED.section_local,
           mobile = COALESCE(EXCLUDED.mobile, voters.mobile), roll_version_id = EXCLUDED.roll_version_id,
           status = 'active', is_new = false, hidden_at = NULL, updated_at = now()`, [ac, roll, hadVoters]);
      // U6: visible voters missing from this roll are hidden (kept for trace; a later roll can bring them back).
      await c.query(
        `UPDATE voters v SET status = 'not_in_roll', hidden_at = now(), updated_at = now()
          WHERE v.ac_no = $1 AND v.${VISIBLE} AND NOT EXISTS (SELECT 1 FROM apply_rows a WHERE a.data->>'epic' = v.epic)`, [ac]);
      // U4: every party's work follows a voter who changed booth.
      await c.query(`UPDATE voter_contacts c SET part_no = v.part_no FROM voters v WHERE v.ac_no = $1 AND c.ac_no = $1 AND c.voter_id = v.id AND c.part_no <> v.part_no`, [ac]);
      await c.query(`UPDATE poll_marks p SET part_no = v.part_no FROM voters v WHERE v.ac_no = $1 AND p.ac_no = $1 AND p.voter_id = v.id AND p.part_no <> v.part_no`, [ac]);
      await c.query(`UPDATE booths b SET voters_count = (SELECT count(*) FROM voters v WHERE v.ac_no = b.ac_no AND v.booth_id = b.id AND v.${VISIBLE}) WHERE b.ac_no = ANY($1::smallint[])`, [[...touchedAcs]]);
      await c.query(`UPDATE import_jobs SET status = 'done', finished_at = now() WHERE id = $1`, [jobId]);
      await c.query('DELETE FROM import_staging WHERE job_id = $1 AND error IS NULL', [jobId]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
    // Rebuild counters for every party working in the assemblies that changed.
    const parties = await core.query<{ party_id: string; ac_no: number }>(
      `SELECT party_id, ac_no FROM party_constituencies WHERE state_code = $1 AND ac_no = ANY($2::smallint[]) AND deleted_at IS NULL`, [stateCode, [...touchedAcs]]);
    await inParty(pool, 'ALL', async (c) => {
      for (const p of parties.rows) {
        await c.query(`INSERT INTO stats_dirty (party_id, booth_id) SELECT $1, id FROM booths WHERE ac_no = $2 ON CONFLICT DO NOTHING`, [p.party_id, p.ac_no]);
      }
    });
  } catch (e) {
    await pool.query(`UPDATE import_jobs SET status = 'failed', message = $2, finished_at = now() WHERE id = $1`, [jobId, (e as Error).message.slice(0, 300)]);
  }
}

