/**
 * Connection pools. The API always connects as the least-privilege role (elvote_api).
 * State DBs are found through core.shards: moving a state = change its row (and env var), no code change.
 */
import pg from 'pg';
import { env, pgUrl } from '../config.js';

pg.types.setTypeParser(20, (v) => v); // bigint → string (voter ids exceed 2^53)

const prefix = process.env.DB_PREFIX ?? '';
const POOL_MAX = 10;

export const core = new pg.Pool({ connectionString: pgUrl(prefix + env.CORE_DB), max: POOL_MAX, idleTimeoutMillis: 30_000 });

const statePools = new Map<string, pg.Pool>();
let shardCache: Map<string, string> | null = null;

async function loadShards() {
  const r = await core.query<{ code: string; name: string; host_ref: string }>(
    `SELECT s.code, sh.name, sh.host_ref FROM states s JOIN shards sh ON sh.id = s.shard_id`,
  );
  shardCache = new Map(r.rows.map((x) => [x.code.trim(), process.env[x.host_ref] && !prefix ? process.env[x.host_ref]! : pgUrl(x.name)]));
}

export async function statePool(stateCode: string): Promise<pg.Pool> {
  const existing = statePools.get(stateCode);
  if (existing) return existing;
  if (!shardCache) await loadShards();
  const url = shardCache!.get(stateCode);
  if (!url) throw new Error(`Unknown state ${stateCode}`);
  const pool = new pg.Pool({ connectionString: url, max: POOL_MAX, idleTimeoutMillis: 30_000 });
  statePools.set(stateCode, pool);
  return pool;
}

export async function allStateCodes(): Promise<string[]> {
  if (!shardCache) await loadShards();
  return [...shardCache!.keys()];
}

/**
 * Runs fn in a transaction scoped to one party (row-level security), or to all parties for
 * platform jobs (counters, super-admin totals).
 */
export async function inParty<T>(pool: pg.Pool, partyId: string | 'ALL', fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    if (partyId === 'ALL') await c.query(`SELECT set_config('app.all_parties', 'on', true)`);
    else await c.query(`SELECT set_config('app.party_id', $1, true)`, [partyId]);
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

export async function inTx<T>(pool: pg.Pool, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

export async function closeAll() {
  await core.end();
  for (const p of statePools.values()) await p.end();
  statePools.clear();
  shardCache = null;
}
