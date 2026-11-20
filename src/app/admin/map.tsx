import { useQuery } from '@tanstack/react-query';
import { themed } from '@/design/theme';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { adminApi, type MapBooth } from '@/api/adminApi';
import { AppText, Group, LargeTitle, Row, Screen } from '@/design/components';
import { chart, colors, fonts, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useActiveMembership } from '@/stores/session';

// magnitude = % contacted; read at render so the customer colour applies
const steps = () => chart.seq;
const stepOf = (pct: number) => (pct < 25 ? 0 : pct <= 50 ? 1 : 2);
const H = 340;
const PAD = 28; // room for the booth number above each dot

/**
 * A-MAP-1 booth map (D17: drawn from booth coordinates, no map tiles yet).
 * Dot colour = % contacted; tap a dot (or a row) to open that booth's numbers.
 */
export default function MapScreen() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const [w, setW] = useState(0);
  const q = useQuery({ queryKey: ['map', mid], queryFn: () => adminApi.map(mid), enabled: !!mid });
  const open = (no: number) => router.push({ pathname: '/admin/booth', params: { no: String(no) } });
  const data = q.data ?? [];
  const located = data.filter((b): b is MapBooth & { lat: number; lng: number } => b.lat != null && b.lng != null);
  const lats = located.map((b) => b.lat);
  const lngs = located.map((b) => b.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const x = (lng: number) => PAD + ((lng - minLng) / (maxLng - minLng || 1)) * (w - PAD * 2);
  const y = (lat: number) => PAD + (1 - (lat - minLat) / (maxLat - minLat || 1)) * (H - PAD * 2);

  return (
    <Screen>
      <LargeTitle title={t('admin.tabs.map')} subtitle={m ? t('admin.acTitle', { no: m.acNo, name: m.acName }) : undefined} />
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Group footer={t('admin.mapHint')}>
            <View style={s.map} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityLabel={t('admin.mapHint')}>
              {w > 0 ? (
                <Svg width={w} height={H}>
                  <Rect x={0} y={0} width={w} height={H} fill={colors.surface} />
                  {located.map((b) => (
                    <Circle key={b.no} cx={x(b.lng)} cy={y(b.lat)} r={11} fill={steps()[stepOf(b.pct)]} stroke={colors.surface} strokeWidth={2} onPress={() => open(b.no)} />
                  ))}
                  {located.map((b) => (
                    <SvgText key={`t${b.no}`} x={x(b.lng)} y={y(b.lat) - 15} fontSize={10} fontFamily={fonts.medium} fill={colors.textSecondary} textAnchor="middle">{String(b.no)}</SvgText>
                  ))}
                </Svg>
              ) : null}
            </View>
            <View style={s.legend}>
              {[t('admin.low'), t('admin.midPct'), t('admin.high')].map((label, i) => (
                <View key={label} style={s.legendItem}>
                  <View style={[s.swatch, { backgroundColor: steps()[i] }]} />
                  <AppText variant="footnote" color={colors.textSecondary}>{label}</AppText>
                </View>
              ))}
            </View>
          </Group>
          {data.length - located.length > 0 ? (
            <AppText variant="footnote" color={colors.textSecondary} style={s.note}>{t('admin.noLocation', { n: data.length - located.length })}</AppText>
          ) : null}
          <Group header={t('admin.boothsLowest')}>
            {[...data].sort((a, b) => a.pct - b.pct).map((b, i, arr) => (
              <Row key={b.no} title={`${b.no} · ${b.name}`} subtitle={`${b.zone ?? t('admin.noZone')} · ${t('admin.metOf', { met: b.met, total: b.total })}`} value={`${b.pct}%`} chevron onPress={() => open(b.no)} last={i === arr.length - 1} />
            ))}
          </Group>
        </>
      )}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  map: { height: H, borderRadius: radius.lg, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, padding: spacing.md, paddingTop: 0 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  note: { paddingHorizontal: spacing.xxxl, paddingTop: spacing.sm },
}));
