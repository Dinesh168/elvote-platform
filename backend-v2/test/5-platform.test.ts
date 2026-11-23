/** TC-B11 super-admin. */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { superUrl } from '../src/config.js';
import { closeAll } from '../src/db/pools.js';
import { processDirty } from '../src/lib/stats.js';
import { app, call, login, start } from './helpers.js';

let sup: ReturnType<typeof call>;
let supToken: string;
beforeAll(async () => {
  await start();
  supToken = (await login('9000000001')).token;
  sup = call(supToken);
});
afterAll(async () => {
  await app.close();
  await closeAll();
});

function upload(fields: Record<string, string>, fileName: string, content: string) {
  const b = '----elvote' + Math.random().toString(16).slice(2);
  const parts = Object.entries(fields).map(([k, v]) => `--${b}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`);
  parts.push(`--${b}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: text/csv\r\n\r\n${content}\r\n--${b}--\r\n`);
  return app.inject({ method: 'POST', url: '/v1/admin/imports', payload: parts.join(''), headers: { authorization: `Bearer ${supToken}`, 'content-type': `multipart/form-data; boundary=${b}` } });
}

const HEADER = 'part_no,booth_name,locality,sno,epic,name,relation,relative_name,gender,age,house_no,section_no,section,mobile';
function csv(n: number, bad = 0) {
  const rows = [HEADER];
  for (let i = 1; i <= n; i++) rows.push(`${1 + Math.floor((i - 1) / 50)},Govt. School Testpur,Testpur,${i},TST${String(9000000 + i)},Voter ${i},S/o,Father ${i},${i % 2 ? 'M' : 'F'},${20 + (i % 50)},${Math.ceil(i / 3)},1,Testpur,`);
  for (let k = 0; k < bad; k++) rows.push(`1,Govt. School Testpur,Testpur,${n + k + 1},BAD,${k ? 'Ok Name' : ''},S/o,X,M,17,1,1,Testpur,`);
  return rows.join('\n');
}

