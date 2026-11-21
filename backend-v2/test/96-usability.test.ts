/** TC-R2-3, 4, 17, 19, 20 (docs/test-cases/usability-r2.md). */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { superUrl } from '../src/config.js';
import { closeAll } from '../src/db/pools.js';
import { app, call, login, membership, start } from './helpers.js';

let core: pg.Client;
let adm: ReturnType<typeof call>;
let vol: ReturnType<typeof call>;
let sup: ReturnType<typeof call>;
let amid: string; // admin membership (JVP · AC 66)
let vmid: string; // volunteer membership (JVP · AC 66)
let partyAcId: string;
let supId: string;

beforeAll(async () => {
  await start();
  core = new pg.Client({ connectionString: superUrl('t_elvote_core') });
  await core.connect();
  const a = (await login('9000000002')).token;
  const v = (await login('9000000003')).token;
  adm = call(a);
  vol = call(v);
  sup = call((await login('9000000001')).token);
  amid = await membership(a, (m) => m.role === 'admin' && m.acNo === 66 && m.partyName === 'Jan Vikas Party');
  vmid = await membership(v, (m) => m.role === 'volunteer' && m.acNo === 66);
  partyAcId = (await adm.get('/v1/me')).json().memberships.find((m: { id: string }) => m.id === amid).partyAcId;
  supId = (await sup.get('/v1/me')).json().user.id;
});
afterAll(async () => {
  await core.end();
  await app.close();
  await closeAll();
});

describe('one role per account (R1)', () => {
  it('TC-R2-3 an admin cannot join a team as a volunteer', async () => {
    const { code } = (await adm.post(`/v1/m/${amid}/join-code`)).json();
    const check = await adm.post('/v1/join/check', { code });
    expect(check.statusCode).toBe(409);
    expect(check.json().error).toBe('role_conflict');
    const join = await adm.post('/v1/join', { code, booths: [101] });
    expect(join.statusCode).toBe(409);
  });

  it('TC-R2-4 a volunteer cannot ask for admin access', async () => {
    const r = await vol.post('/v1/access-requests', { partyName: 'Jan Vikas Party', stateCode: 'PB', acNos: [66], designation: 'Block president' });
    expect(r.statusCode).toBe(409);
    expect(r.json().error).toBe('role_conflict');
    expect(r.json().message).toMatch(/volunteer/i);
  });
});

describe('admin surnames (A2)', () => {
  it('TC-R2-17 counts per surname for the assembly; volunteers and other people refused', async () => {
    const r = await adm.get(`/v1/m/${amid}/surnames`);
    expect(r.statusCode).toBe(200);
    const b = r.json() as { voters: number; surnames: { surname: string; total: number; met: number; our: number; target: number; opp: number }[] };
    expect(b.surnames.length).toBeGreaterThan(0);
    expect(b.surnames.reduce((a, x) => a + x.total, 0)).toBe(b.voters);
    for (const x of b.surnames) {
      expect(x.surname).not.toMatch(/\s/);
      expect(x.met).toBeLessThanOrEqual(x.total);
      expect(x.our + x.target + x.opp).toBeLessThanOrEqual(x.total);
    }
    expect(b.surnames[0].total).toBeGreaterThanOrEqual(b.surnames[b.surnames.length - 1].total);
    const one = await adm.get(`/v1/m/${amid}/surnames?booth=101`);
    expect(one.json().voters).toBeLessThan(b.voters);
    expect((await vol.get(`/v1/m/${vmid}/surnames`)).statusCode).toBe(403);
    expect((await adm.get(`/v1/m/${vmid}/surnames`)).statusCode).toBe(403);
  });
});

describe('super-admin (S1, S2)', () => {
  it('TC-R2-19 sees volunteer requests of every team and approves one', async () => {
    const { code } = (await adm.post(`/v1/m/${amid}/join-code`)).json();
    const newbie = call((await login('9000000777')).token);
    expect((await newbie.post('/v1/join', { code, name: 'Usability Joiner', booths: [101] })).statusCode).toBe(200);
    const list = await sup.get('/v1/admin/volunteer-requests');
    expect(list.statusCode).toBe(200);
    const rows = list.json() as { membershipId: string; name: string; customerId: string; acNo: number; requestedAt: string }[];
    const mine = rows.find((x) => x.name === 'Usability Joiner');
    expect(mine).toBeTruthy();
    expect(mine!.customerId).toBe(partyAcId);
    expect(mine!.acNo).toBe(66);
    const times = rows.map((x) => Date.parse(x.requestedAt));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect((await sup.get(`/v1/admin/volunteer-requests?customer=${partyAcId}`)).json().every((x: { customerId: string }) => x.customerId === partyAcId)).toBe(true);
    const ok = await sup.post(`/v1/admin/customers/${partyAcId}/requests/${mine!.membershipId}/approve`, { booths: [101] });
    expect(ok.statusCode).toBe(200);
    expect((await adm.get('/v1/admin/volunteer-requests')).statusCode).toBe(403);
  });

  it('TC-R2-20 opens a team as admin; writes are logged as the super-admin', async () => {
    const as = await sup.get(`/v1/admin/customers/${partyAcId}/as-admin`);
    expect(as.statusCode).toBe(200);
    const m = as.json();
    expect(m).toMatchObject({ id: partyAcId, role: 'admin', status: 'approved', acNo: 66, asSuperAdmin: true });
    expect((await sup.get(`/v1/m/${partyAcId}/dashboard`)).statusCode).toBe(200);
    expect((await sup.get(`/v1/m/${partyAcId}/team`)).statusCode).toBe(200);
    expect((await sup.post(`/v1/m/${partyAcId}/join-code`)).statusCode).toBe(200);
    const log = await core.query<{ actor_user_id: string; actor_role: string }>(
      `SELECT actor_user_id, actor_role FROM audit_log WHERE action = 'joincode.new' ORDER BY at DESC LIMIT 1`);
    expect(log.rows[0]).toEqual({ actor_user_id: supId, actor_role: 'super_admin' });
    // not for normal admins
    expect((await adm.get(`/v1/admin/customers/${partyAcId}/as-admin`)).statusCode).toBe(403);
    expect((await adm.get(`/v1/m/${partyAcId}/dashboard`)).statusCode).toBe(403);
  });
});
