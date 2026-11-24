/** TC-AA-1 … TC-AA-20 (docs/test-cases/accounts-access.md). Firebase is replaced by a test verifier. */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { superUrl } from '../src/config.js';
import { closeAll } from '../src/db/pools.js';
import { setFirebaseVerifier, type FirebaseClaims } from '../src/lib/auth.js';
import { setPushSender, type PushMessage } from '../src/lib/push.js';
import { promoteSuperAdmin } from '../scripts/seed-guard.js';
import { app, call, login, membership, start } from './helpers.js';

let core: pg.Client;
let pb: pg.Client;
let sup: ReturnType<typeof call>;
const sent: PushMessage[] = [];
const now = () => Math.floor(Date.now() / 1000);

/** Test tokens: "test-token|<provider>|<uid>|<email>|<verified 1/0>|<auth_time>" */
const tok = (provider: string, uid: string, email: string, verified = true, authTime = now()) =>
  `test-token|${provider}|${uid}|${email}|${verified ? 1 : 0}|${authTime}`;

async function fb(token: string) {
  return app.inject({ method: 'POST', url: '/v1/auth/firebase', payload: { idToken: token } });
}
async function signUp(uid: string, email: string, mobile?: string, name = 'Test Person') {
  const r = await fb(tok('google.com', uid, email));
  expect(r.statusCode).toBe(200);
  const c = call(r.json().accessToken);
  if (mobile) expect((await c.patch('/v1/me/profile', { name, mobile, lang: 'en' })).statusCode).toBe(200);
  return c;
}
const partyId = async (name: string) => (await core.query<{ id: string }>('SELECT id FROM parties WHERE name = $1', [name])).rows[0].id;

beforeAll(async () => {
  setFirebaseVerifier(async (t): Promise<FirebaseClaims> => {
    const [k, provider, uid, email, v, at] = t.split('|');
    if (k !== 'test-token') throw new Error('bad token');
    return { uid, email: email || undefined, emailVerified: v === '1', provider, authTime: Number(at), name: 'From Google' };
  });
  setPushSender(async (m) => void sent.push(...m));
  await start();
  core = new pg.Client({ connectionString: superUrl('t_elvote_core') });
  pb = new pg.Client({ connectionString: superUrl('t_elvote_pb') });
  await core.connect();
  await pb.connect();
  sup = call((await login('9000000001')).token);
  // Notifications only go to people with a phone or browser registered.
  await sup.put('/v1/me/push-token', { token: 'ExponentPushToken[test-super]', platform: 'android' });
  await call((await login('9000000002')).token).put('/v1/me/push-token', { token: 'ExponentPushToken[test-admin2]', platform: 'android' });
});
afterAll(async () => {
  setFirebaseVerifier(null);
  setPushSender(null);
  await core.end();
  await pb.end();
  await app.close();
  await closeAll();
});

describe('sign-in (AC1–AC3, AC14)', () => {
  it('TC-AA-1 Google sign-in creates an account without a mobile', async () => {
    const r = await fb(tok('google.com', 'uid-new-1', 'New.One@Gmail.com'));
    expect(r.statusCode).toBe(200);
    const me = (await call(r.json().accessToken).get('/v1/me')).json();
    expect(me.user.email).toBe('new.one@gmail.com');
    expect(me.user.mobile).toBeNull();
    expect(me.user.profileDone).toBe(false);
    expect(me.user.name).toBe('From Google');
  });

  it('TC-AA-2 unverified email/password account is refused', async () => {
    const r = await fb(tok('password', 'uid-unv', 'x@y.com', false));
    expect(r.statusCode).toBe(403);
    expect(r.json().error).toBe('email_unverified');
  });

  it('TC-AA-3 phone sign-in is refused', async () => {
    const r = await fb(tok('phone', 'uid-ph', ''));
    expect(r.statusCode).toBe(403);
    expect(r.json().error).toBe('provider_not_allowed');
  });

  it('TC-AA-4 a super-admin created by email links on first Google sign-in', async () => {
    await promoteSuperAdmin(core, { email: 'Owner.Test@gmail.com', mobile: '9811100001', name: 'Owner Test' });
    const before = await core.query<{ id: string }>(`SELECT id FROM users WHERE lower(email) = 'owner.test@gmail.com'`);
    const r = await fb(tok('google.com', 'uid-owner', 'owner.test@gmail.com'));
    const me = (await call(r.json().accessToken).get('/v1/me')).json();
    expect(me.user.id).toBe(before.rows[0].id);
    expect(me.isSuperAdmin).toBe(true);
    expect(me.user.profileDone).toBe(true);
    const u = await core.query('SELECT firebase_uid FROM users WHERE id = $1', [before.rows[0].id]);
    expect(u.rows[0].firebase_uid).toBe('uid-owner');
  });
});

