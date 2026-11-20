/**
 * Operator command (spec accounts-access AC12): make someone a super-admin by email.
 * Usage: npm run admin:super -- --email owner@gmail.com [--mobile 98xxxxxxxx] [--name "Full Name"]
 */
import pg from 'pg';
import { env, superUrl } from '../src/config.js';
import { promoteSuperAdmin } from './seed-guard.js';

const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

const email = arg('email');
if (!email) {
  console.error('Usage: npm run admin:super -- --email owner@gmail.com [--mobile 98xxxxxxxx] [--name "Full Name"]');
  process.exit(1);
}
const c = new pg.Client({ connectionString: superUrl((process.env.DB_PREFIX ?? '') + env.CORE_DB) });
await c.connect();
try {
  await promoteSuperAdmin(c, { email, mobile: arg('mobile'), name: arg('name') });
  console.log(`Super-admin ready: ${email.toLowerCase()} (sign in with Google or this email).`);
} finally {
  await c.end();
}
