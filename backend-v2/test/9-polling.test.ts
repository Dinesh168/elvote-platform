/** TC-PD polling day: elections, booth locations, distance, presence, alerts (docs/test-cases/polling-day.md). */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeAll, core, statePool } from '../src/db/pools.js';
import { runPresenceJobs } from '../src/lib/presence.js';
import { setPushSender, type PushMessage } from '../src/lib/push.js';
import { app, call, login, membership, start } from './helpers.js';

let sup: ReturnType<typeof call>;
let adm: ReturnType<typeof call>;
let vol: ReturnType<typeof call>;
let rekha: ReturnType<typeof call>;
let amid: string;
let vmid: string;
let rmid: string;
let pacA: string;
let e1: string;
let e2: string;

const ist = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const plusDays = (n: number) => ist(new Date(Date.now() + n * 86_400_000));
const TODAY = ist();
// Booth 112 at a fixed point; booth 113 far away (so 112 is always the nearest).
const B112 = { lat: 30.9, lng: 75.7 };
const B113 = { lat: 31.1, lng: 75.95 };
const north = (m: number) => ({ lat: B112.lat + m / 111_320, lng: B112.lng });
let clock = Date.now() - 3_600_000;
const tick = (sec = 90) => new Date((clock += sec * 1000)).toISOString();
const report = (body: Record<string, unknown>, mid = vmid, who = vol) => who.post(`/v1/m/${mid}/presence`, { permission: 'granted', accuracy: 20, at: tick(), ...body });
const page = async () => (await adm.get(`/v1/m/${amid}/polling`)).json();
const row = async () => (await page()).volunteers.find((v: { membershipId: string }) => v.membershipId === vmid);
const events = async () => (await core.query<{ kind: string }>('SELECT kind FROM presence_events WHERE membership_id = $1 ORDER BY at', [vmid])).rows.map((r) => r.kind);

beforeAll(async () => {
  await start();
  sup = call((await login('9000000001')).token);
  const a = (await login('9000000002')).token;
  adm = call(a);
  amid = await membership(a, (m) => m.role === 'admin' && m.acNo === 66);
  const v = (await login('9000000003')).token;
  vol = call(v);
  vmid = await membership(v, (m) => m.role === 'volunteer');
  const r = (await login('9000000004')).token;
  rekha = call(r);
  rmid = await membership(r, (m) => m.role === 'admin' && m.acNo === 66);
  pacA = (await sup.get('/v1/admin/customers')).json().find((c: { partyName: string; acNo: number }) => c.partyName === 'Jan Vikas Party' && c.acNo === 66).id;
});
afterAll(async () => {
  setPushSender(null);
  await sup.patch(`/v1/admin/customers/${pacA}`, { boothRadiusM: 300 });
  await app.close();
  await closeAll();
});

const pollingDayOf = async (who: ReturnType<typeof call>, pred: (m: { id: string; acNo: number }) => boolean) =>
  (await who.get('/v1/me')).json().memberships.find(pred)?.pollingDay ?? null;

