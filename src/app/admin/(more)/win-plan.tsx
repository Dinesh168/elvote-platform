import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi, type BoothGroup } from '@/api/adminApi';
import { AppText, Button, Group, LargeTitle, ProgressBar, Row, Screen } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useActiveMembership } from '@/stores/session';

const fmt = (n: number) => n.toLocaleString('en-IN');
const GROUPS: { key: BoothGroup; color: string }[] = [
  { key: 'swing', color: colors.warning },
  { key: 'tough', color: colors.danger },
  { key: 'safe', color: colors.success },
];

/**
 * Admin → Win plan (spec map-trend W1): votes needed to win the assembly, how many "ours" the team has found, and the
 * booths in three groups by the last margin (Safe ≥ 100, Swing within 100, Tough lost by > 100). Swing comes first.
 */
export default function WinPlanScreen() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const p = useLocalSearchParams<{ party?: string }>();
  const q = useQuery({ queryKey: ['win-plan', mid, p.party ?? ''], queryFn: () => adminApi.winPlan(mid, p.party || undefined), enabled: !!mid });
  const d = q.data;
  const booth = (no: number) => router.push({ pathname: '/admin/trend', params: { level: 'booth', key: String(no), party: d?.party ?? '', back: t('win.title') } });

  return (
    <Screen back={t('admin.tabs.more')}>
      <LargeTitle title={t('win.title')} subtitle={m ? t('admin.acTitle', { no: m.acNo, name: m.acName }) : undefined} />
      {!d ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : d.needed === null ? (
        <AppText variant="callout" color={colors.textSecondary} align="center" style={s.empty}>{t('trend.none')}</AppText>
      ) : (
        <>
          <View style={s.hero} accessible accessibilityLabel={t('win.heroA11y', { needed: d.needed, found: d.oursFound, toGo: d.toGo ?? 0 })}>
            <AppText variant="caption" color={colors.textOnAccent}>{t('win.needed')}</AppText>
            <AppText variant="largeTitle" color={colors.textOnAccent} tabular>{fmt(d.needed)}</AppText>
            <AppText variant="footnote" color={colors.textOnAccent}>{t('win.rival', { n: fmt(d.rivalVotes ?? 0), year: d.year })}</AppText>
            <ProgressBar value={d.needed ? d.oursFound / d.needed : 0} color={colors.successFill} />
            <View style={s.between}>
              <AppText variant="footnote" weight="semibold" color={colors.textOnAccent}>{t('trend.found', { n: fmt(d.oursFound) })}</AppText>
              <AppText variant="footnote" weight="semibold" color={colors.textOnAccent}>{t('trend.toGo', { n: fmt(d.toGo ?? 0) })}</AppText>
            </View>
          </View>
          {d.uncoveredSwing.length ? (
            <View style={s.alert}>
              <AppText variant="headline" color={colors.danger}>{t('win.uncovered', { count: d.uncoveredSwing.length })}</AppText>
              <AppText variant="footnote" color={colors.textSecondary}>{t('win.uncoveredSub', { booths: d.uncoveredSwing.join(', ') })}</AppText>
              <Button kind="danger" compact label={t('win.assign')} onPress={() => router.push('/admin/team')} />
            </View>
          ) : null}
          {GROUPS.map((g) => (
            <Group key={g.key} header={`${t(`win.${g.key}`)} · ${d.groups[g.key].count}`} footer={t(`win.${g.key}Do`)}>
              {d.groups[g.key].booths.length ? d.groups[g.key].booths.map((no, i, arr) => (
                <Row key={no} title={t('win.booth', { no })} chevron onPress={() => booth(no)} last={i === arr.length - 1}
                  leading={<View style={[s.dot, { backgroundColor: g.color }]} />}
                  subtitle={d.uncoveredSwing.includes(no) ? t('win.noVolunteer') : undefined} />
              )) : <Row title={t('win.empty')} last />}
            </Group>
          ))}
        </>
      )}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  empty: { padding: spacing.xxxl },
  hero: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.accent },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  alert: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.dangerTint },
  dot: { width: 14, height: 14, borderRadius: 7 },
}));
