/**
 * spec easy-redesign A1/A2: the admin Dashboard (root, with the where bar) and every pushed place page (booth, zone,
 * area, section): header, donut by group, 14-day line, every shortcut group, age bars, the booths of a zone/area
 * (search + sort) or the sections and volunteers of a booth. Every number opens its list in a new page.
 */
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Voter } from '@/api/types';
import { adminApi } from '@/api/adminApi';
import {
  AppText, BarLine, Card, ChoiceRow, Donut, Icon, LineChart, SearchBox, Sheet, ShortcutTile, TileGroup, ToolRow, type DonutPart, type Tone,
} from '@/design/components';
import { themed } from '@/design/theme';
import { chart, colors, easy, group, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useVoters } from '@/features/data';
import { useActiveMembership } from '@/stores/session';
import { sectionKey, sectionLabel } from '../labels';
import {
  GROUP_ORDER, last14Days, leadOf, METRICS, shortcutCounts, sumStats, type BoothStatRow, type Metric, type MetricGroup, type StatTotals,
} from '../logic';
import { scopeName, scopeParams, useAdminRoutes, useAllBoothStats, useBoothStats, type Scope } from './scope';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
export const GROUP_ICON: Record<MetricGroup, string> = { poll: 'checkbox', voters: 'people', houses: 'home', phones: 'call', people: 'person', living: 'walk', team: 'people-circle', last: 'trending-up' };

/** Totals for a booth or a section worked out from its voter list (same rules as the volunteer's numbers). */
function totalsFromVoters(vs: Voter[], row?: BoothStatRow): StatTotals {
  const c = shortcutCounts(vs);
  const met = vs.filter((v) => v.group).length;
  const voted = vs.filter((v) => v.votedAt);
  const g = (x: string) => voted.filter((v) => v.group === x).length;
  return {
    booths: 1, total: vs.length, met, our: c.our, target: c.target, opp: c.opp, moved: c.moved, withMobile: c.withPhone, ourMobile: c.ourWithPhone,
    targetMobile: 0, oppMobile: 0, houses: c.houses, housesVisited: c.houses - c.leftHouses, housesWithMobile: 0, ourHouses: c.ourHouses, targetHouses: c.targetHouses,
    oppHouses: c.oppHouses, firstTime: c.a1, young: c.a2, mid: c.a3, senior: c.a4, male: c.men, female: c.women, third: vs.filter((v) => v.gender === 'T').length,
    helpNeeded: c.help, voted: voted.length, ourVoted: g('our'), targetVoted: g('target'), oppVoted: g('opp'), helpVoted: voted.filter((v) => v.needsHelp).length,
    died: c.died, notFound: c.notFound, volunteers: row?.volunteers ?? 0, metToday: row?.metToday ?? 0, lastMargin: row?.lastMargin ?? 0,
  };
}

export function useMetricGo(scope: Scope) {
  const r = useAdminRoutes();
  const { t } = useTranslation();
  const all = useAllBoothStats().data?.booths ?? [];
  const from = scopeName(t, scope, all);
  return (mt: Metric, booth?: number) => {
    const sc = booth ? { ...scope, booth, sec: undefined } : scope;
    if (mt.kind === 'team') { router.push({ pathname: '/admin/team', params: { booth: sc.booth ? String(sc.booth) : '' } }); return; }
    if (sc.booth && mt.kind === 'house') {
      const hc = mt.key === 'ourHouses' ? 'our' : mt.key === 'targetHouses' ? 'target' : mt.key === 'oppHouses' ? 'opp' : mt.key === 'leftHouses' ? 'left' : 'all';
      router.push({ pathname: r.voters as never, params: { ...scopeParams(sc), mode: 'houses', hc, from } });
      return;
    }
    if (sc.booth && mt.filter) { router.push({ pathname: r.voters as never, params: { ...scopeParams(sc), f: JSON.stringify(mt.filter), from } }); return; }
    if (booth) { router.push({ pathname: r.place as never, params: { ...scopeParams(sc), from } }); return; }
    router.push({ pathname: r.booths as never, params: { ...scopeParams(sc), metric: mt.key, from } });
  };
}

