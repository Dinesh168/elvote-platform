/**
 * Push notifications: phones through Expo's push service (spec polling-day A1), browsers through standard
 * Web Push with VAPID keys (spec accounts-access AC11). Only short text goes out (names, booth numbers); never
 * voter data. Failures are logged and dropped: the same state is always visible in the app.
 */
import webpush from 'web-push';
import { env } from '../config.js';
import { core } from '../db/pools.js';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
}
type Sender = (msgs: PushMessage[]) => Promise<void>;

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';

const expoSender: Sender = async (msgs) => {
  for (let i = 0; i < msgs.length; i += 100) {
    const chunk = msgs.slice(i, i + 100).map((m) => ({ ...m, sound: 'default', priority: 'high', channelId: 'alerts' }));
    const r = await fetch(EXPO_URL, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(chunk), signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`push ${r.status}`);
    const out = (await r.json()) as { data?: { status: string; details?: { error?: string } }[] };
    // Tokens of uninstalled apps are removed so we stop sending to them.
    const dead = (out.data ?? []).map((d, j) => (d.details?.error === 'DeviceNotRegistered' ? chunk[j].to : null)).filter((x): x is string => !!x);
    if (dead.length) await core.query('DELETE FROM push_tokens WHERE token = ANY($1)', [dead]);
  }
};

/** Web Push: the token is the browser's subscription JSON. Expired subscriptions (404/410) are deleted. */
const webSender: Sender = async (msgs) => {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  const dead: string[] = [];
  await Promise.all(msgs.map(async (m) => {
    try {
      await webpush.sendNotification(JSON.parse(m.to), JSON.stringify({ title: m.title, body: m.body, data: m.data }), { TTL: 86_400 });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) dead.push(m.to);
      else throw e;
    }
  }));
  if (dead.length) await core.query('DELETE FROM push_tokens WHERE token = ANY($1)', [dead]);
};

/** Web subscriptions are JSON; phone tokens are ExponentPushToken[…]. */
const isWeb = (m: PushMessage) => m.data.platform === 'web' || m.to.startsWith('{');
const realSender: Sender = async (msgs) => {
  const web = msgs.filter(isWeb);
  const phone = msgs.filter((m) => !isWeb(m));
  const errs: Error[] = [];
  if (phone.length) await expoSender(phone).catch((e: Error) => errs.push(e));
  if (web.length) await webSender(web).catch((e: Error) => errs.push(e));
  if (errs.length) throw errs[0];
};

// Tests and local runs never call the outside services.
let sender: Sender | null = process.env.NODE_ENV === 'production' || process.env.PUSH_ENABLED === '1' ? realSender : null;

/** Tests: replace the sender (null = off). */
export function setPushSender(s: Sender | null) {
  sender = s;
}

export const pushEnabled = () => sender != null;

/** Sends; on failure logs and drops (the alert is still in the admin's list). */
export async function sendPush(msgs: PushMessage[], log?: (e: Error) => void) {
  if (!sender || !msgs.length) return;
  try {
    await sender(msgs);
  } catch (e) {
    log?.(e as Error);
  }
}
