/**
 * Local PostgreSQL 16 for development (no Docker needed). Data lives in backend-v2/.pgdata.
 * Keep this running in its own terminal: `npm run db:start`. Ctrl+C stops it cleanly.
 */
import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const dir = path.resolve(import.meta.dirname, '..', '.pgdata');
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: process.env.PG_SUPERUSER ?? 'postgres',
  password: process.env.PG_SUPERPASS ?? 'local-dev-only',
  port: Number(process.env.PG_PORT ?? 5544),
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  postgresFlags: ['-c', 'shared_buffers=128MB', '-c', 'max_connections=60', '-c', 'listen_addresses=127.0.0.1'],
});

if (!existsSync(path.join(dir, 'PG_VERSION'))) {
  console.log('Creating a new local database cluster in', dir);
  await pg.initialise();
}
await pg.start();
console.log(`PostgreSQL is running on 127.0.0.1:${process.env.PG_PORT ?? 5544}. Press Ctrl+C to stop.`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
