/** TC-BR bilingual roll data and draft → final roll updates (docs/test-cases/bilingual-roll.md). */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeAll, core } from '../src/db/pools.js';
import { processDirty } from '../src/lib/stats.js';
import { app, call, login, membership, start } from './helpers.js';

let supToken: string;
let sup: ReturnType<typeof call>;
let adm: ReturnType<typeof call>;
let vol: ReturnType<typeof call>;
let amid: string;
let vmid: string;
let a66: ReturnType<typeof call>;
let a66mid: string;
let draftJob: string;
let finalJob: string;
let foreignEpic: string;
let applyAt: number;
const AC = 80;

type Row = { part: number; sno: number; epic: string; name: string; nameL: string; rel: string; relL: string; house: string; sec: string; secL: string };
const HEADER = 'part_no,booth_name,booth_name_local,booth_address,booth_address_local,locality,locality_local,sno,epic,name,name_local,relation,relative_name,relative_name_local,gender,age,house_no,section_no,section,section_local';
const line = (r: Row) =>
  [r.part, `Govt. School Testgarh ${r.part}`, `ਸਰਕਾਰੀ ਸਕੂਲ ਟੈਸਟਗੜ੍ਹ ${r.part}`, `"Main Road, Testgarh ${r.part}"`, `"ਮੇਨ ਰੋਡ, ਟੈਸਟਗੜ੍ਹ ${r.part}"`, 'Testgarh', 'ਟੈਸਟਗੜ੍ਹ',
    r.sno, r.epic, r.name, r.nameL, 'S/o', r.rel, r.relL, r.sno % 2 ? 'M' : 'F', 30 + r.sno, r.house, 1, r.sec, r.secL].join(',');
const csv = (rows: Row[]) => [HEADER, ...rows.map(line)].join('\n');
const epic = (n: number) => `TGH${String(1000000 + n)}`;
const mk = (n: number, part: number, sno: number): Row => ({
  part, sno, epic: epic(n), name: `Harjit Singh ${n}`, nameL: `ਹਰਜੀਤ ਸਿੰਘ ${n}`, rel: `Ramesh ${n}`, relL: `ਰਮੇਸ਼ ${n}`, house: String(n), sec: 'Ward 1', secL: 'ਵਾਰਡ 1',
});
// Draft: 20 voters, booth 1 = voters 1..10, booth 2 = voters 11..20
const DRAFT = Array.from({ length: 20 }, (_, i) => mk(i + 1, i < 10 ? 1 : 2, (i % 10) + 1));