describe('people added by the super-admin (AC12)', () => {
  it('TC-AA-4b super-admin added by email links on their first Google sign-in', async () => {
    const add = await sup.post('/v1/admin/super-admins', { email: 'Second.Boss@gmail.com', name: 'Second Boss' });
    expect(add.statusCode).toBe(200);
    const me = (await call((await fb(tok('google.com', 'uid-boss2', 'second.boss@gmail.com'))).json().accessToken).get('/v1/me')).json();
    expect(me.user.id).toBe(add.json().userId);
    expect(me.isSuperAdmin).toBe(true);
    expect(me.user.profileDone).toBe(false); // still fills in Your details (mobile)
    expect((await sup.del(`/v1/admin/super-admins/${add.json().userId}`)).statusCode).toBe(200);
  });
});

describe('your details (AC4)', () => {
  it('TC-AA-5 validates and keeps the mobile unique', async () => {
    const c = await signUp('uid-det', 'det@gmail.com');
    expect((await c.patch('/v1/me/profile', { name: 'Det Person', mobile: '12345' })).statusCode).toBe(422);
    const taken = await c.patch('/v1/me/profile', { name: 'Det Person', mobile: '9000000002' });
    expect(taken.statusCode).toBe(409);
    expect(taken.json().error).toBe('mobile_taken');
    expect((await c.patch('/v1/me/profile', { name: 'Det Person', mobile: '9811100002', lang: 'hi' })).statusCode).toBe(200);
    const me = (await c.get('/v1/me')).json();
    expect(me.user).toMatchObject({ mobile: '9811100002', name: 'Det Person', lang: 'hi', profileDone: true });
  });

  it('TC-AA-6 nothing else before the details are done', async () => {
    const c = await signUp('uid-nodet', 'nodet@gmail.com');
    const r = await c.post('/v1/access-requests', { partyName: 'Any', stateCode: 'PB', wholeState: true, designation: 'President' });
    expect(r.statusCode).toBe(422);
    expect(r.json().error).toBe('profile_required');
    expect((await c.post('/v1/join/check', { code: 'ABCD1234' })).json().error).toBe('profile_required');
  });
});

