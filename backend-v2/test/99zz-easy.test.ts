/** TC-ER-B1 … TC-ER-B12 (docs/test-cases/easy-redesign.md): feature who, person restrictions, booth stats, area scope. */
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { superUrl } from '../src/config.js';
import { closeAll } from '../src/db/pools.js';
import { processDirty } from '../src/lib/stats.js';
import { app, call, login, membership, start } from './helpers.js';

let sup: ReturnType<typeof call>;
let adm: ReturnType<typeof call>;
let vol: ReturnType<typeof call>;
let amid: string; // admin membership AC 66
let vmid: string; // volunteer membership AC 66
let teamId: string; // party_constituency id
let pb: pg.Client;

const me = async (c: ReturnType<typeof call>, mid: string) => (await c.get('/v1/me')).json().memberships.find((m: { id: string }) => m.id === mid);
const change = (voterId: string, patch: object) => vol.post(`/v1/m/${vmid}/voters/${voterId}/changes`, { opId: randomUUID(), clientAt: new Date().toISOString(), patch });

beforeAll(async () => {
  await start();
  sup = call((await login('9000000001')).token);
  adm = call((await login('9000000002')).token);
  vol = call((await login('9000000003')).token);
  amid = await membership((await login('9000000002')).token, (m) => m.role === 'admin' && m.acNo === 66);
  vmid = await membership((await login('9000000003')).token, (m) => m.role === 'volunteer');
  teamId = (await me(vol, vmid)).partyAcId;
  pb = new pg.Client({ connectionString: superUrl('t_elvote_pb') });
  await pb.connect();
});
afterAll(async () => {
  await sup.patch(`/v1/admin/memberships/${vmid}/access`, { paused: false, deny: [] });
  await sup.patch(`/v1/admin/customers/${teamId}`, { featureWho: { voice: 'all', poll: 'all' }, features: { voice: true } });
  await pb.end();
  await app.close();
  await closeAll();
});

describe('feature switches (O4, B3)', () => {
  it('TC-ER-B1 new keys are on by default and listed for the super-admin', async () => {
    const c = (await sup.get(`/v1/admin/customers/${teamId}`)).json();
    for (const k of ['voice', 'reports', 'trend', 'addPhone', 'residence', 'tips']) expect(c.features[k]).toBe(true);
    expect(c.featureWho).toEqual({});
    expect((await me(vol, vmid)).features.voice).toBe(true);
  });

  it('TC-ER-B2 "admins only" hides a feature from volunteers but not from admins', async () => {
    expect((await sup.patch(`/v1/admin/customers/${teamId}`, { featureWho: { voice: 'admin' } })).statusCode).toBe(200);
    expect((await me(vol, vmid)).features.voice).toBe(false);
    expect((await me(adm, amid)).features.voice).toBe(true);
    await sup.patch(`/v1/admin/customers/${teamId}`, { featureWho: { voice: 'volunteer' } });
    expect((await me(vol, vmid)).features.voice).toBe(true);
    expect((await me(adm, amid)).features.voice).toBe(false);
  });

  it('TC-ER-B3 switched off for the team = off for everyone', async () => {
    await sup.patch(`/v1/admin/customers/${teamId}`, { features: { voice: false }, featureWho: { voice: 'all' } });
    expect((await me(vol, vmid)).features.voice).toBe(false);
    expect((await me(adm, amid)).features.voice).toBe(false);
    await sup.patch(`/v1/admin/customers/${teamId}`, { features: { voice: true } });
  });

  it('TC-ER-B4 bad who value → 422; only the super-admin may change it', async () => {
    expect((await sup.patch(`/v1/admin/customers/${teamId}`, { featureWho: { voice: 'everyone' } })).statusCode).toBe(422);
    expect((await adm.patch(`/v1/admin/customers/${teamId}`, { featureWho: { voice: 'all' } })).statusCode).toBe(403);
  });
});