function upload(fields: Record<string, string>, content: string, token = supToken) {
  const b = '----elvote' + Math.random().toString(16).slice(2);
  const parts = Object.entries(fields).map(([k, v]) => `--${b}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`);
  parts.push(`--${b}\r\nContent-Disposition: form-data; name="file"; filename="roll.csv"\r\nContent-Type: text/csv\r\n\r\n${content}\r\n--${b}--\r\n`);
  return app.inject({ method: 'POST', url: '/v1/admin/imports', payload: Buffer.from(parts.join(''), 'utf8'), headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/form-data; boundary=${b}` } });
}
type V = { id: string; epic: string; booth: number; sno: number; name: string; nameLocal?: string; relativeLocal?: string; villageLocal?: string; group?: string; votedAt?: string; isNew?: boolean };
const votersOf = async (who: ReturnType<typeof call>, mid: string, booth: number): Promise<V[]> => (await who.get(`/v1/m/${mid}/voters?booth=${booth}`)).json().voters ?? [];
const byEpic = async (n: number) => {
  for (const b of [1, 2, 3]) {
    const v = (await votersOf(adm, amid, b)).find((x) => x.epic === epic(n));
    if (v) return v;
  }
  return undefined;
};

beforeAll(async () => {
  await start();
  supToken = (await login('9000000001')).token;
  sup = call(supToken);
  const t66 = (await login('9000000002')).token;
  a66 = call(t66);
  a66mid = await membership(t66, (m) => m.role === 'admin' && m.acNo === 66);
});
afterAll(async () => {
  await app.close();
  await closeAll();
});

describe('BR bilingual roll and updates', () => {
  it('TC-BR-U1-1 a draft with regional columns stores both languages', async () => {
    const r = await upload({ stateCode: 'PB', acNo: String(AC), acName: 'Testgarh', acNameLocal: 'ਟੈਸਟਗੜ੍ਹ', rollKind: 'draft' }, csv(DRAFT));
    expect(r.statusCode).toBe(200);
    draftJob = r.json().jobId;
    const job = (await sup.get(`/v1/admin/imports/${draftJob}?state=PB`)).json();
    expect(job).toMatchObject({ status: 'ready', rows_ok: 20 });
    expect(job.summary).toMatchObject({ new: 20, changed: 0, moved: 0, notInRoll: 0, held: 0 });
    expect((await sup.post(`/v1/admin/imports/${draftJob}/confirm?state=PB`)).statusCode).toBe(200);

    // A customer for this AC: JVP, admin 9000000081, volunteer 9000000082 on booth 1
    const jvp = (await sup.get('/v1/admin/parties')).json().find((p: { name: string }) => p.name === 'Jan Vikas Party');
    const pa = await sup.post('/v1/admin/party-acs', { partyId: jvp.id, stateCode: 'PB', acNo: AC, maxZones: 2 });
    expect(pa.statusCode).toBe(200);
    expect((await sup.post('/v1/admin/admins', { mobile: '9000000081', name: 'Testgarh Admin', partyAcId: pa.json().id })).statusCode).toBe(200);
    const at = (await login('9000000081')).token;
    adm = call(at);
    amid = await membership(at, (m) => m.acNo === AC);
    const vt = (await login('9000000082')).token;
    const uid = (await call(vt).get('/v1/me')).json().user.id;
    await core.query(`UPDATE users SET name = 'Gurpreet Volunteer' WHERE id = $1`, [uid]);
    const ms = await core.query<{ id: string }>(`INSERT INTO memberships (user_id, party_constituency_id, role, status) VALUES ($1,$2,'volunteer','approved') RETURNING id`, [uid, pa.json().id]);
    await core.query(`INSERT INTO membership_booths (membership_id, part_no) VALUES ($1, 1)`, [ms.rows[0].id]);
    vol = call(vt);
    vmid = ms.rows[0].id;

    const v = (await votersOf(adm, amid, 1)).find((x) => x.epic === epic(3))!;
    expect(v).toMatchObject({ name: 'Harjit Singh 3', nameLocal: 'ਹਰਜੀਤ ਸਿੰਘ 3', relativeLocal: 'ਰਮੇਸ਼ 3', villageLocal: 'ਵਾਰਡ 1', isNew: false });
    const booths = (await adm.get(`/v1/m/${amid}/booths`)).json();
    expect(booths[0]).toMatchObject({ no: 1, nameLocal: 'ਸਰਕਾਰੀ ਸਕੂਲ ਟੈਸਟਗੜ੍ਹ 1', address: 'Main Road, Testgarh 1', addressLocal: 'ਮੇਨ ਰੋਡ, ਟੈਸਟਗੜ੍ਹ 1', villageLocal: 'ਟੈਸਟਗੜ੍ਹ' });
    const acs = (await sup.get('/v1/admin/acs?state=PB')).json();
    expect(acs.find((a: { acNo: number }) => a.acNo === AC)).toMatchObject({ name: 'Testgarh', nameLocal: 'ਟੈਸਟਗੜ੍ਹ', regionalLang: 'pa' });
  });

  it('TC-BR-L1-1 data language per assembly (super-admin only)', async () => {
    const me = async () => (await adm.get('/v1/me')).json().memberships.find((m: { id: string }) => m.id === amid);
    expect((await me()).dataLang).toBe('pa');
    expect((await sup.patch(`/v1/admin/acs/PB/${AC}`, { regionalLang: 'hi' })).statusCode).toBe(200);
    expect((await me()).dataLang).toBe('hi');
    expect((await sup.patch(`/v1/admin/acs/PB/${AC}`, { regionalLang: 'xx' })).statusCode).toBe(422);
    expect((await adm.patch(`/v1/admin/acs/PB/${AC}`, { regionalLang: 'pa' })).statusCode).toBe(403);
    expect((await sup.patch(`/v1/admin/acs/PB/${AC}`, { regionalLang: 'pa' })).statusCode).toBe(200);
    const hr = (await sup.get('/v1/admin/acs?state=HR')).json();
    expect(hr[0].regionalLang).toBe('hi');
  });

  it('volunteer works on the draft (voter 3: our + voted; voter 4: our)', async () => {
    const v3 = await byEpic(3);
    const v4 = await byEpic(4);
    const r = await vol.post(`/v1/m/${vmid}/changes/batch`, { ops: [
      { opId: randomUUID(), voterId: v3!.id, clientAt: new Date().toISOString(), patch: { group: 'our', votedAt: new Date().toISOString() } },
      { opId: randomUUID(), voterId: v4!.id, clientAt: new Date().toISOString(), patch: { group: 'our' } },
    ] });
    expect(r.json().results.map((x: { status: string }) => x.status)).toEqual(['ok', 'ok']);
  });

  it('TC-BR-U3-1 final roll: preview counts, nothing applied yet', async () => {
    // A visible EPIC from AC 66 (seed) to test the state-wide check
    foreignEpic = (await votersOf(a66, a66mid, 101))[0].epic;
    const fin: Row[] = DRAFT.filter((r) => ![9, 10].includes(Number(r.epic.slice(3)) - 1000000)) // 9, 10 not in roll
      .map((r) => ({ ...r }));
    const f = (n: number) => fin.find((r) => r.epic === epic(n))!;
    f(3).part = 2; f(3).sno = 11; // moved booth
    f(4).part = 2; f(4).sno = 12; // moved booth
    f(5).sno = 15; f(6).house = '6A'; f(7).nameL = 'ਹਰਜੀਤ ਸਿੰਘ ਸੰਧੂ 7'; // changed details
    fin.push(mk(21, 1, 21), mk(22, 2, 22)); // new
    fin.push({ ...mk(23, 1, 23), epic: foreignEpic }); // held
    const r = await upload({ stateCode: 'PB', acNo: String(AC), rollKind: 'final', publishedOn: '2026-11-25' }, csv(fin));
    finalJob = r.json().jobId;
    const job = (await sup.get(`/v1/admin/imports/${finalJob}?state=PB`)).json();
    expect(job.status).toBe('ready');
    expect(job.summary).toMatchObject({ unchanged: 13, changed: 3, moved: 2, new: 2, notInRoll: 2, held: 1, back: 0 });
    expect(job.lists.moved.map((x: { epic: string; from: number; to: number }) => `${x.epic}:${x.from}>${x.to}`).sort()).toEqual([`${epic(3)}:1>2`, `${epic(4)}:1>2`]);
    expect(job.lists.notInRoll.map((x: { epic: string }) => x.epic).sort()).toEqual([epic(10), epic(9)].sort());
    expect(job.lists.held[0]).toMatchObject({ epic: foreignEpic, otherAc: 66 });
    expect((await byEpic(3))!.booth).toBe(1); // not applied yet
  });

  it('TC-BR-U2-1 held rows must be decided before Apply', async () => {
    const r = await sup.post(`/v1/admin/imports/${finalJob}/confirm?state=PB`);
    expect(r.statusCode).toBe(422);
    expect(r.json().error).toBe('held_undecided');
  });

  it('TC-BR-U3-2 cancel leaves everything as it was', async () => {
    const r = await upload({ stateCode: 'PB', acNo: String(AC), rollKind: 'final' }, csv(DRAFT.slice(0, 5)));
    const id = r.json().jobId;
    expect((await sup.post(`/v1/admin/imports/${id}/cancel?state=PB`)).statusCode).toBe(200);
    expect((await sup.get(`/v1/admin/imports/${id}?state=PB`)).json().status).toBe('cancelled');
    expect((await sup.post(`/v1/admin/imports/${id}/confirm?state=PB`)).statusCode).toBe(422);
    expect((await votersOf(adm, amid, 1)).length).toBe(10);
  });

  it('TC-BR-U7-2 reject the held row, then Apply', async () => {
    const job = (await sup.get(`/v1/admin/imports/${finalJob}?state=PB`)).json();
    const d = await sup.post(`/v1/admin/imports/${finalJob}/held?state=PB`, { decisions: [{ rowNo: job.lists.held[0].rowNo, decision: 'reject' }] });
    expect(d.statusCode).toBe(200);
    applyAt = Date.now();
    expect((await sup.post(`/v1/admin/imports/${finalJob}/confirm?state=PB`)).statusCode).toBe(200);
    expect((await sup.get(`/v1/admin/imports/${finalJob}?state=PB`)).json().status).toBe('done');
    while (await processDirty(500));
    const still66 = (await votersOf(a66, a66mid, 101)).some((v) => v.epic === foreignEpic);
    expect(still66).toBe(true);
  });

  it('TC-BR-U4-1 a moved voter keeps the party work at the new booth; trace shows the old booth', async () => {
    const v3 = await byEpic(3);
    expect(v3).toMatchObject({ booth: 2, sno: 11, group: 'our' });
    expect(v3!.votedAt).toBeTruthy();
    const trace = (await adm.get(`/v1/m/${amid}/trace?epic=${epic(3)}`)).json();
    expect(trace.events.some((e: { by: string; booth: number }) => e.by === 'Gurpreet Volunteer' && e.booth === 1)).toBe(true);
    const dash = (await adm.get(`/v1/m/${amid}/dashboard?booth=2`)).json();
    expect(dash.totals.our).toBe(2);
    expect(dash.totals.voted).toBe(1);
  });

  it('TC-BR-U4-2 the moved voter is in the new booth only', async () => {
    const vol1 = await votersOf(vol, vmid, 1);
    expect(vol1.some((v) => v.epic === epic(3))).toBe(false);
    expect((await votersOf(adm, amid, 2)).some((v) => v.epic === epic(3))).toBe(true);
  });

  it('TC-BR-U5-1 new voters are tagged; the others are not', async () => {
    expect((await byEpic(21))?.isNew).toBe(true);
    expect((await byEpic(1))?.isNew).toBe(false);
    expect((await byEpic(7))?.nameLocal).toBe('ਹਰਜੀਤ ਸਿੰਘ ਸੰਧੂ 7');
  });

  it('TC-BR-U6-1 voters not in the final roll are hidden but kept', async () => {
    expect(await byEpic(9)).toBeUndefined();
    const roll = (await adm.get(`/v1/m/${amid}/roll`)).json();
    expect(roll.notInRollList.map((x: { epic: string }) => x.epic).sort()).toEqual([epic(10), epic(9)].sort());
    expect((await adm.get(`/v1/m/${amid}/trace?epic=${epic(9)}`)).statusCode).toBe(200);
    const dash = (await adm.get(`/v1/m/${amid}/dashboard?booth=1`)).json();
    expect(dash.totals.total).toBe(7); // 10 − 2 moved − 2 not in roll + 1 new
  });

  it('TC-BR-U9-1 roll version for the admin', async () => {
    const roll = (await adm.get(`/v1/m/${amid}/roll`)).json();
    expect(roll).toMatchObject({ kind: 'final', publishedOn: '2026-11-25', notInRoll: 2, newCount: 2 });
  });

  it('TC-BR-U8-1 offline changes made before the move are accepted; later ones are not', async () => {
    const v4 = await byEpic(4);
    const ops = [
      { opId: randomUUID(), voterId: v4!.id, clientAt: new Date(applyAt - 60_000).toISOString(), patch: { needsHelp: true } },
      { opId: randomUUID(), voterId: v4!.id, clientAt: new Date(Date.now() + 1000).toISOString(), patch: { needsHelp: false } },
    ];
    const r = (await vol.post(`/v1/m/${vmid}/changes/batch`, { ops })).json().results;
    expect(r.map((x: { status: string; code?: string }) => x.code ?? x.status)).toEqual(['ok', 'booth_forbidden']);
  });

  it('TC-BR-U8-2 a change for a voter no longer in the roll is kept', async () => {
    const trace = (await adm.get(`/v1/m/${amid}/trace?epic=${epic(9)}`)).json();
    const r = (await vol.post(`/v1/m/${vmid}/changes/batch`, { ops: [{ opId: randomUUID(), voterId: trace.voter.id, clientAt: new Date(applyAt - 30_000).toISOString(), patch: { group: 'target' } }] })).json().results;
    expect(r[0].status).toBe('ok');
    expect(await byEpic(9)).toBeUndefined();
  });

  it('TC-BR-U6-2 a later roll that includes a hidden voter brings them back', async () => {
    const roll = [...DRAFT.filter((r) => ![9, 10].includes(Number(r.epic.slice(3)) - 1000000)), mk(9, 1, 9), mk(21, 1, 21), mk(22, 2, 22)];
    const f = (n: number) => roll.find((r) => r.epic === epic(n))!;
    f(3).part = 2; f(3).sno = 11; f(4).part = 2; f(4).sno = 12;
    const r = await upload({ stateCode: 'PB', acNo: String(AC), rollKind: 'supplement' }, csv(roll));
    const job = (await sup.get(`/v1/admin/imports/${r.json().jobId}?state=PB`)).json();
    expect(job.summary.back).toBe(1);
    expect(job.summary.notInRoll).toBe(0); // 10 is already hidden
    await sup.post(`/v1/admin/imports/${r.json().jobId}/confirm?state=PB`);
    const v9 = await byEpic(9);
    expect(v9?.group).toBe('target');
    expect((await byEpic(21))?.isNew).toBe(false);
  });

  it('TC-BR-U7-1 move a voter from another assembly', async () => {
    const roll = [...DRAFT.filter((r) => ![9, 10].includes(Number(r.epic.slice(3)) - 1000000)), mk(9, 1, 9), mk(21, 1, 21), mk(22, 2, 22), { ...mk(24, 2, 24), epic: foreignEpic }];
    const f = (n: number) => roll.find((r) => r.epic === epic(n))!;
    f(3).part = 2; f(3).sno = 11; f(4).part = 2; f(4).sno = 12;
    const r = await upload({ stateCode: 'PB', acNo: String(AC), rollKind: 'supplement' }, csv(roll));
    const id = r.json().jobId;
    expect((await sup.post(`/v1/admin/imports/${id}/held?state=PB`, { all: 'move' })).statusCode).toBe(200);
    expect((await sup.post(`/v1/admin/imports/${id}/confirm?state=PB`)).statusCode).toBe(200);
    expect((await votersOf(a66, a66mid, 101)).some((v) => v.epic === foreignEpic)).toBe(false);
    expect((await votersOf(adm, amid, 2)).some((v) => v.epic === foreignEpic)).toBe(true);
    expect((await a66.get(`/v1/m/${a66mid}/trace?epic=${foreignEpic}`)).statusCode).toBe(200);
  });

  it('TC-BR-SEC-1 only the super-admin uploads, decides and sets the language', async () => {
    const at = (await login('9000000081')).token;
    expect((await upload({ stateCode: 'PB', acNo: String(AC) }, csv(DRAFT), at)).statusCode).toBe(403);
    expect((await adm.post(`/v1/admin/imports/${finalJob}/held?state=PB`, { all: 'move' })).statusCode).toBe(403);
    expect((await vol.get(`/v1/m/${vmid}/roll`)).statusCode).toBe(403);
  });
});
