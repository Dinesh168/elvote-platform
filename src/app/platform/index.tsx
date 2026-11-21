import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LANGS } from '@/i18n';
import { LanguageRow } from '@/features/shell/LanguageRow';
import { platformApi } from '@/api/adminApi';
import { AppText, BarList, Grid, Group, IconSquare, LargeTitle, Row, Screen, TileRow } from '@/design/components';
import { useWide } from '@/design/layout';
import { colors, radius, spacing, web } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { logout, rolesOf } from '@/features/session/session';
import { useSession } from '@/stores/session';

const fmt = (n: number) => n.toLocaleString('en-IN');

/** Super-admin home: totals per state, parties at work, and the platform tools. */
export default function PlatformHome() {
  const { t } = useTranslation();
  const me = useSession((s) => s.me);
  const q = useQuery({ queryKey: ['overview'], queryFn: platformApi.overview });
  const [confirm, setConfirm] = useState(false);
  const wide = useWide();
  const o = q.data;
  const totals = o?.states.reduce((a, s) => ({ voters: a.voters + s.voters, booths: a.booths + s.booths, acs: a.acs + s.acs }), { voters: 0, booths: 0, acs: 0 });
  return (
    <Screen>
      <LargeTitle title={t('platform.title')} subtitle={`${t('platform.subtitle')} · ${me?.user.name ?? ''}`} />
      {!o || !totals ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <TileRow>
            <Tile label={t('admin.totalVoters')} value={fmt(totals.voters)} />
            <Tile label={t('platform.states')} value={String(o.states.length)} />
            <Tile label={t('platform.ac')} value={String(totals.acs)} />
            <Tile label={t('admin.booths')} value={fmt(totals.booths)} />
          </TileRow>
          <Grid cols={2}>
          <Group header={t('platform.states')}>
            {o.states.map((st, i) => (
              <Row key={st.code} title={`${st.name}${st.nameLocal ? ` · ${st.nameLocal}` : ''}`} subtitle={t('platform.stateRow', { count: st.acs, acs: st.acs, booths: fmt(st.booths), voters: fmt(st.voters) })} last={i === o.states.length - 1} />
            ))}
          </Group>
          <Group header={t('platform.partyAcs')}>
            <BarList
              a11yLabel={t('platform.partyAcs')}
              max={100}
              items={o.partyAcs.map((p) => ({ key: p.id, label: `${p.partyName} · ${p.stateCode} ${p.acNo} ${p.acName}`, value: p.voters ? Math.round((p.met / p.voters) * 100) : 0, display: `${p.voters ? Math.round((p.met / p.voters) * 100) : 0}%`, sub: t('platform.partyAcRow', { volunteers: p.volunteers, met: fmt(p.met), voters: fmt(p.voters) }) }))}
              onPress={(id) => router.push({ pathname: '/platform/customer/[id]', params: { id } })}
            />
          </Group>
          </Grid>
          {wide ? null : (<>
          <Group>
            <Row title={t('requests.title')} leading={<IconSquare name="person-add" bg={colors.warning} />} chevron onPress={() => router.push('/platform/requests')} />
            <Row title={t('cms.customers')} leading={<IconSquare name="briefcase" bg={colors.accent} />} chevron onPress={() => router.push('/platform/customers')} />
            <Row title={t('platform.parties')} leading={<IconSquare name="flag" bg={colors.accent} />} chevron onPress={() => router.push('/platform/parties')} />
            <Row title={t('pd.elections')} leading={<IconSquare name="calendar" bg={colors.danger} />} chevron onPress={() => router.push('/platform/elections')} />
            <Row title={t('pd.boothsTitle')} leading={<IconSquare name="location" bg={colors.success} />} chevron onPress={() => router.push('/platform/booths')} />
            <Row title={t('users.title')} leading={<IconSquare name="people" bg={colors.iconGender} />} chevron onPress={() => router.push('/platform/users')} />
            <Row title={t('trace.title')} leading={<IconSquare name="git-commit" bg={colors.text} />} chevron onPress={() => router.push('/platform/trace')} />
            <Row title={t('platform.upload')} leading={<IconSquare name="cloud-upload" bg={colors.success} />} chevron onPress={() => router.push('/platform/upload')} />
            <Row title={t('platform.superAdmins')} leading={<IconSquare name="shield-checkmark" bg={colors.text} />} chevron onPress={() => router.push('/platform/super-admins')} last />
          </Group>
          <Group header={t('me2.account')} footer={confirm ? t('auth.logoutConfirm') : undefined}>
            {me && rolesOf(me).length > 1 ? <Row title={t('me2.switchRole')} chevron onPress={() => router.push('/choose')} /> : null}
            <Row title={t('auth.logout')} titleColor={colors.danger} onPress={() => (confirm ? void logout() : setConfirm(true))} last />
          </Group>
          </>)}
          <Group header={t('me2.settings')}>
            <LanguageRow langs={LANGS} />
          </Group>
        </>
      )}
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  const wide = useWide();
  return (
    <View style={[s.tile, wide && s.tileWide]} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="footnote" color={colors.textSecondary}>{label}</AppText>
      <AppText variant={wide ? 'largeTitle' : 'title2'} tabular>{value}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: 2 },
  tileWide: { borderWidth: 1, borderColor: web.border, paddingVertical: spacing.xl },
});
