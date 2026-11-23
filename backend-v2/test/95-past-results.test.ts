/** TC-MT-1…20 (docs/test-cases/map-trend.md): past results upload, trend, results map, win plan, progress, remind. */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { superUrl } from '../src/config.js';
import { closeAll } from '../src/db/pools.js';
import { app, call, login, membership, start } from './helpers.js';

let adm: ReturnType<typeof call>;
let vol: ReturnType<typeof call>;
let sup: ReturnType<typeof call>;
let amid: string;
let vmid: string;
let state: pg.Client;

const HEAD = 'AC No.,Assembly Constituency,POLLING STATION-NUMBER,Polling Station Name,District,Tehsil,Village,State,JVP Votes,INC Votes,SAD Votes,Other Votes,Total Votes,Current Voters,Year';
// Booth 101: we win both years. 112: lost 2017 by 30, won 2022 by 20 (swing). 113: lost by 200 (tough).
const ROWS = [
  '66,Rampur,101,School A,Rampur,T1,Alpha,Punjab,400,200,100,50,750,1000,2017',
  '66,Rampur,112,School B,Rampur,T1,Beta,Punjab,270,300,80,50,700,1000,2017',
  '66,Rampur,113,School C,Rampur,T2,Gamma,Punjab,100,300,150,50,600,900,2017',
  '66,Rampur,101,School A,Rampur,T1,Alpha,Punjab,450,200,80,20,750,1050,2022',
  '66,Rampur,112,School B,Rampur,T1,Beta,Punjab,320,300,60,20,700,1050,2022',
  '66,Rampur,113,School C,Rampur,T2,Gamma,Punjab,150,350,80,20,600,950,2022',
];
const csv = (rows: string[]) => [HEAD, ...rows].join('\n');

beforeAll(async () => {
  await start();
  state = new pg.Client({ connectionString: superUrl('t_elvote_pb') });
  await state.connect();
  const a = (await login('9000000002')).token;
  const v = (await login('9000000003')).token;
  adm = call(a);
  vol = call(v);
  sup = call((await login('9000000001')).token);
  amid = await membership(a, (m) => m.role === 'admin' && m.acNo === 66 && m.partyName === 'Jan Vikas Party');
  vmid = await membership(v, (m) => m.role === 'volunteer' && m.acNo === 66);
});
afterAll(async () => {
  await state.end();
  await app.close();
  await closeAll();
});

describe('super-admin upload (T2)', () => {
  it('TC-MT-1 uploads booths × years', async () => {
    const r = await sup.post('/v1/admin/past-results', { stateCode: 'PB', csv: csv(ROWS) });
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b.rows).toBe(6);
    expect(b.years).toEqual([2017, 2022]);
    expect(b.parties).toEqual(['INC', 'JVP', 'Other', 'SAD']);
    expect(b.acs).toEqual([66]);
  });

  it('TC-MT-2 re-upload of a year replaces only that year', async () => {
    const fixed = ROWS.slice(3).map((l) => l.replace(',450,200,80,', ',460,200,70,'));
    expect((await sup.post('/v1/admin/past-results', { stateCode: 'PB', csv: csv(fixed) })).statusCode).toBe(200);
    const r = await state.query(`SELECT year, count(*)::int AS n FROM past_booth_results WHERE ac_no = 66 GROUP BY year ORDER BY year`);
    expect(r.rows).toEqual([{ year: 2017, n: 3 }, { year: 2022, n: 3 }]);
    const v = await state.query(`SELECT votes FROM past_party_votes WHERE ac_no = 66 AND year = 2022 AND part_no = 101 AND party_code = 'JVP'`);
    expect(v.rows[0].votes).toBe(460);
  });

  it('TC-MT-3 bad files are refused with the line and write nothing', async () => {
    const noYear = (await sup.post('/v1/admin/past-results', { stateCode: 'PB', csv: 'AC No.,POLLING STATION-NUMBER,JVP Votes\n66,101,5' }));
    expect(noYear.statusCode).toBe(422);
    const bad = await sup.post('/v1/admin/past-results', { stateCode: 'PB', csv: csv([ROWS[0].replace('2017', '2012'), ROWS[1].replace(',270,', ',abc,').replace('2017', '2012')]) });
    expect(bad.statusCode).toBe(422);
    expect(bad.json().message).toMatch(/line 3/i);
    const r = await state.query(`SELECT count(*)::int AS n FROM past_booth_results WHERE year = 2012`);
    expect(r.rows[0].n).toBe(0);
  });

  it('TC-MT-4 admins and volunteers cannot upload, list or delete', async () => {
    for (const c of [adm, vol]) {
      expect((await c.post('/v1/admin/past-results', { stateCode: 'PB', csv: csv(ROWS) })).statusCode).toBe(403);
      expect((await c.get('/v1/admin/past-results?state=PB')).statusCode).toBe(403);
      expect((await c.del('/v1/admin/past-results?state=PB&ac=66&year=2017')).statusCode).toBe(403);
    }
  });

  it('TC-MT-5 list and delete one year', async () => {
    await sup.post('/v1/admin/past-results', { stateCode: 'PB', csv: csv(ROWS.map((l) => l.replace(/,2017$/, ',2007')).slice(0, 1)) });
    let list = (await sup.get('/v1/admin/past-results?state=PB')).json();
    expect(list.items.some((x: { acNo: number; year: number }) => x.acNo === 66 && x.year === 2007)).toBe(true);
    expect((await sup.del('/v1/admin/past-results?state=PB&ac=66&year=2007')).statusCode).toBe(200);
    list = (await sup.get('/v1/admin/past-results?state=PB')).json();
    expect(list.items.some((x: { year: number }) => x.year === 2007)).toBe(false);
    expect(list.items.find((x: { year: number }) => x.year === 2022).booths).toBe(3);
  });
});

