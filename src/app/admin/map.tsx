import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi, type MapBooth } from '@/api/adminApi';
import { AppText, Button, ChoiceRow, Group, Icon, Row, Screen, SegmentedControl, Sheet } from '@/design/components';
import { themed } from '@/design/theme';
import { chart, colors, fonts, mapColors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { MapView, type MapHandle } from '@/features/map/MapView';
import { LastResult } from '@/features/map/LastResult';
import type { MapMsgOut, MapPin } from '@/features/map/mapHtml';
import { TeamBar } from '@/features/shell/TeamBar';
import { SyncBadge } from '@/features/sync/SyncBadge';
import { useActiveMembership } from '@/stores/session';

type Mode = 'contacted' | 'strength' | 'result' | 'volunteers';
type Located = MapBooth & { lat: number; lng: number };
const ALL = '__all__';

/** Colour and legend key of a booth in each mode (one hue per meaning; text labels always shown in the legend). */
function paint(b: MapBooth, mode: Mode): { key: string; color: string; dark: boolean } {
  if (mode === 'contacted') {
    const i = b.pct < 25 ? 0 : b.pct <= 50 ? 1 : 2;
    return { key: ['low', 'mid', 'high'][i], color: chart.seq[i], dark: i === 2 };
  }
  if (mode === 'volunteers') return b.workers ? { key: 'has', color: chart.our, dark: true } : { key: 'none', color: chart.opp, dark: true };
  const g = mode === 'strength' ? b.strength : b.result;
  if (g === 'S') return { key: 'S', color: chart.our, dark: true };
  if (g === 'W') return { key: 'W', color: chart.opp, dark: true };
  if (g === 'M') return { key: 'M', color: chart.target, dark: false };
  return { key: 'na', color: chart.none, dark: false };
}

/**
 * spec booth-map M1–M7: admin map of the assembly on a real map. One request for all booths (cached 5 min); the map page
 * loads once and only re-draws pins when the data, colour mode or zone change.
 */
export default function MapScreen() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['map', mid], queryFn: () => adminApi.map(mid), enabled: !!mid, staleTime: 5 * 60_000, gcTime: 60 * 60_000 });
  const map = useRef<MapHandle>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('map');
  const params = useLocalSearchParams<{ mode?: string }>();
  // spec map-results M1: the map opens coloured by the last election (green won / orange close / red lost).
  const [mode, setMode] = useState<Mode>(params.mode === 'contacted' ? 'contacted' : 'result');
  const [zone, setZone] = useState<string>(ALL);
  const [find, setFind] = useState('');
  const [sel, setSel] = useState<number | null>(null);
  const [sat, setSat] = useState(false);
  const [missingOpen, setMissingOpen] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [placing, setPlacing] = useState<MapBooth | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fitted = useRef(false);

  const data = useMemo(() => q.data ?? [], [q.data]);
  const zones = useMemo(() => [...new Set(data.map((b) => b.zone).filter((z): z is string => !!z))].sort(), [data]);
  const shown = useMemo(() => data.filter((b) => zone === ALL || b.zone === zone), [data, zone]);
  const located = useMemo(() => shown.filter((b): b is Located => b.lat != null && b.lng != null), [shown]);
  const missing = useMemo(() => data.filter((b) => b.lat == null || b.lng == null), [data]);
  const legend = useMemo(() => {
    const n = new Map<string, number>();
    for (const b of shown) { const k = paint(b, mode).key; n.set(k, (n.get(k) ?? 0) + 1); }
    return n;
  }, [shown, mode]);

  // Pins go to the map only when something they show changes (no work while the map is idle).
  useEffect(() => {
    if (!ready || view !== 'map') return;
    const pins: MapPin[] = located.map((b) => ({ no: b.no, lat: b.lat, lng: b.lng, ...paint(b, mode), ...(b.last ? { o: b.last.oursVotes, r: b.last.rivalVotes } : {}) }));
    const cluster = mode === 'result' ? { margin: m?.resultMargin ?? 100, won: chart.our, close: chart.target, lost: chart.opp } : null;
    map.current?.post({ type: 'set', pins, fit: !fitted.current || zone !== ALL, cluster });
    fitted.current = true;
  }, [ready, located, mode, zone, view, m?.resultMargin]);
  useEffect(() => { if (ready) map.current?.post({ type: 'layer', satellite: sat }); }, [ready, sat]);

  const onMessage = useCallback((x: MapMsgOut) => {
    if (x.type === 'ready') { fitted.current = false; setReady(true); }
    else if (x.type === 'tap') setSel(x.no);
    else if (x.type === 'picked') setPicked({ lat: x.lat, lng: x.lng });
  }, []);

  const goTo = (no: number) => { setSel(no); setView('map'); setTimeout(() => map.current?.post({ type: 'focus', no }), 50); };
  const search = () => {
    const s = find.trim().toLowerCase();
    if (!s) return;
    const b = data.find((x) => String(x.no) === s) ?? data.find((x) => x.name.toLowerCase().includes(s));
    if (!b) return setMsg(t('bmap.notFound'));
    setMsg(null);
    if (b.lat == null) { setPlacing(b); setPicked(null); map.current?.post({ type: 'pick', on: true }); return; }
    goTo(b.no);
  };
  const locateMe = async () => {
    const p = await Location.requestForegroundPermissionsAsync();
    if (p.status !== 'granted') return setMsg(t('bmap.noPermission'));
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    map.current?.post({ type: 'me', lat: pos.coords.latitude, lng: pos.coords.longitude });
  };
  const startPlace = (b: MapBooth) => { setMissingOpen(false); setView('map'); setPlacing(b); setPicked(null); map.current?.post({ type: 'pick', on: true }); };
  const stopPlace = () => { setPlacing(null); setPicked(null); map.current?.post({ type: 'pick', on: false }); };
  const savePlace = async () => {
    if (!placing || !picked) return;
    await adminApi.setBoothLocation(mid, placing.no, Number(picked.lat.toFixed(6)), Number(picked.lng.toFixed(6)));
    const no = placing.no;
    stopPlace();
    await qc.invalidateQueries({ queryKey: ['map', mid] });
    setMsg(t('bmap.saved', { no }));
  };

  const b = sel != null ? data.find((x) => x.no === sel) : undefined;
  const legendItems: Record<Mode, [string, string][]> = {
    contacted: [['low', t('admin.low')], ['mid', t('admin.midPct')], ['high', t('admin.high')]],
    strength: [['S', t('bmap.strong')], ['M', t('bmap.moderate')], ['W', t('bmap.weak')]],
    result: [['S', t('bmap.wonBy', { n: m?.resultMargin ?? 100 })], ['M', t('bmap.close')], ['W', t('bmap.lostBy', { n: m?.resultMargin ?? 100 })], ['na', t('bmap.noResult')]],
    volunteers: [['has', t('bmap.hasVol')], ['none', t('bmap.noVol')]],
  };
  const keyColor = (k: string) => paint({ pct: k === 'low' ? 0 : k === 'mid' ? 30 : 80, workers: k === 'has' ? 1 : 0, strength: k, result: k } as MapBooth, mode).color;

  return (
    <Screen scroll={false} header={<TeamBar trailing={<SyncBadge />} />}>
      <View style={s.top}>
        <View style={s.searchRow}>
          <View style={s.search}>
            <Icon name="search" size={18} color={colors.textSecondary} />
            <TextInput value={find} onChangeText={setFind} onSubmitEditing={search} returnKeyType="search" placeholder={t('bmap.search')}
              placeholderTextColor={colors.textTertiary} style={s.input} accessibilityLabel={t('bmap.search')} autoCorrect={false} />
          </View>
          <SegmentedControl<'map' | 'list'> label={t('bmap.view')} value={view} onChange={setView} style={s.viewSwitch}
            options={[{ value: 'map', label: t('bmap.map') }, { value: 'list', label: t('bmap.list') }]} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {(['contacted', 'strength', 'result', 'volunteers'] as Mode[]).map((k) => (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: mode === k }} onPress={() => setMode(k)} style={[s.chip, mode === k && s.chipOn]}>
              <AppText variant="footnote" weight="semibold" color={mode === k ? colors.textOnAccent : colors.text}>{t(`bmap.mode.${k}`)}</AppText>
            </Pressable>
          ))}
          {zones.length ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`${t('bmap.zone')}, ${zone === ALL ? t('bmap.allZones') : zone}`} onPress={() => setZoneOpen(true)} style={[s.chip, s.zoneChip, zone !== ALL && s.chipOn]}>
              <AppText variant="footnote" weight="semibold" color={zone !== ALL ? colors.textOnAccent : colors.text}>{zone === ALL ? t('bmap.allZones') : zone}</AppText>
              <Icon name="chevron-down" size={14} color={zone !== ALL ? colors.textOnAccent : colors.text} />
            </Pressable>
          ) : null}
        </ScrollView>
        {msg ? <AppText variant="footnote" color={colors.textSecondary}>{msg}</AppText> : null}
      </View>

      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <View style={s.body}>
          <View style={[s.mapWrap, view !== 'map' && s.hidden]}>
            <MapView ref={map} onMessage={onMessage} />
            <View style={s.fabs}>
              <Fab icon="scan-outline" label={t('bmap.fit')} onPress={() => map.current?.post({ type: 'fit' })} />
              <Fab icon="locate" label={t('bmap.me')} onPress={() => void locateMe()} />
              <Fab icon={sat ? 'map-outline' : 'earth'} label={sat ? t('bmap.street') : t('bmap.satellite')} onPress={() => setSat((x) => !x)} />
            </View>
            <View style={s.legend} accessible accessibilityLabel={legendItems[mode].map(([k, l]) => `${l} ${legend.get(k) ?? 0}`).join(', ')}>
              {legendItems[mode].map(([k, l]) => (
                <View key={k} style={s.legendItem}>
                  <View style={[s.dot, { backgroundColor: keyColor(k) }]} />
                  <AppText variant="caption" weight="semibold">{`${l} ${legend.get(k) ?? 0}`}</AppText>
                </View>
              ))}
            </View>
            {missing.length && !placing ? (
              <Pressable accessibilityRole="button" onPress={() => setMissingOpen(true)} style={s.missing}>
                <Icon name="alert-circle" size={16} color={colors.warning} />
                <AppText variant="footnote" weight="semibold">{t('bmap.missing', { count: missing.length })}</AppText>
              </Pressable>
            ) : null}
            {placing ? (
              <View style={s.card}>
                <AppText variant="headline">{t('bmap.placeTitle', { no: placing.no })}</AppText>
                <AppText variant="callout" color={colors.textSecondary}>{picked ? t('bmap.placeSave') : t('bmap.placeTap')}</AppText>
                <View style={s.actions}>
                  <Button kind="tinted" compact label={t('common.cancel')} onPress={stopPlace} />
                  <Button kind="success" compact label={t('bmap.saveHere')} disabled={!picked} onPress={() => void savePlace()} />
                </View>
              </View>
            ) : b ? (
              <BoothCard b={b} onClose={() => setSel(null)} />
            ) : null}
          </View>
          {view === 'list' ? (
            <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
              <Group header={t('admin.boothsLowest')}>
                {[...shown].sort((a, c) => a.pct - c.pct).map((x, i, arr) => (
                  <Row key={x.no} title={`${x.no} · ${x.name}`} subtitle={`${x.zone ?? t('admin.noZone')} · ${t('admin.metOf', { met: x.met, total: x.total })}`}
                    value={`${x.pct}%`} chevron onPress={() => (x.lat == null ? startPlace(x) : goTo(x.no))} last={i === arr.length - 1} />
                ))}
              </Group>
            </ScrollView>
          ) : null}
        </View>
      )}

      <Sheet visible={zoneOpen} title={t('bmap.zone')} onClose={() => setZoneOpen(false)} scroll={false}>
        <ScrollView style={{ maxHeight: 420 }}>
          {[ALL, ...zones].map((z, i, arr) => (
            <ChoiceRow key={z} title={z === ALL ? t('bmap.allZones') : z} selected={zone === z} onPress={() => { setZone(z); setZoneOpen(false); }} last={i === arr.length - 1} />
          ))}
        </ScrollView>
      </Sheet>
      <Sheet visible={missingOpen} title={t('bmap.missingTitle')} onClose={() => setMissingOpen(false)} footer={t('bmap.missingFoot')} scroll={false}>
        <ScrollView style={{ maxHeight: 420 }}>
          {missing.map((x, i) => (
            <Row key={x.no} title={`${x.no} · ${x.name}`} value={t('bmap.setLocation')} chevron onPress={() => startPlace(x)} last={i === missing.length - 1} />
          ))}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

