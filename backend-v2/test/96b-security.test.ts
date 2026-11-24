/** TC-SF-1 … TC-SF-3 (docs/test-cases/security-fixes.md). */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeAll } from '../src/db/pools.js';
import { app, call, login, membership, start } from './helpers.js';

let vol: ReturnType<typeof call>;
let adm: ReturnType<typeof call>;
let sup: ReturnType<typeof call>;
let vmid: string;
beforeAll(async () => {
  await start();
  const v = (await login('9000000003')).token;
  vol = call(v);
  adm = call((await login('9000000002')).token);
  sup = call((await login('9000000001')).token);
  vmid = await membership(v, (m) => m.role === 'volunteer' && m.acNo === 66);
});
afterAll(async () => {
  await app.close();
  await closeAll();
});

const ENCODED = ['/v1/%61dmin/overview', '/v1/adm%69n/parties', '/v1/%61%64%6d%69%6e/customers', '/v1/admin/%6fverview'];

describe('SF1 super-admin routes by the matched route', () => {
  it('TC-SF-1 a volunteer or admin is refused on encoded /v1/admin URLs; the super-admin still gets them', async () => {
    for (const u of ENCODED) {
      expect((await vol.get(u)).statusCode, u).toBe(403);
      expect((await adm.get(u)).statusCode, u).toBe(403);
      expect((await sup.get(u)).statusCode, u).toBe(200);
    }
    expect((await vol.post('/v1/%61dmin/parties', { name: 'X Party', shortName: 'XP' })).statusCode).toBe(403);
  });

  it('TC-SF-2 public routes stay public; anything else needs sign-in, encoded or not', async () => {
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/v1/auth/otp/request', payload: { mobile: '9000000009' } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/files/nope.png' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/v1/%61dmin/overview' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/v1/me' })).statusCode).toBe(401);
  });
});

describe('SF2 polling-day find limit', () => {
  it('TC-SF-3 30 searches a minute per person, then 429', async () => {
    for (let i = 0; i < 30; i++) expect((await vol.get(`/v1/m/${vmid}/polling/find?part=101&sno=${i + 1}`)).statusCode).toBe(200);
    const r = await vol.get(`/v1/m/${vmid}/polling/find?part=101&sno=1`);
    expect(r.statusCode).toBe(429);
    expect(r.json().error).toBe('find_rate');
  });
});
