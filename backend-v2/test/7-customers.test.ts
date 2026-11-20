/** TC-C customer CMS, users, vote trace (docs/test-cases/customer-cms.md). */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeAll } from '../src/db/pools.js';
import { app, call, login, membership, start } from './helpers.js';

let sup: ReturnType<typeof call>;
let adm: ReturnType<typeof call>;
let vol: ReturnType<typeof call>;
let amid: string;
let vmid: string;
let pacA: string; // Jan Vikas Party · PB 66
let pacB: string; // Lok Sewa Dal · PB 66
type Customer = { id: string; partyName: string; stateCode: string; acNo: number; volunteers: number };

beforeAll(async () => {
  await start();
  sup = call((await login('9000000001')).token);
  const a = (await login('9000000002')).token;
  adm = call(a);
  amid = await membership(a, (m) => m.role === 'admin' && m.acNo === 66);
  const v = (await login('9000000003')).token;
  vol = call(v);
  vmid = await membership(v, (m) => m.role === 'volunteer');
  const list: Customer[] = (await sup.get('/v1/admin/customers')).json();
  pacA = list.find((c) => c.partyName === 'Jan Vikas Party' && c.acNo === 66)!.id;
  pacB = list.find((c) => c.partyName === 'Lok Sewa Dal' && c.acNo === 66 && c.stateCode === 'PB')!.id;
});
afterAll(async () => {
  await sup.patch(`/v1/admin/customers/${pacA}`, { features: { map: true, poll: true }, validUntil: null, maxVolunteers: null });
  await app.close();
  await closeAll();
});

const meLook = async (c: ReturnType<typeof call>) => (await c.get('/v1/me')).json().memberships.find((m: { id: string }) => m.id === amid || m.id === vmid);