describe('PD polling day', () => {
  it('TC-PD-S1-4 election rules', async () => {
    const base = { stateCode: 'PB', kind: 'assembly', name: 'Test', acNos: null, opensAt: '00:00', closesAt: '23:59' };
    expect((await sup.post('/v1/admin/elections', { ...base, pollDate: plusDays(-1) })).statusCode).toBe(422);
    expect((await sup.post('/v1/admin/elections', { ...base, pollDate: plusDays(3), opensAt: '19:00', closesAt: '05:00' })).statusCode).toBe(422);
    expect((await adm.post('/v1/admin/elections', { ...base, pollDate: plusDays(3) })).statusCode).toBe(403);
  });

  it('TC-PD-S1-1 polling day per state reaches the members, with the distance', async () => {
    const r = await sup.post('/v1/admin/elections', { stateCode: 'PB', kind: 'assembly', name: 'Punjab test poll', pollDate: TODAY, acNos: null, opensAt: '00:00', closesAt: '23:59' });
    expect(r.statusCode).toBe(200);
    e1 = r.json().id;
    const pd = await pollingDayOf(vol, (m) => m.id === vmid);
    expect(pd).toMatchObject({ electionId: e1, name: 'Punjab test poll', date: TODAY, opensAt: '00:00', closesAt: '23:59', radiusM: 300 });
    const clash = await sup.post('/v1/admin/elections', { stateCode: 'PB', kind: 'bye', name: 'Clash', pollDate: TODAY, acNos: [66], opensAt: '07:00', closesAt: '18:00' });
    expect(clash.statusCode).toBe(409);
    expect(clash.json().error).toBe('election_clash');
    const list = (await sup.get('/v1/admin/elections')).json();
    expect(list.find((x: { id: string }) => x.id === e1)).toMatchObject({ stateCode: 'PB', acNos: null, status: 'upcoming' });
  });

  // spec flow-fixes P1/P2: polling day: find any voter of the assembly (EPIC, or booth + S.No) and mark Voted.
  it('TC-PF-1/2 a volunteer finds a voter of another booth by booth + S.No or EPIC; no group or phone', async () => {
    const r = await vol.get(`/v1/m/${vmid}/polling/find?part=101&sno=1`);
    expect(r.statusCode).toBe(200);
    const [x] = r.json().items;
    expect(x).toMatchObject({ part: 101, sno: 1, own: false });
    expect(x).not.toHaveProperty('group');
    expect(x).not.toHaveProperty('mobile');
    const epic = (await (await statePool('PB')).query<{ epic: string }>('SELECT epic FROM voters WHERE ac_no = 66 AND id = $1', [x.id])).rows[0].epic;
    const byEpic = (await vol.get(`/v1/m/${vmid}/polling/find?epic=${epic.toLowerCase()}`)).json().items;
    expect(byEpic.map((v: { id: string }) => v.id)).toEqual([x.id]);
    expect((await vol.get(`/v1/m/${vmid}/polling/find?part=112&sno=1`)).json().items[0]).toMatchObject({ own: true });
  });

  it('TC-PF-3 during the window: Voted for another booth is allowed, other changes are not', async () => {
    const [x] = (await vol.get(`/v1/m/${vmid}/polling/find?part=101&sno=2`)).json().items;
    const op = (patch: object) => vol.post(`/v1/m/${vmid}/voters/${x.id}/changes`, { opId: crypto.randomUUID(), patch });
    expect((await op({ votedAt: new Date().toISOString() })).statusCode).toBe(200);
    expect((await vol.get(`/v1/m/${vmid}/polling/find?part=101&sno=2`)).json().items[0]).toMatchObject({ voted: true });
    expect((await op({ group: 'our' })).statusCode).toBe(403);
    expect((await op({ votedAt: null })).statusCode).toBe(200);
  });

  it('TC-PF-4 outside the window other booths cannot be marked', async () => {
    const [x] = (await vol.get(`/v1/m/${vmid}/polling/find?part=101&sno=3`)).json().items;
    await sup.patch(`/v1/admin/elections/PB/${e1}`, { opensAt: '00:00', closesAt: '00:01' });
    const now = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    if (now >= '00:01') {
      expect((await vol.post(`/v1/m/${vmid}/voters/${x.id}/changes`, { opId: crypto.randomUUID(), patch: { votedAt: new Date().toISOString() } })).statusCode).toBe(403);
    }
    await sup.patch(`/v1/admin/elections/PB/${e1}`, { opensAt: '00:00', closesAt: '23:59' });
  });

  it('TC-PF-5 a search needs an EPIC or booth + S.No', async () => {
    expect((await vol.get(`/v1/m/${vmid}/polling/find`)).statusCode).toBe(422);
    expect((await vol.get(`/v1/m/${vmid}/polling/find?part=101`)).statusCode).toBe(422);
  });

  it('TC-PD-S3-1 booth distance per customer (50–2,000 m)', async () => {
    expect((await sup.patch(`/v1/admin/customers/${pacA}`, { boothRadiusM: 40 })).statusCode).toBe(422);
    expect((await sup.patch(`/v1/admin/customers/${pacA}`, { boothRadiusM: 2001 })).statusCode).toBe(422);
    const ok = await sup.patch(`/v1/admin/customers/${pacA}`, { boothRadiusM: 500 });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().boothRadiusM).toBe(500);
    const m = (await vol.get('/v1/me')).json().memberships.find((x: { id: string }) => x.id === vmid);
    expect(m.boothRadiusM).toBe(500);
    expect(m.pollingDay.radiusM).toBe(500);
    expect((await adm.patch(`/v1/admin/customers/${pacA}`, { boothRadiusM: 800 })).statusCode).toBe(403);
    await sup.patch(`/v1/admin/customers/${pacA}`, { boothRadiusM: 300 });
  });

  it('TC-PD-S2-1 booth locations: list, edit, clear, missing filter', async () => {
    expect((await sup.patch('/v1/admin/booths/PB/66/112', B112)).statusCode).toBe(200);
    expect((await sup.patch('/v1/admin/booths/PB/66/113', B113)).statusCode).toBe(200);
    expect((await sup.patch('/v1/admin/booths/PB/66/125', { lat: null, lng: null })).statusCode).toBe(200);
    expect((await sup.patch('/v1/admin/booths/PB/66/112', { lat: 60, lng: 75 })).statusCode).toBe(422);
    expect((await sup.patch('/v1/admin/booths/PB/66/999', B112)).statusCode).toBe(404);
    const all = (await sup.get('/v1/admin/booths?state=PB&ac=66')).json();
    expect(all.total).toBe(25);
    expect(all.items.find((b: { no: number }) => b.no === 112)).toMatchObject({ lat: 30.9, lng: 75.7, source: 'edited' });
    const missing = (await sup.get('/v1/admin/booths?state=PB&ac=66&missing=1')).json();
    expect(missing.items.map((b: { no: number }) => b.no)).toEqual([125]);
    expect(missing.missing).toBe(1);
    expect((await adm.get('/v1/admin/booths?state=PB&ac=66')).statusCode).toBe(403);
  });

  it('TC-PD-S2-2 bulk booth locations: preview, then save the good rows', async () => {
    const rows = [{ no: 125, lat: 30.95, lng: 75.7 }, { no: 999, lat: 30.9, lng: 75.7 }, { no: 124, lat: 50, lng: 75 }];
    const dry = (await sup.post('/v1/admin/booths/locations', { stateCode: 'PB', acNo: 66, rows, dryRun: true })).json();
    expect(dry.ok).toBe(1);
    expect(dry.errors.map((e: { line: number }) => e.line)).toEqual([2, 3]);
    expect((await sup.get('/v1/admin/booths?state=PB&ac=66&missing=1')).json().missing).toBe(1);
    const saved = (await sup.post('/v1/admin/booths/locations', { stateCode: 'PB', acNo: 66, rows, dryRun: false })).json();
    expect(saved.saved).toBe(1);
    expect((await sup.get('/v1/admin/booths?state=PB&ac=66&missing=1')).json().missing).toBe(0);
  });

  it('TC-PD-V2-1 inside the distance → at booth (nearest booth)', async () => {
    const r = await report(north(100));
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ status: 'at_booth', partNo: 112 });
    expect(Math.abs(r.json().distanceM - 100)).toBeLessThan(3);
  });

  it('TC-PD-V2-2 away only after two readings in a row → "left" alert', async () => {
    expect((await report(north(650))).json().status).toBe('at_booth');
    const r = (await report(north(660))).json();
    expect(r.status).toBe('away');
    expect(r.distanceM).toBeGreaterThan(600);
    expect(await events()).toEqual(['left']);
  });

  it('TC-PD-V2-3 a poor reading (accuracy > 100 m) changes nothing', async () => {
    const r = (await report({ ...north(50), accuracy: 250 })).json();
    expect(r.status).toBe('away');
    expect(await events()).toEqual(['left']);
  });

  it('TC-PD-A1-1 back inside → "returned"', async () => {
    expect((await report(north(80))).json().status).toBe('at_booth');
    expect(await events()).toEqual(['left', 'returned']);
  });

  it('TC-PD-A1-3 location turned off → "location_off"; on again → "location_on"', async () => {
    const r = (await report({ permission: 'denied', lat: undefined, lng: undefined })).json();
    expect(r.status).toBe('location_off');
    expect((await report(north(80))).json().status).toBe('at_booth');
    expect(await events()).toEqual(['left', 'returned', 'location_off', 'location_on']);
  });

  it('TC-PD-A1-2 still away after 15 minutes → one "still_away"', async () => {
    await report(north(700));
    expect((await report(north(710))).json().status).toBe('away');
    await core.query(`UPDATE field_presence SET away_since = now() - interval '16 minutes' WHERE membership_id = $1`, [vmid]);
    await runPresenceJobs();
    await runPresenceJobs();
    const ev = await events();
    expect(ev.filter((k) => k === 'still_away').length).toBe(1);
    await report(north(10));
  });

  it('TC-PD-A1-5 every alert is pushed to the admins (name, booth, distance only)', async () => {
    const sent: PushMessage[] = [];
    setPushSender(async (msgs) => { sent.push(...msgs); });
    expect((await adm.put('/v1/me/push-token', { token: 'ExponentPushToken[test-admin]', platform: 'android' })).statusCode).toBe(200);
    expect((await rekha.put('/v1/me/push-token', { token: 'ExponentPushToken[other-party]', platform: 'ios' })).statusCode).toBe(200);
    await report(north(800));
    await report(north(810));
    const m = sent.find((x) => x.to === 'ExponentPushToken[test-admin]');
    expect(m?.title).toMatch(/Suresh Kumar/);
    expect(m?.title).toMatch(/112/);
    expect(m?.body).toMatch(/m away/);
    expect(Object.keys(m?.data ?? {}).sort()).toEqual(['kind', 'mid']);
    expect(sent.some((x) => x.to === 'ExponentPushToken[other-party]')).toBe(false);
    setPushSender(null);
    await report(north(10));
  });

  it('TC-PD-V2-4 the customer distance is used (500 m: 400 m away is at the booth)', async () => {
    await sup.patch(`/v1/admin/customers/${pacA}`, { boothRadiusM: 500 });
    await report(north(400));
    expect((await report(north(400))).json().status).toBe('at_booth');
    await sup.patch(`/v1/admin/customers/${pacA}`, { boothRadiusM: 300 });
  });

  it('TC-PD-A1-4 admin alert list, unseen badge, mark seen', async () => {
    const a = (await adm.get(`/v1/m/${amid}/polling/alerts`)).json();
    expect(a.items.length).toBeGreaterThanOrEqual(6);
    expect(a.items[0]).toMatchObject({ name: 'Suresh Kumar' });
    expect(a.unseen).toBeGreaterThan(0);
    expect((await adm.post(`/v1/m/${amid}/polling/alerts/seen`)).statusCode).toBe(200);
    expect((await adm.get(`/v1/m/${amid}/polling/alerts`)).json().unseen).toBe(0);
    expect((await page()).unseen).toBe(0);
  });

  it('TC-PD-A2-1 polling-day page: tiles, booths, volunteers', async () => {
    const p = await page();
    expect(p.election).toMatchObject({ id: e1, date: TODAY });
    expect(p.inWindow).toBe(true);
    expect(p.radiusM).toBe(300);
    const s = p.volunteers.find((v: { membershipId: string }) => v.membershipId === vmid);
    expect(s).toMatchObject({ name: 'Suresh Kumar', status: 'at_booth', partNo: 112, booths: [112, 113] });
    const t = p.tiles;
    expect(t.atBooth).toBeGreaterThanOrEqual(1);
    expect(t.atBooth + t.away + t.notReporting + t.locationOff + t.notShared + t.missing + t.checking).toBe(p.volunteers.length);
    expect(t.sharing).toBe(t.atBooth + t.away + t.missing + t.checking);
    const b112 = p.booths.find((b: { no: number }) => b.no === 112);
    expect(b112).toMatchObject({ lat: 30.9, lng: 75.7, volunteers: 1, atBooth: 1 });
    expect(p.booths.find((b: { no: number }) => b.no === 113)).toMatchObject({ volunteers: 1, atBooth: 0 });
    expect(t.unattendedBooths).toBe(p.booths.filter((b: { volunteers: number; atBooth: number; lat: number | null }) => b.volunteers > 0 && b.atBooth === 0 && b.lat != null).length);
  });

  it('TC-PD-A2-2 nothing for 10 minutes → not reporting', async () => {
    await core.query(`UPDATE field_presence SET reported_at = now() - interval '11 minutes' WHERE membership_id = $1`, [vmid]);
    expect((await row()).status).toBe('not_reporting');
    await report(north(10));
    expect((await row()).status).toBe('at_booth');
  });

  it('TC-PD-A2-3 the super-admin sees the same page for a customer', async () => {
    const p = (await sup.get(`/v1/admin/customers/${pacA}/polling`)).json();
    expect(p.election.id).toBe(e1);
    expect(p.volunteers.find((v: { membershipId: string }) => v.membershipId === vmid).status).toBe('at_booth');
  });

  it('TC-PD-SEC-1 only this customer\'s admins see it; reports only for your own membership', async () => {
    expect((await vol.get(`/v1/m/${vmid}/polling`)).statusCode).toBe(403);
    expect((await rekha.get(`/v1/m/${amid}/polling`)).statusCode).toBe(403);
    const other = (await rekha.get(`/v1/m/${rmid}/polling`)).json();
    expect(other.volunteers.some((v: { membershipId: string }) => v.membershipId === vmid)).toBe(false);
    expect((await report(north(10), amid, vol)).statusCode).toBe(403);
    expect((await report(north(10), amid, adm)).statusCode).toBe(403);
  });

  it('TC-PD-V2-5 booths without a location → "booth location missing", no alert', async () => {
    const before = (await events()).length;
    await sup.patch('/v1/admin/booths/PB/66/112', { lat: null, lng: null });
    await sup.patch('/v1/admin/booths/PB/66/113', { lat: null, lng: null });
    expect((await report(north(5000))).json().status).toBe('no_booth_location');
    expect((await events()).length).toBe(before);
    await sup.patch('/v1/admin/booths/PB/66/112', B112);
    await sup.patch('/v1/admin/booths/PB/66/113', B113);
  });

  it('admins also fix a booth location from their app (no GPS feature needed)', async () => {
    expect((await adm.put(`/v1/m/${amid}/booths/112/location`, B112)).statusCode).toBe(200);
  });

  it('a report outside the polling-day window is not stored', async () => {
    const r = await sup.patch(`/v1/admin/elections/PB/${e1}`, { opensAt: '00:00', closesAt: '00:01' });
    expect(r.statusCode).toBe(200);
    const before = (await core.query('SELECT reported_at FROM field_presence WHERE membership_id = $1', [vmid])).rows[0].reported_at;
    const x = (await report(north(10))).json();
    const now = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    if (now >= '00:01') {
      expect(x).toMatchObject({ stored: false });
      const after = (await core.query('SELECT reported_at FROM field_presence WHERE membership_id = $1', [vmid])).rows[0].reported_at;
      expect(after).toEqual(before);
    }
    await sup.patch(`/v1/admin/elections/PB/${e1}`, { opensAt: '00:00', closesAt: '23:59' });
  });

  it('TC-PD-S1-2 an election for some assemblies reaches only them', async () => {
    const r = await sup.post('/v1/admin/elections', { stateCode: 'PB', kind: 'bye', name: 'Nawanpind bye-poll', pollDate: plusDays(10), acNos: [50], opensAt: '07:00', closesAt: '18:00' });
    expect(r.statusCode).toBe(200);
    e2 = r.json().id;
    expect((await pollingDayOf(adm, (m) => m.acNo === 66)).electionId).toBe(e1);
  });

  it('TC-PD-S1-3 a cancelled election reaches nobody', async () => {
    expect((await sup.patch(`/v1/admin/elections/PB/${e1}`, { status: 'cancelled' })).statusCode).toBe(200);
    expect((await pollingDayOf(adm, (m) => m.acNo === 50)).electionId).toBe(e2);
    const p66 = await pollingDayOf(adm, (m) => m.acNo === 66);
    expect(p66.electionId).not.toBe(e1);
    expect(p66.electionId).not.toBe(e2);
    expect(p66.name).toBe('Punjab Assembly 2027');
    expect((await report(north(10))).json()).toMatchObject({ stored: false });
  });

  it('TC-PD-O1-1 location data is deleted 30 days after the poll date', async () => {
    await core.query(`UPDATE field_presence SET poll_date = current_date - 31 WHERE membership_id = $1`, [vmid]);
    await core.query(`UPDATE presence_events SET poll_date = current_date - 31 WHERE membership_id = $1`, [vmid]);
    await runPresenceJobs();
    expect((await core.query('SELECT 1 FROM field_presence WHERE membership_id = $1', [vmid])).rowCount).toBe(0);
    expect((await core.query('SELECT 1 FROM presence_events WHERE membership_id = $1', [vmid])).rowCount).toBe(0);
  });
});
