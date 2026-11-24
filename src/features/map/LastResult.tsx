import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MapBooth } from '@/api/adminApi';
import { AppText } from '@/design/components';
import { chart, colors } from '@/design/tokens';

/** spec map-results M3/M4: last election of this booth for the team's party. */
export function LastResult({ b }: { b: MapBooth }) {
  const { t } = useTranslation();
  if (!b.last) return <AppText variant="footnote" color={colors.textSecondary}>{t('bmap.noResult')}</AppText>;
  const l = b.last;
  const c = l.margin >= 0 ? chart.our : chart.opp;
  return (
    <View style={st.row} accessible accessibilityLabel={t('bmap.lastA11y', { year: l.year, party: l.party, ours: l.ours, rival: l.rival ?? '', rivalPct: l.rivalPct, n: Math.abs(l.margin), won: l.margin >= 0 ? t('bmap.wonWord') : t('bmap.lostWord') })}>
      <View style={[st.dot, { backgroundColor: c }]} />
      <AppText variant="footnote" style={{ flex: 1 }}>
        {`${l.year} · ${l.party} ${l.ours}%${l.rival ? ` vs ${l.rival} ${l.rivalPct}%` : ''} · `}
        <AppText variant="footnote" weight="semibold" color={c}>{l.margin >= 0 ? t('bmap.wonN', { n: l.margin }) : t('bmap.lostN', { n: -l.margin })}</AppText>
      </AppText>
    </View>
  );
}


const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