export function PlaceView({ scope, root }: { scope: Scope; root?: boolean }) {
  const { t } = useTranslation();
  const routes = useAdminRoutes();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const pollOn = m?.features?.poll !== false && !!m?.pollingDay;
  const allQ = useAllBoothStats();
  const groupQ = useBoothStats(scope);
  const votersQ = useVoters(scope.booth ?? 0);
  const go = useMetricGo(scope);
  const [bq, setBq] = useState('');
  const [bsort, setBsort] = useState<'lead' | 'notMet' | 'no'>('lead');
  const [sortSheet, setSortSheet] = useState(false);
  const dashQ = useQuery({ queryKey: ['dash', mid, '', 0], queryFn: () => adminApi.dashboard(mid, {}), enabled: !!mid && !!root && !scope.booth });

  const all = allQ.data?.booths ?? [];
  const rows = useMemo(() => (groupQ.data?.booths ?? []).filter((b) => !scope.booth || b.no === scope.booth), [groupQ.data, scope.booth]);
  const boothRow = scope.booth ? all.find((b) => b.no === scope.booth) : undefined;
  const boothVoters = useMemo(() => (scope.booth ? (votersQ.data ?? []).filter((v) => v.booth === scope.booth && (!scope.sec || sectionKey(v) === scope.sec)) : []), [votersQ.data, scope.booth, scope.sec]);
  const tot: StatTotals | null = scope.booth
    ? (votersQ.data ? totalsFromVoters(boothVoters, boothRow) : boothRow ? sumStats([boothRow]) : null)
    : groupQ.data ? sumStats(rows) : null;

  const days = useMemo(() => {
    const keys = last14Days();
    const nos = new Set(rows.map((r) => r.no));
    const sum = new Map<string, number>();
    for (const d of groupQ.data?.days ?? []) if (nos.has(d.booth)) sum.set(d.day, (sum.get(d.day) ?? 0) + d.contacted);
    return keys.map((k) => sum.get(k) ?? 0);
  }, [groupQ.data, rows]);

  if (!tot) return <QueryState loading={groupQ.isLoading || votersQ.isLoading} error={groupQ.isError} onRetry={() => void groupQ.refetch()} />;
  const lead = boothRow ? leadOf(boothRow) : null;
  const name = scopeName(t, scope, all);
  const pct = (n: number) => (tot.total ? `${Math.round((n / tot.total) * 100)}%` : '');
  const groups = GROUP_ORDER.filter((g) => g !== 'last' && (g !== 'poll' || pollOn));
  const toneOf = (mt: Metric): Tone | undefined => (mt.tone === 'grey' ? 'grey' : mt.tone);
  const booths = rows.filter((b) => !bq.trim() || String(b.no).startsWith(bq.trim()) || b.name.toLowerCase().includes(bq.trim().toLowerCase()))
    .sort((a, b) => bsort === 'no' ? a.no - b.no : bsort === 'notMet' ? (b.total - b.met) - (a.total - a.met) : (b.our - b.opp) / Math.max(1, b.total) - (a.our - a.opp) / Math.max(1, a.total));
  const secs = scope.booth && !scope.sec ? [...new Map(boothVoters.map((v) => [sectionKey(v), v])).values()].sort((a, b) => (parseInt(sectionKey(a), 10) || 0) - (parseInt(sectionKey(b), 10) || 0)) : [];
  const quiet = dashQ.data?.quiet?.length ?? 0;
  const nobody = rows.filter((r) => r.metToday === 0).length;

  return (
    <View style={{ paddingBottom: spacing.xxxl }}>
      {!root ? (
        <Card border={lead ? group[lead].strong : easy.active}>
          <View style={s.headRow}>
            <View style={[s.headIcon, { backgroundColor: lead ? group[lead].strong : easy.active }]}><Icon name={scope.booth ? 'business' : scope.view === 'area' ? 'layers' : 'location'} size={30} color={colors.textOnAccent} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="title2">{name}</AppText>
              {boothRow ? <AppText variant="callout" color={colors.textSecondary}>{[boothRow.name, boothRow.zone, boothRow.area].filter(Boolean).join(' · ')}</AppText> : <AppText variant="callout" color={colors.textSecondary}>{t('easy.nBooths', { n: rows.length })}</AppText>}
              {lead ? <AppText variant="callout" weight="bold" color={group[lead].text}>{[t(`easy.lead.${lead}`), boothRow?.lastMargin != null ? t(boothRow.lastMargin >= 0 ? 'easy.wonBy' : 'easy.lostBy', { n: Math.abs(boothRow.lastMargin) }) : null].filter(Boolean).join(' · ')}</AppText> : null}
            </View>
          </View>
        </Card>
      ) : null}

      {root && !scope.booth && (quiet || nobody) ? (
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.sm }}>
          <View style={s.secHead}><Icon name="notifications" size={20} color={colors.text} /><AppText variant="headline" style={{ fontSize: 18 }}>{t('easy.needsYou')}</AppText></View>
          {nobody ? <Need icon="alert-circle" text={t('easy.nobodyOut', { n: nobody })} tone="opp" onPress={() => router.push({ pathname: routes.booths as never, params: { ...scopeParams(scope), metric: 'metToday', sort: 'low', from: name } })} /> : null}
          {quiet ? <Need icon="people" text={t('easy.quietVols', { n: quiet })} tone="target" onPress={() => router.push('/admin/remind')} /> : null}
        </View>
      ) : null}

      <Card>
        <AppText variant="headline" style={{ fontSize: 18 }}>{t('easy.byGroup')}</AppText>
        <Donut a11y={t('easy.byGroup')} centre={fmt(tot.total)} centreSub={t('easy.voters')} parts={[...(['our', 'target', 'opp'] as const).map((g): DonutPart => ({
          key: g, label: t(`groups.${g}`), value: tot[g], color: chart[g], onPress: () => go(METRICS.find((x) => x.key === g)!),
        })), { key: 'none', label: t('groups.none'), value: tot.total - tot.met, color: chart.none, onPress: () => go(METRICS.find((x) => x.key === 'notMet')!) }]} />
      </Card>

      {!scope.booth ? (
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: routes.daily as never, params: { ...scopeParams(scope), from: name } })}>
          <Card>
            <View style={s.secHead}><Icon name="trending-up" size={20} color={colors.text} /><AppText variant="headline" style={{ fontSize: 18, flex: 1 }}>{t('easy.met14')}</AppText><Icon name="chevron-forward" size={20} color={colors.textSecondary} /></View>
            <AppText variant="callout" color={colors.textSecondary}>{t('easy.todayBest', { today: days[days.length - 1], best: Math.max(...days) })}</AppText>
            <LineChart values={days} a11y={t('easy.met14')} />
          </Card>
        </Pressable>
      ) : null}

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: routes.matrix as never, params: { ...scopeParams(scope), from: name } })} style={({ pressed }) => [s.matrixBtn, pressed && { opacity: 0.85 }]}>
          <Icon name="grid" size={24} color={colors.textOnAccent} />
          <AppText variant="body" weight="bold" color={colors.textOnAccent}>{t('easy.allNumbers')}</AppText>
        </Pressable>
      </View>

      {groups.map((g) => {
        const ms = METRICS.filter((x) => x.group === g && x.kind !== 'pct');
        return (
          <TileGroup key={g} title={t(`easy.g.${g}`)} icon={GROUP_ICON[g]} cols={g === 'voters' ? 2 : 3}>
            {ms.map((mt) => (
              <ShortcutTile key={mt.key} icon={mt.icon} num={fmt(mt.value(tot))} word={t(`em.m.${mt.key}`)} tone={toneOf(mt)} big={g === 'voters'}
                pct={mt.kind === 'voter' && mt.key !== 'total' ? pct(mt.value(tot)) : undefined} onPress={() => go(mt)} />
            ))}
          </TileGroup>
        );
      })}

      <Card>
        <AppText variant="headline" style={{ fontSize: 18 }}>{t('easy.age')}</AppText>
        {(['firstTime', 'young', 'mid', 'senior'] as const).map((k) => {
          const mt = METRICS.find((x) => x.key === k)!;
          const v = mt.value(tot);
          return <BarLine key={k} label={t(`em.m.${k}`)} value={fmt(v)} sub={pct(v)} pct={tot.total ? (v / tot.total) * 200 : 0} onPress={() => go(mt)} />;
        })}
      </Card>

      {!scope.booth ? (
        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <View style={[s.secHead, { paddingHorizontal: spacing.lg }]}><Icon name="business" size={20} color={colors.text} /><AppText variant="headline" style={{ fontSize: 18 }}>{t('easy.boothsHere', { n: rows.length })}</AppText></View>
          <SearchBox value={bq} onChange={setBq} placeholder={t('easy.searchBooth')} />
          <ToolRow sortWord={t(`easy.bsort.${bsort}`)} onSort={() => setSortSheet(true)} />
          <Legend />
          {booths.map((b) => {
            const l = leadOf(b);
            const p = (n: number) => (b.total ? (n / b.total) * 100 : 0);
            return (
              <Pressable key={b.no} accessibilityRole="button" accessibilityLabel={`${t('easy.boothNo', { no: b.no })} ${b.name}`} onPress={() => router.push({ pathname: routes.place as never, params: { ...scopeParams({ ...scope, booth: b.no, sec: undefined }), from: name } })}
                style={({ pressed }) => [s.booth, { borderColor: group[l].strong }, pressed && { opacity: 0.8 }]}>
                <View style={s.boothTop}>
                  <View style={[s.boothNo, { backgroundColor: group[l].strong }]}><AppText variant="headline" color={colors.textOnAccent}>{b.no}</AppText></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="headline" numberOfLines={1}>{b.name}</AppText>
                    <AppText variant="footnote" color={colors.textSecondary}>{`${Math.round(p(b.met))}% ${t('easy.metWord')} · ${t(`easy.lead.${l}`)} · ${t('easy.todayN', { n: b.metToday })}`}</AppText>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
                <BarLine label="" value="" segs={[{ pct: p(b.our), color: chart.our }, { pct: p(b.target), color: chart.target }, { pct: p(b.opp), color: chart.opp }]} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {secs.length ? (
        <View style={{ marginTop: spacing.lg, gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          <View style={s.secHead}><Icon name="location" size={20} color={colors.text} /><AppText variant="headline" style={{ fontSize: 18 }}>{t('easy.sections')}</AppText></View>
          {secs.map((v) => {
            const n = boothVoters.filter((x) => sectionKey(x) === sectionKey(v));
            return (
              <Pressable key={sectionKey(v)} accessibilityRole="button" onPress={() => router.push({ pathname: routes.place as never, params: { ...scopeParams({ ...scope, sec: sectionKey(v) }), from: name } })} style={({ pressed }) => [s.secRow, pressed && { opacity: 0.8 }]}>
                <View style={{ flex: 1 }}>
                  <AppText variant="headline">{sectionLabel(t, v)}</AppText>
                  <AppText variant="footnote" color={colors.textSecondary}>{t('easy.secLine', { n: n.length, our: n.filter((x) => x.group === 'our').length })}</AppText>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {scope.booth ? <BoothTeam booth={scope.booth} /> : null}

      <Sheet visible={sortSheet} title={t('easy.sort')} onClose={() => setSortSheet(false)}>
        {(['lead', 'notMet', 'no'] as const).map((x, i) => <ChoiceRow key={x} title={t(`easy.bsort.${x}`)} selected={bsort === x} last={i === 2} onPress={() => { setBsort(x); setSortSheet(false); }} />)}
      </Sheet>
    </View>
  );
}

function Need({ icon, text, tone, onPress }: { icon: string; text: string; tone: 'opp' | 'target'; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.need, { borderColor: group[tone].strong, backgroundColor: group[tone].card }, pressed && { opacity: 0.8 }]}>
      <View style={[s.needIcon, { backgroundColor: group[tone].strong }]}><Icon name={icon} size={22} color={colors.textOnAccent} /></View>
      <AppText variant="body" weight="semibold" style={{ flex: 1 }}>{text}</AppText>
      <Icon name="chevron-forward" size={22} color={group[tone].strong} />
    </Pressable>
  );
}

export function Legend() {
  const { t } = useTranslation();
  const items: [string, string][] = [[t('groups.our'), chart.our], [t('groups.target'), chart.target], [t('groups.opp'), chart.opp], [t('groups.none'), chart.none]];
  return (
    <View style={s.legend}>
      {items.map(([l, c]) => <View key={l} style={s.legItem}><View style={[s.legSw, { backgroundColor: c }]} /><AppText variant="footnote" weight="semibold" color={colors.textSecondary}>{l}</AppText></View>)}
    </View>
  );
}

function BoothTeam({ booth }: { booth: number }) {
  const { t } = useTranslation();
  const mid = useActiveMembership()?.id ?? '';
  const q = useQuery({ queryKey: ['team', mid, 'approved'], queryFn: () => adminApi.team(mid, 'approved'), enabled: !!mid });
  const vols = (q.data ?? []).filter((x) => x.role === 'volunteer' && x.booths.includes(booth));
  if (!vols.length) return null;
  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm, paddingHorizontal: spacing.lg }}>
      <View style={s.secHead}><Icon name="people" size={20} color={colors.text} /><AppText variant="headline" style={{ fontSize: 18 }}>{t('easy.volsHere')}</AppText></View>
      {vols.map((v) => (
        <View key={v.membershipId} style={[s.secRow, { borderColor: v.contactedToday ? group.our.strong : group.opp.strong, backgroundColor: v.contactedToday ? group.our.card : group.opp.card }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="headline">{v.name}</AppText>
            <AppText variant="footnote" color={colors.textSecondary}>{t('easy.todayN', { n: v.contactedToday })}</AppText>
          </View>
          {v.mobile ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`${t('voters.call')} ${v.name}`} onPress={() => void Linking.openURL(`tel:${v.mobile}`)} style={s.call}>
              <Icon name="call" size={20} color={colors.text} /><AppText variant="callout" weight="bold">{t('voters.call')}</AppText>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  matrixBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 60, borderRadius: 18, backgroundColor: easy.active },
  booth: { marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: 18, borderWidth: 2, backgroundColor: colors.surface },
  boothTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  boothNo: { minWidth: 50, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, padding: spacing.md, borderRadius: 16, borderWidth: 2, borderColor: easy.tileBorder, backgroundColor: colors.surface },
  need: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 18, borderWidth: 2 },
  needIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.lg },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legSw: { width: 12, height: 12, borderRadius: 3 },
  call: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: easy.tileBorder, backgroundColor: colors.surface },
}));
