/**
 * A2: polling-day page body, shared by the admin (/admin/polling) and the super-admin (/platform/polling/<customer>).
 * Tiles · map (booth circles at the customer distance, volunteers as dots) · filterable volunteer list · alerts · booths without a location.
 */
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import type { PdAlert, PdBooth, PdStatus, PdVolunteer, PollingPage } from '@/api/adminApi';
import { AppText, Button, DataTable, Field, Group, Icon, Row, Sheet, type Column } from '@/design/components';
import { useWide } from '@/design/layout';
import { themed } from '@/design/theme';
import { colors, fonts, radius, spacing, web } from '@/design/tokens';
import { localeOf } from '@/i18n';

type Filter = 'all' | 'sharing' | PdStatus;
const FILTERS: Filter[] = ['all', 'at_booth', 'away', 'not_reporting', 'location_off', 'not_shared', 'no_booth_location'];

/** Status = colour + icon + words (never colour alone). */
export const statusMeta = (s: PdStatus): { color: string; icon: string } => ({
  at_booth: { color: colors.success, icon: 'checkmark-circle' },
  away: { color: colors.danger, icon: 'warning' },
  not_reporting: { color: colors.textSecondary, icon: 'cloud-offline' },
  location_off: { color: colors.warning, icon: 'location-outline' },
  no_booth_location: { color: colors.warning, icon: 'help-circle' },
  checking: { color: colors.accent, icon: 'locate' },
  not_shared: { color: colors.textTertiary, icon: 'ellipse-outline' },
}[s]);

export function StatusPill({ status }: { status: PdStatus }) {
  const { t } = useTranslation();
  const m = statusMeta(status);
  return (
    <View style={s.pill}>
      <Icon name={m.icon} size={16} color={m.color} />
      <AppText variant="callout" weight="semibold" color={m.color} numberOfLines={1}>{t(`pd.st.${status}`)}</AppText>
    </View>
  );
}

export function useAgo() {
  const { t } = useTranslation();
  return (iso: string | null) => {
    if (!iso) return '—';
    const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
    if (m < 1) return t('pd.ago.now');
    if (m < 60) return t('pd.ago.min', { n: m });
    return t('pd.ago.h', { n: Math.round(m / 60) });
  };
}

