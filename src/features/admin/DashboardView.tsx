import { useQuery } from '@tanstack/react-query';
import { themed } from '@/design/theme';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import {
  AppText, BarList, ChoiceRow, Columns, DataTable, Grid, Group, Icon, LangPill, LargeTitle, Row, Screen, Sheet, StackedBar, TileRow, groupParts,
} from '@/design/components';
import { useWide } from '@/design/layout';
import { chart, colors, radius, spacing, web } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { activate, rolesOf } from '@/features/session/session';
import { useActiveMembership, useSession } from '@/stores/session';
import { RollStrip } from './RollStrip';

const fmt = (n: number) => n.toLocaleString('en-IN');
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

/** Admin dashboard (A-DASH-1…6). With `booth`, the same numbers for one booth. */
export function DashboardView({ booth }: { booth?: number }) {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const me = useSession((s) => s.me);
  const [zone, setZone] = useState<string | undefined>();
  const [acSheet, setAcSheet] = useState(false);
  const wide = useWide();
  const mid = m?.id ?? '';
  const q = useQuery({ queryKey: ['dash', mid, zone ?? '', booth ?? 0], queryFn: () => adminApi.dashboard(mid, { zone, booth }), enabled: !!mid, refetchInterval: 30_000 });
  const tableQ = useQuery({ queryKey: ['boothTable', mid, zone ?? ''], queryFn: () => adminApi.boothTable(mid, zone), enabled: !!mid && !booth });
  const adminAcs = me ? rolesOf(me).filter((r) => r.mode === 'admin') : [];
  const d = q.data;
  const g = { our: t('groups.our'), target: t('groups.target'), opp: t('groups.opp') };

  return (
    <Screen back={booth ? t('admin.tabs.dashboard') : undefined} trailing={<LangPill />}>
      <LargeTitle
        title={booth ? t('admin.boothDash', { no: booth }) : t('admin.tabs.dashboard')}
        subtitle={m ? (!booth && adminAcs.length > 1 ? m.partyName : `${m.partyName} · ${t('admin.acTitle', { no: m.acNo, name: m.acName })}`) : undefined}
      />
      {!booth ? <RollStrip mid={mid} /> : null}
      {!booth && adminAcs.length > 1 && !wide ? (
        <Pressable accessibilityRole="button" onPress={() => setAcSheet(true)} style={s.acSwitch}>
          <AppText variant="callout" color={colors.accent}>{t('admin.acTitle', { no: m?.acNo, name: m?.acName })}</AppText>
          <Icon name="chevron-down" size={16} color={colors.accent} />
        </Pressable>
      ) : null}

      {!booth && d ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {[{ id: undefined, name: t('admin.allZones') }, ...d.charts.zones.map((z) => ({ id: z.id as string | undefined, name: z.name }))].map((z) => {
            const on = zone === z.id;
            return (
              <Pressable key={z.id ?? 'all'} accessibilityRole="radio" accessibilityState={{ selected: on, checked: on }} aria-checked={on} onPress={() => setZone(z.id)} style={[s.chip, on && s.chipOn]}>
                <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>{z.name}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {!d ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <TileRow>
            <Tile label={t('admin.visitedToday')} value={fmt(d.visitedToday)} />
            <Tile label={t('admin.contacted')} value={`${pct(d.totals.met, d.totals.total)}%`} sub={`${fmt(d.totals.met)} / ${fmt(d.totals.total)}`} />
            <Tile label={t('admin.notContacted')} value={fmt(d.totals.total - d.totals.met)} sub={`${pct(d.totals.total - d.totals.met, d.totals.total)}%`} />
            <Tile label={t('admin.housesVisited')} value={`${pct(d.totals.housesVisited, d.totals.houses)}%`} sub={`${fmt(d.totals.housesVisited)} / ${fmt(d.totals.houses)}`} />
          </TileRow>

          <Grid cols={2}>

          <Group header={t('admin.groups')}>
            <StackedBar a11yLabel={t('admin.groups')} parts={groupParts({ ...d.charts.groups, none: d.charts.groups.notMet }, { ...g, none: t('admin.notMet') })} />
          </Group>

          <Group header={t('admin.housesByGroup')}>
            <StackedBar a11yLabel={t('admin.housesByGroup')} parts={groupParts({ ...d.charts.houses, none: d.charts.houses.notVisited }, { ...g, none: t('admin.notVisited') })} />
          </Group>

          <Group header={t('admin.trend')}>
            <Columns a11yLabel={t('admin.trend')} items={d.charts.trend.map((x) => ({ key: x.day, label: String(Number(x.day.slice(8))), value: x.contacted }))} />
          </Group>

          {!booth ? (
            <Group header={t('admin.zonePerf')}>
              <BarList
                a11yLabel={t('admin.zonePerf')}
                max={100}
                items={[...d.charts.zones].sort((a, b) => b.pct - a.pct).map((z) => ({ key: z.id, label: z.name, value: z.pct, display: `${z.pct}%`, sub: t('admin.zoneBooths', { n: z.booths }) }))}
                onPress={(id) => setZone(id)}
              />
            </Group>
          ) : null}

          <Group header={t('admin.ages')}>
            <BarList a11yLabel={t('admin.ages')} items={[
              { key: 'ft', label: t('admin.firstTime'), value: d.charts.ages.firstTime },
              { key: 'y', label: t('admin.young'), value: d.charts.ages.young },
              { key: 'm', label: t('admin.mid'), value: d.charts.ages.mid },
              { key: 's', label: t('admin.senior'), value: d.charts.ages.senior },
            ]} />
          </Group>

          <Group header={t('admin.mobiles')}>
            <Row title={t('admin.withMobile')} value={fmt(d.totals.withMobile)} />
            <Row title={t('admin.groupMobile', { group: g.our })} value={fmt(d.totals.ourMobile)} leading={<Dot color={chart.our} />} />
            <Row title={t('admin.groupMobile', { group: g.target })} value={fmt(d.totals.targetMobile)} leading={<Dot color={chart.target} />} />
            <Row title={t('admin.groupMobile', { group: g.opp })} value={fmt(d.totals.oppMobile)} leading={<Dot color={chart.opp} />} />
            <Row title={t('admin.housesWithMobile')} value={fmt(d.totals.housesWithMobile)} last />
          </Group>

          <Group header={t('admin.gender')}>
            <Row title={t('admin.male')} value={fmt(d.totals.male)} />
            <Row title={t('admin.female')} value={fmt(d.totals.female)} />
            <Row title={t('admin.third')} value={fmt(d.totals.third)} />
            <Row title={t('admin.migrated')} value={fmt(d.totals.moved)} />
            <Row title={t('admin.helpNeeded')} value={fmt(d.totals.helpNeeded)} last />
          </Group>

          {!booth ? (
            <Group header={t('admin.booths')}>
              <BarList a11yLabel={t('admin.strength')} items={[
                { key: 'S', label: t('admin.strong'), value: d.pollingStations.strong },
                { key: 'M', label: t('admin.moderate'), value: d.pollingStations.moderate },
                { key: 'W', label: t('admin.weak'), value: d.pollingStations.weak },
              ]} />
              <Row title={t('admin.withWorker')} value={fmt(d.pollingStations.withWorker)} />
              <Row title={t('admin.withoutWorker')} value={fmt(d.pollingStations.withoutWorker)} last />
            </Group>
          ) : null}

          {!booth && d.topWorkers.length ? (
            <Group header={t('admin.topWorkers')}>
              {d.topWorkers.map((w, i) => (
                <Row key={w.userId} title={`${i + 1}. ${w.name || t('del.deletedUser')}`} subtitle={t('admin.todayTotal', { today: w.today, total: w.contacted })} value={fmt(w.contacted)} last={i === d.topWorkers.length - 1} />
              ))}
            </Group>
          ) : null}

          </Grid>

          {!booth && tableQ.data && wide ? (
            <View style={s.tableWrap}>
              <AppText variant="headline" accessibilityRole="header" style={s.tableTitle}>{t('admin.boothTable')}</AppText>
              <DataTable
                rows={tableQ.data}
                rowKey={(b) => String(b.no)}
                initialSort={{ key: 'no', dir: 'asc' }}
                onRowPress={(b) => router.push({ pathname: '/admin/booth', params: { no: String(b.no) } })}
                rowA11y={(b) => `${t('common.booth', { no: b.no })}, ${b.name}, ${pct(b.met, b.total)}%`}
                columns={[
                  { key: 'no', label: t('admin.col.booth'), value: (b) => b.no, flex: 0.6 },
                  { key: 'name', label: t('admin.col.name'), value: (b) => b.name, flex: 2.4 },
                  { key: 'zone', label: t('admin.col.zone'), value: (b) => b.zone ?? t('admin.noZone'), flex: 1 },
                  { key: 'met', label: t('admin.col.met'), value: (b) => b.met, render: (b) => <AppText variant="callout" tabular>{fmt(b.met)}</AppText>, align: 'right', flex: 0.9 },
                  { key: 'total', label: t('admin.col.total'), value: (b) => b.total, render: (b) => <AppText variant="callout" tabular>{fmt(b.total)}</AppText>, align: 'right', flex: 0.9 },
                  { key: 'pct', label: t('admin.col.pct'), value: (b) => pct(b.met, b.total), render: (b) => <PctCell v={pct(b.met, b.total)} />, flex: 1.6 },
                  { key: 'workers', label: t('admin.col.workers'), value: (b) => b.workers, align: 'right', flex: 0.9 },
                ]}
              />
            </View>
          ) : null}

          {!booth && tableQ.data && !wide ? (
            <Group header={t('admin.boothTable')}>
              {tableQ.data.map((b, i) => (
                <Row
                  key={b.no}
                  title={`${b.no} · ${b.name}`}
                  subtitle={`${b.zone ?? t('admin.noZone')} · ${t('admin.boothRow', { pct: pct(b.met, b.total), workers: b.workers })}`}
                  value={`${fmt(b.met)}/${fmt(b.total)}`}
                  chevron
                  onPress={() => router.push({ pathname: '/admin/booth', params: { no: String(b.no) } })}
                  last={i === tableQ.data.length - 1}
                />
              ))}
            </Group>
          ) : null}
        </>
      )}

      <Sheet visible={acSheet} title={t('auth.chooseRole')} onClose={() => setAcSheet(false)}>
        {adminAcs.map((r, i) => {
          const am = me?.memberships.find((x) => x.id === r.membershipId);
          return (
            <ChoiceRow key={r.membershipId} title={t('admin.acTitle', { no: am?.acNo, name: am?.acName })} subtitle={am?.partyName} selected={r.membershipId === mid}
              onPress={() => { setAcSheet(false); setZone(undefined); void activate(r); }} last={i === adminAcs.length - 1} />
          );
        })}
      </Sheet>
    </Screen>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const wide = useWide();
  return (
    <View style={[s.tile, wide && s.tileWide]} accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}>
      <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>{label}</AppText>
      <AppText variant={wide ? 'largeTitle' : 'title2'} weight="bold" tabular>{value}</AppText>
      {sub ? <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>{sub}</AppText> : null}
    </View>
  );
}

function PctCell({ v }: { v: number }) {
  return (
    <View style={s.pctCell}>
      <View style={s.pctTrack}><View style={[s.pctFill, { width: `${v}%` }]} /></View>
      <AppText variant="callout" tabular style={s.pctText}>{`${v}%`}</AppText>
    </View>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />;
}

const s = themed(() => StyleSheet.create({
  acSwitch: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.lg, paddingTop: 4 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.full, justifyContent: 'center', backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.accent },
  tile: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: 2 },
  tableWrap: { marginTop: spacing.xl },
  tableTitle: { paddingHorizontal: spacing.xxxl, paddingBottom: spacing.sm },
  tileWide: { borderWidth: 1, borderColor: web.border, paddingVertical: spacing.xl },
  pctCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pctTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: chart.track, overflow: 'hidden' },
  pctFill: { height: 6, borderRadius: 3, backgroundColor: chart.series },
  pctText: { width: 40, textAlign: 'right' },
}));
