/**
 * spec easy-redesign A4/A8: the Reports tab — a summary donut and six reports. Every bar, legend row and table cell
 * opens its list; every chart also shows its numbers as text.
 */
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import {
  AppText, BarLine, Card, ChipRow, ChoiceRow, DayBars, Donut, Icon, Screen, SearchBox, Sheet, ToolRow,
} from '@/design/components';
import { themed } from '@/design/theme';
import { chart, colors, easy, group, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { TeamBar } from '@/features/shell/TeamBar';
import { SyncBadge } from '@/features/sync/SyncBadge';
import { useActiveMembership } from '@/stores/session';
import { defaultMatrixBooths, GROUP_ORDER, last14Days, MATRIX_MAX, leadOf, matrixRows, METRICS, metricOf, sumStats, type BoothStatRow, type Metric, type MetricGroup } from '../logic';
import { AdminPath } from './AdminScreens';
import { Legend, useMetricGo } from './PlaceView';
import { scopeFromParams, scopeName, scopeParams, useAdminRoutes, useAllBoothStats, useBoothStats, type Scope, type ScopeParams } from './scope';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
const show = (mt: Metric, v: number) => (mt.kind === 'pct' ? `${v}%` : mt.kind === 'last' ? `${v > 0 ? '+' : ''}${fmt(v)}` : fmt(v));
function useScopeRows(scope: Scope) {
  const q = useBoothStats(scope);
  const rows = useMemo(() => (q.data?.booths ?? []).filter((b) => !scope.booth || b.no === scope.booth), [q.data, scope.booth]);
  return { q, rows };
}
function useScopeParam() {
  return scopeFromParams(useLocalSearchParams<ScopeParams>());
}

// ---------- Hub ----------
export function ReportsHub() {
  const { t } = useTranslation();
  const scope: Scope = { view: 'zone' };
  const { q, rows } = useScopeRows(scope);
  const go = useMetricGo(scope);
  const tot = sumStats(rows);
  const cards: { k: string; icon: string; c: string }[] = [
    { k: 'matrix', icon: 'grid', c: easy.active }, { k: 'compare', icon: 'bar-chart', c: group.our.strong }, { k: 'daily', icon: 'calendar', c: group.target.strong },
    { k: 'vwork', icon: 'people', c: easy.purple }, { k: 'people', icon: 'person', c: easy.teal }, { k: 'living', icon: 'walk', c: group.none.text },
  ];
  return (
    <Screen header={<TeamBar trailing={<SyncBadge />} say={t('easy.say.reports')} />} trailing={<SyncBadge />}>
      <View style={s.head}><AppText variant="largeTitle">{t('easy.reports')}</AppText><AppText variant="callout" color={colors.textSecondary}>{t('easy.reportsSub')}</AppText></View>
      {!q.data ? <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} /> : (
        <Card>
          <Donut a11y={t('easy.byGroup')} centre={`${tot.total ? Math.round((tot.met / tot.total) * 100) : 0}%`} centreSub={t('easy.metWord')}
            parts={[...(['our', 'target', 'opp'] as const).map((g) => ({ key: g, label: t(`groups.${g}`), value: tot[g], color: chart[g], onPress: () => go(metricOf(g)!) })),
              { key: 'none', label: t('groups.none'), value: tot.total - tot.met, color: chart.none, onPress: () => go(metricOf('notMet')!) }]} />
        </Card>
      )}
      {cards.map((c) => (
        <Pressable key={c.k} accessibilityRole="button" onPress={() => router.push({ pathname: `/admin/r-${c.k}` as never, params: { ...scopeParams(scope), from: t('easy.reports') } })} style={({ pressed }) => [s.rCard, pressed && { opacity: 0.8 }]}>
          <View style={[s.rIcon, { backgroundColor: c.c }]}><Icon name={c.icon} size={28} color={colors.textOnAccent} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="headline" style={{ fontSize: 18 }}>{t(`easy.r.${c.k}`)}</AppText>
            <AppText variant="callout" color={colors.textSecondary}>{t(`easy.r.${c.k}Sub`)}</AppText>
          </View>
          <Icon name="chevron-forward" size={22} color={colors.textSecondary} />
        </Pressable>
      ))}
    </Screen>
  );
}