describe('C customer settings', () => {
  it('TC-C1-1 super-admin sets the look; members get it in /v1/me', async () => {
    const r = await sup.patch(`/v1/admin/customers/${pacA}`, { appName: 'Rampur Jeet', colour: '#1B5E20', candidateName: 'Harpreet Singh', ballotNo: 3, slogan: 'Vikas sab da', message: 'Thank you, team!', defaultLang: 'pa', languages: ['pa', 'en'] });
    expect(r.statusCode).toBe(200);
    const m = await meLook(vol);
    expect(m.look).toMatchObject({ appName: 'Rampur Jeet', colour: '#1B5E20', candidateName: 'Harpreet Singh', ballotNo: 3, slogan: 'Vikas sab da', message: 'Thank you, team!', defaultLang: 'pa' });
    expect(m.active).toBe(true);
    expect(m.features.map).toBe(true);
  });

  it('rejects bad values (colour, default language not allowed)', async () => {
    expect((await sup.patch(`/v1/admin/customers/${pacA}`, { colour: 'green' })).statusCode).toBe(422);
    expect((await sup.patch(`/v1/admin/customers/${pacA}`, { defaultLang: 'pa', languages: ['en'] })).statusCode).toBe(422);
    expect((await adm.patch(`/v1/admin/customers/${pacA}`, { appName: 'Hack' })).statusCode).toBe(403);
  });

  it('TC-C1-4 logo upload: real PNG accepted and served; fake image refused', async () => {
    const token = (await login('9000000001')).token;
    const up = async (bytes: Buffer) => {
      const boundary = `----x${randomUUID()}`;
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="logo.png"\r\nContent-Type: image/png\r\n\r\n`),
        bytes, Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      return app.inject({ method: 'POST', url: `/v1/admin/customers/${pacA}/upload?kind=logo`, payload: body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, authorization: `Bearer ${token}` } });
    };
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
    const ok = await up(png);
    expect(ok.statusCode).toBe(200);
    const url: string = ok.json().url;
    expect(url).toMatch(/^\/files\/[a-f0-9]{32}\.png$/);
    const file = await app.inject({ method: 'GET', url });
    expect(file.statusCode).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');
    expect((await up(Buffer.from('<script>alert(1)</script>'))).json().error).toBe('not_image');
    expect((await app.inject({ method: 'GET', url: '/files/..%2F.env' })).statusCode).toBe(404);
    expect((await meLook(vol)).look.logoUrl).toBe(url);
  });

  it('TC-C3-1 map off → admin map refused, dashboard still works', async () => {
    await sup.patch(`/v1/admin/customers/${pacA}`, { features: { map: false } });
    const r = await adm.get(`/v1/m/${amid}/map`);
    expect(r.statusCode).toBe(403);
    expect(r.json().error).toBe('feature_off');
    expect((await adm.get(`/v1/m/${amid}/dashboard`)).statusCode).toBe(200);
    expect((await meLook(adm)).features.map).toBe(false);
    await sup.patch(`/v1/admin/customers/${pacA}`, { features: { map: true } });
    expect((await adm.get(`/v1/m/${amid}/map`)).statusCode).toBe(200);
  });

  it('TC-C3-2 polling day off → volunteer cannot mark voted (other changes still work)', async () => {
    await sup.patch(`/v1/admin/customers/${pacA}`, { features: { poll: false } });
    const { voters } = (await vol.get(`/v1/m/${vmid}/voters?booth=112`)).json();
    const voted = await vol.post(`/v1/m/${vmid}/voters/${voters[5].id}/changes`, { opId: randomUUID(), patch: { votedAt: new Date().toISOString() } });
    expect(voted.statusCode).toBe(403);
    expect(voted.json().error).toBe('feature_off');
    const grp = await vol.post(`/v1/m/${vmid}/voters/${voters[5].id}/changes`, { opId: randomUUID(), patch: { group: 'target' } });
    expect(grp.statusCode).toBe(200);
    await sup.patch(`/v1/admin/customers/${pacA}`, { features: { poll: true } });
  });

  it('TC-C5-1 subscription past its date → refused; /v1/me says inactive', async () => {
    const y = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await sup.patch(`/v1/admin/customers/${pacA}`, { validUntil: y });
    const r = await vol.get(`/v1/m/${vmid}/voters?booth=112`);
    expect(r.statusCode).toBe(403);
    expect(r.json().error).toBe('subscription_ended');
    expect((await meLook(vol)).active).toBe(false);
    await sup.patch(`/v1/admin/customers/${pacA}`, { validUntil: null });
    expect((await vol.get(`/v1/m/${vmid}/voters?booth=112`)).statusCode).toBe(200);
  });

  let joinerMid = '';
  it('TC-C5-2 volunteer limit reached → approve refused (409)', async () => {
    const { code } = (await adm.post(`/v1/m/${amid}/join-code`)).json();
    const s = await login('9876544441');
    const api = call(s.token);
    expect((await api.post('/v1/join', { code, name: 'Limit Test', booths: [102] })).statusCode).toBe(200);
    joinerMid = await membership(s.token, () => true);
    const c = (await sup.get(`/v1/admin/customers/${pacA}`)).json();
    await sup.patch(`/v1/admin/customers/${pacA}`, { maxVolunteers: c.volunteers });
    const r = await adm.post(`/v1/m/${amid}/team/${joinerMid}/approve`, { booths: [102] });
    expect(r.statusCode).toBe(409);
    expect(r.json().error).toBe('limit_volunteers');
    await sup.patch(`/v1/admin/customers/${pacA}`, { maxVolunteers: null });
    expect((await adm.post(`/v1/m/${amid}/team/${joinerMid}/approve`, { booths: [102] })).statusCode).toBe(200);
  });

  it('TC-C7-1 copy settings from one customer to another (limits unchanged)', async () => {
    const before = (await sup.get(`/v1/admin/customers/${pacB}`)).json();
    const r = await sup.post(`/v1/admin/customers/${pacB}/copy`, { fromId: pacA });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ appName: 'Rampur Jeet', colour: '#1B5E20', candidateName: 'Harpreet Singh', maxZones: before.maxZones, status: before.status });
  });

  it('TC-C8-1 find users by name or mobile', async () => {
    const r = (await sup.get('/v1/admin/users?q=Suresh')).json().items;
    const s = r.find((u: { mobile: string }) => u.mobile === '9000000003');
    expect(s.memberships.some((m: { role: string; acNo: number }) => m.role === 'volunteer' && m.acNo === 66)).toBe(true);
    expect((await sup.get('/v1/admin/users?q=90')).statusCode).toBe(422);
  });

  it('TC-C8-5 list all users with filters and paging', async () => {
    const all = (await sup.get('/v1/admin/users')).json();
    expect(all.total).toBeGreaterThan(5);
    expect(all.items.length).toBe(Math.min(50, all.total));
    const page2 = (await sup.get('/v1/admin/users?limit=2&offset=2')).json();
    expect(page2.items.length).toBe(2);
    expect(page2.items[0].id).toBe((await sup.get('/v1/admin/users?limit=4')).json().items[2].id);
    const admins = (await sup.get('/v1/admin/users?role=admin&limit=100')).json().items;
    expect(admins.every((u: { memberships: { role: string }[] }) => u.memberships.some((m) => m.role === 'admin'))).toBe(true);
    const inA = (await sup.get(`/v1/admin/users?customer=${pacA}&limit=100`)).json().items;
    expect(inA.some((u: { mobile: string }) => u.mobile === '9000000003')).toBe(true);
    expect(inA.some((u: { mobile: string }) => u.mobile === '9000000005')).toBe(false);
    expect((await sup.get('/v1/admin/users?role=super')).json().items.every((u: { isSuperAdmin: boolean }) => u.isSuperAdmin)).toBe(true);
  });

  it('TC-C8-3 block needs a reason; cannot block yourself', async () => {
    const me = (await sup.get('/v1/me')).json().user.id;
    const s = (await sup.get('/v1/admin/users?q=9000000003')).json().items[0];
    expect((await sup.post(`/v1/admin/users/${s.id}/block`, {})).statusCode).toBe(422);
    const self = await sup.post(`/v1/admin/users/${me}/block`, { reason: 'test self' });
    expect(self.json().error).toBe('self');
  });

  it('TC-C8-2 block → refused everywhere at once; unblock → can sign in again', async () => {
    const s = await login('9000000003');
    const api = call(s.token);
    const u = (await sup.get('/v1/admin/users?q=9000000003')).json().items[0];
    expect((await sup.post(`/v1/admin/users/${u.id}/block`, { reason: 'Shared his login' })).statusCode).toBe(200);
    const r = await api.get('/v1/me');
    expect(r.statusCode).toBe(401);
    expect(r.json().error).toBe('user_blocked');
    expect((await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: s.refreshToken } })).statusCode).toBe(401);
    const again = await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { mobile: '9000000003', code: '123456' } });
    expect(again.json().error).toBe('user_blocked');
    expect((await sup.get('/v1/admin/users?q=9000000003')).json().items[0]).toMatchObject({ status: 'blocked', blockedReason: 'Shared his login' });
    expect((await sup.post(`/v1/admin/users/${u.id}/unblock`, { reason: 'Sorted out' })).statusCode).toBe(200);
    vol = call((await login('9000000003')).token);
    expect((await vol.get('/v1/me')).statusCode).toBe(200);
  });

  it('TC-C8-4 change role and remove from a customer', async () => {
    const r = await sup.patch(`/v1/admin/memberships/${joinerMid}`, { role: 'admin', reason: 'Booth in-charge promoted' });
    expect(r.statusCode).toBe(200);
    const s = await login('9876544441');
    const me = (await call(s.token).get('/v1/me')).json();
    expect(me.memberships.find((m: { id: string }) => m.id === joinerMid).role).toBe('admin');
    expect((await sup.patch(`/v1/admin/memberships/${joinerMid}`, { remove: true, reason: 'Left the team' })).statusCode).toBe(200);
    const after = (await call(s.token).get('/v1/me')).json();
    expect(after.memberships.find((m: { id: string; status: string }) => m.id === joinerMid).status).toBe('removed');
    expect((await sup.patch(`/v1/admin/memberships/${joinerMid}`, { role: 'admin' })).statusCode).toBe(422);
  });
});

describe('C9 vote trace', () => {
  let epic = '';
  beforeAll(async () => {
    const { voters } = (await vol.get(`/v1/m/${vmid}/voters?booth=112`)).json();
    const v = voters[7];
    epic = v.epic;
    expect((await vol.post(`/v1/m/${vmid}/voters/${v.id}/changes`, { opId: randomUUID(), patch: { group: 'our', mobile: '9811122233' } })).statusCode).toBe(200);
  });

  it('TC-C9-1 admin sees who changed the voter, newest first, without the mobile number', async () => {
    const r = await adm.get(`/v1/m/${amid}/trace?epic=${epic}`);
    expect(r.statusCode).toBe(200);
    const t = r.json();
    expect(t.voter.epic).toBe(epic);
    expect(t.events[0]).toMatchObject({ by: 'Suresh Kumar', party: 'Jan Vikas Party', change: { group: 'our', mobile: true } });
    expect(JSON.stringify(t)).not.toContain('9811122233');
    expect((await adm.get(`/v1/m/${amid}/trace?booth=112&sno=${t.voter.sno}`)).json().voter.epic).toBe(epic);
  });

  it('TC-C9-2 another party’s admin does not see these changes', async () => {
    const r4 = (await login('9000000004')).token;
    const lmid = await membership(r4, (m) => m.role === 'admin' && m.acNo === 66);
    const t = (await call(r4).get(`/v1/m/${lmid}/trace?epic=${epic}`)).json();
    expect(t.events.every((e: { party: string }) => e.party === 'Lok Sewa Dal')).toBe(true);
  });

  it('TC-C9-3 super-admin sees all parties', async () => {
    const t = (await sup.get(`/v1/admin/trace?state=PB&ac=66&epic=${epic}`)).json();
    expect(t.events.some((e: { party: string }) => e.party === 'Jan Vikas Party')).toBe(true);
    expect((await adm.get(`/v1/admin/trace?state=PB&ac=66&epic=${epic}`)).statusCode).toBe(403);
  });
});