const fmtDate = (d: string, lang: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function PollingView({
  data, alerts, onSetLocation, onOpenAlerts,
}: {
  data: PollingPage;
  alerts?: PdAlert[];
  /** Admin only: fix a booth's location. */
  onSetLocation?: (no: number, lat: number, lng: number) => Promise<unknown>;
  onOpenAlerts?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const wide = useWide();
  const ago = useAgo();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [fix, setFix] = useState<PdBooth | null>(null);
  const tl = data.tiles;
  const e = data.election;

  const rows = useMemo(() => data.volunteers.filter((v) => {
    if (filter === 'sharing' && !['at_booth', 'away', 'no_booth_location', 'checking'].includes(v.status)) return false;
    if (filter !== 'all' && filter !== 'sharing' && v.status !== filter) return false;
    const x = q.trim().toLowerCase();
    return !x || v.name.toLowerCase().includes(x) || (v.mobile ?? '').includes(x) || v.booths.some((b) => String(b) === x);
  }), [data.volunteers, filter, q]);

  const tiles: { key: Filter | 'unattended'; label: string; value: number; color: string; icon: string }[] = [
    { key: 'sharing', label: t('pd.tile.sharing'), value: tl.sharing, color: colors.accent, icon: 'navigate' },
    { key: 'at_booth', label: t('pd.tile.atBooth'), value: tl.atBooth, color: colors.success, icon: 'checkmark-circle' },
    { key: 'away', label: t('pd.tile.away'), value: tl.away, color: colors.danger, icon: 'warning' },
    { key: 'not_reporting', label: t('pd.tile.notReporting'), value: tl.notReporting, color: colors.textSecondary, icon: 'cloud-offline' },
    { key: 'location_off', label: t('pd.tile.locationOff'), value: tl.locationOff, color: colors.warning, icon: 'location-outline' },
    { key: 'unattended', label: t('pd.tile.unattended'), value: tl.unattendedBooths, color: colors.danger, icon: 'flag' },
  ];

  const cols: Column<PdVolunteer>[] = [
    { key: 'name', label: t('admin.col.name'), value: (v) => v.name, flex: 1.8 },
    { key: 'mobile', label: t('admin.col.mobile'), value: (v) => v.mobile ?? '', flex: 1.3, render: (v) => <AppText variant="callout" tabular>{v.mobile ? `+91 ${v.mobile}` : '—'}</AppText> },
    { key: 'booths', label: t('admin.col.booth'), value: (v) => v.booths.join(', '), flex: 1 },
    { key: 'status', label: t('pd.col.status'), value: (v) => t(`pd.st.${v.status}`), flex: 1.6, render: (v) => <StatusPill status={v.status} /> },
    { key: 'dist', label: t('pd.col.distance'), value: (v) => v.distanceM ?? -1, align: 'right', render: (v) => <AppText variant="callout" tabular>{distText(v, t)}</AppText> },
    { key: 'at', label: t('pd.col.updated'), value: (v) => v.reportedAt ?? '', align: 'right', render: (v) => <AppText variant="callout" tabular color={colors.textSecondary}>{ago(v.reportedAt)}</AppText> },
  ];

  const missing = data.booths.filter((b) => b.lat == null).sort((a, b) => b.volunteers - a.volunteers || a.no - b.no);

  return (
    <View>
      {/* Election and state of the day */}
      <View style={[s.head, wide && s.headWide]}>
        {e ? (
          <>
            <View style={s.headLine}>
              <View style={[s.live, { backgroundColor: data.inWindow ? colors.successFill : colors.textTertiary }]} />
              <AppText variant="headline">{data.inWindow ? t('pd.liveNow') : t('pd.notYet', { date: fmtDate(e.date, i18n.language), time: e.opensAt })}</AppText>
            </View>
            <AppText variant="callout" color={colors.textSecondary}>
              {`${e.name} · ${fmtDate(e.date, i18n.language)} · ${e.opensAt}–${e.closesAt} · ${t('pd.radiusLine', { m: data.radiusM })}`}
            </AppText>
          </>
        ) : (
          <AppText variant="callout" color={colors.textSecondary}>{t('pd.noElection')}</AppText>
        )}
      </View>

      {/* Tiles (tap = filter the list) */}
      <View style={s.tiles}>
        {tiles.map((x) => {
          const on = filter === x.key;
          return (
            <Pressable key={x.key} accessibilityRole={x.key === 'unattended' ? undefined : 'button'} {...(x.key === 'unattended' ? {} : ({ 'aria-pressed': on } as object))}
              accessibilityLabel={x.key === 'unattended' ? undefined : `${x.label}: ${x.value}`} disabled={x.key === 'unattended'}
              onPress={() => setFilter(on ? 'all' : (x.key as Filter))}
              style={[s.tile, wide ? s.tileWide : s.tilePhone, on && { borderColor: x.color, borderWidth: 2 }]}>
              <View style={s.tileTop}>
                <Icon name={x.icon} size={18} color={x.color} />
                <AppText variant="footnote" color={colors.textSecondary} numberOfLines={2} style={s.flex}>{x.label}</AppText>
              </View>
              <AppText variant={wide ? 'largeTitle' : 'title2'} tabular>{String(x.value)}</AppText>
            </Pressable>
          );
        })}
      </View>
      {tl.notShared ? <AppText variant="footnote" color={colors.textSecondary} style={s.note}>{t('pd.notSharedNote', { n: tl.notShared })}</AppText> : null}

      {/* Alerts (admin) */}
      {alerts ? (
        <Group header={`${t('pd.alerts')}${data.unseen ? ` · ${t('pd.newAlerts', { n: data.unseen })}` : ''}`} footer={alerts.length ? undefined : t('pd.noAlerts')}>
          {alerts.slice(0, 8).map((a, i, arr) => (
            <Row key={a.id} title={t(`pd.alert.${a.kind}`, { name: a.name, no: a.partNo ?? '' })}
              subtitle={`${a.distanceM != null && (a.kind === 'left' || a.kind === 'still_away') ? `${t('pd.mAway', { m: a.distanceM })} · ` : ''}${new Date(a.at).toLocaleTimeString(localeOf(i18n.language), { hour: 'numeric', minute: '2-digit' })}`}
              leading={<View style={s.alertIcon}><Icon name={alertIcon(a.kind)} size={22} color={alertColor(a.kind)} /></View>}
              last={i === arr.length - 1 && !(alerts.length > 8 && onOpenAlerts)} />
          ))}
          {alerts.length > 8 && onOpenAlerts ? <Row title={t('pd.allAlerts', { n: alerts.length })} titleColor={colors.accent} chevron onPress={onOpenAlerts} last /> : null}
        </Group>
      ) : null}

      {/* Map */}
      <Group header={t('pd.map')} footer={t('pd.mapHint', { m: data.radiusM })}>
        <PdMap data={data} />
        <View style={s.legend}>
          {(['at_booth', 'away', 'not_reporting', 'checking'] as PdStatus[]).map((k) => (
            <View key={k} style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: statusMeta(k).color }]} />
              <AppText variant="footnote" color={colors.textSecondary}>{t(`pd.st.${k}`)}</AppText>
            </View>
          ))}
          <View style={s.legendItem}>
            <View style={[s.ring, { borderColor: colors.danger }]} />
            <AppText variant="footnote" color={colors.textSecondary}>{t('pd.legendUnattended')}</AppText>
          </View>
        </View>
      </Group>

      {/* Volunteers */}
      <View style={s.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} {...({ role: 'radiogroup', 'aria-label': t('pd.col.status') } as object)}>
          {FILTERS.map((f) => {
            const on = filter === f;
            const n = f === 'all' ? data.volunteers.length : data.volunteers.filter((v) => v.status === f).length;
            return (
              <Pressable key={f} {...({ role: 'radio', 'aria-checked': on } as object)} accessibilityState={{ checked: on }} onPress={() => setFilter(f)} style={[s.chip, on && s.chipOn]}>
                <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>{`${f === 'all' ? t('pd.all') : t(`pd.st.${f}`)} · ${n}`}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>
        <Field label={t('pd.search')} value={q} onChangeText={setQ} autoCorrect={false} />
      </View>
      {wide ? (
        <View style={s.tableGap}>
          <DataTable columns={cols} rows={rows} rowKey={(v) => v.membershipId} empty={t('pd.noneMatch')}
            initialSort={{ key: 'status', dir: 'asc' }} rowA11y={(v) => `${v.name}, ${t(`pd.st.${v.status}`)}`}
            onRowPress={(v) => v.mobile && void Linking.openURL(`tel:${v.mobile}`)} />
        </View>
      ) : (
        <Group footer={rows.length ? t('pd.tapToCall') : t('pd.noneMatch')}>
          {rows.map((v, i) => (
            <Row key={v.membershipId} title={v.name}
              subtitle={`${t('common.booth', { no: v.booths.join(', ') })} · ${distText(v, t)} · ${ago(v.reportedAt)}`}
              trailing={<StatusPill status={v.status} />}
              onPress={v.mobile ? () => void Linking.openURL(`tel:${v.mobile}`) : undefined}
              a11yLabel={`${v.name}, ${t(`pd.st.${v.status}`)}`} last={i === rows.length - 1} />
          ))}
        </Group>
      )}

      {/* Booths without a location (PD8) */}
      {missing.length ? (
        <Group header={t('pd.missingTitle', { n: missing.length })} footer={onSetLocation ? t('pd.missingHintAdmin') : t('pd.missingHint')}>
          {missing.slice(0, 50).map((b, i, arr) => (
            <Row key={b.no} title={`${b.no} · ${b.name}`} subtitle={t('pd.boothVols', { n: b.volunteers })}
              chevron={!!onSetLocation} onPress={onSetLocation ? () => setFix(b) : undefined} last={i === arr.length - 1} />
          ))}
        </Group>
      ) : null}

      {fix && onSetLocation ? <FixSheet booth={fix} onClose={() => setFix(null)} save={(lat, lng) => onSetLocation(fix.no, lat, lng)} /> : null}
    </View>
  );
}

function distText(v: PdVolunteer, t: TFunction) {
  if (v.distanceM == null) return '—';
  return v.distanceM >= 1000 ? t('pd.km', { km: (v.distanceM / 1000).toFixed(1) }) : t('pd.m', { m: v.distanceM });
}
const alertIcon = (k: PdAlert['kind']) => ({ left: 'warning', still_away: 'time', returned: 'checkmark-circle', location_off: 'location-outline', location_on: 'location' }[k]);
const alertColor = (k: PdAlert['kind']) => ({ left: colors.danger, still_away: colors.danger, returned: colors.success, location_off: colors.warning, location_on: colors.accent }[k]);

// ---------- map: drawn from coordinates (no map tiles), equal scale on both axes ----------

const H = 380;
const PAD = 24;
const M_PER_DEG = 111_320;

function PdMap({ data }: { data: PollingPage }) {
  const { t } = useTranslation();
  const [w, setW] = useState(0);
  const booths = data.booths.filter((b): b is PdBooth & { lat: number; lng: number } => b.lat != null && b.lng != null);
  const vols = data.volunteers.filter((v): v is PdVolunteer & { lat: number; lng: number } => v.lat != null && v.lng != null && v.status !== 'not_shared');
  const pts = [...booths, ...vols];
  if (!pts.length) {
    return <AppText variant="callout" color={colors.textSecondary} style={s.mapEmpty}>{t('pd.mapEmpty')}</AppText>;
  }
  const lat0 = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const mx = (p: { lng: number }) => p.lng * k * M_PER_DEG;
  const my = (p: { lat: number }) => p.lat * M_PER_DEG;
  const xs = pts.map(mx);
  const ys = pts.map(my);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = { x: Math.max(maxX - minX, data.radiusM * 3), y: Math.max(maxY - minY, data.radiusM * 3) };
  const scale = w > 0 ? Math.min((w - PAD * 2) / span.x, (H - PAD * 2) / span.y) : 0;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const X = (p: { lng: number }) => w / 2 + (mx(p) - cx) * scale;
  const Y = (p: { lat: number }) => H / 2 - (my(p) - cy) * scale;
  const r = Math.max(data.radiusM * scale, 4);
  const label = booths.length <= 60;
  return (
    <View style={s.map} onLayout={(ev) => setW(ev.nativeEvent.layout.width)} accessibilityRole="image" accessibilityLabel={t('pd.mapA11y', { booths: booths.length, vols: vols.length })}>
      {w > 0 ? (
        <Svg width={w} height={H}>
          <Rect x={0} y={0} width={w} height={H} fill={colors.surface} />
          {booths.map((b) => {
            const unattended = b.volunteers > 0 && b.atBooth === 0;
            return (
              <Circle key={`b${b.no}`} cx={X(b)} cy={Y(b)} r={r}
                fill={b.atBooth ? colors.successTint : b.volunteers ? colors.dangerTint : colors.fill}
                stroke={unattended ? colors.danger : b.atBooth ? colors.success : colors.separator} strokeWidth={unattended ? 2 : 1} />
            );
          })}
          {label ? booths.map((b) => (
            <SvgText key={`t${b.no}`} x={X(b)} y={Y(b) - r - 4} fontSize={10} fontFamily={fonts.medium} fill={colors.textSecondary} textAnchor="middle">{String(b.no)}</SvgText>
          )) : null}
          {vols.map((v) => (
            <Circle key={v.membershipId} cx={X(v)} cy={Y(v)} r={6} fill={statusMeta(v.status).color} stroke={colors.surface} strokeWidth={2} />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

// ---------- admin: set a booth's location ----------

function FixSheet({ booth, onClose, save }: { booth: PdBooth; onClose: () => void; save: (lat: number, lng: number) => Promise<unknown> }) {
  const { t } = useTranslation();
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const la = Number(lat);
  const lo = Number(lng);
  const ok = lat !== '' && lng !== '' && la >= 6 && la <= 38 && lo >= 68 && lo <= 98;
  const here = async () => {
    setErr(null);
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.status !== 'granted') return setErr(t('me3.locationDenied'));
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const go = async () => {
    setBusy(true);
    try {
      await save(la, lo);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible title={t('pd.fixTitle', { no: booth.no })} onClose={onClose} footer={booth.name}>
      <View style={s.sheet}>
        <Field label={t('pd.lat')} value={lat} onChangeText={setLat} keyboardType="decimal-pad" placeholder="30.912345" error={lat && (la < 6 || la > 38) ? t('pd.latRange') : null} />
        <Field label={t('pd.lng')} value={lng} onChangeText={setLng} keyboardType="decimal-pad" placeholder="75.712345" error={lng && (lo < 68 || lo > 98) ? t('pd.lngRange') : null} />
        {Platform.OS !== 'web' ? <Button kind="tinted" label={t('pd.useHere')} onPress={() => void here()} /> : null}
        {err ? <AppText variant="footnote" color={colors.danger}>{err}</AppText> : null}
        <Button label={t('cms.save')} disabled={!ok || busy} onPress={() => void go()} />
      </View>
    </Sheet>
  );
}

const s = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: 4 },
  headWide: { paddingTop: spacing.sm },
  headLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  live: { width: 10, height: 10, borderRadius: 5 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  tile: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: 4, borderWidth: 1, borderColor: 'transparent' },
  tilePhone: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  tileWide: { flexBasis: 0, flexGrow: 1, minWidth: 150, borderColor: web.border },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { paddingHorizontal: spacing.xxxl, paddingTop: spacing.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  alertIcon: { width: 30, alignItems: 'center' },
  map: { height: H, borderRadius: radius.lg, overflow: 'hidden' },
  mapEmpty: { padding: spacing.xl },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, padding: spacing.md, paddingTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  ring: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  filters: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: { height: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill },
  chipOn: { backgroundColor: colors.accent },
  tableGap: { marginTop: spacing.lg },
  sheet: { padding: spacing.lg, gap: spacing.md },
}));
