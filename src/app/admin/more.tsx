import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import { Group, IconSquare, LargeTitle, Row, Screen, SegmentedControl } from '@/design/components';
import { useWide } from '@/design/layout';
import { colors, spacing } from '@/design/tokens';
import { useAllowedLangs, useFeature } from '@/features/session/customer';
import { useAdminPolling } from '@/features/pollingDay/adminHooks';
import { logout, rolesOf } from '@/features/session/session';
import { initI18n, type Lang } from '@/i18n';
import { usePrefs } from '@/stores/prefs';
import { useActiveMembership, useSession } from '@/stores/session';

/** Admin More (D18): Polling day, Zones, Branding, join code, language, switch role, log out. */
export default function More() {
  const { t, i18n } = useTranslation();
  const m = useActiveMembership();
  const me = useSession((s) => s.me);
  const setLang = usePrefs((s) => s.setLang);
  const [code, setCode] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const roles = me ? rolesOf(me) : [];
  const wide = useWide();
  const poll = useFeature('poll');
  const zones = useFeature('zones');
  const langs = useAllowedLangs();
  const pd = useAdminPolling();
  return (
    <Screen width="narrow">
      <LargeTitle title={t('admin.tabs.more')} subtitle={me ? `${me.user.name} · +91 ${me.user.mobile}` : undefined} />
      {pd.day ? (
        <Group>
          <Row title={t('pd.title')} subtitle={pd.unseen ? t('pd.newAlerts', { n: pd.unseen }) : pd.live ? t('pd.liveNow') : `${pd.day.name} · ${pd.day.date}`}
            leading={<IconSquare name="location" bg={pd.unseen ? colors.danger : colors.success} />} chevron onPress={() => router.push('/admin/polling')} last />
        </Group>
      ) : null}
      <Group>
        {poll ? <Row title={t('admin.poll')} leading={<IconSquare name="checkbox" bg={colors.success} />} chevron onPress={() => router.push('/admin/poll')} /> : null}
        {zones ? <Row title={t('admin.zones')} subtitle={m ? `${m.zoneCount} / ${m.maxZones}` : undefined} leading={<IconSquare name="grid" bg={colors.accent} />} chevron onPress={() => router.push('/admin/zones')} /> : null}
        <Row title={t('trace.title')} subtitle={t('trace.sub')} leading={<IconSquare name="git-commit" bg={colors.text} />} chevron onPress={() => router.push('/admin/trace')} last />
      </Group>
      <Group header={t('admin.joinCode')} footer={code ? t('admin.newCodeShown', { code }) : undefined}>
        <Row title={t('admin.newCode')} leading={<IconSquare name="key" bg={colors.accent} />} onPress={() => m && void adminApi.newJoinCode(m.id).then((r) => setCode(r.code))} last />
      </Group>
      {wide ? null : (<>
      {langs.length > 1 ? (
        <Group header={t('admin.language')} style={{ padding: spacing.md }}>
          <SegmentedControl<Lang> variant="answer" label={t('admin.language')} value={i18n.language as Lang}
            options={langs.map((l) => ({ value: l, label: l === 'pa' ? 'ਪੰਜਾਬੀ' : 'English' }))}
            onChange={(l) => { setLang(l); void initI18n(l); }} />
        </Group>
      ) : null}
      <Group header={t('me2.account')} footer={confirm ? t('auth.logoutConfirm') : undefined}>
        {roles.length > 1 ? <Row title={t('me2.switchRole')} chevron onPress={() => router.push('/choose')} /> : null}
        <Row title={t('auth.logout')} titleColor={colors.danger} onPress={() => (confirm ? void logout() : setConfirm(true))} last />
      </Group>
      </>)}
      <Group>
        <Row title={t('del.row')} titleColor={colors.danger} leading={<IconSquare name="trash" bg={colors.danger} />} chevron onPress={() => router.push('/delete-account')} last />
      </Group>
    </Screen>
  );
}
