/** TC-B3 auth, TC-B4 me and join. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeAll } from '../src/db/pools.js';
import { app, call, login, start } from './helpers.js';

beforeAll(start);
afterAll(async () => {
  await app.close();
  await closeAll();
});

describe('B3 auth', () => {
  it('TC-B3-1 correct OTP gives tokens', async () => {
    const r = await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { mobile: '9000000003', code: '123456' } });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ accessToken: expect.any(String), refreshToken: expect.any(String), expiresIn: 900 });
  });

  it('OTP request returns the dev code only in dev mode and rejects bad numbers', async () => {
    const ok = await app.inject({ method: 'POST', url: '/v1/auth/otp/request', payload: { mobile: '9876500001' } });
    expect(ok.statusCode).toBe(200);
    const bad = await app.inject({ method: 'POST', url: '/v1/auth/otp/request', payload: { mobile: '12345' } });
    expect(bad.statusCode).toBe(422);
  });

  it('TC-B3-2 wrong OTP → 401 otp_invalid', async () => {
    const r = await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { mobile: '9876500002', code: '000000' } });
    expect(r.statusCode).toBe(401);
    expect(r.json().error).toBe('otp_invalid');
  });

  it('TC-B3-3 five wrong codes lock the number (429), even for the right code', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { mobile: '9876500003', code: '111111' } })).statusCode);
    expect(codes.slice(0, 4)).toEqual([401, 401, 401, 401]);
    expect(codes[4]).toBe(429);
    const right = await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { mobile: '9876500003', code: '123456' } });
    expect(right.statusCode).toBe(429);
  });

  it('TC-B3-4 missing or bad token → 401', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/me' })).statusCode).toBe(401);
    expect((await call('not-a-token').get('/v1/me')).statusCode).toBe(401);
  });

  it('TC-B3-5 refresh rotates the token; the old one stops working', async () => {
    const { refreshToken } = await login('9000000003');
    const r1 = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken } });
    expect(r1.statusCode).toBe(200);
    const r2 = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken } });
    expect(r2.statusCode).toBe(401);
  });

  it('logout revokes the refresh token', async () => {
    const { refreshToken } = await login('9000000003');
    await app.inject({ method: 'POST', url: '/v1/auth/logout', payload: { refreshToken } });
    expect((await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken } })).statusCode).toBe(401);
  });
});

describe('B12 browser access (CORS)', () => {
  it('allows PUT, PATCH and DELETE from the app origin, not from others', async () => {
    const ok = await app.inject({ method: 'OPTIONS', url: '/v1/me', headers: { origin: 'http://localhost:8081', 'access-control-request-method': 'PUT' } });
    expect(String(ok.headers['access-control-allow-methods'])).toMatch(/PUT/);
    expect(String(ok.headers['access-control-allow-methods'])).toMatch(/DELETE/);
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:8081');
    const bad = await app.inject({ method: 'OPTIONS', url: '/v1/me', headers: { origin: 'https://evil.example', 'access-control-request-method': 'PUT' } });
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('B4 me and roles', () => {
  it('TC-B4-1 volunteer has booths 112, 113; only the platform owner is super-admin', async () => {
    const v = (await call((await login('9000000003')).token).get('/v1/me')).json();
    expect(v.isSuperAdmin).toBe(false);
    expect(v.memberships).toHaveLength(1);
    expect(v.memberships[0]).toMatchObject({ role: 'volunteer', status: 'approved', acNo: 66, stateCode: 'PB', booths: [112, 113] });
    const s = (await call((await login('9000000001')).token).get('/v1/me')).json();
    expect(s.isSuperAdmin).toBe(true);
    const a = (await call((await login('9000000002')).token).get('/v1/me')).json();
    expect(a.memberships.map((m: { acNo: number }) => m.acNo).sort()).toEqual([50, 66]);
  });

  it('TC-B4-2 join with a valid code → pending, listed for the admin', async () => {
    const t = (await login('9876511111')).token;
    const check = await call(t).post('/v1/join/check', { code: 'nawan50' });
    expect(check.statusCode).toBe(200);
    expect(check.json().booths.length).toBe(20);
    const j = await call(t).post('/v1/join', { code: 'NAWAN50', name: 'Test Joiner', booths: [5, 6] });
    expect(j.statusCode).toBe(200);
    expect(j.json().status).toBe('pending');
    const admin = (await login('9000000002')).token;
    const me = (await call(admin).get('/v1/me')).json();
    const mid = me.memberships.find((m: { acNo: number }) => m.acNo === 50).id;
    const pending = (await call(admin).get(`/v1/m/${mid}/team?status=pending`)).json();
    expect(pending.some((p: { name: string; booths: number[] }) => p.name === 'Test Joiner' && p.booths.join() === '5,6')).toBe(true);
  });

  it('TC-B4-3 wrong join code → 422 code_invalid', async () => {
    const t = (await login('9876511112')).token;
    const r = await call(t).post('/v1/join', { code: 'NOPE1234', name: 'X Y', booths: [1] });
    expect(r.statusCode).toBe(422);
    expect(r.json().error).toBe('code_invalid');
  });

  it('a pending member cannot read data', async () => {
    const t = (await login('9876511111')).token;
    const me = (await call(t).get('/v1/me')).json();
    expect((await call(t).get(`/v1/m/${me.memberships[0].id}/voters?booth=5`)).statusCode).toBe(403);
  });
});
