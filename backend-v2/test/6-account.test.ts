/** TC-AD account deletion (docs/test-cases/account-deletion.md). Runs last: it erases test users. */
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { superUrl } from '../src/config.js';
import { closeAll } from '../src/db/pools.js';
import { eraseDueAccounts } from '../src/lib/account.js';
import { app, call, login, membership, start } from './helpers.js';

let core: pg.Client;
let pb: pg.Client;
let adm: ReturnType<typeof call>;
let amid: string;
const VOL = '9876522221';

beforeAll(async () => {
  await start();
  core = new pg.Client({ connectionString: superUrl('t_elvote_core') });
  pb = new pg.Client({ connectionString: superUrl('t_elvote_pb') });
  await core.connect();
  await pb.connect();
  const a = (await login('9000000002')).token;
  adm = call(a);
  amid = await membership(a, (m) => m.role === 'admin' && m.acNo === 66);
});
afterAll(async () => {
  await core.end();
  await pb.end();
  await app.close();
  await closeAll();
});

/** A fresh volunteer in AC 66 booth 101, approved, with one saved voter change. */
async function newVolunteer(mobile: string) {
  const { code } = (await adm.post(`/v1/m/${amid}/join-code`)).json();
  let s = await login(mobile);
  let api = call(s.token);
  expect((await api.post('/v1/join', { code, name: 'Delete Me', booths: [101] })).statusCode).toBe(200);
  const mid = await membership(s.token, () => true);
  expect((await adm.post(`/v1/m/${amid}/team/${mid}/approve`, { booths: [101] })).statusCode).toBe(200);
  s = await login(mobile);
  api = call(s.token);
  const { voters } = (await api.get(`/v1/m/${mid}/voters?booth=101`)).json();
  const ch = await api.post(`/v1/m/${mid}/voters/${voters[0].id}/changes`, { opId: randomUUID(), clientAt: new Date().toISOString(), patch: { group: 'our' } });
  expect(ch.statusCode).toBe(200);
  const uid = (await api.get('/v1/me')).json().user.id as string;
  return { ...s, api, mid, uid };
}

