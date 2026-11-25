/**
 * spec easy-redesign A5: admin Poll day tab (only when the super-admin turned Poll day on). Voting numbers like the
 * current app (voted of total, ours voted, not voted by group, needs help, by zone, booths with most of ours not
 * voted) and a button to Booth attendance (spec polling-day A2).
 */
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import { AppText, BarLine, Card, Donut, Icon, Screen, ShortcutTile, TileGroup } from '@/design/components';
import { themed } from '@/design/theme';
import { chart, colors, easy, group, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { TeamBar } from '@/features/shell/TeamBar';
import { SyncBadge } from '@/features/sync/SyncBadge';
import { useActiveMembership } from '@/stores/session';
import { metricOf, sumStats } from '../logic';
import { useMetricGo } from './PlaceView';
import { useBoothStats, type Scope } from './scope';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

export function AdminPollDay() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const scope: Scope = { view: 'zone' };
  const go = useMetricGo(scope);
  const bs = useBoothStats(scope);
  const poll = useQuery({ queryKey: ['poll', mid], queryFn: () => adminApi.poll(mid), enabled: !!mid, refetchInterval: 30_000 });
  const tot = sumStats(bs.data?.booths ?? []);
  const day = m?.pollingDay;
  return (
    <Screen header={<TeamBar trailing={<SyncBadge />} say={t('easy.say.poll')} />} trailing={<SyncBadge />}>
      <View style={s.live}>
        <Icon name="checkbox" size={22} color={colors.textOnAccent} />
        <AppText variant="body" weight="bold" color={colors.textOnAccent}>{day ? t('easy.pollLive', { from: day.opensAt, to: day.closesAt }) : t('easy.pollDay')}</AppText>
      </View>
      <View style={s.views}>
        <View style={[s.view, s.viewOn]}><Icon name="checkbox" size={20} color={colors.textOnAccent} /><AppText variant="body" weight="bold" color={colors.textOnAccent}>{t('easy.voting')}</AppText></View>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/admin/p-attendance' as never, params: { from: t('easy.pollDay') } })} style={({ pressed }) => [s.view, pressed && { opacity: 0.8 }]}>
          <Icon name="location" size={20} color={easy.active} /><AppText variant="body" weight="bold" color={easy.active}>{t('easy.attendance')}</AppText>
        </Pressable>
      </View>
      {!bs.data ? <QueryState loading={bs.isLoading} error={bs.isError} err={bs.error} onRetry={() => void bs.refetch()} /> : (
        <>
          <Card>
            <Donut a11y={t('easy.votedOf', { voted: fmt(tot.voted), total: fmt(tot.total) })} centre={`${tot.total ? Math.round((tot.voted / tot.total) * 100) : 0}%`} centreSub={t('easy.voted')}
              parts={[{ key: 'v', label: t('easy.voted'), value: tot.voted, color: chart.series }, { key: 'n', label: t('easy.f.notVoted'), value: tot.total - tot.voted, color: chart.none }]} />
            <AppText variant="headline" color={group.our.text}>{t('easy.oursVoted', { pct: tot.our ? Math.round((tot.ourVoted / tot.our) * 100) : 0, voted: fmt(tot.ourVoted), of: fmt(tot.our) })}</AppText>
          </Card>
          <TileGroup title={t('easy.notVotedYet')} icon="time" cols={2}>
            {[
              <ShortcutTile key="o" icon="thumbs-up" num={fmt(tot.our - tot.ourVoted)} word={t('groups.our')} tone="our" big onPress={() => go(metricOf('ourNotVoted')!)} />,
              <ShortcutTile key="t" icon="swap-horizontal" num={fmt(tot.target - tot.targetVoted)} word={t('groups.target')} tone="target" big onPress={() => go(metricOf('targetNotVoted')!)} />,
              <ShortcutTile key="p" icon="thumbs-down" num={fmt(tot.opp - tot.oppVoted)} word={t('groups.opp')} tone="opp" big onPress={() => go(metricOf('oppNotVoted')!)} />,
              <ShortcutTile key="h" icon="accessibility" num={fmt(tot.helpNeeded - tot.helpVoted)} word={t('easy.needsHelp')} big onPress={() => go(metricOf('helpNotVoted')!)} />,
            ]}
          </TileGroup>
          {poll.data?.zones.length ? (
            <Card>
              <AppText variant="headline" style={{ fontSize: 18 }}>{t('easy.votedByZone')}</AppText>
              {poll.data.zones.map((z) => <BarLine key={z.name} label={z.name} value={`${Math.round(z.pct)}%`} sub={`${fmt(z.voted)} / ${fmt(z.total)}`} pct={z.pct} />)}
            </Card>
          ) : null}
          {poll.data?.booths.length ? (
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <AppText variant="headline" style={{ fontSize: 18, paddingHorizontal: spacing.lg }}>{t('easy.mostOursNotVoted')}</AppText>
              {[...poll.data.booths].sort((a, b) => b.ourNotVoted - a.ourNotVoted).slice(0, 8).map((b) => (
                <Pressable key={b.no} accessibilityRole="button" onPress={() => router.push({ pathname: '/admin/place' as never, params: { view: 'zone', booth: String(b.no), from: t('easy.pollDay') } })} style={({ pressed }) => [s.row, pressed && { opacity: 0.8 }]}>
                  <View style={s.no}><AppText variant="headline" color={easy.bandText}>{b.no}</AppText></View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="headline" numberOfLines={1}>{b.name}</AppText>
                    <AppText variant="footnote" color={colors.textSecondary}>{t('easy.boothPollLine', { pct: Math.round(b.pct), help: b.helpPending })}</AppText>
                  </View>
                  <AppText variant="title2" color={group.our.text} tabular>{b.ourNotVoted}</AppText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  live: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.md, borderRadius: 16, backgroundColor: group.opp.strong },
  views: { flexDirection: 'row', gap: 6, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: 4, borderRadius: 16, backgroundColor: colors.fill },
  view: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderRadius: 12 },
  viewOn: { backgroundColor: easy.active },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: 16, borderWidth: 2, borderColor: group.our.strong, backgroundColor: group.our.card },
  no: { minWidth: 48, height: 40, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
}));
