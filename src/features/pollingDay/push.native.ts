/**
 * Phone push notifications: polling-day alerts (spec polling-day A1) and requests / approvals (spec accounts-access
 * AC11). Needs a phone build with an EAS project id; anywhere else this quietly does nothing (the app shows the same).
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_MODE } from '@/api/client';
import { http } from '@/api/http';
import { durable } from '@/lib/durable';

const KEY = 'elvote.pushToken.v1';

export type PushState = 'granted' | 'denied' | 'ask' | 'unsupported';

export function pushState(): PushState {
  return 'ask';
}

/** Phones may ask without a tap; `ask` is accepted for the same call shape as the website. */
export async function registerPush(_ask = true): Promise<PushState> {
  if (Platform.OS === 'web' || API_MODE !== 'http') return 'unsupported';
  try {
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return 'unsupported';
    let perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted' && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== 'granted') return 'denied';
    if (Platform.OS === 'android') {
      // eslint-disable-next-line import/namespace -- AndroidImportance is re-exported with `export *`; the TypeScript check confirms it
      await Notifications.setNotificationChannelAsync('alerts', { name: 'Alerts', importance: Notifications.AndroidImportance.HIGH });
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await http.put('/v1/me/push-token', { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
    await durable.setItem(KEY, token);
    return 'granted';
  } catch {
    return 'unsupported'; // no push on this device; the app still shows everything
  }
}

/** Logout: this phone stops receiving the person's alerts. */
export async function unregisterPush() {
  try {
    const token = await durable.getItem(KEY);
    if (!token) return;
    await http.del(`/v1/me/push-token?token=${encodeURIComponent(token)}`).catch(() => undefined);
    await durable.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Tapping a notification opens its page (data.url), e.g. Team for a new volunteer request. */
export function listenPushTaps(open: (url: string) => void): () => void {
  if (Platform.OS === 'web') return () => undefined;
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const url = (r.notification.request.content.data as { url?: unknown } | undefined)?.url;
    if (typeof url === 'string' && url.startsWith('/')) open(url);
  });
  return () => sub.remove();
}
