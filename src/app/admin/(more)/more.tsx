import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BrandCard, ElVoteFooter } from '@/features/shell/Brand';
import { LanguageRow } from '@/features/shell/LanguageRow';
import { Group, IconSquare, LargeTitle, Row, Screen } from '@/design/components';
import { useWide } from '@/design/layout';
import { colors } from '@/design/tokens';
import { useAllowedLangs, useFeature } from '@/features/session/customer';
import { useAdminPolling } from '@/features/pollingDay/adminHooks';
import { rolesOf } from '@/features/session/session';
import { useSignOut } from '@/features/session/useSignOut';
import { TeamBar } from '@/features/shell/TeamBar';
import { SyncBadge } from '@/features/sync/SyncBadge';
import { useActiveMembership, useSession } from '@/stores/session';

/** Admin More (D18): Polling day, Zones, Branding, join code, language, switch role, log out. */
export default function More() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const me = useSession((s) => s.me);
  const signOut = useSignOut();
  const roles = me ? rolesOf(me) : [];
  // spec accounts-access AC9: admins of several assemblies (or a whole state) get the overview.
  const adminAcs = (me?.memberships ?? []).filter((x) => x.role === 'admin' && x.status === 'approved').length;
  const wide = useWide();
  const poll = useFeature('poll');
  const zones = useFeature('zones');
  const langs = useAllowedLangs();
  const pd = useAdminPolling();
  return (
    <Screen width="narrow" header={<TeamBar trailing={<SyncBadge />} />} trailing={<SyncBadge />}>
      <LargeTitle title={t('admin.tabs.more')} />
      <BrandCard roleLabel={t('web.roleAdmin')} />
      {pd.day ? (
        <Group>
          <Row title={t('pd.title')} subtitle={pd.unseen ? t('pd.newAlerts', { n: pd.unseen }) : pd.live ? t('pd.liveNow') : `${pd.day.name} · ${pd.day.date}`}
            leading={<IconSquare name="location" bg={pd.unseen ? colors.danger : colors.success} />} chevron onPress={() => router.push('/admin/polling')} last />
        </Group>
      ) : null}
      <Group>
        {poll ? <Row title={t('admin.poll')} leading={<IconSquare name="checkbox" bg={colors.success} />} chevron onPress={() => router.push('/admin/poll')} /> : null}
        {zones ? <Row title={t('admin.zones')} subtitle={m ? `${m.zoneCount} / ${m.maxZones}` : undefined} leading={<IconSquare name="grid" bg={colors.accent} />} chevron onPress={() => router.push('/admin/zones')} /> : null}
        <Row title={t('trace.title')} subtitle={t('trace.sub')} leading={<IconSquare name="git-commit" bg={colors.text} />} chevron onPress={() => router.push('/admin/trace')} last={adminAcs < 2} />
        {adminAcs > 1 ? <Row title={t('overview.title')} subtitle={t('overview.count', { count: adminAcs })} leading={<IconSquare name="albums" bg={colors.accent} />} chevron onPress={() => router.push('/admin/overview')} last /> : null}
      </Group>
      <Group header={t('me2.settings')}>
        <Row title={t('banner.title')} subtitle={m?.look?.bannerUrl ? t('banner.set') : t('banner.none')} leading={<IconSquare name="image" bg={colors.accent} />} chevron onPress={() => router.push('/admin/banner')} />
        <LanguageRow langs={langs} />
      </Group>
      <Group header={t('admin.joinCode')}>
        <Row title={t('qr.title')} subtitle={t('qr.rowSub')} leading={<IconSquare name="qr-code" bg={colors.success} />} chevron onPress={() => router.push('/admin/team-qr')} last />
      </Group>
      {wide ? null : (<>
      <Group header={t('me2.account')}>
        {roles.length > 1 ? <Row title={t('me2.switchRole')} chevron onPress={() => router.push('/choose')} /> : null}
        <Row title={t('auth.logout')} titleColor={colors.danger} leading={<IconSquare name="log-out-outline" bg={colors.danger} />} onPress={signOut.ask} last />
      </Group>
      </>)}
      <Group>
        <Row title={t('del.row')} titleColor={colors.danger} leading={<IconSquare name="trash" bg={colors.danger} />} chevron onPress={() => router.push('/delete-account')} last />
      </Group>
      <ElVoteFooter />
      {signOut.dialog}
    </Screen>
  );
}
