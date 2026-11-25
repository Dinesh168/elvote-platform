/**
 * spec admin-fixes-r1 A3 (was admin-views A2): every zone, area and booth in one list. A Zones | Areas | Booths switch
 * (Areas only when the booth data has areas), search, and per row: booths, voters, % met and a Our/Swing/Opp bar.
 * Tapping a row opens that place's page (the same page the Dashboard opens).
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, BarLine, Icon, LargeTitle, Screen, SearchBox, SegmentedControl } from '@/design/components';
import { themed } from '@/design/theme';
import { chart, colors, easy, group, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { leadOf, sumStats, type BoothStatRow } from '@/features/easy/logic';
import { Legend } from '@/features/easy/admin/PlaceView';
import { scopeParams, useAllBoothStats, type Scope } from '@/features/easy/admin/scope';
import { useActiveMembership } from '@/stores/session';

type By = 'zone' | 'area' | 'booth';
interface Line { id: string; name: string; sub: string; rows: BoothStatRow[]; scope: Scope; no?: number }

export default function Places() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const q = useAllBoothStats();
  const all = useMemo(() => q.data?.booths ?? [], [q.data]);
  const hasAreas = all.some((b) => b.area) || !!m?.views?.includes('area');
  const opts: By[] = hasAreas ? ['zone', 'area', 'booth'] : ['zone', 'booth'];
  const [by, setBy] = useState<By>('zone');
  const [text, setText] = useState('');

  const lines = useMemo<Line[]>(() => {
    if (by === 'booth') {
      return all.map((b) => ({ id: String(b.no), no: b.no, name: `${b.no} · ${b.name}`, sub: [b.zone, b.area].filter(Boolean).join(' · '), rows: [b], scope: { view: 'zone', booth: b.no } }));
    }
    const map = new Map<string, { name: string; rows: BoothStatRow[] }>();
    for (const b of all) {
      const key = (by === 'zone' ? b.zoneId : b.area) ?? '';
      const name = (by === 'zone' ? b.zone : b.area) ?? '';
      const cur = map.get(key);
      if (cur) cur.rows.push(b);
      else map.set(key, { name, rows: [b] });
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] === '' ? 1 : b[0] === '' ? -1 : a[1].name.localeCompare(b[1].name, undefined, { numeric: true })))
      .map(([key, x]) => ({
        id: key || '_none', name: key ? x.name : by === 'zone' ? t('places.noZone') : t('allb.noArea'), sub: '', rows: x.rows,
        // Booths without a zone / area cannot be opened as one place: open the first booth list instead.
        scope: key ? { view: by, key } : { view: 'zone' },
      }));
  }, [all, by, t]);

  const s_ = text.trim().toLowerCase();
  const shown = s_ ? lines.filter((l) => l.name.toLowerCase().includes(s_) || l.rows.some((b) => String(b.no) === s_)) : lines;
  const label: Record<By, string> = { zone: t('places.zones'), area: t('places.areas'), booth: t('places.booths') };
  const open = (l: Line) => router.push({ pathname: '/admin/place', params: { ...scopeParams(l.scope), from: t('side.places') } });

  return (
    <Screen back={t('admin.tabs.dashboard')} width="medium">
      <LargeTitle title={t('side.places')} subtitle={m ? t('admin.acTitle', { no: m.acNo, name: m.acName }) : undefined} />
      <View style={s.pad}>
        <SegmentedControl<By> label={t('allb.viewBy')} value={by} onChange={(v) => { setBy(v); setText(''); }} options={opts.map((v) => ({ value: v, label: label[v] }))} />
      </View>
      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <SearchBox value={text} onChange={setText} placeholder={t('places.search')} />
        <Legend />
      </View>
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} />
      ) : !shown.length ? (
        <AppText variant="callout" color={colors.textSecondary} align="center" style={s.empty}>{by === 'zone' && !lines.length ? t('places.empty') : t('voters.empty')}</AppText>
      ) : shown.map((l) => {
        const x = sumStats(l.rows);
        const p = (n: number) => (x.total ? (n / x.total) * 100 : 0);
        const lead = leadOf(x);
        const canOpen = by === 'booth' || l.id !== '_none';
        return (
          <Pressable key={l.id} accessibilityRole="button" disabled={!canOpen} onPress={() => open(l)}
            accessibilityLabel={`${l.name}, ${t('places.row', { booths: l.rows.length, voters: x.total.toLocaleString('en-IN'), pct: Math.round(p(x.met)) })}`}
            style={({ pressed }) => [s.card, { borderColor: group[lead].strong }, pressed && { opacity: 0.8 }]}>
            <View style={s.top}>
              <View style={[s.badge, { backgroundColor: group[lead].strong }]}>
                <Icon name={by === 'booth' ? 'business' : by === 'area' ? 'layers' : 'location'} size={22} color={colors.textOnAccent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="headline" numberOfLines={1}>{l.name}</AppText>
                <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>
                  {[l.sub, t('places.row', { booths: l.rows.length, voters: x.total.toLocaleString('en-IN'), pct: Math.round(p(x.met)) })].filter(Boolean).join(' · ')}
                </AppText>
              </View>
              {canOpen ? <Icon name="chevron-forward" size={20} color={colors.textSecondary} /> : null}
            </View>
            <BarLine label="" value="" segs={[{ pct: p(x.our), color: chart.our }, { pct: p(x.target), color: chart.target }, { pct: p(x.opp), color: chart.opp }]} />
          </Pressable>
        );
      })}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  empty: { padding: spacing.xxxl },
  card: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: 18, borderWidth: 2, backgroundColor: colors.surface, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: easy.active },
}));