// ---------- Complete data ----------
export function MatrixReport() {
  const { t } = useTranslation();
  const scope = useScopeParam();
  const all = useAllBoothStats();
  const allRows = all.data?.booths ?? [];
  const { rows: scopeRows } = useScopeRows(scope);
  const go = useMetricGo(scope);
  const pollOn = !!useActiveMembership()?.pollingDay;
  const [picked, setPicked] = useState<number[] | null>(null);
  const [hidden, setHidden] = useState<Partial<Record<MetricGroup, boolean>>>({});
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'no' | 'high' | 'low'>('no');
  const [sheet, setSheet] = useState<'pick' | 'sort' | null>(null);
  const [pq, setPq] = useState('');
  // spec admin-fixes-r1 A10: drawing every booth × every number froze the phone; open with 10, allow up to 25.
  const nos = picked ?? defaultMatrixBooths(scopeRows.map((r) => r.no));
  const cols = allRows.filter((b) => nos.includes(b.no)).sort((a, b) => (sort === 'no' ? a.no - b.no : sort === 'high' ? b.total - a.total : a.total - b.total));
  const tot = sumStats(cols);
  const lines = matrixRows(hidden, q, (k) => t(k), pollOn);
  const title = t('easy.r.matrix');
  if (!all.data) return <Screen><AdminPath title={title} /><QueryState loading={all.isLoading} error={all.isError} err={all.error} onRetry={() => void all.refetch()} /></Screen>;
  return (
    <Screen>
      <AdminPath title={title} />
      <Pressable accessibilityRole="button" onPress={() => setSheet('pick')} style={({ pressed }) => [s.picker, pressed && { opacity: 0.8 }]}>
        <Icon name="business" size={24} color={easy.bandText} />
        <View style={{ flex: 1 }}>
          <AppText variant="footnote" weight="bold" color={easy.bandText}>{t('easy.inTable', { n: cols.length })}</AppText>
          <AppText variant="callout" weight="bold" color={easy.bandText} numberOfLines={2}>{cols.map((c) => c.no).join(', ') || t('easy.nonePicked')}</AppText>
        </View>
        <AppText variant="callout" weight="bold" color={easy.active}>{t('common.change')}</AppText>
      </Pressable>
      <View style={{ gap: 10, marginTop: spacing.sm }}>
        <SearchBox value={q} onChange={setQ} placeholder={t('easy.findNumber')} />
        <ToolRow sortWord={t(`easy.colSort.${sort}`)} onSort={() => setSheet('sort')} />
        <View style={{ paddingHorizontal: spacing.lg }}>
          <ChipRow chips={GROUP_ORDER.filter((g) => g !== 'poll' || pollOn).map((g) => ({ key: g, label: t(`easy.g.${g}`), selected: !hidden[g], onPress: () => setHidden({ ...hidden, [g]: !hidden[g] }) }))} />
        </View>
        <View style={s.hint}><Icon name="hand-left" size={16} color={colors.textSecondary} /><AppText variant="footnote" color={colors.textSecondary}>{t('easy.tableHint')}</AppText></View>
      </View>
      <View style={s.table}>
        <View style={s.fixed}>
          <View style={[s.th, s.cellH, { backgroundColor: easy.bandText }]}><AppText variant="footnote" weight="bold" color={colors.textOnAccent}>{t('easy.number')}</AppText></View>
          {lines.map((l) => l.kind === 'group'
            ? <View key={`g-${l.group}`} style={[s.gRow, { backgroundColor: easy.band }]}><AppText variant="footnote" weight="bold" color={easy.bandText}>{t(`easy.g.${l.group}`)}</AppText></View>
            : <View key={l.metric.key} style={s.lRow}>{l.metric.tone ? <View style={[s.dot, { backgroundColor: l.metric.tone === 'grey' ? easy.dashed : group[l.metric.tone].strong }]} /> : null}<AppText variant="footnote" weight="semibold" numberOfLines={2} style={{ flex: 1 }}>{t(`em.m.${l.metric.key}`)}</AppText></View>)}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={{ flexDirection: 'row' }}>
              {[{ no: 0, label: t('easy.total'), sub: t('easy.nBooths', { n: cols.length }), bg: easy.bandText }, ...cols.map((c) => ({ no: c.no, label: t('easy.boothNo', { no: c.no }), sub: c.name.split(',')[0], bg: group[leadOf(c)].strong }))].map((c) => (
                <Pressable key={c.no} accessibilityRole="button" disabled={!c.no} onPress={() => go(METRICS[5], c.no)} style={[s.th, { backgroundColor: c.bg }]}>
                  <AppText variant="footnote" weight="bold" color={colors.textOnAccent} numberOfLines={1}>{c.label}</AppText>
                  <AppText variant="caption" color={colors.textOnAccent} numberOfLines={1}>{c.sub}</AppText>
                </Pressable>
              ))}
            </View>
            {lines.map((l) => l.kind === 'group'
              ? <View key={`g-${l.group}`} style={[s.gRow, { backgroundColor: easy.band, width: (cols.length + 1) * 92 }]} />
              : (
                <View key={l.metric.key} style={{ flexDirection: 'row' }}>
                  {[null, ...cols].map((c: BoothStatRow | null) => {
                    const v = l.metric.value(c ?? tot);
                    const base = c ? c.total : tot.total;
                    const pct = l.metric.kind === 'voter' && l.metric.key !== 'total' && base ? `${Math.round((v / base) * 100)}%` : '';
                    return (
                      <Pressable key={c?.no ?? 'tot'} accessibilityRole="button" accessibilityLabel={`${t(`em.m.${l.metric.key}`)}, ${c ? t('easy.boothNo', { no: c.no }) : t('easy.total')}: ${show(l.metric, v)}`}
                        onPress={() => go(l.metric, c?.no)} style={({ pressed }) => [s.cell, !c && { backgroundColor: easy.helpTint }, pressed && { opacity: 0.6 }]}>
                        <AppText variant="callout" weight={c ? 'semibold' : 'bold'} tabular color={l.metric.kind === 'last' ? (v >= 0 ? group.our.text : group.opp.text) : colors.text}>{show(l.metric, v)}</AppText>
                        {pct ? <AppText variant="caption" color={colors.textSecondary}>{pct}</AppText> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
          </View>
        </ScrollView>
      </View>
      <Sheet visible={sheet === 'pick'} title={t('easy.pickTable')} onClose={() => setSheet(null)} footer={t('easy.matrixMax', { n: MATRIX_MAX })}>
        <View style={{ paddingVertical: spacing.sm }}><SearchBox value={pq} onChange={setPq} placeholder={t('easy.searchBooth')} /></View>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <ChipRow chips={[
            { key: 'all', label: t('easy.firstN', { n: MATRIX_MAX }), selected: false, onPress: () => setPicked(allRows.slice(0, MATRIX_MAX).map((b) => b.no)) },
            { key: 'scope', label: scopeName(t, scope, allRows), selected: false, onPress: () => setPicked(scopeRows.slice(0, MATRIX_MAX).map((b) => b.no)) },
            { key: 'clear', label: t('easy.clearAll'), selected: false, onPress: () => setPicked([]) },
          ]} />
        </View>
        {allRows.filter((b) => !pq.trim() || String(b.no).startsWith(pq.trim()) || b.name.toLowerCase().includes(pq.trim().toLowerCase())).map((b) => {
          const on = nos.includes(b.no);
          return <ChoiceRow key={b.no} title={t('easy.boothNo', { no: b.no })} subtitle={b.name} selected={on} onPress={() => setPicked(on ? nos.filter((x) => x !== b.no) : nos.length >= MATRIX_MAX ? nos : [...nos, b.no])} />;
        })}
      </Sheet>
      <Sheet visible={sheet === 'sort'} title={t('easy.sort')} onClose={() => setSheet(null)}>
        {(['no', 'high', 'low'] as const).map((x, i) => <ChoiceRow key={x} title={t(`easy.colSort.${x}`)} selected={sort === x} last={i === 2} onPress={() => { setSort(x); setSheet(null); }} />)}
      </Sheet>
    </Screen>
  );
}

// ---------- Compare booths ----------
const CMP = ['groups', 'metPct', 'our', 'target', 'opp', 'notMet', 'withMobile', 'firstTime', 'died', 'metToday'];
export function CompareReport() {
  const { t } = useTranslation();
  const scope = useScopeParam();
  const routes = useAdminRoutes();
  const { q, rows } = useScopeRows(scope);
  const [k, setK] = useState('groups');
  const [qq, setQq] = useState('');
  const [sort, setSort] = useState<'high' | 'low' | 'no'>('high');
  const [sheet, setSheet] = useState(false);
  const mt = metricOf(k === 'groups' ? 'our' : k)!;
  const list = rows.filter((b) => !qq.trim() || String(b.no).startsWith(qq.trim()) || b.name.toLowerCase().includes(qq.trim().toLowerCase()))
    .sort((a, b) => (sort === 'no' ? a.no - b.no : sort === 'low' ? mt.value(a) - mt.value(b) : mt.value(b) - mt.value(a)));
  const max = Math.max(1, ...list.map((b) => mt.value(b)));
  const title = t('easy.r.compare');
  return (
    <Screen>
      <AdminPath title={title} />
      <View style={{ gap: 10 }}>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <ChipRow chips={CMP.map((x) => ({ key: x, label: x === 'groups' ? t('easy.allGroups') : t(`em.m.${x}`), selected: k === x, onPress: () => setK(x) }))} />
        </View>
        <SearchBox value={qq} onChange={setQq} placeholder={t('easy.searchBooth')} />
        <ToolRow sortWord={t(`easy.boothSort.${sort}`)} onSort={() => setSheet(true)} />
        {k === 'groups' ? <Legend /> : null}
      </View>
      {!q.data ? <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} /> : (
        <Card>
          {list.map((b) => {
            const v = mt.value(b);
            const p = (n: number) => (b.total ? (n / b.total) * 100 : 0);
            return (
              <BarLine key={b.no} label={`${b.no} · ${b.name}`} value={k === 'groups' ? `${Math.round(p(b.our))}% ${t('groups.our')}` : show(mt, v)}
                segs={k === 'groups' ? [{ pct: p(b.our), color: chart.our }, { pct: p(b.target), color: chart.target }, { pct: p(b.opp), color: chart.opp }] : undefined}
                pct={(v / max) * 100} color={mt.tone && mt.tone !== 'grey' ? chart[mt.tone] : chart.series}
                onPress={() => router.push({ pathname: routes.place as never, params: { ...scopeParams({ ...scope, booth: b.no }), from: title } })} />
            );
          })}
        </Card>
      )}
      <Sheet visible={sheet} title={t('easy.sort')} onClose={() => setSheet(false)}>
        {(['high', 'low', 'no'] as const).map((x, i) => <ChoiceRow key={x} title={t(`easy.boothSort.${x}`)} selected={sort === x} last={i === 2} onPress={() => { setSort(x); setSheet(false); }} />)}
      </Sheet>
    </Screen>
  );
}

// ---------- Daily work ----------
export function DailyReport() {
  const { t, i18n } = useTranslation();
  const scope = useScopeParam();
  const routes = useAdminRoutes();
  const { q, rows } = useScopeRows(scope);
  const [keys] = useState(last14Days);
  const [pick, setPick] = useState(13);
  const nos = new Set(rows.map((r) => r.no));
  const per = (day: string) => (q.data?.days ?? []).filter((d) => d.day === day && nos.has(d.booth));
  const vals = keys.map((k) => per(k).reduce((a, d) => a + d.contacted, 0));
  const top = per(keys[pick]).sort((a, b) => b.contacted - a.contacted).slice(0, 5);
  const dayName = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString(i18n.language === 'en' ? 'en-IN' : `${i18n.language}-IN`, { weekday: 'short', day: 'numeric', month: 'short' });
  const title = t('easy.r.daily');
  return (
    <Screen>
      <AdminPath title={title} />
      {!q.data ? <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} /> : (
        <>
          <Card>
            <AppText variant="callout" color={colors.textSecondary}>{t('easy.dailySub')}</AppText>
            <DayBars days={keys.map((k, i) => ({ label: k.slice(8), value: vals[i], a11y: `${dayName(k)}: ${vals[i]}` }))} picked={pick} onPick={setPick} />
          </Card>
          <Card border={easy.active}>
            <View style={s.row}><Icon name="calendar" size={22} color={colors.text} /><AppText variant="headline" style={{ fontSize: 18 }}>{dayName(keys[pick])}</AppText></View>
            <AppText variant="title2" tabular>{t('easy.metThatDay', { n: fmt(vals[pick]) })}</AppText>
            <AppText variant="callout" weight="bold" color={colors.textSecondary}>{t('easy.topBooths')}</AppText>
            {top.length ? top.map((d) => {
              const b = rows.find((r) => r.no === d.booth);
              return (
                <Pressable key={d.booth} accessibilityRole="button" onPress={() => router.push({ pathname: routes.place as never, params: { ...scopeParams({ ...scope, booth: d.booth }), from: title } })} style={({ pressed }) => [s.listRow, pressed && { opacity: 0.8 }]}>
                  <AppText variant="body" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{`${d.booth} · ${b?.name ?? ''}`}</AppText>
                  <AppText variant="body" weight="bold" tabular>{d.contacted}</AppText>
                  <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              );
            }) : <AppText variant="callout" color={colors.textSecondary}>{t('easy.nobodyThatDay')}</AppText>}
          </Card>
        </>
      )}
    </Screen>
  );
}

// ---------- Volunteer work ----------
export function VolunteerWork() {
  const { t } = useTranslation();
  const scope = useScopeParam();
  const { rows } = useScopeRows(scope);
  const mid = useActiveMembership()?.id ?? '';
  const q = useQuery({ queryKey: ['team', mid, 'approved'], queryFn: () => adminApi.team(mid, 'approved'), enabled: !!mid });
  const [qq, setQq] = useState('');
  const [sort, setSort] = useState<'high' | 'low' | 'name'>('high');
  const [sheet, setSheet] = useState(false);
  const nos = new Set(rows.map((r) => r.no));
  const list = (q.data ?? []).filter((v) => v.role === 'volunteer' && v.booths.some((b) => nos.has(b)) && (!qq.trim() || v.name.toLowerCase().includes(qq.trim().toLowerCase()) || v.booths.map(String).includes(qq.trim())))
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'low' ? a.contactedTotal - b.contactedTotal : b.contactedTotal - a.contactedTotal));
  const max = Math.max(1, ...list.map((v) => v.contactedTotal));
  return (
    <Screen>
      <AdminPath title={t('easy.r.vwork')} />
      <View style={{ gap: 10 }}>
        <SearchBox value={qq} onChange={setQq} placeholder={t('easy.searchVol')} />
        <ToolRow sortWord={t(`easy.vsort.${sort}`)} onSort={() => setSheet(true)} />
      </View>
      {!q.data ? <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} /> : (
        <Card>
          {list.map((v) => (
            <BarLine key={v.membershipId} label={`${v.name} · ${v.booths.join(', ')}`} value={fmt(v.contactedTotal)} sub={t('easy.todayN', { n: v.contactedToday })}
              pct={(v.contactedTotal / max) * 100} color={v.contactedToday ? chart.our : chart.opp} onPress={() => router.push('/admin/team')} />
          ))}
          {!list.length ? <AppText variant="callout" color={colors.textSecondary}>{t('voters.empty')}</AppText> : null}
        </Card>
      )}
      <Sheet visible={sheet} title={t('easy.sort')} onClose={() => setSheet(false)}>
        {(['high', 'low', 'name'] as const).map((x, i) => <ChoiceRow key={x} title={t(`easy.vsort.${x}`)} selected={sort === x} last={i === 2} onPress={() => { setSort(x); setSheet(false); }} />)}
      </Sheet>
    </Screen>
  );
}

// ---------- People ----------
export function PeopleReport() {
  const { t } = useTranslation();
  const scope = useScopeParam();
  const { q, rows } = useScopeRows(scope);
  const go = useMetricGo(scope);
  const tot = sumStats(rows);
  return (
    <Screen>
      <AdminPath title={t('easy.r.people')} />
      {!q.data ? <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} /> : (
        <>
          <Card>
            <Donut a11y={t('easy.menWomen')} centre={fmt(tot.total)} centreSub={t('easy.voters')} parts={[
              { key: 'male', label: t('em.m.male'), value: tot.male, color: chart.series, onPress: () => go(metricOf('male')!) },
              { key: 'female', label: t('em.m.female'), value: tot.female, color: easy.teal, onPress: () => go(metricOf('female')!) },
              { key: 'third', label: t('em.m.third'), value: tot.third, color: easy.purple, onPress: () => go(metricOf('third')!) },
            ]} />
          </Card>
          <Card>
            <AppText variant="headline" style={{ fontSize: 18 }}>{t('easy.age')}</AppText>
            {(['firstTime', 'young', 'mid', 'senior'] as const).map((k) => {
              const v = tot[k];
              return <BarLine key={k} label={t(`em.m.${k}`)} value={fmt(v)} sub={tot.total ? `${Math.round((v / tot.total) * 100)}%` : ''} pct={tot.total ? (v / tot.total) * 200 : 0} onPress={() => go(metricOf(k)!)} />;
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}

// ---------- Not living here ----------
export function LivingReport() {
  const { t } = useTranslation();
  const scope = useScopeParam();
  const { q, rows } = useScopeRows(scope);
  const go = useMetricGo(scope);
  const [qq, setQq] = useState('');
  const [sort, setSort] = useState<'high' | 'low' | 'no'>('high');
  const [sheet, setSheet] = useState(false);
  const lt = (b: BoothStatRow) => b.moved + b.died + b.notFound;
  const list = rows.filter((b) => !qq.trim() || String(b.no).startsWith(qq.trim()) || b.name.toLowerCase().includes(qq.trim().toLowerCase()))
    .sort((a, b) => (sort === 'no' ? a.no - b.no : sort === 'low' ? lt(a) - lt(b) : lt(b) - lt(a)));
  return (
    <Screen>
      <AdminPath title={t('easy.r.living')} />
      <View style={{ gap: 10 }}>
        <SearchBox value={qq} onChange={setQq} placeholder={t('easy.searchBooth')} />
        <ToolRow sortWord={t(`easy.boothSort.${sort}`)} onSort={() => setSheet(true)} />
      </View>
      {!q.data ? <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} /> : list.map((b) => (
        <View key={b.no} style={s.living}>
          <View style={s.row}><AppText variant="headline" style={{ flex: 1 }} numberOfLines={1}>{`${b.no} · ${b.name}`}</AppText><AppText variant="headline" tabular>{lt(b)}</AppText></View>
          <View style={s.row}>
            {(['moved', 'died', 'notFound'] as const).map((k) => (
              <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${t(`em.m.${k}`)} ${b[k]}`} onPress={() => go(metricOf(k)!, b.no)} style={({ pressed }) => [s.livCell, pressed && { opacity: 0.7 }]}>
                <AppText variant="title2" tabular>{b[k]}</AppText>
                <AppText variant="footnote" weight="semibold" color={colors.textSecondary}>{t(`em.m.${k}`)}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <Sheet visible={sheet} title={t('easy.sort')} onClose={() => setSheet(false)}>
        {(['high', 'low', 'no'] as const).map((x, i) => <ChoiceRow key={x} title={t(`easy.boothSort.${x}`)} selected={sort === x} last={i === 2} onPress={() => { setSort(x); setSheet(false); }} />)}
      </Sheet>
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  head: { paddingHorizontal: spacing.lg, gap: 2 },
  rCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: 20, borderWidth: 2, borderColor: easy.tileBorder, backgroundColor: colors.surface },
  rIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  picker: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.md, borderRadius: 16, borderWidth: 2, borderColor: easy.active, backgroundColor: easy.helpTint },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg },
  table: { flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: easy.tileBorder, backgroundColor: colors.surface },
  fixed: { width: 140, borderRightWidth: 1, borderRightColor: easy.tileBorder },
  th: { width: 92, height: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cellH: { width: 140, alignItems: 'flex-start', paddingHorizontal: 10 },
  gRow: { height: 36, justifyContent: 'center', paddingHorizontal: 10 },
  lRow: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: colors.separator },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cell: { width: 92, height: 52, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.separator, borderLeftWidth: 1, borderLeftColor: colors.separator },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: easy.tileBorder },
  living: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: 18, borderWidth: 1.5, borderColor: easy.tileBorder, backgroundColor: colors.surface, gap: spacing.sm },
  livCell: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 64, borderRadius: 14, borderWidth: 1.5, borderColor: easy.tileBorder, backgroundColor: colors.bg },
}));
