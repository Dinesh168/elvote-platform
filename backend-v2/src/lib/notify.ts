/**
 * Request and decision notifications (spec accounts-access AC11): phone push + web push, in each person's
 * language. Best-effort and asynchronous to the request; the app always shows the same state itself.
 */
import { core } from '../db/pools.js';
import { sendPush, type PushMessage } from './push.js';

export type NoticeType = 'volunteer_request' | 'admin_request' | 'approved' | 'rejected' | 'removed';
type Lang = 'en' | 'hi' | 'pa';
type P = Record<string, string>;

const T: Record<NoticeType, Record<Lang, { title: string; body: (p: P) => string }>> = {
  volunteer_request: {
    en: { title: 'New volunteer request', body: (p) => `${p.name} · booths ${p.booths}` },
    hi: { title: 'नया स्वयंसेवक अनुरोध', body: (p) => `${p.name} · बूथ ${p.booths}` },
    pa: { title: 'ਨਵੀਂ ਵਲੰਟੀਅਰ ਬੇਨਤੀ', body: (p) => `${p.name} · ਬੂਥ ${p.booths}` },
  },
  admin_request: {
    en: { title: 'New admin request', body: (p) => `${p.name} · ${p.party} · ${p.area}` },
    hi: { title: 'नया एडमिन अनुरोध', body: (p) => `${p.name} · ${p.party} · ${p.area}` },
    pa: { title: 'ਨਵੀਂ ਐਡਮਿਨ ਬੇਨਤੀ', body: (p) => `${p.name} · ${p.party} · ${p.area}` },
  },
  approved: {
    en: { title: "You're approved ✅", body: (p) => `${p.party} · ${p.area}. Tap to open.` },
    hi: { title: 'आपको मंज़ूरी मिल गई ✅', body: (p) => `${p.party} · ${p.area}. खोलने के लिए दबाएँ।` },
    pa: { title: 'ਤੁਹਾਨੂੰ ਮਨਜ਼ੂਰੀ ਮਿਲ ਗਈ ✅', body: (p) => `${p.party} · ${p.area}. ਖੋਲ੍ਹਣ ਲਈ ਦਬਾਓ।` },
  },
  rejected: {
    en: { title: 'Request not approved', body: (p) => p.reason },
    hi: { title: 'अनुरोध मंज़ूर नहीं हुआ', body: (p) => p.reason },
    pa: { title: 'ਬੇਨਤੀ ਮਨਜ਼ੂਰ ਨਹੀਂ ਹੋਈ', body: (p) => p.reason },
  },
  removed: {
    en: { title: 'Access removed', body: (p) => `Your access to ${p.party} · ${p.area} was removed.` },
    hi: { title: 'पहुँच हटा दी गई', body: (p) => `${p.party} · ${p.area} की आपकी पहुँच हटा दी गई।` },
    pa: { title: 'ਪਹੁੰਚ ਹਟਾ ਦਿੱਤੀ ਗਈ', body: (p) => `${p.party} · ${p.area} ਤੱਕ ਤੁਹਾਡੀ ਪਹੁੰਚ ਹਟਾ ਦਿੱਤੀ ਗਈ।` },
  },
};

/** Where tapping the notification opens the app. */
const URL: Record<NoticeType, string> = {
  volunteer_request: '/admin/team',
  admin_request: '/platform/requests',
  approved: '/',
  rejected: '/waiting',
  removed: '/',
};

let log: (e: Error) => void = () => undefined;
export function setNotifyLog(l: (e: Error) => void) {
  log = l;
}

/** Sends one notice to these users (all their phones and browsers). */
export async function notify(userIds: string[], type: NoticeType, params: P) {
  if (!userIds.length) return;
  try {
    await send(userIds, type, params);
  } catch (e) {
    log(e as Error); // never fail the request because a notification could not be prepared
  }
}

async function send(userIds: string[], type: NoticeType, params: P) {
  const r = await core.query<{ token: string; platform: string; lang: string }>(
    `SELECT t.token, t.platform, u.lang FROM push_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.user_id = ANY($1::uuid[]) AND u.deleted_at IS NULL AND u.status = 'active'`, [userIds]);
  const msgs: PushMessage[] = r.rows.map((x) => {
    const lang = (['en', 'hi', 'pa'].includes(x.lang) ? x.lang : 'en') as Lang;
    const t = T[type][lang];
    return { to: x.token, title: t.title, body: t.body(params), data: { type, url: URL[type], platform: x.platform } };
  });
  await sendPush(msgs, log);
}

/** Approved admins of one customer (assembly). */
export async function adminsOf(partyAcId: string): Promise<string[]> {
  const r = await core.query<{ user_id: string }>(
    `SELECT user_id FROM memberships WHERE party_constituency_id = $1 AND role = 'admin' AND status = 'approved'`, [partyAcId]);
  return r.rows.map((x) => x.user_id);
}

export async function superAdmins(): Promise<string[]> {
  const r = await core.query<{ user_id: string }>('SELECT user_id FROM platform_admins WHERE revoked_at IS NULL');
  return r.rows.map((x) => x.user_id);
}

/** Area text for a customer: "Rampur (PB 66)". */
export async function areaOf(partyAcId: string): Promise<{ party: string; area: string }> {
  const r = await core.query<{ party: string; ac_name: string; state_code: string; ac_no: number }>(
    `SELECT p.name AS party, pc.ac_name, trim(pc.state_code) AS state_code, pc.ac_no
       FROM party_constituencies pc JOIN parties p ON p.id = pc.party_id WHERE pc.id = $1`, [partyAcId]);
  const x = r.rows[0];
  return x ? { party: x.party, area: `${x.ac_name} (${x.state_code} ${x.ac_no})` } : { party: '', area: '' };
}