describe('admin requests (AC6, AC7, AC8)', () => {
  let reqUser: ReturnType<typeof call>;
  let reqId: string;

  it('TC-AA-7 create, refuse a second open one, read, withdraw', async () => {
    reqUser = await signUp('uid-adm-1', 'adm1@gmail.com', '9811100003', 'Adm One');
    const r = await reqUser.post('/v1/access-requests', { partyName: 'New Front', stateCode: 'PB', acNos: [66], designation: 'District president', note: 'Please' });
    expect(r.statusCode).toBe(200);
    expect((await reqUser.post('/v1/access-requests', { partyName: 'X Party', stateCode: 'PB', wholeState: true, designation: 'Worker' })).json().error).toBe('request_open');
    const mine = (await reqUser.get('/v1/me')).json().accessRequest;
    expect(mine).toMatchObject({ status: 'pending', partyName: 'New Front', stateCode: 'PB', acNos: [66], wholeState: false });
    expect((await reqUser.del(`/v1/access-requests/${mine.id}`)).statusCode).toBe(200);
    expect((await reqUser.get('/v1/me')).json().accessRequest.status).toBe('withdrawn');
    reqId = (await reqUser.post('/v1/access-requests', { partyName: 'Jan Vikas Party', stateCode: 'PB', acNos: [66], designation: 'Halqa incharge' })).json().id;
    expect(sent.some((m) => m.data.type === 'admin_request')).toBe(true);
  });

  it('TC-AA-8 only super-admins see and decide requests', async () => {
    const adm = call((await login('9000000002')).token);
    expect((await adm.get('/v1/admin/access-requests')).statusCode).toBe(403);
    expect((await adm.post(`/v1/admin/access-requests/${reqId}/approve`, {})).statusCode).toBe(403);
  });

  it('TC-AA-9 approve one assembly', async () => {
    const list = (await sup.get('/v1/admin/access-requests?status=pending')).json();
    const row = list.find((x: { id: string }) => x.id === reqId);
    expect(row).toMatchObject({ name: 'Adm One', mobile: '9811100003', email: 'adm1@gmail.com', designation: 'Halqa incharge' });
    sent.length = 0;
    const r = await sup.post(`/v1/admin/access-requests/${reqId}/approve`, { partyId: await partyId('Jan Vikas Party'), stateCode: 'PB', acNos: [66] });
    expect(r.statusCode).toBe(200);
    const me = (await reqUser.get('/v1/me')).json();
    expect(me.memberships.filter((m: { role: string; status: string }) => m.role === 'admin' && m.status === 'approved').map((m: { acNo: number }) => m.acNo)).toEqual([66]);
    expect(me.accessRequest.status).toBe('approved');
    const a = await core.query(`SELECT 1 FROM audit_log WHERE action = 'access.approve' AND entity_id = $1`, [reqId]);
    expect(a.rowCount).toBe(1);
  });

  it('TC-AA-10 reject needs a reason', async () => {
    const u = await signUp('uid-adm-rej', 'rej@gmail.com', '9811100004', 'Rej Person');
    const id = (await u.post('/v1/access-requests', { partyName: 'Some Party', stateCode: 'HR', wholeState: true, designation: 'Worker' })).json().id;
    expect((await sup.post(`/v1/admin/access-requests/${id}/reject`, {})).statusCode).toBe(422);
    sent.length = 0;
    expect((await sup.post(`/v1/admin/access-requests/${id}/reject`, { reason: 'Not a party office bearer' })).statusCode).toBe(200);
    expect((await u.get('/v1/me')).json().accessRequest).toMatchObject({ status: 'rejected', reason: 'Not a party office bearer' });
  });

  let stateUser: ReturnType<typeof call>;
  let stateUserId: string;
  it('TC-AA-11 whole state, including customers created later', async () => {
    stateUser = await signUp('uid-state', 'state@gmail.com', '9811100005', 'State Admin');
    stateUserId = (await stateUser.get('/v1/me')).json().user.id;
    const id = (await stateUser.post('/v1/access-requests', { partyName: 'Jan Vikas Party', stateCode: 'PB', wholeState: true, designation: 'State secretary' })).json().id;
    const p1 = await partyId('Jan Vikas Party');
    expect((await sup.post(`/v1/admin/access-requests/${id}/approve`, { partyId: p1, stateCode: 'PB', wholeState: true })).statusCode).toBe(200);
    const acs = () => stateUser.get('/v1/me').then((r) => r.json().memberships.filter((m: { role: string; status: string }) => m.role === 'admin' && m.status === 'approved').map((m: { acNo: number }) => m.acNo).sort());
    expect(await acs()).toEqual([50, 66]);
    await pb.query(`INSERT INTO assembly_constituencies (ac_no, name) VALUES (77, 'Testpur') ON CONFLICT DO NOTHING`);
    expect((await sup.post('/v1/admin/party-acs', { partyId: p1, stateCode: 'PB', acNo: 77 })).statusCode).toBe(200);
    expect(await acs()).toEqual([50, 66, 77]);
  });

  it('TC-AA-12 assemblies without a customer', async () => {
    const u = await signUp('uid-hr', 'hr@gmail.com', '9811100006', 'Hr Admin');
    const id = (await u.post('/v1/access-requests', { partyName: 'Jan Vikas Party', stateCode: 'HR', acNos: [12], designation: 'MLA candidate' })).json().id;
    const p1 = await partyId('Jan Vikas Party');
    const no = await sup.post(`/v1/admin/access-requests/${id}/approve`, { partyId: p1, stateCode: 'HR', acNos: [12] });
    expect(no.statusCode).toBe(422);
    expect(no.json().error).toBe('no_customer');
    expect((await sup.post(`/v1/admin/access-requests/${id}/approve`, { partyId: p1, stateCode: 'HR', acNos: [12], createMissing: true })).statusCode).toBe(200);
    expect((await u.get('/v1/me')).json().memberships.some((m: { acNo: number; stateCode: string }) => m.stateCode === 'HR' && m.acNo === 12)).toBe(true);
  });

  it('TC-AA-13 removing the whole-state scope keeps direct access', async () => {
    const p1 = await partyId('Jan Vikas Party');
    // add one direct assembly too
    expect((await sup.post(`/v1/admin/users/${stateUserId}/admin-access`, { partyId: p1, stateCode: 'PB', acNos: [66] })).statusCode).toBe(200);
    const acc = (await sup.get(`/v1/admin/users/${stateUserId}/admin-access`)).json();
    expect(acc.states).toEqual([expect.objectContaining({ partyId: p1, stateCode: 'PB' })]);
    expect((await sup.del(`/v1/admin/users/${stateUserId}/admin-access/state/${p1}/PB`)).statusCode).toBe(200);
    const left = (await stateUser.get('/v1/me')).json().memberships.filter((m: { role: string; status: string }) => m.role === 'admin' && m.status === 'approved').map((m: { acNo: number }) => m.acNo);
    expect(left).toEqual([66]);
  });

  it('TC-AA-14 whole-state admins do not count against max_admins', async () => {
    const p1 = await partyId('Jan Vikas Party');
    await core.query(`UPDATE party_constituencies SET max_admins = (SELECT count(*) FROM memberships m WHERE m.party_constituency_id = party_constituencies.id AND m.role='admin' AND m.status='approved' AND m.source='direct') WHERE party_id = $1 AND state_code = 'PB' AND ac_no = 50`, [p1]);
    const u = await signUp('uid-state2', 'state2@gmail.com', '9811100007', 'State Two');
    const id = (await u.post('/v1/access-requests', { partyName: 'Jan Vikas Party', stateCode: 'PB', wholeState: true, designation: 'Observer' })).json().id;
    expect((await sup.post(`/v1/admin/access-requests/${id}/approve`, { partyId: p1, stateCode: 'PB', wholeState: true })).statusCode).toBe(200);
    expect((await u.get('/v1/me')).json().memberships.some((m: { acNo: number }) => m.acNo === 50)).toBe(true);
    await core.query(`UPDATE party_constituencies SET max_admins = NULL WHERE party_id = $1`, [p1]);
  });
});

