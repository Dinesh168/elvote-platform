import { Tabs } from 'expo-router';
import { SuperAdminStrip } from '@/features/shell/SuperAdminStrip';
import { useTranslation } from 'react-i18next';
import { useTabBarStyle } from '@/features/shell/tabBar';
import { Icon } from '@/design/components';
import { colors, fonts } from '@/design/tokens';
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
  reports: ['grid', 'grid-outline'],
  pollday: ['checkbox', 'checkbox-outline'],
  trend: ['trending-up', 'trending-up-outline'],
  map: ['map', 'map-outline'],
  team: ['people', 'people-outline'],
  tasks: ['flag', 'flag-outline'],
  more: ['ellipsis-horizontal-circle', 'ellipsis-horizontal-circle-outline'],
};

/** Admin app (D18): 5 tabs; Polling day, Zones, Branding live under More. */
export default function AdminLayout() {
  const { t, i18n } = useTranslation();
  // spec flow-fixes O2: the bottom menu clears the phone's home bar / buttons / browser toolbar.
  const bar = useTabBarStyle();
  const pa = i18n.language === 'pa';
  const hi = i18n.language === 'hi';
  const guard = useGuard('admin');
  const wide = useWide();
  const m = useActiveMembership();
  useSyncEngine(); // sync mode set by the super-admin (spec sync-modes S3)
  const pd = useAdminPolling(); // polling day: alerts badge (spec polling-day A1)
  useEffect(() => { if (m?.role === 'admin') void registerPush(); }, [m?.id, m?.role]);
  const f = { map: m?.features?.map !== false, tasks: m?.features?.tasks !== false, poll: m?.features?.poll !== false, zones: m?.features?.zones !== false, reports: m?.features?.reports !== false, trend: m?.features?.trend !== false };
  // spec easy-redesign A5/A6: Poll day takes Trend's place in the tab bar when the super-admin turned it on.
  const pollTab = f.poll && !!m?.pollingDay;
  const me = useSession((s) => s.me);
  const adminAcs = (me?.memberships ?? []).filter((x) => x.role === 'admin' && x.status === 'approved').length;
  if (guard) return guard;
  const nav: NavItem[] = [
    ...(adminAcs > 1 ? [{ path: '/admin/overview', label: t('overview.title'), icon: ['albums', 'albums-outline'] as [string, string] }] : []),
    { path: '/admin/dashboard', label: t('admin.tabs.dashboard'), icon: ICONS.dashboard, also: ['/admin/booth', '/admin/roll', '/admin/surnames'] },
    ...(pd.day ? [{ path: '/admin/polling', label: t('pd.title'), icon: ['location', 'location-outline'] as [string, string], badge: pd.unseen }] : []),
    { path: '/admin/map', label: t('admin.tabs.map'), icon: ICONS.map },
    { path: '/admin/team', label: t('admin.tabs.team'), icon: ICONS.team },
    { path: '/admin/tasks', label: t('admin.tabs.tasks'), icon: ICONS.tasks },
    { path: '/admin/poll', label: t('admin.poll'), icon: ['checkbox', 'checkbox-outline'] },
    { path: '/admin/zones', label: t('admin.zones'), icon: ['grid', 'grid-outline'] },
    { path: '/admin/trace', label: t('trace.title'), icon: ['git-commit', 'git-commit-outline'] },
    { path: '/admin/more', label: t('admin.tabs.more'), icon: ICONS.more, also: ['/admin/banner', '/admin/team-qr', '/admin/trace'] },
  ].filter((it) => !(
    (it.path === '/admin/map' && !f.map) || (it.path === '/admin/tasks' && !f.tasks) ||
    (it.path === '/admin/poll' && !f.poll) || (it.path === '/admin/zones' && !f.zones))) as NavItem[];
  const tabs = (
    <Tabs
      key={m?.id ?? 'none'}
      tabBar={wide ? () => null : undefined}
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontFamily: pa ? fonts.paSemibold : hi ? fonts.hiSemibold : fonts.medium, fontSize: 12, lineHeight: 16, marginTop: 2 },
        ...bar,
        tabBarIcon: ({ focused, color }) => <Icon name={ICONS[route.name.replace(/[()]/g, '')]?.[focused ? 0 : 1] ?? 'ellipse'} size={26} color={color} />,
      })}
    >
      {/* spec usability-r2 U2: Dashboard and More are page stacks (booth, surnames, zones, banner… open on top). */}
      {/* spec easy-redesign: Dashboard · Reports · Map · Poll day (or Trend) · Team; the rest lives in the ☰ menu. */}
      <Tabs.Screen name="(dashboard)" options={{ title: t('admin.tabs.dashboard') }} />
      <Tabs.Screen name="(reports)" options={{ title: t('easy.reports'), href: f.reports ? undefined : null }} />
      <Tabs.Screen name="map" options={{ title: t('admin.tabs.map'), href: f.map ? undefined : null }} />
      <Tabs.Screen name="(pollday)" options={{ title: t('easy.pollDay'), href: pollTab ? undefined : null }} />
      <Tabs.Screen name="(trend)" options={{ title: t('trend.title'), href: !pollTab && f.trend ? undefined : null }} />
      <Tabs.Screen name="team" options={{ title: t('admin.tabs.team') }} />
      <Tabs.Screen name="tasks" options={{ title: t('admin.tabs.tasks'), href: null }} />
      <Tabs.Screen name="(more)" options={{ title: t('admin.tabs.more'), href: null }} />
    </Tabs>
  );
  // Phones: a "polling day is live" strip above every admin screen (opens the polling-day page).
  const body = (
    <>
      <SuperAdminStrip />
      {tabs}
    </>
  );
  return wide ? <AppShell items={nav} mode="admin">{body}</AppShell> : <AdminLiveBanner>{body}</AdminLiveBanner>;
}
