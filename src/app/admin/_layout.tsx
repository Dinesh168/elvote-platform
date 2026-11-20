import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/design/components';
import { colors, fonts, hairline } from '@/design/tokens';
import { useWide } from '@/design/layout';
import { useGuard } from '@/features/session/Guard';
import { useSyncEngine } from '@/features/sync/engine';
import { useActiveMembership, useSession } from '@/stores/session';
import { AppShell, type NavItem } from '@/features/shell/AppShell';
import { useEffect } from 'react';
import { useAdminPolling } from '@/features/pollingDay/adminHooks';
import { AdminLiveBanner } from '@/features/pollingDay/AdminLiveBanner';
import { registerPush } from '@/features/pollingDay/push';

const ICONS: Record<string, [string, string]> = {
  dashboard: ['stats-chart', 'stats-chart-outline'],
  map: ['map', 'map-outline'],
  team: ['people', 'people-outline'],
  tasks: ['flag', 'flag-outline'],
  more: ['ellipsis-horizontal-circle', 'ellipsis-horizontal-circle-outline'],
};

/** Admin app (D18): 5 tabs; Polling day, Zones, Branding live under More. */
export default function AdminLayout() {
  const { t, i18n } = useTranslation();
  const pa = i18n.language === 'pa';
  const hi = i18n.language === 'hi';
  const guard = useGuard('admin');
  const wide = useWide();
  const m = useActiveMembership();
  useSyncEngine(); // sync mode set by the super-admin (spec sync-modes S3)
  const pd = useAdminPolling(); // polling day: alerts badge (spec polling-day A1)
  useEffect(() => { if (m?.role === 'admin') void registerPush(); }, [m?.id, m?.role]);
  const f = { map: m?.features?.map !== false, tasks: m?.features?.tasks !== false, poll: m?.features?.poll !== false, zones: m?.features?.zones !== false };
  const me = useSession((s) => s.me);
  const adminAcs = (me?.memberships ?? []).filter((x) => x.role === 'admin' && x.status === 'approved').length;
  if (guard) return guard;
  const nav: NavItem[] = [
    ...(adminAcs > 1 ? [{ path: '/admin/overview', label: t('overview.title'), icon: ['albums', 'albums-outline'] as [string, string] }] : []),
    { path: '/admin/dashboard', label: t('admin.tabs.dashboard'), icon: ICONS.dashboard, also: ['/admin/booth', '/admin/roll'] },
    ...(pd.day ? [{ path: '/admin/polling', label: t('pd.title'), icon: ['location', 'location-outline'] as [string, string], badge: pd.unseen }] : []),
    { path: '/admin/map', label: t('admin.tabs.map'), icon: ICONS.map },
    { path: '/admin/team', label: t('admin.tabs.team'), icon: ICONS.team },
    { path: '/admin/tasks', label: t('admin.tabs.tasks'), icon: ICONS.tasks },
    { path: '/admin/poll', label: t('admin.poll'), icon: ['checkbox', 'checkbox-outline'] },
    { path: '/admin/zones', label: t('admin.zones'), icon: ['grid', 'grid-outline'] },
    { path: '/admin/trace', label: t('trace.title'), icon: ['git-commit', 'git-commit-outline'] },
    { path: '/admin/more', label: t('admin.tabs.more'), icon: ICONS.more },
  ].filter((it) => !(
    (it.path === '/admin/map' && !f.map) || (it.path === '/admin/tasks' && !f.tasks) ||
    (it.path === '/admin/poll' && !f.poll) || (it.path === '/admin/zones' && !f.zones))) as NavItem[];
  const tabs = (
    <Tabs
      key={m?.id ?? 'none'}
      tabBar={wide ? () => null : undefined}
      backBehavior={wide ? 'history' : undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontFamily: pa ? fonts.paSemibold : hi ? fonts.hiSemibold : fonts.medium, fontSize: 12 },
        tabBarStyle: {
          backgroundColor: Platform.OS === 'web' ? colors.tabBar : colors.surface,
          borderTopWidth: hairline,
          borderTopColor: colors.separator,
          elevation: 0,
          height: Platform.OS === 'web' ? 64 : undefined,
          paddingTop: 4,
        },
        tabBarItemStyle: { paddingBottom: Platform.OS === 'web' ? 6 : 0 },
        tabBarIcon: ({ focused, color }) => <Icon name={ICONS[route.name]?.[focused ? 0 : 1] ?? 'ellipse'} size={26} color={color} />,
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: t('admin.tabs.dashboard') }} />
      <Tabs.Screen name="map" options={{ title: t('admin.tabs.map'), href: f.map ? undefined : null }} />
      <Tabs.Screen name="team" options={{ title: t('admin.tabs.team') }} />
      <Tabs.Screen name="tasks" options={{ title: t('admin.tabs.tasks'), href: f.tasks ? undefined : null }} />
      <Tabs.Screen name="more" options={{ title: t('admin.tabs.more') }} />
      <Tabs.Screen name="booth" options={{ href: null }} />
      <Tabs.Screen name="poll" options={{ href: null }} />
      <Tabs.Screen name="zones" options={{ href: null }} />
      <Tabs.Screen name="trace" options={{ href: null }} />
      <Tabs.Screen name="polling" options={{ href: null }} />
      <Tabs.Screen name="roll" options={{ href: null }} />
      <Tabs.Screen name="overview" options={{ href: null }} />
    </Tabs>
  );
  // Phones: a "polling day is live" strip above every admin screen (opens the polling-day page).
  return wide ? <AppShell items={nav} mode="admin">{tabs}</AppShell> : <AdminLiveBanner>{tabs}</AdminLiveBanner>;
}
