import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/design/components';
import { colors, fonts, hairline } from '@/design/tokens';
import { useWide } from '@/design/layout';
import { useGuard } from '@/features/session/Guard';
import { useSyncEngine } from '@/features/sync/engine';
import { useActiveMembership } from '@/stores/session';
import { AppShell, type NavItem } from '@/features/shell/AppShell';
import { PollingGate } from '@/features/pollingDay/PollingGate';

const ICONS: Record<string, [string, string]> = {
  home: ['home', 'home-outline'],
  voters: ['people', 'people-outline'],
  poll: ['checkbox', 'checkbox-outline'],
  me: ['person-circle', 'person-circle-outline'],
};
/** Tab route "(home)" → icon key "home". */
const iconKey = (name: string) => name.replace(/[()]/g, '');

export default function TabsLayout() {
  const { t, i18n } = useTranslation();
  const pa = i18n.language === 'pa';
  const hi = i18n.language === 'hi';
  const guard = useGuard('volunteer');
  const wide = useWide();
  const m = useActiveMembership();
  useSyncEngine(); // sync mode set by the super-admin (spec sync-modes S3)
  const on = (k: 'poll' | 'tasks' | 'surnames') => m?.features?.[k] !== false;
  if (guard) return guard;
  const nav: NavItem[] = [
    { path: '/home', label: t('tabs.home'), icon: ICONS.home, also: ['/stats'] },
    { path: '/voters', label: t('tabs.voters'), icon: ICONS.voters, also: ['/slip'] },
    { path: '/poll', label: t('tabs.poll'), icon: ICONS.poll, also: ['/help'] },
    { path: '/tasks', label: t('tasks.title'), icon: ['flag', 'flag-outline'] },
    { path: '/surnames', label: t('surnames.title'), icon: ['people-circle', 'people-circle-outline'] },
    { path: '/me', label: t('tabs.me'), icon: ICONS.me },
  ].filter((it) => !((it.path === '/poll' && !on('poll')) || (it.path === '/tasks' && !on('tasks')) || (it.path === '/surnames' && !on('surnames')))) as NavItem[];
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
        tabBarIcon: ({ focused, color }) => <Icon name={ICONS[iconKey(route.name)]?.[focused ? 0 : 1] ?? 'ellipse'} size={26} color={color} />,
      })}
    >
      {/* spec usability-r2 U2: each tab is a page stack, so swipe / Android back return to the previous page. */}
      <Tabs.Screen name="(home)" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="(voters)" options={{ title: t('tabs.voters') }} />
      <Tabs.Screen name="(poll)" options={{ title: t('tabs.poll'), href: on('poll') ? undefined : null }} />
      <Tabs.Screen name="me" options={{ title: t('tabs.me') }} />
    </Tabs>
  );
  // Polling day (spec polling-day V1/V3): location required inside the window; away banner on every screen.
  return <PollingGate>{wide ? <AppShell items={nav} mode="volunteer">{tabs}</AppShell> : tabs}</PollingGate>;
}
