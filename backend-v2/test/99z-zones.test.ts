/** spec zones-easy TC-ZE-1..3 (runs last: it reshapes the test team's zones). */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeAll } from '../src/db/pools.js';
import { app, call, login, membership, start } from './helpers.js';

beforeAll(async () => {
  await start();
});
afterAll(async () => {
  await app.close();
  await closeAll();
});
describe('zones made easy', () => {
  it('TC-ZE-1 split into 3 zones: every booth in one zone, sizes differ by at most 1 booth per zone', async () => {
    const a = call((await login('9000000002')).token);
    const mid = await membership((await login('9000000002')).token, (x) => x.role === 'admin' && x.acNo === 66);
    expect((await a.post(`/v1/m/${mid}/zones/split`, { count: 3 })).statusCode).toBe(200);
    const z = (await a.get(`/v1/m/${mid}/zones`)).json() as { zones: { id: string; booths: number[]; total: number }[]; unassigned: number[]; allBooths: { no: number; zoneId: string | null }[] };
    expect(z.zones).toHaveLength(3);
    expect(z.unassigned).toEqual([]);
    const sizes = z.zones.map((x) => x.booths.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(Math.ceil(z.allBooths.length / 3));
    expect(z.allBooths.every((b) => b.zoneId)).toBe(true);
    // booth-number order: zone 1 holds the lowest numbers
    expect(Math.max(...z.zones[0].booths)).toBeLessThan(Math.min(...z.zones[1].booths));
  });

  it('TC-ZE-2 delete a zone: its booths become unzoned, the rest renumber', async () => {
    const a = call((await login('9000000002')).token);
    const mid = await membership((await login('9000000002')).token, (x) => x.role === 'admin' && x.acNo === 66);
    const before = (await a.get(`/v1/m/${mid}/zones`)).json() as { zones: { id: string; number: number; booths: number[] }[] };
    const gone = before.zones[0];
    expect((await a.del(`/v1/m/${mid}/zones/${gone.id}`)).json().zoneCount).toBe(2);
    const after = (await a.get(`/v1/m/${mid}/zones`)).json() as { zones: { number: number }[]; unassigned: number[] };
    expect(after.zones.map((x) => x.number)).toEqual([1, 2]);
    expect(after.unassigned).toEqual(gone.booths);
  });

  it('TC-ZE-3 split over the maximum is refused; volunteers cannot split', async () => {
    const a = call((await login('9000000002')).token);
    const mid = await membership((await login('9000000002')).token, (x) => x.role === 'admin' && x.acNo === 66);
    expect((await a.post(`/v1/m/${mid}/zones/split`, { count: 50 })).statusCode).toBe(422);
    const v = call((await login('9000000003')).token);
    const vmid = await membership((await login('9000000003')).token, (x) => x.role === 'volunteer');
    expect((await v.post(`/v1/m/${vmid}/zones/split`, { count: 2 })).statusCode).toBe(403);
    await a.post(`/v1/m/${mid}/zones/split`, { count: 5 });
  });
});
