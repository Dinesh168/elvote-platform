import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useWide } from '@/design/layout';
import { colors } from '@/design/tokens';
import { useGuard } from '@/features/session/Guard';
import { AppShell, type NavItem } from '@/features/shell/AppShell';

/** Super-admin area (platform owner). Every action is also checked by the server. Web desktop: sidebar frame (W2). */
export default function PlatformLayout() {
  const { t } = useTranslation();
  const guard = useGuard('platform');
  const wide = useWide();
  if (guard) return guard;
  const stack = <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: wide ? 'none' : undefined }} />;
  if (!wide) return stack;
  const nav: NavItem[] = [
    { path: '/platform', label: t('web.overview'), icon: ['grid', 'grid-outline'] },
    { path: '/platform/requests', label: t('requests.title'), icon: ['person-add', 'person-add-outline'] },
    { path: '/platform/customers', label: t('cms.customers'), icon: ['briefcase', 'briefcase-outline'], also: ['/platform/customer', '/platform/party-ac'] },
    { path: '/platform/parties', label: t('platform.parties'), icon: ['flag', 'flag-outline'] },
    { path: '/platform/elections', label: t('pd.elections'), icon: ['calendar', 'calendar-outline'] },
    { path: '/platform/booths', label: t('pd.boothsTitle'), icon: ['location', 'location-outline'], also: ['/platform/polling'] },
    { path: '/platform/users', label: t('users.title'), icon: ['people', 'people-outline'] },
    { path: '/platform/trace', label: t('trace.title'), icon: ['git-commit', 'git-commit-outline'] },
    { path: '/platform/upload', label: t('platform.upload'), icon: ['cloud-upload', 'cloud-upload-outline'] },
    { path: '/platform/super-admins', label: t('platform.superAdmins'), icon: ['shield-checkmark', 'shield-checkmark-outline'] },
  ];
  return <AppShell items={nav} mode="platform">{stack}</AppShell>;
}
