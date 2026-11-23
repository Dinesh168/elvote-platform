import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi, type BoothGroup, type Trend, type TrendChild, type TrendLevel, type TrendYear } from '@/api/adminApi';
import { AppText, Button, Group, IconSquare, LargeTitle, PartyShare, ProgressBar, Row, Screen, SegmentedControl, ShareTrend } from '@/design/components';
import { themed } from '@/design/theme';
import { chart, colors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useActiveMembership } from '@/stores/session';

const UUID = /^[0-9a-f-]{36}$/i;
const fmt = (n: number) => n.toLocaleString('en-IN');
const groupColor = (g: BoothGroup | null | undefined) => (g === 'safe' ? colors.success : g === 'tough' ? colors.danger : colors.warning);

/** Where a child row opens (spec map-trend T3): assembly → zone (or booth), zone / village → booth. */
function nextOf(level: TrendLevel, child: TrendChild): { level: TrendLevel; key: string } {
  if (level === 'assembly') return { level: UUID.test(child.key) || child.key === 'none' ? 'zone' : 'booth', key: child.key };
  if (level === 'village' && !/^\d+$/.test(child.key)) return { level: 'village', key: child.key };
  return { level: 'booth', key: child.key };
}

/**
 * Admin → Map & Trend (spec map-trend T3/T5): past results of the admin's own assembly. The admin only picks the party
 * and the level; tapping a zone, village or booth goes one level down, Back goes up. Results are loaded by the super-admin.
 */
