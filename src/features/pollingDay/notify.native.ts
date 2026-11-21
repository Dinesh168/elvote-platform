/** Phone notifications for the volunteer's away warning (spec polling-day V3). */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { i18n } from '@/i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function ensureChannel() {
  if (Platform.OS === 'android') {
    // eslint-disable-next-line import/namespace -- AndroidImportance is re-exported with `export *`; the TypeScript check confirms it
    await Notifications.setNotificationChannelAsync('alerts', { name: i18n.t('pd.channel'), importance: Notifications.AndroidImportance.HIGH }).catch(() => undefined);
  }
}

export async function requestNotifyPermission() {
  await Notifications.requestPermissionsAsync().catch(() => undefined);
}

export async function showLocal(title: string, body: string) {
  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({ content: { title, body, sound: 'default' }, trigger: Platform.OS === 'android' ? { channelId: 'alerts' } : null });
  } catch {
    // the banner in the app still shows
  }
}