describe('B11 super-admin', () => {
  it('TC-B11-1 an admin cannot use super-admin routes', async () => {
    const a = call((await login('9000000002')).token);
    expect((await a.get('/v1/admin/parties')).statusCode).toBe(403);
    expect((await a.get('/v1/admin/overview')).statusCode).toBe(403);
  });

  it('overview: totals per state and per party AC', async () => {
    const o = (await sup.get('/v1/admin/overview')).json();
    expect(o.states.map((s: { code: string }) => s.code).sort()).toEqual(['HR', 'PB', 'UP']);
    const pb = o.states.find((s: { code: string }) => s.code === 'PB');
    expect(pb.acs).toBe(2);
    expect(pb.booths).toBe(45);
    expect(o.partyAcs).toHaveLength(4);
    expect(o.partyAcs.every((p: { voters: number }) => p.voters > 0)).toBe(true);
  });

  it('TC-B11-2 add another super-admin, remove them; the last one cannot be removed', async () => {
    const add = await sup.post('/v1/admin/super-admins', { mobile: '9000000099', name: 'Second Owner' });
    expect(add.statusCode).toBe(200);
    const two = (await sup.get('/v1/admin/super-admins')).json();
    expect(two).toHaveLength(2);
    const second = call((await login('9000000099')).token);
    expect((await second.get('/v1/admin/parties')).statusCode).toBe(200);
    expect((await sup.del(`/v1/admin/super-admins/${add.json().userId}`)).statusCode).toBe(200);
    const me = (await sup.get('/v1/me')).json();
    expect((await sup.del(`/v1/admin/super-admins/${me.user.id}`)).statusCode).toBe(422);
  });

  it('create a party, give it an AC, add its admin', async () => {
    const p = await sup.post('/v1/admin/parties', { name: 'Test Party', shortName: 'TP' });
    expect(p.statusCode).toBe(200);
    const pa = await sup.post('/v1/admin/party-acs', { partyId: p.json().id, stateCode: 'HR', acNo: 12, maxZones: 6 });
    expect(pa.statusCode).toBe(200);
    expect((await sup.post('/v1/admin/party-acs', { partyId: p.json().id, stateCode: 'HR', acNo: 12 })).statusCode).toBe(422);
    expect((await sup.post('/v1/admin/party-acs', { partyId: p.json().id, stateCode: 'HR', acNo: 99 })).json().error).toBe('ac_unknown');
    const ad = await sup.post('/v1/admin/admins', { mobile: '9000000077', name: 'Test Admin', partyAcId: pa.json().id });
    expect(ad.statusCode).toBe(200);
    const t = (await login('9000000077')).token;
    const me = (await call(t).get('/v1/me')).json();
    expect(me.memberships[0]).toMatchObject({ role: 'admin', acNo: 12, stateCode: 'HR', zoneCount: 6, maxZones: 6 });
    while (await processDirty(500));
    const d = (await call(t).get(`/v1/m/${me.memberships[0].id}/dashboard`)).json();
    expect(d.totals.total).toBeGreaterThan(9000);
    expect(d.totals.met).toBe(0);
  });

  it('TC-B11-3 upload a CSV roll for a new AC, confirm, voters and counters exist', async () => {
    const r = await upload({ stateCode: 'PB', acNo: '77', acName: 'Testpur' }, 'roll.csv', csv(120));
    expect(r.statusCode).toBe(200);
    const job = (await sup.get(`/v1/admin/imports/${r.json().jobId}?state=PB`)).json();
    expect(job).toMatchObject({ status: 'ready', rows_ok: 120, rows_failed: 0 });
    expect((await sup.post(`/v1/admin/imports/${r.json().jobId}/confirm?state=PB`)).statusCode).toBe(200);
    expect((await sup.get(`/v1/admin/imports/${r.json().jobId}?state=PB`)).json().status).toBe('done');
    const acs = (await sup.get('/v1/admin/acs?state=PB')).json();
    expect(acs.find((a: { acNo: number }) => a.acNo === 77)).toMatchObject({ name: 'Testpur', booths: 3, voters: 120 });
    // re-upload the same roll: updates, no duplicates
    const r2 = await upload({ stateCode: 'PB', acNo: '77' }, 'roll.csv', csv(120));
    await sup.post(`/v1/admin/imports/${r2.json().jobId}/confirm?state=PB`);
    expect((await sup.get('/v1/admin/acs?state=PB')).json().find((a: { acNo: number }) => a.acNo === 77).voters).toBe(120);
  });

  it('TC-B11-4 rows with errors are reported with row numbers', async () => {
    const r = await upload({ stateCode: 'PB', acNo: '78', acName: 'Errpur' }, 'roll.csv', csv(10, 2));
    const job = (await sup.get(`/v1/admin/imports/${r.json().jobId}?state=PB`)).json();
    expect(job.rows_ok).toBe(10);
    expect(job.rows_failed).toBe(2);
    expect(job.errors.map((e: { row: number }) => e.row)).toEqual([12, 13]);
    const missing = await upload({ stateCode: 'PB', acNo: '79' }, 'roll.csv', 'a,b,c\n1,2,3');
    expect((await sup.get(`/v1/admin/imports/${missing.json().jobId}?state=PB`)).json()).toMatchObject({ status: 'failed' });
  });

  it('TC-B11-5 clear with a wrong AC number or pass key → 422', async () => {
    const o = (await sup.get('/v1/admin/overview')).json();
    const pa = o.partyAcs.find((p: { partyName: string; acNo: number }) => p.partyName === 'Jan Vikas Party' && p.acNo === 66);
    expect((await sup.post(`/v1/admin/party-acs/${pa.id}/clear`, { passKey: 'local-clear-key', confirmAcNo: 65 })).json().error).toBe('confirm_mismatch');
    expect((await sup.post(`/v1/admin/party-acs/${pa.id}/clear`, { passKey: 'wrong-key', confirmAcNo: 66 })).json().error).toBe('passkey_wrong');
  });

  it('TC-B11-6 clear removes only that party’s data in that AC; roll and other party intact', async () => {
    const db = new pg.Client({ connectionString: superUrl('t_elvote_pb') });
    await db.connect();
    const q = async () => (await db.query(`SELECT p.party_id, count(*)::int AS n FROM voter_contacts p WHERE ac_no = 66 GROUP BY 1 ORDER BY 1`)).rows;
    const voters = async () => (await db.query('SELECT count(*)::int AS n FROM voters WHERE ac_no = 66')).rows[0].n;
    const before = await q();
    const v0 = await voters();
    const o = (await sup.get('/v1/admin/overview')).json();
    const pa = o.partyAcs.find((p: { partyName: string; acNo: number }) => p.partyName === 'Jan Vikas Party' && p.acNo === 66);
    const r = await sup.post(`/v1/admin/party-acs/${pa.id}/clear`, { passKey: 'local-clear-key', confirmAcNo: 66 });
    expect(r.statusCode).toBe(200);
    const after = await q();
    expect(after).toHaveLength(1);
    expect(after[0].party_id).not.toBe(pa.partyId);
    expect(after[0].n).toBe(before.find((b: { party_id: string }) => b.party_id !== pa.partyId)!.n);
    expect(await voters()).toBe(v0);
    // Party 1 AC 50 untouched
    expect((await db.query(`SELECT count(*)::int AS n FROM voter_contacts WHERE party_id = $1 AND ac_no = 50`, [pa.partyId])).rows[0].n).toBeGreaterThan(0);
    await db.end();
  });
});
