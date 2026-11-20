/**
 * Creates the databases and the API role, applies SQL migrations to the central DB and every state DB,
 * and sets least-privilege grants. Safe to re-run. `--reset` drops the local databases first (local only).
 * Usage: npm run db:migrate [-- --reset]   (DB_PREFIX env var lets tests use separate databases)
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { env, LOCAL_STATES, superUrl } from '../src/config.js';

const root = path.resolve(import.meta.dirname, '..', 'migrations');
const prefix = process.env.DB_PREFIX ?? '';

export const dbNames = () => ({
  core: prefix + env.CORE_DB,
  states: LOCAL_STATES.map((s) => ({ ...s, db: prefix + s.db })),
});

async function withClient<T>(db: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: superUrl(db) });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function apply(db: string, dir: string, vars: Record<string, string>) {
  await withClient(db, async (c) => {
    await c.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await c.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    for (const f of readdirSync(path.join(root, dir)).filter((x) => x.endsWith('.sql')).sort()) {
      if (done.has(f)) continue;
      let sql = readFileSync(path.join(root, dir, f), 'utf8');
      for (const [k, v] of Object.entries(vars)) sql = sql.replaceAll(k, v);
      await c.query('BEGIN');
      try {
        await c.query(sql);
        await c.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
        await c.query('COMMIT');
        console.log(`  ${db}: applied ${f}`);
      } catch (e) {
        await c.query('ROLLBACK');
        throw new Error(`${db}/${f}: ${(e as Error).message}`);
      }
    }
  });
}

/** API role gets data access on parent tables only (partitions stay unreachable, so RLS always applies). */
async function grant(db: string, extraRevokes: string[]) {
  await withClient(db, async (c) => {
    await c.query(`GRANT CONNECT ON DATABASE ${db} TO ${env.PG_API_USER}`);
    await c.query(`GRANT USAGE ON SCHEMA public TO ${env.PG_API_USER}`);
    await c.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${env.PG_API_USER}`);
    const tables = await c.query<{ relname: string }>(
      `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relispartition`,
    );
    for (const { relname } of tables.rows) {
      if (extraRevokes.includes(relname)) continue;
      await c.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${relname} TO ${env.PG_API_USER}`);
    }
    for (const t of extraRevokes) await c.query(`REVOKE ALL ON ${t} FROM ${env.PG_API_USER}`).catch(() => undefined);
  });
}

export async function migrate(opts: { reset?: boolean } = {}) {
  const names = dbNames();
  const all = [names.core, ...names.states.map((s) => s.db)];
  await withClient('postgres', async (c) => {
    const role = await c.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [env.PG_API_USER]);
    if (!role.rowCount) {
      await c.query(`CREATE ROLE ${env.PG_API_USER} LOGIN PASSWORD '${env.PG_API_PASS.replaceAll("'", "''")}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
    }
    for (const db of all) {
      if (opts.reset) await c.query(`DROP DATABASE IF EXISTS ${db} WITH (FORCE)`);
      const exists = await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [db]);
      if (!exists.rowCount) await c.query(`CREATE DATABASE ${db} ENCODING 'UTF8' TEMPLATE template0`);
    }
  });

  await apply(names.core, 'core', {});
  for (const s of names.states) {
    await apply(s.db, 'state', { __STATE_NO__: String(s.stateNo), __STATE_BASE__: String(BigInt(s.stateNo) << 40n) });
  }

  // Shard map + states (infrastructure config, idempotent).
  await withClient(names.core, async (c) => {
    for (const s of names.states) {
      const shard = await c.query<{ id: string }>(
        `INSERT INTO shards (name, host_ref) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET host_ref = EXCLUDED.host_ref RETURNING id`,
        [s.db, s.hostRef],
      );
      await c.query(
        `INSERT INTO states (code, state_no, name, name_local, regional_lang, shard_id) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (code) DO UPDATE SET shard_id = EXCLUDED.shard_id`,
        [s.code, s.stateNo, s.name, s.nameLocal, s.lang, shard.rows[0].id],
      );
    }
  });

  await grant(names.core, []);
  await withClient(names.core, (c) => c.query(`REVOKE UPDATE, DELETE ON audit_log FROM ${env.PG_API_USER}`));
  for (const s of names.states) await grant(s.db, ['voter_sensitive']);
  console.log('Migrations done:', all.join(', '));
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  migrate({ reset: process.argv.includes('--reset') }).catch((e) => {
    console.error('Migration failed:', e.message);
    process.exit(1);
  });
}