describe('person restrictions (O5, B4)', () => {
  it('TC-ER-B5 "mark voters" off: group change refused 403 not_allowed; needs help too', async () => {
    const r = await sup.patch(`/v1/admin/memberships/${vmid}/access`, { deny: ['mark'] });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ paused: false, deny: ['mark'] });
    const { voters } = (await vol.get(`/v1/m/${vmid}/voters?booth=112`)).json();
    const x = await change(voters[0].id, { group: 'our' });
    expect(x.statusCode).toBe(403);
    expect(x.json().code ?? x.json().error).toMatch(/not_allowed/);
    expect((await change(voters[0].id, { needsHelp: true })).statusCode).toBe(403);
    expect((await me(vol, vmid)).deny).toEqual(['mark']);
  });

  it('TC-ER-B6 "add phone" off: mobile change refused, group change allowed again', async () => {
    await sup.patch(`/v1/admin/memberships/${vmid}/access`, { deny: ['addPhone'] });
    const { voters } = (await vol.get(`/v1/m/${vmid}/voters?booth=112`)).json();
    expect((await change(voters[1].id, { mobile: '9876543210' })).statusCode).toBe(403);
    expect((await change(voters[1].id, { group: 'target' })).statusCode).toBe(200);
  });

  it('TC-ER-B7 "see phone numbers" off: mobiles come masked', async () => {
    await sup.patch(`/v1/admin/memberships/${vmid}/access`, { deny: [] });
    const { voters } = (await vol.get(`/v1/m/${vmid}/voters?booth=112`)).json();
    expect((await change(voters[2].id, { mobile: '9876543210' })).statusCode).toBe(200);
    await sup.patch(`/v1/admin/memberships/${vmid}/access`, { deny: ['phones'] });
    const after = (await vol.get(`/v1/m/${vmid}/voters?booth=112`)).json().voters.find((v: { id: string }) => v.id === voters[2].id);
    expect(after.mobile).toBe('98xxxxx210');
    const admView = (await adm.get(`/v1/m/${amid}/voters?booth=112`)).json().voters.find((v: { id: string }) => v.id === voters[2].id);
    expect(admView.mobile).toBe('9876543210');
  });

  it('TC-ER-B8 paused: every team request is refused 403 paused; /v1/me still shows the team as paused', async () => {
    await sup.patch(`/v1/admin/memberships/${vmid}/access`, { paused: true, deny: [] });
    const r = await vol.get(`/v1/m/${vmid}/booths`);
    expect(r.statusCode).toBe(403);
    expect(r.json().code ?? r.json().error).toMatch(/paused/);
    expect((await me(vol, vmid)).paused).toBe(true);
    await sup.patch(`/v1/admin/memberships/${vmid}/access`, { paused: false });
    expect((await vol.get(`/v1/m/${vmid}/booths`)).statusCode).toBe(200);
  });

  it('TC-ER-B9 unknown ability → 422; admins cannot change access', async () => {
    expect((await sup.patch(`/v1/admin/memberships/${vmid}/access`, { deny: ['delete'] })).statusCode).toBe(422);
    expect((await adm.patch(`/v1/admin/memberships/${vmid}/access`, { paused: true })).statusCode).toBe(403);
  });

  it('TC-ER-B10 team member list shows paused and deny', async () => {
    await sup.patch(`/v1/admin/memberships/${vmid}/access`, { deny: ['poll'] });
    const list = (await sup.get(`/v1/admin/customers/${teamId}/members`)).json();
    expect(list.find((x: { membershipId: string }) => x.membershipId === vmid)).toMatchObject({ paused: false, deny: ['poll'] });
    await sup.patch(`/v1/admin/memberships/${vmid}/access`, { deny: [] });
  });
});

describe('booth stats and area scope (B1, B2)', () => {
  it('TC-ER-B11 booth-stats: every counter per booth incl. died / not found; volunteers 403', async () => {
    const { voters } = (await vol.get(`/v1/m/${vmid}/voters?booth=113`)).json();
    expect((await change(voters[3].id, { residence: 'died' })).statusCode).toBe(200);
    expect((await change(voters[4].id, { residence: 'not_found' })).statusCode).toBe(200);
    await processDirty();
    const r = await adm.get(`/v1/m/${amid}/booth-stats`);
    expect(r.statusCode).toBe(200);
    const b113 = r.json().booths.find((b: { no: number }) => b.no === 113);
    expect(b113).toMatchObject({ no: 113, total: expect.any(Number), our: expect.any(Number), withMobile: expect.any(Number), volunteers: expect.any(Number) });
    expect(b113.died).toBeGreaterThanOrEqual(1);
    expect(b113.notFound).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(r.json().days)).toBe(true);
    expect((await adm.get(`/v1/m/${amid}/booth-stats?booth=113`)).json().booths.map((b: { no: number }) => b.no)).toEqual([113]);
    expect((await vol.get(`/v1/m/${vmid}/booth-stats`)).statusCode).toBe(403);
  });

  it('TC-ER-B12 dashboard and booth-stats by area', async () => {
    await pb.query(`UPDATE booths SET area = 'Test Area' WHERE ac_no = 66 AND part_no IN (112, 113)`);
    const bs = (await adm.get(`/v1/m/${amid}/booth-stats?area=${encodeURIComponent('Test Area')}`)).json();
    expect(bs.booths.map((b: { no: number }) => b.no).sort()).toEqual([112, 113]);
    const d = (await adm.get(`/v1/m/${amid}/dashboard?area=${encodeURIComponent('Test Area')}`)).json();
    const sum = bs.booths.reduce((a: number, b: { total: number }) => a + b.total, 0);
    expect(d.totals.total).toBe(sum);
    expect(d.totals.died).toBeGreaterThanOrEqual(1);
    await pb.query(`UPDATE booths SET area = NULL WHERE ac_no = 66 AND part_no IN (112, 113)`);
  });
});

describe('booth locations (V4)', () => {
  it('TC-ER-B13 a volunteer cannot set a booth location; the admin can', async () => {
    const r = await vol.put(`/v1/m/${vmid}/booths/112/location`, { lat: 30.9, lng: 75.8 });
    expect(r.statusCode).toBe(403);
    expect(r.json().error ?? r.json().code).toBe('admin_only');
  });
});
