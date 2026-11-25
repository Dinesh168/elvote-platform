/**
 * spec easy-redesign A1/A2/A3: admin Dashboard (root, with Group by Zone | Area and the place dropdowns), a pushed
 * place page, the ranked booth list, and the admin voter list / house page of one booth. Each page reads its place
 * from its own route params.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ActivePills, AppText, BarLine, ChoiceRow, FilterSheet, Icon, PathBar, Screen, SearchBox, Sheet, ToolRow, type FilterCat,
} from '@/design/components';
import { themed } from '@/design/theme';
import { chart, colors, easy, group, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { goBack } from '@/features/shell/navHistory';
import { TeamBar } from '@/features/shell/TeamBar';
import { SyncBadge } from '@/features/sync/SyncBadge';
import { useActiveMembership } from '@/stores/session';
import { leadOf, matchBooth, metricOf, METRICS, sortBooths, type BoothFilters, type BoothSort } from '../logic';
import { Legend, PlaceView } from './PlaceView';
import { groupsOf, scopeFromParams, scopeName, scopeParams, useAdminRoutes, useAllBoothStats, useBoothStats, type GroupView, type Scope, type ScopeParams } from './scope';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

/** Back + path for a pushed admin page: previous page name comes from the place. */
export function AdminPath({ title }: { title: string }) {
  const { t } = useTranslation();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const back = from || t('easy.previous');
  return <PathBar back={back} onBack={goBack} crumbs={[{ label: back, onPress: goBack }, { label: title }]} />;
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const views = (m?.views ?? ['zone']).filter((v): v is GroupView => v === 'zone' || v === 'area');
  const [scope, setScope] = useState<Scope>({ view: views[0] ?? 'zone' });
  const all = useAllBoothStats().data?.booths ?? [];
  const groups = groupsOf(all, scope.view);
  const [sheet, setSheet] = useState<'grp' | 'booth' | null>(null);
  const [bq, setBq] = useState('');
  const boothsIn = all.filter((b) => !scope.key || (scope.view === 'zone' ? b.zoneId === scope.key : b.area === scope.key));
  const gName = scope.key ? groups.find((g) => g.key === scope.key)?.name ?? scope.key : t('easy.all');
  return (
    <Screen header={<TeamBar trailing={<SyncBadge />} say={t('easy.say.dash')} />} trailing={<SyncBadge />}>
      <View style={s.where}>
        {views.length > 1 ? (
          <View style={s.switchRow}>
            <AppText variant="callout" weight="bold" color={colors.textSecondary}>{t('easy.groupBy')}</AppText>
            <View style={s.switch}>
              {views.map((v) => {
                const on = scope.view === v;
                return (
                  <Pressable key={v} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setScope({ view: v })} style={[s.swBtn, on && s.swOn]}>
                    {on ? <Icon name="checkmark" size={16} color={colors.textOnAccent} /> : null}
                    <AppText variant="callout" weight="bold" color={on ? colors.textOnAccent : easy.active}>{t(`easy.view.${v}`)}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        <View style={s.drops}>
          <Drop label={t(`easy.view.${scope.view}`)} value={gName} on={!!scope.key} onPress={() => setSheet('grp')} />
          <Drop label={t('easy.booth')} value={scope.booth ? String(scope.booth) : t('easy.all')} on={!!scope.booth} onPress={() => setSheet('booth')} />
        </View>
      </View>
      <PlaceView scope={scope} root />
      <Sheet visible={sheet === 'grp'} title={t(`easy.pick.${scope.view}`)} onClose={() => setSheet(null)}>
        <ChoiceRow title={t('easy.all')} subtitle={t('easy.nBooths', { n: all.length })} selected={!scope.key} onPress={() => { setScope({ view: scope.view }); setSheet(null); }} />
        {groups.map((g, i) => (
          <ChoiceRow key={g.key} title={g.name} subtitle={t('easy.nBooths', { n: g.booths })} selected={scope.key === g.key} last={i === groups.length - 1} onPress={() => { setScope({ view: scope.view, key: g.key }); setSheet(null); }} />
        ))}
      </Sheet>
      <Sheet visible={sheet === 'booth'} title={t('easy.pickBooth')} onClose={() => setSheet(null)}>
        <View style={{ paddingVertical: spacing.sm }}><SearchBox value={bq} onChange={setBq} placeholder={t('easy.searchBooth')} /></View>
        <ChoiceRow title={t('easy.all')} selected={!scope.booth} onPress={() => { setScope({ ...scope, booth: undefined }); setSheet(null); }} />
        {boothsIn.filter((b) => !bq.trim() || String(b.no).startsWith(bq.trim()) || b.name.toLowerCase().includes(bq.trim().toLowerCase())).map((b) => (
          <ChoiceRow key={b.no} title={t('easy.boothNo', { no: b.no })} subtitle={b.name} selected={scope.booth === b.no} onPress={() => { setScope({ ...scope, booth: b.no }); setSheet(null); }} />
        ))}
      </Sheet>
    </Screen>
  );
}

export function AdminPlace() {
  const { t } = useTranslation();
  const p = useLocalSearchParams<ScopeParams>();
  const scope = scopeFromParams(p);
  const all = useAllBoothStats().data?.booths ?? [];
  return (
    <Screen>
      <AdminPath title={scopeName(t, scope, all)} />
      <PlaceView scope={scope} />
    </Screen>
  );
}

/** A3: booths ranked by one number, with search, filter (who leads, % met, nobody out today) and sort. */
export function AdminBooths() {
  const { t } = useTranslation();
  const routes = useAdminRoutes();
  const p = useLocalSearchParams<ScopeParams & { metric?: string; sort?: string }>();
  const scope = scopeFromParams(p);
  const metric = metricOf(p.metric ?? 'total') ?? METRICS[5];
  const q = useBoothStats(scope);
  const all = useAllBoothStats().data?.booths ?? [];
  const [qq, setQq] = useState('');
  const [sort, setSort] = useState<BoothSort>((p.sort as BoothSort) || 'high');
  const [f, setF] = useState<BoothFilters>({});
  const [sheet, setSheet] = useState<'filter' | 'sort' | null>(null);
  const rows = useMemo(() => sortBooths((q.data?.booths ?? []).filter((b) => matchBooth(b, f) && (!qq.trim() || String(b.no).startsWith(qq.trim()) || b.name.toLowerCase().includes(qq.trim().toLowerCase()))), metric, sort), [q.data, f, qq, metric, sort]);
  const base = q.data?.booths ?? [];
  const cnt = (x: BoothFilters) => base.filter((b) => matchBooth(b, x)).length;
  const tog = <K extends keyof BoothFilters>(k: K, v: BoothFilters[K]) => setF((cur) => (cur[k] === v ? { ...cur, [k]: undefined } : { ...cur, [k]: v }));
  const cats: FilterCat[] = [
    { title: t('easy.cat.lead'), icon: 'thumbs-up', opts: (['our', 'target', 'opp'] as const).map((l) => ({ key: l, label: t(`easy.lead.${l}`), count: cnt({ ...f, lead: l }), selected: f.lead === l, onPress: () => tog('lead', l) })) },
    { title: t('easy.cat.met'), icon: 'checkmark-circle', opts: (['low', 'high'] as const).map((c) => ({ key: c, label: t(`easy.cov.${c}`), count: cnt({ ...f, cov: c }), selected: f.cov === c, onPress: () => tog('cov', c) })) },
    { title: t('easy.cat.team'), icon: 'people', opts: (['none', 'some'] as const).map((c) => ({ key: c, label: t(`easy.team.${c}`), count: cnt({ ...f, team: c }), selected: f.team === c, onPress: () => tog('team', c) })) },
  ];
  const pills = [
    f.lead ? { label: t(`easy.lead.${f.lead}`), onRemove: () => setF({ ...f, lead: undefined }) } : null,
    f.cov ? { label: t(`easy.cov.${f.cov}`), onRemove: () => setF({ ...f, cov: undefined }) } : null,
    f.team ? { label: t(`easy.team.${f.team}`), onRemove: () => setF({ ...f, team: undefined }) } : null,
  ].filter((x): x is { label: string; onRemove: () => void } => !!x);
  const title = t('easy.boothsBy', { what: t(`em.m.${metric.key}`) });
  const max = Math.max(1, ...rows.map((r) => metric.value(r)));
  return (
    <Screen>
      <AdminPath title={title} />
      <View style={s.listHead}>
        <AppText variant="title2">{title}</AppText>
        <AppText variant="callout" color={colors.textSecondary}>{scopeName(t, scope, all)}</AppText>
      </View>
      <View style={{ gap: 10 }}>
        <SearchBox value={qq} onChange={setQq} placeholder={t('easy.searchBooth')} />
        <ToolRow filterCount={pills.length} onFilter={() => setSheet('filter')} sortWord={t(`easy.boothSort.${sort}`)} onSort={() => setSheet('sort')} />
        <ActivePills pills={pills} onClear={() => setF({})} />
        <AppText variant="callout" weight="bold" color={colors.textSecondary} style={{ paddingHorizontal: spacing.lg }}>{t('easy.nBooths', { n: rows.length })}</AppText>
        <Legend />
      </View>
      {!q.data ? <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} /> : rows.map((b) => {
        const l = leadOf(b);
        const v = metric.value(b);
        const pc = (n: number) => (b.total ? (n / b.total) * 100 : 0);
        return (
          <Pressable key={b.no} accessibilityRole="button" accessibilityLabel={`${t('easy.boothNo', { no: b.no })}: ${fmt(v)}`}
            onPress={() => router.push({ pathname: routes.place as never, params: { ...scopeParams({ ...scope, booth: b.no }), from: title } })} style={({ pressed }) => [s.booth, { borderColor: group[l].strong }, pressed && { opacity: 0.8 }]}>
            <View style={s.boothTop}>
              <View style={[s.boothNo, { backgroundColor: group[l].strong }]}><AppText variant="caption" color={colors.textOnAccent}>{t('easy.booth')}</AppText><AppText variant="headline" color={colors.textOnAccent}>{b.no}</AppText></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="headline" numberOfLines={1}>{b.name}</AppText>
                <AppText variant="footnote" color={colors.textSecondary}>{`${[b.zone, b.area].filter(Boolean).join(' · ')} · ${t(`easy.lead.${l}`)}`}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="title2" tabular color={metric.tone && metric.tone !== 'grey' ? group[metric.tone].text : colors.text}>{metric.kind === 'pct' ? `${v}%` : fmt(v)}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>{t(`em.m.${metric.key}`)}</AppText>
              </View>
            </View>
            <BarLine label="" value="" pct={(v / max) * 100} color={metric.tone && metric.tone !== 'grey' ? chart[metric.tone] : chart.series} />
            <BarLine label="" value="" segs={[{ pct: pc(b.our), color: chart.our }, { pct: pc(b.target), color: chart.target }, { pct: pc(b.opp), color: chart.opp }]} />
          </Pressable>
        );
      })}
      <FilterSheet visible={sheet === 'filter'} onClose={() => setSheet(null)} cats={cats} onClear={() => setF({})} showLabel={t('easy.showN', { n: rows.length })} />
      <Sheet visible={sheet === 'sort'} title={t('easy.sort')} onClose={() => setSheet(null)}>
        {(['high', 'low', 'no'] as BoothSort[]).map((x, i) => <ChoiceRow key={x} title={t(`easy.boothSort.${x}`)} selected={sort === x} last={i === 2} onPress={() => { setSort(x); setSheet(null); }} />)}
      </Sheet>
    </Screen>
  );
}

function Drop({ label, value, onPress, on }: { label: string; value: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={({ pressed }) => [s.drop, on && s.dropOn, pressed && { opacity: 0.75 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="caption" color={colors.textSecondary}>{label}</AppText>
        <AppText variant="callout" weight="bold" numberOfLines={1}>{value}</AppText>
      </View>
      <Icon name="chevron-down" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const s = themed(() => StyleSheet.create({
  where: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  switch: { flexDirection: 'row', gap: 3, padding: 3, borderRadius: 12, backgroundColor: colors.fill },
  swBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40, paddingHorizontal: 14, borderRadius: 10 },
  swOn: { backgroundColor: easy.active },
  drops: { flexDirection: 'row', gap: spacing.sm },
  drop: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingLeft: 10, paddingRight: 6, borderRadius: 14, borderWidth: 2, borderColor: easy.tileBorder, backgroundColor: colors.surface },
  dropOn: { borderColor: easy.active, backgroundColor: easy.helpTint },
  listHead: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 2 },
  booth: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: 18, borderWidth: 2, backgroundColor: colors.surface, gap: 2 },
  boothTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  boothNo: { minWidth: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
}));