function Fab({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.fab, pressed && { opacity: 0.7 }]} hitSlop={4}>
      <Icon name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

/** M4: the tapped booth with its numbers and the three things an admin does next. */
function BoothCard({ b, onClose }: { b: MapBooth; onClose: () => void }) {
  const { t } = useTranslation();
  const call = b.contact?.mobile;
  return (
    <View style={s.card} accessibilityLiveRegion="polite">
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <AppText variant="headline" numberOfLines={1}>{`${b.no} · ${b.name}`}</AppText>
          <AppText variant="footnote" color={colors.textSecondary}>{`${b.zone ?? t('admin.noZone')} · ${t('admin.metOf', { met: b.met, total: b.total })} · ${b.pct}%`}</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={10}><Icon name="close" size={22} color={colors.textSecondary} /></Pressable>
      </View>
      <View style={s.cells}>
        <Cell n={b.our} label={t('groups.our')} color={chart.our} />
        <Cell n={b.target} label={t('groups.target')} color={chart.target} />
        <Cell n={b.opp} label={t('groups.opp')} color={chart.opp} />
        <Cell n={b.workers} label={t('bmap.volunteers')} color={colors.text} />
      </View>
      <LastResult b={b} />
      {b.contact ? <AppText variant="footnote" color={colors.textSecondary}>{t('bmap.volunteer', { name: b.contact.name })}</AppText> : null}
      <View style={s.actions}>
        <Button kind="filled" compact style={s.act} label={t('bmap.open')} onPress={() => router.push({ pathname: '/admin/booth', params: { no: String(b.no) } })} />
        {call ? <Button kind="tinted" compact style={s.act} label={t('bmap.call')} onPress={() => void Linking.openURL(`tel:${call}`)} /> : null}
        {b.lat != null ? <Button kind="tinted" compact style={s.act} label={t('bmap.directions')} onPress={() => void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`)} /> : null}
      </View>
    </View>
  );
}

function Cell({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={s.cell}>
      <AppText variant="headline" color={color} tabular>{n.toLocaleString('en-IN')}</AppText>
      <AppText variant="caption" color={colors.textSecondary}>{label}</AppText>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: spacing.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.fill },
  input: { flex: 1, fontSize: 16, fontFamily: fonts.regular, color: colors.text, paddingVertical: 0 },
  viewSwitch: { width: 140 },
  chips: { gap: spacing.sm },
  chip: { height: 32, paddingHorizontal: spacing.md, borderRadius: radius.full, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  zoneChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  body: { flex: 1 },
  mapWrap: { flex: 1, overflow: 'hidden' },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  fabs: { position: 'absolute', right: spacing.md, top: spacing.md, gap: spacing.sm },
  fab: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, shadowColor: mapColors.shadow, shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
  legend: { position: 'absolute', left: spacing.md, top: spacing.md, maxWidth: '70%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8, borderRadius: radius.md, backgroundColor: colors.surface, opacity: 0.95 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  missing: { position: 'absolute', left: spacing.md, bottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, height: 34, borderRadius: radius.full, backgroundColor: colors.surface, elevation: 3 },
  card: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md, gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, shadowColor: mapColors.shadow, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cells: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  act: { flex: 1 },
}));