describe('admin trend (T3–T5)', () => {
  it('TC-MT-6 assembly trend defaults to the team party', async () => {
    const r = await adm.get(`/v1/m/${amid}/trend?level=assembly`);
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b.party).toBe('JVP');
    expect(b.years.map((y: { year: number }) => y.year)).toEqual([2017, 2022]);
    const y22 = b.years[1];
    const sum = Object.values(y22.shares as Record<string, number>).reduce((a, x) => a + x, 0);
    expect(Math.abs(sum - 100)).toBeLessThan(0.5);
    expect(y22.ours).toBeCloseTo((930 / 2050) * 100, 0);
    expect(b.swing).toBeCloseTo(y22.ours - b.years[0].ours, 1);
    expect(b.children.length).toBeGreaterThan(0);
  });

  it('TC-MT-7 another party can be picked', async () => {
    const b = (await adm.get(`/v1/m/${amid}/trend?level=assembly&party=INC`)).json();
    expect(b.party).toBe('INC');
    expect(b.years[1].ours).toBeCloseTo((850 / 2050) * 100, 0);
  });

  it('TC-MT-8 booth level gives votes by year and what is needed to win', async () => {
    const b = (await adm.get(`/v1/m/${amid}/trend?level=booth&key=112`)).json();
    expect(b.years.map((y: { year: number }) => y.year)).toEqual([2017, 2022]);
    expect(b.years[0].votes.JVP).toBe(270);
    expect(b.margin).toBe(20);
    expect(b.toWin.needed).toBeGreaterThan(0);
    expect(typeof b.toWin.oursFound).toBe('number');
    expect(b.toWin.toGo).toBe(Math.max(0, b.toWin.needed - b.toWin.oursFound));
  });

  it('TC-MT-8b village level lists the village booths', async () => {
    const b = (await adm.get(`/v1/m/${amid}/trend?level=village&key=Alpha`)).json();
    expect(b.children.map((c: { key: string }) => c.key)).toEqual(['101']);
  });

  it('TC-MT-9 an assembly with no results is empty, not an error', async () => {
    const other = await membership((await login('9000000002')).token, (m) => m.role === 'admin' && m.acNo === 50);
    const r = await adm.get(`/v1/m/${other}/trend?level=assembly`);
    expect(r.statusCode).toBe(200);
    expect(r.json().years).toEqual([]);
    expect(r.json().children).toEqual([]);
  });

  it('TC-MT-10 volunteers cannot read admin analysis', async () => {
    for (const p of ['trend?level=assembly', 'results-map', 'win-plan']) expect((await vol.get(`/v1/m/${vmid}/${p}`)).statusCode).toBe(403);
  });

  it('TC-MT-11 the AC always comes from the membership', async () => {
    const r = await adm.get(`/v1/m/${amid}/trend?level=assembly&ac=67`);
    expect([200, 400]).toContain(r.statusCode);
    if (r.statusCode === 200) expect(r.json().acNo).toBe(66);
  });

  it('TC-MT-12 results map: one row per booth, legend adds up', async () => {
    const b = (await adm.get(`/v1/m/${amid}/results-map`)).json();
    expect(b.year).toBe(2022);
    expect(b.booths).toHaveLength(3);
    const b113 = b.booths.find((x: { partNo: number }) => x.partNo === 113);
    expect(b113.winner).toBe('INC');
    expect(b113.margin).toBe(-200);
    expect(b.legend.won + b.legend.lost).toBe(3);
    expect(b.legend.lostUnder50).toBe(0);
  });
});