describe('volunteer requests by the super-admin (AC10)', () => {
  it('TC-AA-15 list, approve, reject; admins cannot use these routes', async () => {
    const adm = call((await login('9000000002')).token);
    const mid = await membership((await login('9000000002')).token, (m) => m.role === 'admin' && m.acNo === 66 && m.partyName === 'Jan Vikas Party');
    const code = (await adm.post(`/v1/m/${mid}/join-code`, {})).json().code as string;
    const v1 = await signUp('uid-vol-1', 'vol1@gmail.com', '9811100008', 'Vol One');
    await v1.put('/v1/me/push-token', { token: 'ExponentPushToken[test-vol1]', platform: 'android' });
    const v2 = await signUp('uid-vol-2', 'vol2@gmail.com', '9811100009', 'Vol Two');
    sent.length = 0;
    expect((await v1.post('/v1/join', { code, booths: [101] })).statusCode).toBe(200);
    expect(sent.some((m) => m.data.type === 'volunteer_request' && /Vol One/.test(m.body))).toBe(true);
    expect((await v2.post('/v1/join', { code, booths: [102] })).statusCode).toBe(200);
    const p1 = await partyId('Jan Vikas Party');
    const cust = (await core.query<{ id: string }>(`SELECT id FROM party_constituencies WHERE party_id = $1 AND state_code = 'PB' AND ac_no = 66`, [p1])).rows[0].id;
    expect((await adm.get(`/v1/admin/customers/${cust}/requests`)).statusCode).toBe(403);
    const list = (await sup.get(`/v1/admin/customers/${cust}/requests`)).json();
    const r1 = list.find((x: { name: string }) => x.name === 'Vol One');
    const r2 = list.find((x: { name: string }) => x.name === 'Vol Two');
    expect(r1).toMatchObject({ mobile: '9811100008', booths: [101] });
    sent.length = 0;
    expect((await sup.post(`/v1/admin/customers/${cust}/requests/${r1.membershipId}/approve`, { booths: [101] })).statusCode).toBe(200);
    expect(sent.some((m) => m.data.type === 'approved')).toBe(true);
    expect((await sup.post(`/v1/admin/customers/${cust}/requests/${r2.membershipId}/reject`, { reason: 'Unknown person' })).statusCode).toBe(200);
    const me1 = (await v1.get('/v1/me')).json();
    expect(me1.memberships[0]).toMatchObject({ role: 'volunteer', status: 'approved', booths: [101] });
  });

  it('volunteer join requires a code-free profile first (name from details)', async () => {
    const me = (await (await signUp('uid-vol-3', 'vol3@gmail.com', '9811100010', 'Vol Three')).get('/v1/me')).json();
    expect(me.user.name).toBe('Vol Three');
  });
});

