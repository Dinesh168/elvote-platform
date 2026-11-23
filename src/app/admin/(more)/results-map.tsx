import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { adminApi, type ResultsMapBooth } from '@/api/adminApi';
import { AppText, Group, LargeTitle, Row, Screen, SegmentedControl } from '@/design/components';
import { themed } from '@/design/theme';
import { chart, colors, fonts, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useActiveMembership } from '@/stores/session';

const H = 340;
const PAD = 28;
const fmt = (n: number) => n.toLocaleString('en-IN');
const close = (b: ResultsMapBooth) => b.margin <= 0 && b.margin > -50;
/** Our share → one hue light → dark (3 steps). */
const shareStep = (pct: number) => chart.seq[pct < 30 ? 0 : pct < 45 ? 1 : 2];

/**
 * Admin → Map → Past results (spec map-trend T4): booths drawn from their coordinates (same map as the admin Map),
 * coloured by who won or by our share; a yellow ring marks booths lost by fewer than 50 votes. Tap a booth for its trend.
 */
export default function ResultsMapScreen() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const p = useLocalSearchParams<{ party?: string }>();
  const [year, setYear] = useState<number | undefined>();
  const [mode, setMode] = useState<'won' | 'share'>('won');
  const [w, setW] = useState(0);
  const party = p.party || undefined;
  const q = useQuery({ queryKey: ['results-map', mid, year ?? 0, party ?? ''], queryFn: () => adminApi.resultsMap(mid, { year, party }), enabled: !!mid });
  const d = q.data;
  const open = (no: number) => router.push({ pathname: '/admin/trend', params: { level: 'booth', key: String(no), party: d?.party ?? '', back: t('results.title') } });
  const booths = d?.booths ?? [];
  const located = booths.filter((b): b is ResultsMapBooth & { lat: number; lng: number } => b.lat != null && b.lng != null);
  const lats = located.map((b) => b.lat);
  const lngs = located.map((b) => b.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const x = (lng: number) => PAD + ((lng - minLng) / (maxLng - minLng || 1)) * (w - PAD * 2);
  const y = (lat: number) => PAD + (1 - (lat - minLat) / (maxLat - minLat || 1)) * (H - PAD * 2);
  const fill = (b: ResultsMapBooth) => (mode === 'share' ? shareStep(b.ours) : b.margin > 0 ? chart.our : colors.textSecondary);

  return (
    <Screen back={t('admin.tabs.more')}>
      <LargeTitle title={d?.year ? t('results.titleYear', { year: d.year }) : t('results.title')} subtitle={d?.party ? t('results.sub', { party: d.party }) : undefined} />
      {!d ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : !booths.length ? (
        <AppText variant="callout" color={colors.textSecondary} align="center" style={s.empty}>{t('trend.none')}</AppText>
      ) : (
        <>
          <View style={s.pad}>
            <SegmentedControl label={t('results.colourBy')} options={[{ value: 'won', label: t('results.whoWon') }, { value: 'share', label: t('results.ourShare') }]} value={mode} onChange={setMode} />
          </View>
          {d.years.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {d.years.map((yr) => {
                const on = yr === d.year;
                return (
                  <Pressable key={yr} accessibilityRole="radio" accessibilityState={{ selected: on, checked: on }} aria-checked={on} onPress={() => setYear(yr)} style={[s.chip, on && s.chipOn]}>
                    <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>{String(yr)}</AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          <Group footer={t('results.hint')}>
            {located.length ? (
              <View style={s.map} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityLabel={t('results.a11y', { won: d.legend.won, lost: d.legend.lost, close: d.legend.lostUnder50 })}>
                {w > 0 ? (
                  <Svg width={w} height={H}>
                    <Rect x={0} y={0} width={w} height={H} fill={colors.surface} />
                    {located.map((b) => (
                      <Circle key={b.partNo} cx={x(b.lng)} cy={y(b.lat)} r={12} fill={fill(b)} stroke={close(b) ? colors.warningFill : colors.surface} strokeWidth={close(b) ? 4 : 2} onPress={() => open(b.partNo)} />
                    ))}
                    {located.map((b) => (
                      <SvgText key={`t${b.partNo}`} x={x(b.lng)} y={y(b.lat) - 17} fontSize={10} fontFamily={fonts.medium} fill={colors.textSecondary} textAnchor="middle">{String(b.partNo)}</SvgText>
                    ))}
                  </Svg>
                ) : null}
              </View>
            ) : null}
            <View style={s.legend}>
              {(mode === 'won'
                ? [{ c: chart.our, l: t('results.won', { n: d.legend.won }) }, { c: colors.textSecondary, l: t('results.lost', { n: d.legend.lost }) }]
                : [{ c: chart.seq[0], l: '< 30%' }, { c: chart.seq[1], l: '30–45%' }, { c: chart.seq[2], l: '45%+' }]
              ).map((x2) => (
                <View key={x2.l} style={s.legendItem}><View style={[s.swatch, { backgroundColor: x2.c }]} /><AppText variant="footnote" color={colors.textSecondary}>{x2.l}</AppText></View>
              ))}
              <View style={s.legendItem}><View style={[s.swatch, s.ring]} /><AppText variant="footnote" color={colors.textSecondary}>{t('results.close', { n: d.legend.lostUnder50 })}</AppText></View>
            </View>
          </Group>
          <Group header={t('results.closest')}>
            {[...booths].sort((a, b) => Math.abs(a.margin) - Math.abs(b.margin)).map((b, i, arr) => (
              <Row key={b.partNo} title={`${b.partNo} · ${b.name}`} chevron onPress={() => open(b.partNo)} last={i === arr.length - 1}
                subtitle={`${t(b.margin > 0 ? 'trend.wonBy' : 'trend.lostBy', { n: fmt(Math.abs(b.margin)) })}${b.prevOurs === null ? '' : ` · ${t('results.before', { pct: b.prevOurs })}`} · ${t('results.metNow', { pct: b.metPct })}`}
                value={`${b.ours}%`} leading={<View style={[s.dot, { backgroundColor: fill(b) }, close(b) && s.ring]} />} />
            ))}
          </Group>
        </>
      )}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  empty: { padding: spacing.xxxl },
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  chip: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.surface, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.accent },
  map: { height: H, borderRadius: radius.lg, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, padding: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  ring: { borderWidth: 3, borderColor: colors.warningFill, backgroundColor: colors.surface },
  dot: { width: 16, height: 16, borderRadius: 8 },
}));