export default function TrendScreen() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const p = useLocalSearchParams<{ level?: TrendLevel; key?: string; party?: string; back?: string }>();
  const [byVillage, setByVillage] = useState(p.level === 'village');
  const level: TrendLevel = p.level === 'zone' || p.level === 'booth' ? p.level : byVillage ? 'village' : 'assembly';
  const [party, setParty] = useState<string | undefined>(p.party);
  const q = useQuery({ queryKey: ['trend', mid, level, p.key ?? '', party ?? ''], queryFn: () => adminApi.trend(mid, { level, key: p.key, party }), enabled: !!mid });
  const d = q.data;
  const open = (c: TrendChild) => router.push({ pathname: '/admin/trend', params: { ...nextOf(level, c), party: d?.party ?? '', back: d?.name ?? '' } });
  const top = level === 'assembly' || (level === 'village' && !p.key);

  return (
    <Screen back={p.back || t('admin.tabs.more')}>
      <LargeTitle title={top ? t('trend.title') : d?.name ?? ''} subtitle={m ? t('admin.acTitle', { no: m.acNo, name: m.acName }) : undefined} />
      {!d ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : !d.years.length ? (
        <AppText variant="callout" color={colors.textSecondary} align="center" style={s.empty}>{t('trend.none')}</AppText>
      ) : (
        <>
          {d.parties.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {d.parties.map((code) => {
                const on = code === d.party;
                return (
                  <Pressable key={code} accessibilityRole="radio" accessibilityState={{ selected: on, checked: on }} aria-checked={on} onPress={() => setParty(code)} style={[s.chip, on && s.chipOn]}>
                    <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>{code}</AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          {top ? (
            <View style={s.pad}>
              <SegmentedControl label={t('trend.levelLabel')} options={[{ value: 'zone', label: t('trend.byZone') }, { value: 'village', label: t('trend.byVillage') }]}
                value={byVillage ? 'village' : 'zone'} onChange={(v) => setByVillage(v === 'village')} />
            </View>
          ) : null}
          <Hero d={d} />
          {d.toWin ? <ToWin d={d} /> : null}
          {/* spec flow-fixes O3: vote share as charts; the year rows below stay as the table view. */}
          <Group header={t('trend.shareChart', { year: d.years.at(-1)!.year })}>
            <PartyShare shares={d.years.at(-1)!.shares} ours={d.party ?? ''} a11yLabel={t('trend.shareChart', { year: d.years.at(-1)!.year })} />
          </Group>
          {d.years.length > 1 ? (() => {
            const rival = Object.entries(d.years.at(-1)!.shares).filter(([k]) => k !== d.party).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
            return (
              <Group header={t('trend.overYears')}>
                <ShareTrend ours={d.party ?? ''} rival={rival} a11yLabel={t('trend.overYears')}
                  years={d.years.map((y) => ({ year: y.year, ours: y.ours, rival: y.shares[rival] ?? 0 }))} />
              </Group>
            );
          })() : null}
          <Group header={t('trend.byYear')} footer={d.sample ? t('trend.sample') : t('trend.source')}>
            {[...d.years].reverse().map((y, i, arr) => <YearBar key={y.year} y={y} party={d.party ?? ''} last={i === arr.length - 1} />)}
          </Group>
          {d.closeLosses.length ? (
            <Group>
              <Row title={t('trend.closeLosses', { count: d.closeLosses.length })} subtitle={t('trend.closeSub')} leading={<IconSquare name="map" bg={colors.warning} />}
                chevron onPress={() => router.push({ pathname: '/admin/results-map', params: { party: d.party ?? '' } })} last={level !== 'assembly'} />
              {level === 'assembly' ? <Row title={t('win.title')} subtitle={t('win.rowSub')} leading={<IconSquare name="trophy" bg={colors.success} />} chevron onPress={() => router.push({ pathname: '/admin/win-plan', params: { party: d.party ?? '' } })} last /> : null}
            </Group>
          ) : null}
          {d.children.length ? (
            <Group header={t(level === 'assembly' ? 'trend.children.assembly' : level === 'village' && !p.key ? 'trend.children.villages' : 'trend.children.booths')}>
              {d.children.map((c, i) => (
                <Row key={c.key} title={c.name} chevron onPress={() => open(c)} last={i === d.children.length - 1}
                  subtitle={c.margin === null ? undefined : `${t(`win.${c.group ?? 'swing'}`)} · ${t(c.margin > 0 ? 'trend.wonBy' : 'trend.lostBy', { n: fmt(Math.abs(c.margin)) })}`}
                  leading={<View style={[s.dot, { backgroundColor: groupColor(c.group) }]} />}
                  value={c.ours === null ? '' : `${c.ours}%${c.swing === null ? '' : ` ${c.swing >= 0 ? '▲' : '▼'}${Math.abs(c.swing)}`}`}
                  a11yLabel={t('trend.childA11y', { name: c.name, ours: c.ours ?? 0, swing: c.swing ?? 0, margin: c.margin ?? 0 })} />
              ))}
            </Group>
          ) : null}
          {level === 'booth' && p.key ? (
            <View style={[s.pad, s.actions]}>
              <Button kind="tinted" label={t('trend.boothDetails')} onPress={() => router.push({ pathname: '/admin/booth', params: { no: p.key! } })} style={s.flex} />
              <Button label={t('trend.startTask')} onPress={() => router.push('/admin/tasks')} style={s.flex} />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Hero({ d }: { d: Trend }) {
  const { t } = useTranslation();
  const last = d.years.at(-1)!;
  const prev = d.years.at(-2);
  const up = (d.swing ?? 0) >= 0;
  return (
    <View style={s.hero} accessible accessibilityLabel={t('trend.heroA11y', { party: d.party, year: last.year, ours: last.ours, swing: d.swing ?? 0 })}>
      <View style={s.flex}>
        <AppText variant="caption" color={colors.textOnAccent}>{t('trend.ourShare', { party: d.party, year: last.year })}</AppText>
        <AppText variant="largeTitle" color={colors.textOnAccent} tabular>{`${last.ours}%`}</AppText>
        <AppText variant="footnote" color={colors.textOnAccent}>{t(last.margin > 0 ? 'trend.wonBy' : 'trend.lostBy', { n: fmt(Math.abs(last.margin)) })}</AppText>
      </View>
      {d.swing !== null && prev ? (
        <View style={s.swing}>
          <AppText variant="title2" color={colors.textOnAccent} tabular>{`${up ? '▲' : '▼'} ${Math.abs(d.swing)}%`}</AppText>
          <AppText variant="caption" color={colors.textOnAccent}>{t('trend.since', { year: prev.year })}</AppText>
        </View>
      ) : null}
    </View>
  );
}

function YearBar({ y, party, last }: { y: TrendYear; party: string; last: boolean }) {
  const { t } = useTranslation();
  const rival = Object.entries(y.shares).filter(([k]) => k !== party).sort((a, b) => b[1] - a[1])[0];
  const others = Math.max(0, 100 - y.ours - (rival?.[1] ?? 0));
  return (
    <View style={[s.year, !last && s.sep]} accessible accessibilityLabel={t('trend.yearA11y', { year: y.year, party, ours: y.ours, rival: rival?.[0] ?? '', rivalPct: rival?.[1] ?? 0 })}>
      <View style={s.yearTop}>
        <AppText variant="headline" tabular>{String(y.year)}</AppText>
        <AppText variant="footnote" color={colors.textSecondary}>{`${party} ${y.ours}% · ${rival?.[0] ?? ''} ${rival?.[1] ?? 0}%${y.estimated ? ` · ${t('trend.estimated', { count: y.estimated })}` : ''}`}</AppText>
      </View>
      <View style={s.bar}>
        <View style={{ width: `${y.ours}%`, backgroundColor: chart.our }} />
        <View style={{ width: `${rival?.[1] ?? 0}%`, backgroundColor: colors.textSecondary }} />
        <View style={{ width: `${others}%`, backgroundColor: chart.none }} />
      </View>
    </View>
  );
}

function ToWin({ d }: { d: Trend }) {
  const { t } = useTranslation();
  const w = d.toWin!;
  return (
    <Group header={t('trend.toWin')} footer={t('trend.toWinNote')}>
      <View style={s.card}>
        <View style={s.yearTop}>
          <AppText variant="callout" color={colors.textSecondary}>{t('trend.needAbout')}</AppText>
          <AppText variant="title2" tabular>{t('trend.oursN', { n: fmt(w.needed) })}</AppText>
        </View>
        <ProgressBar value={w.needed ? w.oursFound / w.needed : 0} color={chart.our} label={t('trend.toWinA11y', { found: w.oursFound, needed: w.needed })} />
        <View style={s.yearTop}>
          <AppText variant="footnote" weight="semibold" color={colors.successText}>{t('trend.found', { n: fmt(w.oursFound) })}</AppText>
          <AppText variant="footnote" weight="semibold" color={colors.warning}>{t('trend.toGo', { n: fmt(w.toGo) })}</AppText>
        </View>
      </View>
    </Group>
  );
}

const s = themed(() => StyleSheet.create({
  empty: { padding: spacing.xxxl },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  chip: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.surface, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.accent },
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  hero: { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.success },
  swing: { alignItems: 'flex-end' },
  flex: { flex: 1 },
  year: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  sep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  yearTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: chart.track, gap: 2 },
  card: { padding: spacing.lg, gap: spacing.sm },
  dot: { width: 14, height: 14, borderRadius: 7 },
  actions: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.xl },
}));