describe('AD account deletion', () => {
  let v: Awaited<ReturnType<typeof newVolunteer>>;
  beforeAll(async () => {
    v = await newVolunteer(VOL);
  });

  it('TC-AD1-1 sends a code to the account mobile', async () => {
    const r = await v.api.post('/v1/me/delete/code');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ sent: true, devCode: '123456' });
  });

  it('TC-AD2-1 needs the exact word DELETE', async () => {
    const r = await v.api.post('/v1/me/delete', { confirm: 'delete', code: '123456' });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toBe('confirm_required');
  });

  it('TC-AD2-2 wrong code → 422 otp_invalid (not 401, which would sign the app out), account unchanged', async () => {
    const r = await v.api.post('/v1/me/delete', { confirm: 'DELETE', code: '000000' });
    expect(r.statusCode).toBe(422);
    expect(r.json().error).toBe('otp_invalid');
    const u = (await core.query('SELECT deletion_requested_at FROM users WHERE id = $1', [v.uid])).rows[0];
    expect(u.deletion_requested_at).toBeNull();
  });

  it('TC-AD2-3 the only admin of an AC is blocked (409 last_admin)', async () => {
    const r = await adm.post('/v1/me/delete', { confirm: 'DELETE', code: '123456' });
    expect(r.statusCode).toBe(409);
    expect(r.json().error).toBe('last_admin');
    expect(r.json().details.acs.map((a: { acNo: number }) => a.acNo)).toContain(66);
    const u = (await core.query(`SELECT deletion_requested_at FROM users WHERE mobile = '9000000002'`)).rows[0];
    expect(u.deletion_requested_at).toBeNull();
  });

  it('TC-AD2-4 volunteer request: due in 7 days, signed out everywhere', async () => {
    const r = await v.api.post('/v1/me/delete', { confirm: 'DELETE', code: '123456' });
    expect(r.statusCode).toBe(200);
    const days = (new Date(r.json().dueAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
    const rf = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: v.refreshToken } });
    expect(rf.statusCode).toBe(401);
  });

  it('TC-AD3-1 signing in again cancels the deletion', async () => {
    const r = await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { mobile: VOL, code: '123456' } });
    expect(r.statusCode).toBe(200);
    expect(r.json().deletionCancelled).toBe(true);
    const u = (await core.query('SELECT deletion_requested_at, deletion_due_at FROM users WHERE id = $1', [v.uid])).rows[0];
    expect(u).toEqual({ deletion_requested_at: null, deletion_due_at: null });
    const again = await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { mobile: VOL, code: '123456' } });
    expect(again.json().deletionCancelled).toBeUndefined();
  });

  it('TC-AD4-1 after 7 days the person is erased and the work is kept', async () => {
    const s = await login(VOL);
    expect((await call(s.token).post('/v1/me/delete', { confirm: 'DELETE', code: '123456' })).statusCode).toBe(200);
    const events = async () => (await pb.query('SELECT count(*)::int AS n FROM contact_events WHERE user_id = $1', [v.uid])).rows[0].n;
    const before = await events();
    expect(before).toBeGreaterThan(0);
    await core.query(`UPDATE users SET deletion_due_at = now() - interval '1 minute' WHERE id = $1`, [v.uid]);
    expect(await eraseDueAccounts()).toBeGreaterThanOrEqual(1);
    const u = (await core.query('SELECT mobile, name, epic, firebase_uid, status, deleted_at FROM users WHERE id = $1', [v.uid])).rows[0];
    expect(u).toMatchObject({ mobile: null, name: '', epic: null, firebase_uid: null, status: 'deleted' });
    expect(u.deleted_at).not.toBeNull();
    const ms = (await core.query('SELECT status FROM memberships WHERE user_id = $1', [v.uid])).rows;
    expect(ms.every((m) => m.status === 'removed')).toBe(true);
    expect((await core.query('SELECT count(*)::int AS n FROM membership_booths mb JOIN memberships m ON m.id = mb.membership_id WHERE m.user_id = $1', [v.uid])).rows[0].n).toBe(0);
    expect((await core.query('SELECT count(*)::int AS n FROM sessions WHERE user_id = $1', [v.uid])).rows[0].n).toBe(0);
    expect(await events()).toBe(before);
    expect((await core.query(`SELECT 1 FROM audit_log WHERE action = 'account.erased' AND entity_id = $1`, [v.uid])).rowCount).toBe(1);
    // Team lists no longer show them.
    const team = (await adm.get(`/v1/m/${amid}/team?status=approved&q=Delete`)).json();
    expect(team.find((x: { membershipId: string }) => x.membershipId === v.mid)).toBeUndefined();
  });

  it('TC-AD4-2 the same mobile can sign up again as a new, empty account', async () => {
    const s = await login(VOL);
    const me = (await call(s.token).get('/v1/me')).json();
    expect(me.user.id).not.toBe(v.uid);
    expect(me.memberships).toEqual([]);
  });

  it('TC-AD2-5 an admin whose AC has a second admin is not blocked', async () => {
    const sup = call((await login('9000000001')).token);
    const pac = (await core.query(`SELECT pc.id FROM party_constituencies pc JOIN parties p ON p.id = pc.party_id WHERE p.name = 'Jan Vikas Party' AND pc.ac_no = 66`)).rows[0].id;
    expect((await sup.post('/v1/admin/admins', { mobile: '9876522299', name: 'Second Admin', partyAcId: pac })).statusCode).toBe(200);
    const sole = await adm.post('/v1/me/delete', { confirm: 'DELETE', code: '123456' });
    expect(sole.json().details?.acs?.map((a: { acNo: number }) => a.acNo) ?? []).not.toContain(66);
    const second = call((await login('9876522299')).token);
    const r = await second.post('/v1/me/delete', { confirm: 'DELETE', code: '123456' });
    expect(r.statusCode).toBe(200);
  });
});
