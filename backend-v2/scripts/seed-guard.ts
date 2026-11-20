/**
 * Safety for the sample-data seed on a server (spec live-demo D7). The seed wipes data, so in production it runs
 * only with --demo and only on demo_ databases. DEMO_SUPERADMIN makes the owner's mobile a super-admin.
 */
import type pg from 'pg';

export function seedAllowed(o: { nodeEnv: string | undefined; argv: string[]; coreDb: string }): { ok: true } | { ok: false; reason: string } {
  if (o.nodeEnv !== 'production') return { ok: true };
  if (!o.argv.includes('--demo')) return { ok: false, reason: 'In production the seed runs only with --demo (it wipes data).' };
  if (!o.coreDb.startsWith('demo_')) return { ok: false, reason: `Refusing to seed ${o.coreDb}: only demo_ databases can be seeded.` };
  return { ok: true };
}

/**
 * AC12: makes a person a super-admin by their Google / sign-in email (idempotent). They sign in with Google and the
 * account links on the first sign-in. Mobile and name are optional (they can fill in Your details later).
 */
export async function promoteSuperAdmin(core: pg.Client | pg.Pool, o: { email: string; mobile?: string; name?: string }) {
  const email = o.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Give a valid email address.');
  if (o.mobile && !/^[6-9]\d{9}$/.test(o.mobile)) throw new Error('The mobile must be a 10-digit Indian mobile number.');
  const found = await core.query<{ id: string }>('SELECT id FROM users WHERE lower(email) = $1 AND deleted_at IS NULL', [email]);
  let id = found.rows[0]?.id;
  if (id) {
    await core.query(`UPDATE users SET status = 'active', mobile = COALESCE($2, mobile), name = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE name END, updated_at = now() WHERE id = $1`,
      [id, o.mobile ?? null, o.name ?? null]);
  } else {
    id = (await core.query<{ id: string }>('INSERT INTO users (email, mobile, name) VALUES ($1, $2, $3) RETURNING id', [email, o.mobile ?? null, o.name ?? ''])).rows[0].id;
  }
  await core.query(`INSERT INTO platform_admins (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET revoked_at = NULL`, [id]);
  return id;
}

/** AC12: a server seed creates no logins — the sample super-admin is switched off. */
export async function revokeSampleSuperAdmin(core: pg.Client | pg.Pool) {
  await core.query(`UPDATE platform_admins SET revoked_at = now() WHERE user_id IN (SELECT id FROM users WHERE mobile = '9000000001') AND revoked_at IS NULL`);
}