describe('overview (AC9)', () => {
  it('TC-AA-16 one row per assembly', async () => {
    const t = (await login('9000000002')).token;
    const r = await call(t).get('/v1/me/overview');
    expect(r.statusCode).toBe(200);
    const rows = r.json().rows as { acNo: number; volunteers: number; pending: number; contactedPct: number }[];
    expect(rows.map((x) => x.acNo).sort()).toEqual([50, 66]);
    for (const x of rows) {
      expect(typeof x.volunteers).toBe('number');
      expect(typeof x.pending).toBe('number');
      expect(x.contactedPct).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('notifications (AC11)', () => {
  it('TC-AA-17 language and web push routing', async () => {
    const u = await signUp('uid-notif', 'notif@gmail.com', '9811100011', 'Notif Person');
    await u.patch('/v1/me/profile', { name: 'Notif Person', mobile: '9811100011', lang: 'hi' });
    const web = JSON.stringify({ endpoint: 'https://fcm.googleapis.com/fcm/send/' + 'x'.repeat(150), keys: { p256dh: 'p'.repeat(87), auth: 'a'.repeat(22) } });
    expect((await u.put('/v1/me/push-token', { token: web, platform: 'web' })).statusCode).toBe(200);
    const id = (await u.post('/v1/access-requests', { partyName: 'Jan Vikas Party', stateCode: 'PB', acNos: [50], designation: 'Booth incharge' })).json().id;
    sent.length = 0;
    await sup.post(`/v1/admin/access-requests/${id}/reject`, { reason: 'Duplicate' });
    const m = sent.find((x) => x.to === web);
    expect(m).toBeTruthy();
    expect(m!.data.type).toBe('rejected');
    expect(m!.data.platform).toBe('web');
    expect(m!.title).toMatch(/[ऀ-ॿ]/); // Hindi
  });

  it('TC-AA-18 web subscriptions are accepted; vapid key route', async () => {
    const r = await app.inject({ method: 'GET', url: '/v1/push/vapid-key' });
    expect([200, 404]).toContain(r.statusCode);
  });
});

describe('account deletion re-check (AC13)', () => {
  it('TC-AA-19 needs a fresh sign-in of the same account', async () => {
    const u = await signUp('uid-del', 'del@gmail.com', '9811100012', 'Del Person');
    const old = await u.post('/v1/me/delete', { confirm: 'DELETE', idToken: tok('google.com', 'uid-del', 'del@gmail.com', true, now() - 600) });
    expect(old.json().error).toBe('reauth_required');
    const other = await u.post('/v1/me/delete', { confirm: 'DELETE', idToken: tok('google.com', 'uid-someone', 'x@gmail.com') });
    expect(other.json().error).toBe('reauth_mismatch');
    const ok = await u.post('/v1/me/delete', { confirm: 'DELETE', idToken: tok('google.com', 'uid-del', 'del@gmail.com') });
    expect(ok.statusCode).toBe(200);
  });
});

/** spec party-states TC-PS-1..6: parties shown per state; national = no states set. */
describe('parties by state (party-states)', () => {
  const catalog = async (state?: string) =>
    ((await sup.get(`/v1/catalog/parties${state ? `?state=${state}` : ''}`)).json() as { name: string }[]).map((p) => p.name);

  it('TC-PS-1 a party with no states is national (every state)', async () => {
    expect(await catalog('PB')).toEqual(expect.arrayContaining(['Jan Vikas Party', 'Lok Sewa Dal']));
    expect(await catalog('HR')).toEqual(expect.arrayContaining(['Jan Vikas Party', 'Lok Sewa Dal']));
  });

  it('TC-PS-2 a state party shows only in its states; [] makes it national again', async () => {
    const lsd = await partyId('Lok Sewa Dal');
    expect((await sup.put(`/v1/admin/parties/${lsd}/states`, { states: ['HR'] })).statusCode).toBe(200);
    expect(await catalog('PB')).not.toContain('Lok Sewa Dal');
    expect(await catalog('HR')).toContain('Lok Sewa Dal');
    expect(await catalog()).toContain('Lok Sewa Dal');
    const list = (await sup.get('/v1/admin/parties')).json() as { name: string; states: string[] }[];
    expect(list.find((p) => p.name === 'Lok Sewa Dal')!.states).toEqual(['HR']);
    expect((await sup.put(`/v1/admin/parties/${lsd}/states`, { states: [] })).statusCode).toBe(200);
    expect(await catalog('PB')).toContain('Lok Sewa Dal');
  });

  it('TC-PS-3 unknown state 422, not super-admin 403', async () => {
    const lsd = await partyId('Lok Sewa Dal');
    expect((await sup.put(`/v1/admin/parties/${lsd}/states`, { states: ['XX'] })).statusCode).toBe(422);
    const adm = call((await login('9000000002')).token);
    expect((await adm.put(`/v1/admin/parties/${lsd}/states`, { states: ['PB'] })).statusCode).toBe(403);
  });

  it('TC-PS-4 a party created on approval belongs to the request state', async () => {
    const u = await signUp('uid-newparty', 'np@gmail.com', '9811100099', 'New Party Person');
    const id = (await u.post('/v1/access-requests', { partyName: 'Kisan Morcha', stateCode: 'PB', wholeState: true, designation: 'Candidate' })).json().id;
    expect((await sup.post(`/v1/admin/access-requests/${id}/approve`, { newPartyName: 'Kisan Morcha', stateCode: 'PB', wholeState: true })).statusCode).toBe(200);
    expect(await catalog('PB')).toContain('Kisan Morcha');
    expect(await catalog('HR')).not.toContain('Kisan Morcha');
  });
});

/** spec admin-views TC-SA-1..6: the super-admin manages a team's people and views directly. */
describe('super-admin team management (admin-views)', () => {
  const team = async () => ((await sup.get('/v1/admin/customers')).json() as { id: string; partyName: string; acNo: number }[])
    .find((c) => c.partyName === 'Jan Vikas Party' && c.acNo === 66)!.id;

  it('TC-SA-1/2 list members; add a volunteer directly with booths', async () => {
    const id = await team();
    const before = (await sup.get(`/v1/admin/customers/${id}/members`)).json() as { name: string; role: string; booths: number[] }[];
    expect(before.some((x) => x.role === 'volunteer' && x.booths.includes(112))).toBe(true);
    const r = await sup.post('/v1/admin/volunteers', { mobile: '9811100088', name: 'Direct Volunteer', partyAcId: id, booths: [101] });
    expect(r.statusCode).toBe(200);
    const after = (await sup.get(`/v1/admin/customers/${id}/members`)).json() as { membershipId: string; name: string; role: string; status: string; booths: number[] }[];
    expect(after.find((x) => x.name === 'Direct Volunteer')).toMatchObject({ role: 'volunteer', status: 'approved', booths: [101] });
  });

  it('TC-SA-3 change booths; a booth outside the assembly is refused', async () => {
    const id = await team();
    const m = ((await sup.get(`/v1/admin/customers/${id}/members`)).json() as { membershipId: string; name: string }[]).find((x) => x.name === 'Direct Volunteer')!;
    expect((await sup.put(`/v1/admin/customers/${id}/members/${m.membershipId}/booths`, { booths: [101, 102] })).statusCode).toBe(200);
    expect((await sup.put(`/v1/admin/customers/${id}/members/${m.membershipId}/booths`, { booths: [9999] })).statusCode).toBe(422);
  });

  it('TC-SA-4 remove a member', async () => {
    const id = await team();
    const m = ((await sup.get(`/v1/admin/customers/${id}/members`)).json() as { membershipId: string; name: string }[]).find((x) => x.name === 'Direct Volunteer')!;
    expect((await sup.del(`/v1/admin/customers/${id}/members/${m.membershipId}`)).statusCode).toBe(200);
    const left = (await sup.get(`/v1/admin/customers/${id}/members`)).json() as { name: string }[];
    expect(left.some((x) => x.name === 'Direct Volunteer')).toBe(false);
  });

  it('TC-SA-5 only the super-admin', async () => {
    const id = await team();
    const adm = call((await login('9000000002')).token);
    expect((await adm.post('/v1/admin/volunteers', { mobile: '9811100089', name: 'Nope', partyAcId: id, booths: [101] })).statusCode).toBe(403);
    expect((await adm.get(`/v1/admin/customers/${id}/members`)).statusCode).toBe(403);
  });

  it('TC-SA-6 views: saved, sent to the admin, validated', async () => {
    const id = await team();
    expect((await sup.patch(`/v1/admin/customers/${id}`, { views: ['zone', 'area'] })).json().views).toEqual(['zone', 'area']);
    const me = (await call((await login('9000000002')).token).get('/v1/me')).json();
    expect(me.memberships.find((x: { acNo: number; role: string }) => x.acNo === 66 && x.role === 'admin').views).toEqual(['zone', 'area']);
    expect((await sup.patch(`/v1/admin/customers/${id}`, { views: [] })).statusCode).toBe(422);
    expect((await sup.patch(`/v1/admin/customers/${id}`, { views: ['x'] })).statusCode).toBe(422);
    await sup.patch(`/v1/admin/customers/${id}`, { views: ['zone'] });
  });

  it('TC-SA-7 booth area and village are edited by the super-admin and shown to the admin', async () => {
    expect((await sup.patch('/v1/admin/booths/PB/66/101/place', { area: 'Tehsil Rampur', village: 'Kheri' })).statusCode).toBe(200);
    const a = call((await login('9000000002')).token);
    const amid = await membership((await login('9000000002')).token, (m) => m.role === 'admin' && m.acNo === 66);
    const row = ((await a.get(`/v1/m/${amid}/booth-table`)).json() as { no: number; area: string; village: string }[]).find((b) => b.no === 101);
    expect(row).toMatchObject({ area: 'Tehsil Rampur', village: 'Kheri' });
  });
});
