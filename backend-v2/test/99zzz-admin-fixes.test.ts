/** TC-AF-B* (docs/test-cases/admin-fixes-r1.md): zone scope, admin voter search. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeAll } from '../src/db/pools.js';
import { app, call, login, membership, start } from './helpers.js';

let adm: ReturnType<typeof call>;
let vol: ReturnType<typeof call>;
let amid: string;
let vmid: string;

beforeAll(async () => {
  await start();
  adm = call((await login('9000000002')).token);
  vol = call((await login('9000000003')).token);
  amid = await membership((await login('9000000002')).token, (m) => m.role === 'admin' && m.acNo === 66);
  vmid = await membership((await login('9000000003')).token, (m) => m.role === 'volunteer');
});
afterAll(async () => {
  await app.close();
  await closeAll();
});

describe('zone scope (A9)', () => {
  it('TC-AF-B1 booth-stats and dashboard for one zone', async () => {
    expect((await adm.post(`/v1/m/${amid}/zones/split`, { count: 2 })).statusCode).toBe(200);
    const all = (await adm.get(`/v1/m/${amid}/booth-stats`)).json();
    const zoneId = all.booths.find((b: { zoneId: string | null }) => b.zoneId).zoneId;
    const r = await adm.get(`/v1/m/${amid}/booth-stats?zone=${zoneId}`);
    expect(r.statusCode, r.body).toBe(200);
    const inZone = all.booths.filter((b: { zoneId: string }) => b.zoneId === zoneId).map((b: { no: number }) => b.no);
    expect(r.json().booths.map((b: { no: number }) => b.no)).toEqual(inZone);
    const d = await adm.get(`/v1/m/${amid}/dashboard?zone=${zoneId}`);
    expect(d.statusCode, d.body).toBe(200);
  });
});

type V = { id: string; name: string; epic: string; house: string | null; age: number | null; booth: number };
describe('voter search (B1)', () => {
  let vs: V[];
  beforeAll(async () => { vs = (await adm.get(`/v1/m/${amid}/voters?booth=112`)).json().voters; });

  it('TC-AF-B2 by EPIC: exactly that voter', async () => {
    const r = await adm.get(`/v1/m/${amid}/search?epic=${vs[5].epic}`);
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json().items.map((x: V) => x.id)).toEqual([vs[5].id]);
  });

  it('TC-AF-B3 name + address (house)', async () => {
    const v = vs.find((x) => x.house)!;
    const word = v.name.split(' ')[0].slice(0, 4);
    const r = (await adm.get(`/v1/m/${amid}/search?name=${encodeURIComponent(word)}&address=${encodeURIComponent(v.house!)}`)).json();
    expect(r.items.length).toBeGreaterThan(0);
    for (const x of r.items as V[]) { expect(x.name.toLowerCase()).toContain(word.toLowerCase()); expect(x.house).toBe(v.house); }
    expect(r.items.map((x: V) => x.id)).toContain(v.id);
  });

  it('TC-AF-B4 name + age ±2', async () => {
    const v = vs.find((x) => x.age)!;
    const word = v.name.split(' ')[0].slice(0, 4);
    const r = (await adm.get(`/v1/m/${amid}/search?name=${encodeURIComponent(word)}&age=${v.age}`)).json();
    expect(r.items.map((x: V) => x.id)).toContain(v.id);
    for (const x of r.items as V[]) expect(Math.abs((x.age ?? 0) - v.age!)).toBeLessThanOrEqual(2);
    expect(r.items.length).toBeLessThanOrEqual(50);
  });

  it('TC-AF-B5 name needs 3 letters', async () => {
    expect((await adm.get(`/v1/m/${amid}/search?name=ab`)).statusCode).toBe(422);
  });

  it('TC-AF-B6 volunteer: own booths only', async () => {
    const r = (await vol.get(`/v1/m/${vmid}/search?name=${encodeURIComponent(vs[0].name.split(' ')[0].slice(0, 3))}`)).json();
    for (const x of r.items as V[]) expect([112, 113]).toContain(x.booth);
  });

  it('TC-AF-B7 injection text is just text', async () => {
    const r = await adm.get(`/v1/m/${amid}/search?name=${encodeURIComponent("x' OR 1=1 --")}`);
    expect(r.statusCode).toBe(200);
    expect(r.json().items).toEqual([]);
  });
});
