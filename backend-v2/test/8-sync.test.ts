/** TC-S sync modes and offline safety (docs/test-cases/sync-modes.md). */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeAll } from '../src/db/pools.js';
import { app, call, login, membership, start } from './helpers.js';

let sup: ReturnType<typeof call>;
let adm: ReturnType<typeof call>;
let vol: ReturnType<typeof call>;
let amid: string;
let vmid: string;
let pacA: string;
type V = { id: string; sno: number; group?: string | null; votedAt?: string | null; booth: number };

beforeAll(async () => {
  await start();
  sup = call((await login('9000000001')).token);
  const a = (await login('9000000002')).token;
  adm = call(a);
  amid = await membership(a, (m) => m.role === 'admin' && m.acNo === 66);
  const v = (await login('9000000003')).token;
  vol = call(v);
  vmid = await membership(v, (m) => m.role === 'volunteer');
  pacA = (await sup.get('/v1/admin/customers')).json().find((c: { partyName: string; acNo: number }) => c.partyName === 'Jan Vikas Party' && c.acNo === 66).id;
});
afterAll(async () => {
  await sup.patch(`/v1/admin/customers/${pacA}`, { syncMode: 'live', syncMinutes: 15 });
  await app.close();
  await closeAll();
});

const voters = async (booth = 113): Promise<V[]> => (await vol.get(`/v1/m/${vmid}/voters?booth=${booth}`)).json().voters;
const at = (min: number) => new Date(Date.UTC(2026, 10, 19, 10, min)).toISOString();
const batch = (ops: unknown[], unsent?: number) => vol.post(`/v1/m/${vmid}/changes/batch`, { ops, unsent });

