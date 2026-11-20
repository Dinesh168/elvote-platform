/**
 * Phone push notifications through Expo's push service (spec polling-day A1).
 * Only short alert text goes out (name, booth number, distance); never voter data.
 * Failures are logged and dropped: an alert is also in the admin's in-app list.
 */
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

// Tests and local runs never call the outside service.
let sender: Sender | null = process.env.NODE_ENV === 'production' || process.env.PUSH_ENABLED === '1' ? expoSender : null;

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
