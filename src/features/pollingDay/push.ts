/**
 * Website push notifications (spec accounts-access AC11): standard Web Push with the server's VAPID key and the
 * service worker `public/sw.js`. Works in Chrome / Edge / Firefox (desktop and Android); on iPhone only from the
 * Home Screen. The phone version is push.native.ts. Asking for permission needs a tap (`ask = true`).
 */
import { API_MODE } from '@/api/client';
import { API_URL, http } from '@/api/http';

export type PushState = 'granted' | 'denied' | 'ask' | 'unsupported';
const KEY = 'elvote.webPush.v1';

const supported = () =>
  API_MODE === 'http' && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushState(): PushState {
  if (!supported()) return 'unsupported';
  const p = Notification.permission;
  return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'ask';
}

export async function registerPush(ask = false): Promise<PushState> {
  if (!supported()) return 'unsupported';
  try {
    const r = await fetch(`${API_URL}/v1/push/vapid-key`);
    if (!r.ok) return 'unsupported';
    const { key } = (await r.json()) as { key: string };
    if (Notification.permission === 'denied') return 'denied';
    if (Notification.permission !== 'granted') {
      if (!ask) return 'ask';
      if ((await Notification.requestPermission()) !== 'granted') return pushState();
    }
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
    const token = JSON.stringify(sub);
    await http.put('/v1/me/push-token', { token, platform: 'web' });
    try { localStorage.setItem(KEY, token); } catch { /* private window */ }
    return 'granted';
  } catch {
    return pushState();
  }
}

/** Sign-out: this browser stops receiving the person's notifications. */
export async function unregisterPush() {
  try {
    const token = localStorage.getItem(KEY);
    if (!token) return;
    await http.del(`/v1/me/push-token?token=${encodeURIComponent(token)}`).catch(() => undefined);
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Website: the service worker opens the page itself. */
export function listenPushTaps(_open: (url: string) => void): () => void {
  return () => undefined;
}