describe('S sync', () => {
  it('TC-S3-1 super-admin sets the mode and timer; members get it; limits enforced', async () => {
    expect((await sup.patch(`/v1/admin/customers/${pacA}`, { syncMode: 'scheduled', syncMinutes: 20 })).statusCode).toBe(200);
    const m = (await vol.get('/v1/me')).json().memberships.find((x: { id: string }) => x.id === vmid);
    expect(m.sync).toEqual({ mode: 'scheduled', minutes: 20 });
    expect((await sup.patch(`/v1/admin/customers/${pacA}`, { syncMinutes: 0 })).statusCode).toBe(422);
    expect((await sup.patch(`/v1/admin/customers/${pacA}`, { syncMinutes: 121 })).statusCode).toBe(422);
    expect((await sup.patch(`/v1/admin/customers/${pacA}`, { syncMode: 'sometimes' })).statusCode).toBe(422);
    expect((await adm.patch(`/v1/admin/customers/${pacA}`, { syncMode: 'offline' })).statusCode).toBe(403);
  });

  it('TC-S4-1 a batch applies in order; sending it again changes nothing (duplicate)', async () => {
    const vs = (await voters()).slice(200, 203);
    const ops = vs.map((v, i) => ({ opId: randomUUID(), voterId: v.id, clientAt: new Date(Date.now() - (3 - i) * 1000).toISOString(), patch: { group: 'target' } }));
    const r1 = await batch(ops);
    expect(r1.statusCode).toBe(200);
    expect(r1.json().results.map((x: { status: string }) => x.status)).toEqual(['ok', 'ok', 'ok']);
    const r2 = await batch(ops);
    expect(r2.json().results.map((x: { status: string }) => x.status)).toEqual(['duplicate', 'duplicate', 'duplicate']);
    const after = await voters();
    for (const v of vs) expect(after.find((x) => x.id === v.id)?.group).toBe('target');
    const trace = (await adm.get(`/v1/m/${amid}/trace?booth=113&sno=${vs[0].sno}`)).json();
    expect(trace.events.filter((e: { change: { group?: string } }) => e.change.group === 'target').length).toBe(1);
  });

  it('TC-S4-2 one bad change does not stop the others', async () => {
    const mine = (await voters()).slice(210, 212);
    const other = (await adm.get(`/v1/m/${amid}/voters?booth=101`)).json().voters[0] as V;
    const ops = [
      { opId: randomUUID(), voterId: mine[0].id, clientAt: new Date().toISOString(), patch: { group: 'our' } },
      { opId: randomUUID(), voterId: other.id, clientAt: new Date().toISOString(), patch: { group: 'our' } },
      { opId: randomUUID(), voterId: '999999999999', clientAt: new Date().toISOString(), patch: { group: 'our' } },
      { opId: randomUUID(), voterId: mine[1].id, clientAt: new Date().toISOString(), patch: { colour: 'red' } },
      { opId: randomUUID(), voterId: mine[1].id, clientAt: new Date().toISOString(), patch: { group: 'opp' } },
    ];
    const r = (await batch(ops)).json().results;
    expect(r.map((x: { status: string; code?: string }) => x.code ?? x.status)).toEqual(['ok', 'booth_forbidden', 'voter_not_found', 'invalid', 'ok']);
    const after = await voters();
    expect(after.find((x) => x.id === mine[0].id)?.group).toBe('our');
    expect(after.find((x) => x.id === mine[1].id)?.group).toBe('opp');
  });

  it('TC-S6-1 an older change does not overwrite a newer one, but other fields still apply', async () => {
    const v = (await voters())[220];
    await batch([{ opId: randomUUID(), voterId: v.id, clientAt: at(5), patch: { group: 'our' } }]);
    const r = await batch([{ opId: randomUUID(), voterId: v.id, clientAt: at(0), patch: { group: 'opp', needsHelp: true } }]);
    expect(r.json().results[0].status).toBe('ok');
    const after = (await voters()).find((x) => x.id === v.id) as V & { needsHelp: boolean };
    expect(after.group).toBe('our'); // newer group kept
    expect(after.needsHelp).toBe(true); // a field nobody changed later still applies
    const trace = (await adm.get(`/v1/m/${amid}/trace?booth=113&sno=${v.sno}`)).json();
    expect(trace.events.some((e: { change: { group?: string } }) => e.change.group === 'opp')).toBe(true); // history keeps both
  });

  it('TC-S6-2 a Voted mark is not undone by an older undo', async () => {
    const v = (await voters())[230];
    await batch([{ opId: randomUUID(), voterId: v.id, clientAt: at(5), patch: { votedAt: at(5) } }]);
    await batch([{ opId: randomUUID(), voterId: v.id, clientAt: at(0), patch: { votedAt: null } }]);
    expect((await voters()).find((x) => x.id === v.id)?.votedAt).toBeTruthy();
    await batch([{ opId: randomUUID(), voterId: v.id, clientAt: at(9), patch: { votedAt: null } }]);
    expect((await voters()).find((x) => x.id === v.id)?.votedAt).toBeFalsy(); // a newer undo works
  });

  it('TC-S6-3 a phone clock in the future counts as now', async () => {
    const v = (await voters())[240];
    const future = new Date(Date.now() + 2 * 86_400_000).toISOString();
    await batch([{ opId: randomUUID(), voterId: v.id, clientAt: future, patch: { group: 'opp' } }]);
    await batch([{ opId: randomUUID(), voterId: v.id, clientAt: new Date(Date.now() + 1000).toISOString(), patch: { group: 'our' } }]);
    expect((await voters()).find((x) => x.id === v.id)?.group).toBe('our');
  });

  it('TC-S9-1 the admin sees each volunteer’s last sync and unsent count', async () => {
    const v = (await voters())[250];
    await batch([{ opId: randomUUID(), voterId: v.id, clientAt: new Date().toISOString(), patch: { residence: 'here' } }], 4);
    const team = (await adm.get(`/v1/m/${amid}/team?status=approved`)).json();
    const me = team.find((x: { membershipId: string }) => x.membershipId === vmid);
    expect(me.unsent).toBe(4);
    expect(Date.now() - Date.parse(me.lastSyncAt)).toBeLessThan(60_000);
  });

  it('single-change endpoint still works and follows the same rules', async () => {
    const v = (await voters())[260];
    const r = await vol.post(`/v1/m/${vmid}/voters/${v.id}/changes`, { opId: randomUUID(), clientAt: new Date().toISOString(), patch: { group: 'target' } });
    expect(r.statusCode).toBe(200);
    expect(r.json().group).toBe('target');
  });
});
