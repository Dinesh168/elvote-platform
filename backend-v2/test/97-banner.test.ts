/** TC-OB-6 … TC-OB-9 (docs/test-cases/onboarding-branding.md): team banner. */
import { existsSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { superUrl } from '../src/config.js';
import { closeAll } from '../src/db/pools.js';
import { UPLOAD_DIR } from '../src/routes/customers.js';
import { app, call, login, membership, start } from './helpers.js';

// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

function multipart(buf: Buffer, filename: string, type: string) {
  const boundary = '----elvote' + Math.random().toString(16).slice(2);
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { payload: Buffer.concat([head, buf, tail]), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}
async function upload(token: string, url: string, buf = PNG, filename = 'banner.png', type = 'image/png') {
  const m = multipart(buf, filename, type);
  return app.inject({ method: 'POST', url, payload: m.payload, headers: { ...m.headers, authorization: `Bearer ${token}` } });
}

let core: pg.Client;
let adminTok: string;
let mid: string;
let partyAcId: string;

beforeAll(async () => {
  await start();
  core = new pg.Client({ connectionString: superUrl('t_elvote_core') });
  await core.connect();
  adminTok = (await login('9000000002')).token;
  mid = await membership(adminTok, (m) => m.role === 'admin' && m.acNo === 66 && m.partyName === 'Jan Vikas Party');
  const me = (await call(adminTok).get('/v1/me')).json();
  partyAcId = me.memberships.find((m: { id: string }) => m.id === mid).partyAcId;
});
afterAll(async () => {
  await core.query('UPDATE party_constituencies SET banner_url = NULL WHERE id = $1', [partyAcId]);
  await core.end();
  await app.close();
  await closeAll();
});

describe('team banner (OB8)', () => {
  it('TC-OB-6 admin uploads a banner; members see it in look', async () => {
    const r = await upload(adminTok, `/v1/m/${mid}/banner`);
    expect(r.statusCode).toBe(200);
    const url = r.json().url as string;
    expect(url).toMatch(/^\/files\/[a-f0-9]{32}\.png$/);
    expect(existsSync(path.join(UPLOAD_DIR, url.replace('/files/', '')))).toBe(true);
    const vol = (await call((await login('9000000003')).token).get('/v1/me')).json();
    expect(vol.memberships.find((m: { partyAcId: string }) => m.partyAcId === partyAcId).look.bannerUrl).toBe(url);
    const served = await app.inject({ method: 'GET', url });
    expect(served.statusCode).toBe(200);
  });

  it('TC-OB-7 refuses non-images, big files, volunteers and other teams', async () => {
    expect((await upload(adminTok, `/v1/m/${mid}/banner`, Buffer.from('hello'), 'x.png')).json().error).toBe('not_image');
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024 + 10)]);
    expect((await upload(adminTok, `/v1/m/${mid}/banner`, big)).json().error).toBe('file_too_big');
    const volTok = (await login('9000000003')).token;
    const volMid = await membership(volTok, (m) => m.role === 'volunteer');
    expect((await upload(volTok, `/v1/m/${volMid}/banner`)).statusCode).toBe(403);
    const otherTok = (await login('9000000004')).token; // party 2 admin
    expect((await upload(otherTok, `/v1/m/${mid}/banner`)).statusCode).toBe(403);
  });

  it('TC-OB-8 admin removes the banner', async () => {
    const r = await call(adminTok).del(`/v1/m/${mid}/banner`);
    expect(r.statusCode).toBe(200);
    const me = (await call(adminTok).get('/v1/me')).json();
    expect(me.memberships.find((m: { id: string }) => m.id === mid).look.bannerUrl).toBeNull();
    const a = await core.query(`SELECT 1 FROM audit_log WHERE action = 'customer.banner_remove' AND entity_id = $1`, [partyAcId]);
    expect(a.rowCount).toBeGreaterThan(0);
  });

  it('TC-OB-9 super-admin uploads kind=banner', async () => {
    const supTok = (await login('9000000001')).token;
    const r = await upload(supTok, `/v1/admin/customers/${partyAcId}/upload?kind=banner`);
    expect(r.statusCode).toBe(200);
    const c = (await call(supTok).get(`/v1/admin/customers/${partyAcId}`)).json();
    expect(c.bannerUrl).toBe(r.json().url);
  });
});
