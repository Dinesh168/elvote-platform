/** TC-RD-1…8 (docs/test-cases/real-demo-data.md): worked-out booth strength, estimated booths, UP state. Runs after 95 (results loaded). */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeAll } from '../src/db/pools.js';
import { app, call, login, membership, start } from './helpers.js';

let adm: ReturnType<typeof call>;
let vol: ReturnType<typeof call>;
let sup: ReturnType<typeof call>;
let amid: string;
let vmid: string;

beforeAll(async () => {
  await start();
  const a = (await login('9000000002')).token;
  const v = (await login('9000000003')).token;
  adm = call(a);
  vol = call(v);
  sup = call((await login('9000000001')).token);
  amid = await membership(a, (m) => m.role === 'admin' && m.acNo === 66 && m.partyName === 'Jan Vikas Party');
  vmid = await membership(v, (m) => m.role === 'volunteer' && m.acNo === 66);
});
afterAll(async () => {
  await app.close();
  await closeAll();
});

type Row = { no: number; strength: string; strengthSource: string };
const row = async (no: number) => ((await adm.get(`/v1/m/${amid}/booth-table`)).json() as Row[]).find((b) => b.no === no)!;

describe('booth strength worked out per party (B3)', () => {
  it('TC-RD-1 reset gives the worked-out value from the last result', async () => {
    expect((await adm.del(`/v1/m/${amid}/booths/101/strength`)).statusCode).toBe(200);
    expect(await row(101)).toEqual(expect.objectContaining({ strength: 'S', strengthSource: 'auto' }));
  });

  it('TC-RD-2/3 an admin setting wins until Reset', async () => {
    expect((await adm.put(`/v1/m/${amid}/booths/101/strength`, { strength: 'W' })).statusCode).toBe(200);
    expect(await row(101)).toEqual(expect.objectContaining({ strength: 'W', strengthSource: 'admin' }));
    await adm.del(`/v1/m/${amid}/booths/101/strength`);
    expect(await row(101)).toEqual(expect.objectContaining({ strength: 'S', strengthSource: 'auto' }));
  });

  it('TC-RD-4 swing booth is Moderate, lost by 200 is Weak', async () => {
    await adm.del(`/v1/m/${amid}/booths/112/strength`);
    await adm.del(`/v1/m/${amid}/booths/113/strength`);
    expect((await row(112)).strength).toBe('M');
    expect((await row(113)).strength).toBe('W');
    const map = (await adm.get(`/v1/m/${amid}/map`)).json() as Row[];
    expect(map.find((b) => b.no === 113)!.strength).toBe('W');
  });

  it('TC-RD-5 volunteers cannot reset', async () => {
    expect((await vol.del(`/v1/m/${vmid}/booths/101/strength`)).statusCode).toBe(403);
  });

  it('TC-RD-6 dashboard counts include worked-out strengths', async () => {
    const d = (await adm.get(`/v1/m/${amid}/dashboard`)).json();
    const t = (await adm.get(`/v1/m/${amid}/booth-table`)).json() as Row[];
    expect(d.pollingStations.strong).toBe(t.filter((b) => b.strength === 'S').length);
    expect(d.pollingStations.weak).toBe(t.filter((b) => b.strength === 'W').length);
  });
});

describe('estimated booths and UP (B1, O1)', () => {
  it('TC-RD-8 a booth whose votes were estimated is flagged', async () => {
    const csv = 'AC No.,POLLING STATION-NUMBER,JVP Votes,INC Votes,Total Votes,Year,Data Note\n66,112,100,90,190,2012,dummy votes (no 2022 match; neighbour shares)\n66,113,80,120,200,2012,2022 Form 20';
    expect((await sup.post('/v1/admin/past-results', { stateCode: 'PB', csv })).statusCode).toBe(200);
    const b = (await adm.get(`/v1/m/${amid}/trend?level=booth&key=112`)).json();
    expect(b.years.find((y: { year: number }) => y.year === 2012).estimated).toBe(1);
    const c = (await adm.get(`/v1/m/${amid}/trend?level=booth&key=113`)).json();
    expect(c.years.find((y: { year: number }) => y.year === 2012).estimated).toBe(0);
    await sup.del('/v1/admin/past-results?state=PB&ac=66&year=2012');
  });

  it('TC-RD-7 Uttar Pradesh is a state', async () => {
    const o = (await sup.get('/v1/admin/overview')).json();
    expect(o.states.map((s: { code: string }) => s.code)).toContain('UP');
  });
});

/** spec booth-map TC-BM-1: map data has volunteers, the first volunteer to call and the last-result group. */
describe('booth map data', () => {
  it('TC-BM-1 workers, contact and result per booth', async () => {
    const rows = (await adm.get(`/v1/m/${amid}/map`)).json() as { no: number; workers: number; contact: { name: string; mobile: string | null } | null; result: string | null }[];
    const b112 = rows.find((b) => b.no === 112)!;
    expect(b112.workers).toBeGreaterThan(0);
    expect(b112.contact?.name).toBeTruthy();
    expect(rows.find((b) => b.no === 101)!.result).toBe('S');
    expect((await vol.get(`/v1/m/${vmid}/map`)).statusCode).toBe(403);
  });
});

/** spec map-results TC-MR-1/2: the super-admin's close-contest margin drives strength and the map's last-election data. */
describe('team margin', () => {
  it('TC-MR-1 a larger margin turns a won-by-100+ booth into Moderate; back to 100 restores it', async () => {
    const id = ((await sup.get('/v1/admin/customers')).json() as { id: string; partyName: string; acNo: number }[]).find((c) => c.partyName === 'Jan Vikas Party' && c.acNo === 66)!.id;
    await adm.del(`/v1/m/${amid}/booths/101/strength`);
    expect((await sup.patch(`/v1/admin/customers/${id}`, { resultMargin: 2000 })).json().resultMargin).toBe(2000);
    expect(await row(101)).toEqual(expect.objectContaining({ strength: 'M', strengthSource: 'auto' }));
    expect((await sup.patch(`/v1/admin/customers/${id}`, { resultMargin: 5 })).statusCode).toBe(422);
    await sup.patch(`/v1/admin/customers/${id}`, { resultMargin: 100 });
    expect(await row(101)).toEqual(expect.objectContaining({ strength: 'S' }));
  });

  it('TC-MR-2 map: last election per booth (year, party, our %, rival, margin, votes)', async () => {
    const b = ((await adm.get(`/v1/m/${amid}/map`)).json() as { no: number; last: { year: number; party: string; ours: number; rival: string; margin: number; oursVotes: number; rivalVotes: number } | null }[]).find((x) => x.no === 101)!;
    expect(b.last).toMatchObject({ party: 'JVP' });
    expect(b.last!.margin).toBe(b.last!.oursVotes - b.last!.rivalVotes);
    expect(b.last!.year).toBeGreaterThan(2000);
  });
});
