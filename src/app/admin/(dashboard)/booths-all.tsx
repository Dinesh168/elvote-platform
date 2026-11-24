import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi, type BoothRow } from '@/api/adminApi';
import { AppText, Group, Icon, LargeTitle, Screen, SegmentedControl } from '@/design/components';
import { themed } from '@/design/theme';
import { chart, colors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useActiveMembership } from '@/stores/session';

type View_ = 'zone' | 'area' | 'village';
type Focus = 'our' | 'target' | 'opp' | 'notMet' | undefined;
type Sums = { total: number; met: number; our: number; target: number; opp: number };
const sum = (rows: BoothRow[]): Sums => rows.reduce((a, b) => ({ total: a.total + b.total, met: a.met + b.met, our: a.our + b.our, target: a.target + b.target, opp: a.opp + b.opp }), { total: 0, met: 0, our: 0, target: 0, opp: 0 });
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
const share = (x: Sums, f: Focus) => (f === 'notMet' ? pct(x.total - x.met, x.total) : f ? pct(x[f], x.total) : pct(x.met, x.total));

/**
 * spec admin-views A2: every booth with an overview bar (Our / Target / Opp / Not met), grouped by the levels the
 * super-admin allows (zone, area, village). Tap a group to open it, a booth to open its dashboard.
 */
export default function AllBooths() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const f = (['our', 'target', 'opp', 'notMet'].includes(focus ?? '') ? focus : undefined) as Focus;
  const views = (m?.views?.length ? m.views : ['zone']) as View_[];
  const [by, setBy] = useState<View_>(views[0]);
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['boothTable', mid, 'all'], queryFn: () => adminApi.boothTable(mid), enabled: !!mid, staleTime: 60_000 });

  const groups = useMemo(() => {
    const rows = q.data ?? [];
    const key = (b: BoothRow) => (by === 'zone' ? b.zone : by === 'area' ? b.area : b.village) ?? '';
    const map = new Map<string, BoothRow[]>();
    for (const b of rows) map.set(key(b), [...(map.get(key(b)) ?? []), b]);
    return [...map.entries()]
      .map(([k, list]) => ({ key: k, list: [...list].sort((a, b) => share(a, f) - share(b, f)), sums: sum(list) }))
      .sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : share(a.sums, f) - share(b.sums, f)));
  }, [q.data, by, f]);
  const all = useMemo(() => sum(q.data ?? []), [q.data]);
  const label = { zone: t('allb.zone'), area: t('allb.area'), village: t('allb.village') };
  const none = { zone: t('admin.noZone'), area: t('allb.noArea'), village: t('allb.noVillage') };

  return (
    <Screen back={t('admin.tabs.dashboard')} width="medium">
      <LargeTitle title={t('allb.title')} subtitle={f ? t('allb.sortedBy', { what: t(`allb.focus.${f}`) }) : t('allb.sub')} />
      {views.length > 1 ? (
        <View style={s.pad}>
          <SegmentedControl<View_> label={t('allb.viewBy')} value={by} onChange={(v) => { setBy(v); setOpen(null); }} options={views.map((v) => ({ value: v, label: label[v] }))} />
        </View>
      ) : null}
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Group header={t('allb.overall')}>
            <View style={s.row}><Bar x={all} /><Legend x={all} /></View>
          </Group>
          <Group header={t('allb.groups', { what: label[by] })} footer={t('allb.foot')}>
            {groups.map((g, i) => {
              const isOpen = open === g.key;
              const name = g.key || none[by];
              return (
                <View key={g.key || '_none'} style={[i < groups.length - 1 && s.sep]}>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
                    accessibilityLabel={`${name}, ${g.list.length} ${t('allb.booths')}, ${pct(g.sums.met, g.sums.total)}% ${t('allb.met')}`}
                    onPress={() => setOpen(isOpen ? null : g.key)} style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.pressed }]}>
                    <View style={s.head}>
                      <Icon name={isOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textSecondary} />
                      <AppText variant="headline" style={s.flex} numberOfLines={1}>{name}</AppText>
                      <AppText variant="footnote" color={colors.textSecondary}>{`${g.list.length} ${t('allb.booths')}`}</AppText>
                      <AppText variant="callout" weight="semibold" tabular style={s.pct}>{`${share(g.sums, f)}%`}</AppText>
                    </View>
                    <Bar x={g.sums} />
                  </Pressable>
                  {isOpen ? g.list.map((b) => (
                    <Pressable key={b.no} accessibilityRole="button" accessibilityLabel={`${b.no} ${b.name}, ${pct(b.met, b.total)}% ${t('allb.met')}`}
                      onPress={() => router.push({ pathname: '/admin/booth', params: { no: String(b.no) } })} style={({ pressed }) => [s.booth, pressed && { backgroundColor: colors.pressed }]}>
                      <View style={s.head}>
                        <AppText variant="callout" style={s.flex} numberOfLines={1}>{`${b.no} · ${b.name}`}</AppText>
                        <AppText variant="footnote" weight="semibold" tabular style={s.pct}>{`${share(b, f)}%`}</AppText>
                      </View>
                      <Bar x={b} thin />
                    </Pressable>
                  )) : null}
                </View>
              );
            })}
          </Group>
        </>
      )}
    </Screen>
  );
}

/** 100% bar: Our · Target · Opp · Not met (2px gaps, never colour alone: the legend and % carry the numbers). */
function Bar({ x, thin }: { x: Sums; thin?: boolean }) {
  const parts = [
    { k: 'our', v: x.our, c: chart.our }, { k: 'target', v: x.target, c: chart.target }, { k: 'opp', v: x.opp, c: chart.opp },
    { k: 'none', v: Math.max(0, x.total - x.our - x.target - x.opp), c: chart.none },
  ].filter((p) => p.v > 0);
  return (
    <View style={[s.bar, thin && s.thin]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {parts.map((p) => <View key={p.k} style={{ flex: p.v, backgroundColor: p.c }} />)}
    </View>
  );
}

function Legend({ x }: { x: Sums }) {
  const { t } = useTranslation();
  const items: [string, number, string][] = [[t('groups.our'), x.our, chart.our], [t('groups.target'), x.target, chart.target], [t('groups.opp'), x.opp, chart.opp], [t('admin.notMet'), x.total - x.met, chart.none]];
  return (
    <View style={s.legend}>
      {items.map(([l, n, c]) => (
        <View key={l} style={s.li}>
          <View style={[s.dot, { backgroundColor: c }]} />
          <AppText variant="footnote">{`${l} ${n.toLocaleString('en-IN')} · ${pct(n, x.total)}%`}</AppText>
        </View>
      ))}
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  booth: { paddingLeft: spacing.xxxl, paddingRight: spacing.lg, paddingVertical: spacing.sm, gap: 6, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  pct: { minWidth: 44, textAlign: 'right' },
  sep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  bar: { flexDirection: 'row', height: 12, gap: 2, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: chart.track },
  thin: { height: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  li: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
}));