describe('volunteer and win plan (T6, W1, G1–G2)', () => {
  it('TC-MT-14 volunteer sees only their booth result', async () => {
    const r = await vol.get(`/v1/m/${vmid}/my-booth-result?booth=112`);
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ year: 2022, partNo: 112, result: 'won', margin: 20 });
    expect((await vol.get(`/v1/m/${vmid}/my-booth-result?booth=101`)).statusCode).toBe(403);
  });

  it('TC-MT-15 win plan groups booths', async () => {
    const b = (await adm.get(`/v1/m/${amid}/win-plan`)).json();
    expect(b.year).toBe(2022);
    expect(b.groups.safe.booths).toEqual([101]);
    expect(b.groups.swing.booths).toEqual([112]);
    expect(b.groups.tough.booths).toEqual([113]);
    expect(b.needed).toBeGreaterThan(0);
    expect(b.toGo).toBe(Math.max(0, b.needed - b.oursFound));
    expect(Array.isArray(b.uncoveredSwing)).toBe(true);
  });

  it('TC-MT-16/17 my progress: today, streak, rank, badges', async () => {
    const r = await vol.get(`/v1/m/${vmid}/my-progress`);
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b.target).toBe(25);
    expect(b.today).toBeGreaterThanOrEqual(0);
    expect(b.streak).toBeGreaterThanOrEqual(0);
    expect(b.rank).toBeGreaterThanOrEqual(1);
    expect(b.teamSize).toBeGreaterThanOrEqual(b.rank);
    expect(b.badges.map((x: { key: string }) => x.key)).toEqual(['met100', 'met500', 'phones50', 'streak5']);
    for (const x of b.badges) expect(typeof x.earned).toBe('boolean');
  });
});

describe('remind quiet volunteers (Q1)', () => {
  it('TC-MT-18 sends once per 12 hours', async () => {
    const team = (await adm.get(`/v1/m/${amid}/team`)).json();
    const ids = (team.approved ?? team.members ?? team).filter((x: { role?: string }) => !x.role || x.role === 'volunteer').slice(0, 2).map((x: { userId: string }) => x.userId);
    expect(ids.length).toBeGreaterThan(0);
    const r = await adm.post(`/v1/m/${amid}/remind`, { userIds: ids, template: 'booth_needs_you' });
    expect(r.statusCode).toBe(200);
    expect(r.json().sent).toBe(ids.length);
    const again = await adm.post(`/v1/m/${amid}/remind`, { userIds: ids, template: 'call_me' });
    expect(again.statusCode).toBe(429);
  });

  it('TC-MT-19 people outside the team are skipped', async () => {
    const r = await adm.post(`/v1/m/${amid}/remind`, { userIds: ['00000000-0000-7000-8000-000000000000'], template: 'days_left' });
    expect(r.statusCode).toBe(200);
    expect(r.json().sent).toBe(0);
  });
});

describe('dashboard yesterday and quiet volunteers (Y1, Q1)', () => {
  it('TC-MT-20 dashboard has yesterday numbers and quiet volunteers', async () => {
    const b = (await adm.get(`/v1/m/${amid}/dashboard`)).json();
    expect(b.yesterday).toEqual(expect.objectContaining({ met: expect.any(Number), ours: expect.any(Number) }));
    expect('bestBooth' in b.yesterday).toBe(true);
    expect(Array.isArray(b.quiet)).toBe(true);
    for (const q of b.quiet) expect(q.days === null || q.days >= 3).toBe(true);
  });
});
