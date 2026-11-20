/** TC-LD-D6-1, TC-LD-D7-1, TC-LD-D7-2 (docs/test-cases/live-demo.md). */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Env, superUrl } from '../src/config.js';
import { promoteSuperAdmin, seedAllowed } from '../scripts/seed-guard.js';

describe('HOST setting (D6)', () => {
  const base = { JWT_SECRET: 'x'.repeat(40) };
  it('defaults to 0.0.0.0 and accepts 127.0.0.1', () => {
    expect(Env.parse(base).HOST).toBe('0.0.0.0');
    expect(Env.parse({ ...base, HOST: '127.0.0.1' }).HOST).toBe('127.0.0.1');
  });
});

describe('seed guard (D7)', () => {
  it('allows any non-production environment', () => {
    expect(seedAllowed({ nodeEnv: 'development', argv: [], coreDb: 'elvote_core' })).toEqual({ ok: true });
  });
  it('refuses production without --demo', () => {
    expect(seedAllowed({ nodeEnv: 'production', argv: [], coreDb: 'demo_elvote_core' }).ok).toBe(false);
  });
  it('refuses production --demo when the core DB is not a demo_ DB', () => {
    expect(seedAllowed({ nodeEnv: 'production', argv: ['--demo'], coreDb: 'elvote_core' }).ok).toBe(false);
  });
  it('allows production --demo on demo_ DBs', () => {
    expect(seedAllowed({ nodeEnv: 'production', argv: ['--demo'], coreDb: 'demo_elvote_core' })).toEqual({ ok: true });
  });
});

describe('super-admin command (AC12)', () => {
  let core: pg.Client;
  beforeAll(async () => {
    core = new pg.Client({ connectionString: superUrl('t_elvote_core') });
    await core.connect();
  });
  afterAll(async () => {
    await core.query(`DELETE FROM platform_admins WHERE user_id IN (SELECT id FROM users WHERE lower(email) = 'boss.demo@gmail.com')`);
    await core.query(`DELETE FROM users WHERE lower(email) = 'boss.demo@gmail.com'`);
    await core.end();
  });

  it('makes the email an active platform admin, idempotently (AC12)', async () => {
    await promoteSuperAdmin(core, { email: 'Boss.Demo@gmail.com', mobile: '9811100099', name: 'Boss Demo' });
    await promoteSuperAdmin(core, { email: 'boss.demo@gmail.com' });
    const r = await core.query(
      `SELECT count(*)::int AS n, max(u.mobile) AS mobile FROM platform_admins pa JOIN users u ON u.id = pa.user_id
        WHERE lower(u.email) = 'boss.demo@gmail.com' AND pa.revoked_at IS NULL`,
    );
    expect(r.rows[0]).toEqual({ n: 1, mobile: '9811100099' });
  });

  it('rejects a bad email or mobile', async () => {
    await expect(promoteSuperAdmin(core, { email: 'not-an-email' })).rejects.toThrow(/email/);
    await expect(promoteSuperAdmin(core, { email: 'a@b.com', mobile: '12345' })).rejects.toThrow(/10-digit/);
  });
});
