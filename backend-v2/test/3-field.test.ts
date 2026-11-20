/** TC-B5 volunteer data, TC-B12-3/4 validation and speed. */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeAll } from '../src/db/pools.js';
import { app, call, login, membership, start } from './helpers.js';

let vol: ReturnType<typeof call>;
let vmid: string;
beforeAll(async () => {
  await start();
  const t = (await login('9000000003')).token;
  vol = call(t);
  vmid = await membership(t, (m) => m.role === 'volunteer');
});
afterAll(async () => {
  await app.close();
  await closeAll();
});

const change = (voterId: string, patch: object, opId = randomUUID()) => vol.post(`/v1/m/${vmid}/voters/${voterId}/changes`, { opId, clientAt: new Date().toISOString(), patch });

describe('B5 volunteer data', () => {
  it('lists only the volunteer’s booths', async () => {
    const r = await vol.get(`/v1/m/${vmid}/booths`);
    expect(r.json().map((b: { no: number }) => b.no)).toEqual([112, 113]);
  });

  it('TC-B5-1 booth 112 voters in the app shape', async () => {
    const t0 = Date.now();
    const r = await vol.get(`/v1/m/${vmid}/voters?booth=112`);
    const ms = Date.now() - t0;
    expect(r.statusCode).toBe(200);
    const { voters } = r.json();
    expect(voters).toHaveLength(1200);
    expect(voters[0]).toMatchObject({ booth: 112, sno: 1, residence: expect.any(String), needsHelp: expect.any(Boolean) });
    expect(['S/o', 'W/o', 'D/o']).toContain(voters[0].relation);
    expect(voters.filter((v: { group?: string }) => v.group).length).toBeGreaterThan(200);
    expect(ms).toBeLessThan(1500); // TC-B12-4 (includes JSON); target < 500 ms on a warm server
  });

  it('TC-B5-2 another booth → 403', async () => {
    expect((await vol.get(`/v1/m/${vmid}/voters?booth=114`)).statusCode).toBe(403);
  });

  it('TC-B5-3 the same opId twice is stored once', async () => {
    const { voters } = (await vol.get(`/v1/m/${vmid}/voters?booth=113`)).json();
    const v = voters.find((x: { group?: string }) => !x.group);
    const op = randomUUID();
    const r1 = await change(v.id, { group: 'our' }, op);
    const r2 = await change(v.id, { group: 'our' }, op);
    expect(r1.statusCode).toBe(200);
    expect(r1.json().group).toBe('our');
    expect(r2.json().group).toBe('our');
    const pg = (await import('pg')).default;
    const { superUrl } = await import('../src/config.js');
    const c = new pg.Client({ connectionString: superUrl('t_elvote_pb') });
    await c.connect();
    const n = (await c.query('SELECT count(*)::int AS n FROM contact_events WHERE voter_id = $1', [v.id])).rows[0].n;
    await c.end();
    expect(n).toBe(1);
  });

  it('TC-B5-4 party 2 does not see party 1’s change', async () => {
    const { voters } = (await vol.get(`/v1/m/${vmid}/voters?booth=112`)).json();
    const v = voters.find((x: { group?: string; sno: number }) => !x.group && x.sno > 900);
    await change(v.id, { group: 'opp', needsHelp: true });
    const t2 = (await login('9000000004')).token;
    const mid2 = await membership(t2, (m) => m.acNo === 66);
    const list = (await call(t2).get(`/v1/m/${mid2}/voters?booth=112`)).json().voters;
    const same = list.find((x: { id: string }) => x.id === v.id);
    expect(same.group === 'opp' && same.needsHelp === true).toBe(false);
  });

  it('TC-B5-5 since= returns only changed voters', async () => {
    const since = new Date().toISOString();
    const { voters } = (await vol.get(`/v1/m/${vmid}/voters?booth=113`)).json();
    const v = voters.find((x: { group?: string; sno: number }) => !x.group && x.sno > 800);
    await change(v.id, { residence: 'moved' });
    const d = (await vol.get(`/v1/m/${vmid}/voters?booth=113&since=${encodeURIComponent(since)}`)).json();
    expect(d.voters.map((x: { id: string }) => x.id)).toEqual([v.id]);
    expect(d.voters[0].residence).toBe('moved');
  });

  it('TC-B5-6 bad mobile → 422; good mobile saved', async () => {
    const { voters } = (await vol.get(`/v1/m/${vmid}/voters?booth=113`)).json();
    const v = voters[10];
    expect((await change(v.id, { mobile: '123' })).statusCode).toBe(422);
    const ok = await change(v.id, { mobile: '9876543210' });
    expect(ok.json().mobile).toBe('9876543210');
  });

  it('polling day: voted and undo', async () => {
    const { voters } = (await vol.get(`/v1/m/${vmid}/voters?booth=113`)).json();
    const v = voters.find((x: { votedAt?: string }) => !x.votedAt);
    const t0 = Date.now();
    const r = await change(v.id, { votedAt: new Date().toISOString() });
    expect(Date.now() - t0).toBeLessThan(500); // TC-B12-4 change write
    expect(r.json().votedAt).toBeTruthy();
    const u = await change(v.id, { votedAt: null });
    expect(u.json().votedAt).toBeUndefined();
  });

  it('TC-B12-3 injection-looking input is rejected by validation', async () => {
    expect((await vol.get(`/v1/m/${vmid}/voters?booth=1%20OR%201=1`)).statusCode).toBe(422);
    expect((await vol.post(`/v1/m/${vmid}/voters/1;DROP/changes`, { opId: randomUUID(), patch: { group: 'our' } })).statusCode).toBe(422);
    expect((await change('123', { group: 'everyone' })).statusCode).toBe(422);
  });

  it('search by name, house and EPIC stays within the volunteer’s booths', async () => {
    const r = (await vol.get(`/v1/m/${vmid}/search?q=kaur`)).json();
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((v: { booth: number }) => v.booth === 112 || v.booth === 113)).toBe(true);
    const epic = (await vol.get(`/v1/m/${vmid}/voters?booth=112`)).json().voters[0].epic;
    const e = (await vol.get(`/v1/m/${vmid}/search?q=${epic}`)).json();
    expect(e[0].epic).toBe(epic);
  });

  it('TC-V4-9 branding for the voter slip', async () => {
    const b = (await vol.get(`/v1/m/${vmid}/branding`)).json();
    expect(b).toMatchObject({ partyName: 'Jan Vikas Party', candidateName: 'Harjit Singh Sandhu', ballotNo: 3, pollDate: '2027-02-14' });
  });

  it('tasks: volunteer gets drives covering their booths', async () => {
    const t = (await vol.get(`/v1/m/${vmid}/tasks`)).json();
    expect(t.map((x: { kind: string }) => x.kind).sort()).toEqual(['first_time', 'senior', 'women'].filter((k) => t.some((x: { kind: string }) => x.kind === k)).sort());
    expect(t.length).toBeGreaterThanOrEqual(2);
    expect(t.every((x: { booths: number[] }) => x.booths.every((b) => b === 112 || b === 113))).toBe(true);
  });
});
