/** TC-B6 dashboard, TC-B7 zones, TC-B8 team, TC-B9 drives, TC-B10 polling day. */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { superUrl } from '../src/config.js';
import { closeAll } from '../src/db/pools.js';
import { processDirty } from '../src/lib/stats.js';
import { app, call, login, membership, start } from './helpers.js';

let adm: ReturnType<typeof call>;
let mid: string;
let partyId: string;
let db: pg.Client;
beforeAll(async () => {
  await start();
  const t = (await login('9000000002')).token;
  adm = call(t);
  mid = await membership(t, (m) => m.acNo === 66);
  partyId = (await adm.get('/v1/me')).json().memberships.find((m: { id: string }) => m.id === mid).partyId;
  db = new pg.Client({ connectionString: superUrl('t_elvote_pb') });
  await db.connect();
  while (await processDirty(500));
});
afterAll(async () => {
  await db.end();
  await app.close();
  await closeAll();
});

describe('B6 dashboard', () => {
  it('TC-B6-1 totals equal a raw recount; charts and top workers present', async () => {
    const t0 = Date.now();
    const r = await adm.get(`/v1/m/${mid}/dashboard`);
    const ms = Date.now() - t0;
    expect(r.statusCode).toBe(200);
    const d = r.json();
    const raw = (await db.query(
      `SELECT (SELECT count(*) FROM voters WHERE ac_no = 66)::int AS total,
              (SELECT count(*) FROM voter_contacts WHERE party_id = $1 AND ac_no = 66 AND group_code IS NOT NULL)::int AS met,
              (SELECT count(*) FROM voter_contacts WHERE party_id = $1 AND ac_no = 66 AND group_code = 'target')::int AS target`, [partyId])).rows[0];
    expect(d.totals.total).toBe(raw.total);
    expect(d.totals.met).toBe(raw.met);
    expect(d.totals.target).toBe(raw.target);
    expect(d.charts.groups.our + d.charts.groups.target + d.charts.groups.opp + d.charts.groups.notMet).toBe(raw.total);
    expect(d.charts.zones).toHaveLength(10);
    expect(d.charts.trend).toHaveLength(7);
    expect(d.topWorkers.length).toBeGreaterThan(3);
    expect(d.topWorkers.length).toBeLessThanOrEqual(10);
    expect(d.pollingStations.total).toBe(25);
    expect(d.pollingStations.strong + d.pollingStations.moderate + d.pollingStations.weak).toBe(25);
    expect(ms).toBeLessThan(800); // TC-B12-4; target < 300 ms on a warm server
  });

  it('TC-B6-2 zone filter equals the sum of that zone’s booths', async () => {
    const d = (await adm.get(`/v1/m/${mid}/dashboard`)).json();
    const z = d.charts.zones[0];
    const zd = (await adm.get(`/v1/m/${mid}/dashboard?zone=${z.id}`)).json();
    expect(zd.totals.total).toBe(z.total);
    expect(zd.totals.met).toBe(z.met);
    const table = (await adm.get(`/v1/m/${mid}/booth-table?zone=${z.id}`)).json();
    expect(table.reduce((a: number, b: { total: number }) => a + b.total, 0)).toBe(z.total);
  });

  it('TC-B6-3 volunteer cannot open the dashboard', async () => {
    const t = (await login('9000000003')).token;
    const vmid = await membership(t, () => true);
    expect((await call(t).get(`/v1/m/${vmid}/dashboard`)).statusCode).toBe(403);
  });

  it('admin of party 2 never sees party 1 numbers', async () => {
    const t2 = (await login('9000000004')).token;
    const m2 = await membership(t2, (m) => m.acNo === 66);
    const a = (await adm.get(`/v1/m/${mid}/dashboard`)).json().totals.met;
    const b = (await call(t2).get(`/v1/m/${m2}/dashboard`)).json().totals.met;
    expect(a).not.toBe(b);
    expect((await call(t2).get(`/v1/m/${mid}/dashboard`)).statusCode).toBe(403);
  });
});

describe('B7 zones', () => {
  it('TC-B7-1 zone count above max → 422', async () => {
    const r = await adm.put(`/v1/m/${mid}/zones/count`, { count: 11 });
    expect(r.statusCode).toBe(422);
    expect(r.json().error).toBe('zones_over_max');
  });

  it('TC-B7-2 lowering 10 → 8 removes Z9, Z10 and leaves their booths unassigned', async () => {
    const before = (await adm.get(`/v1/m/${mid}/zones`)).json();
    const lost = before.zones.filter((z: { number: number }) => z.number > 8).flatMap((z: { booths: number[] }) => z.booths);
    expect((await adm.put(`/v1/m/${mid}/zones/count`, { count: 8 })).statusCode).toBe(200);
    const after = (await adm.get(`/v1/m/${mid}/zones`)).json();
    expect(after.zones).toHaveLength(8);
    for (const b of lost) expect(after.unassigned).toContain(b);
    // move them back into Z8
    const z8 = after.zones.find((z: { number: number }) => z.number === 8).id;
    expect((await adm.put(`/v1/m/${mid}/zones/booths`, { booths: lost, zoneId: z8 })).statusCode).toBe(200);
    expect((await adm.get(`/v1/m/${mid}/zones`)).json().unassigned).toEqual([]);
  });

  it('TC-B7-3 super-admin raises max to 12, then admin can use 12', async () => {
    const sup = call((await login('9000000001')).token);
    const me = (await adm.get('/v1/me')).json().memberships.find((m: { id: string }) => m.id === mid);
    expect((await sup.patch(`/v1/admin/party-acs/${me.partyAcId}`, { maxZones: 12 })).statusCode).toBe(200);
    expect((await adm.put(`/v1/m/${mid}/zones/count`, { count: 12 })).statusCode).toBe(200);
    expect((await adm.get(`/v1/m/${mid}/zones`)).json().zones).toHaveLength(12);
    expect((await sup.patch(`/v1/admin/party-acs/${me.partyAcId}`, { maxZones: 5 })).statusCode).toBe(422);
  });

  it('rename a zone', async () => {
    const z = (await adm.get(`/v1/m/${mid}/zones`)).json().zones[0];
    expect((await adm.patch(`/v1/m/${mid}/zones/${z.id}`, { name: 'North' })).statusCode).toBe(200);
    expect((await adm.get(`/v1/m/${mid}/zones`)).json().zones[0].name).toBe('North');
  });
});

