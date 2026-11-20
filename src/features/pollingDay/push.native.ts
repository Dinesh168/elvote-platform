/**
 * Admin phone push notifications for polling-day alerts (spec polling-day A1, PD6).
 * Needs a phone build with an EAS project id; anywhere else this quietly does nothing (alerts are still in the app).
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_MODE } from '@/api/client';
import { http } from '@/api/http';
import { durable } from '@/lib/durable';

const KEY = 'elvote.pushToken.v1';

export async function registerPush() {
  if (Platform.OS === 'web' || API_MODE !== 'http') return;
  try {
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    let perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted' && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alerts', { name: 'Polling day alerts', importance: Notifications.AndroidImportance.HIGH });
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await http.put('/v1/me/push-token', { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
    await durable.setItem(KEY, token);
  } catch {
    // no push on this device; the in-app alert list still works
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
