/** Data language of an assembly (spec bilingual-roll L1): the assembly's own setting, else the state's language. */
import { core, statePool } from '../db/pools.js';

export type DataLang = 'hi' | 'pa';
const stateCache = new Map<string, DataLang>();

export async function stateLang(stateCode: string): Promise<DataLang> {
  const hit = stateCache.get(stateCode);
  if (hit) return hit;
  const r = await core.query<{ regional_lang: string }>('SELECT regional_lang FROM states WHERE code = $1', [stateCode]);
  const lang: DataLang = r.rows[0]?.regional_lang === 'pa' ? 'pa' : 'hi';
  stateCache.set(stateCode, lang);
  return lang;
}

/** Languages of several assemblies of one state at once (for /v1/me). */
export async function acLangs(stateCode: string, acNos: number[]): Promise<Map<number, DataLang>> {
  const pool = await statePool(stateCode);
  const def = await stateLang(stateCode);
  const r = await pool.query<{ ac_no: number; regional_lang: DataLang | null }>('SELECT ac_no, regional_lang FROM assembly_constituencies WHERE ac_no = ANY($1::smallint[])', [acNos]);
  const m = new Map<number, DataLang>(acNos.map((n) => [n, def]));
  for (const x of r.rows) if (x.regional_lang) m.set(x.ac_no, x.regional_lang);
  return m;
}