describe('B8 team', () => {
  it('TC-B8-1 approve a pending volunteer with booths; audit written', async () => {
    const pending = (await adm.get(`/v1/m/${mid}/team?status=pending`)).json();
    expect(pending.length).toBeGreaterThan(0);
    const p = pending[0];
    expect((await adm.post(`/v1/m/${mid}/team/${p.membershipId}/approve`, { booths: [124, 125] })).statusCode).toBe(200);
    const approved = (await adm.get(`/v1/m/${mid}/team?status=approved&q=${encodeURIComponent(p.name.split(' ')[0])}`)).json();
    expect(approved.find((x: { membershipId: string }) => x.membershipId === p.membershipId).booths).toEqual([124, 125]);
    const core = new pg.Client({ connectionString: superUrl('t_elvote_core') });
    await core.connect();
    const a = await core.query(`SELECT 1 FROM audit_log WHERE action = 'member.approve' AND entity_id = $1`, [p.membershipId]);
    await core.end();
    expect(a.rowCount).toBe(1);
  });

  it('TC-B8-2 reject with a reason', async () => {
    const pending = (await adm.get(`/v1/m/${mid}/team?status=pending`)).json();
    const p = pending[0];
    expect((await adm.post(`/v1/m/${mid}/team/${p.membershipId}/reject`, { reason: 'Not from this area' })).statusCode).toBe(200);
    const rej = (await adm.get(`/v1/m/${mid}/team?status=rejected`)).json();
    expect(rej.find((x: { membershipId: string }) => x.membershipId === p.membershipId).rejectReason).toBe('Not from this area');
  });

  it('volunteer list shows activity', async () => {
    const team = (await adm.get(`/v1/m/${mid}/team`)).json();
    expect(team.some((x: { contactedTotal: number }) => x.contactedTotal > 0)).toBe(true);
  });

  it('new join code works once generated; old one stops', async () => {
    const r = (await adm.post(`/v1/m/${mid}/join-code`)).json();
    const t = (await login('9876522222')).token;
    expect((await call(t).post('/v1/join/check', { code: r.code })).statusCode).toBe(200);
    expect((await call(t).post('/v1/join/check', { code: 'RAMPUR24' })).statusCode).toBe(422);
  });
});

describe('B9 drives', () => {
  it('TC-B9-1 create a women drive in Z1 → progress with targeted > 0', async () => {
    const zones = (await adm.get(`/v1/m/${mid}/zones`)).json().zones;
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const c = await adm.post(`/v1/m/${mid}/drives`, { kind: 'women', startsOn: today, endsOn: end, scope: 'zones', zoneIds: [zones[0].id] });
    expect(c.statusCode).toBe(200);
    const list = (await adm.get(`/v1/m/${mid}/drives`)).json();
    const d = list.find((x: { id: string }) => x.id === c.json().id);
    expect(d.targeted).toBeGreaterThan(0);
    expect(d.completed).toBeLessThanOrEqual(d.targeted);
    expect(d.status).toBe('ongoing');
    expect(d.byZone).toHaveLength(1);
    expect((await adm.del(`/v1/m/${mid}/drives/${d.id}`)).statusCode).toBe(200);
  });

  it('"Other" needs a name; end before start is rejected', async () => {
    expect((await adm.post(`/v1/m/${mid}/drives`, { kind: 'other', startsOn: '2026-12-01', endsOn: '2026-12-10', scope: 'all' })).statusCode).toBe(422);
    expect((await adm.post(`/v1/m/${mid}/drives`, { kind: 'young', startsOn: '2026-12-10', endsOn: '2026-12-01', scope: 'all' })).statusCode).toBe(422);
  });
});

describe('B10 polling day', () => {
  it('TC-B10-1 voted equals poll marks; booths sorted lowest % first', async () => {
    while (await processDirty(500));
    const p = (await adm.get(`/v1/m/${mid}/poll`)).json();
    const raw = (await db.query(`SELECT count(*)::int AS n FROM poll_marks WHERE party_id = $1 AND ac_no = 66 AND undone_at IS NULL`, [partyId])).rows[0].n;
    expect(p.voted).toBe(raw);
    for (let i = 1; i < p.booths.length; i++) expect(p.booths[i].pct).toBeGreaterThanOrEqual(p.booths[i - 1].pct);
    expect(p.zones.length).toBeGreaterThan(0);
  });

  it('map returns 25 booths with coordinates', async () => {
    const m = (await adm.get(`/v1/m/${mid}/map`)).json();
    expect(m).toHaveLength(25);
    expect(m.every((b: { lat: number | null }) => b.lat != null)).toBe(true);
  });

  it('TC-C1-2 admins can no longer change branding (moved to the super-admin)', async () => {
    expect((await adm.patch(`/v1/m/${mid}/settings`, { candidateName: 'New Candidate', ballotNo: 4 })).statusCode).toBe(404);
    expect((await adm.get(`/v1/m/${mid}/settings`)).statusCode).toBe(404);
  });
});
