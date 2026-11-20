/**
 * Small, readable charts for the admin dashboard. Every mark has a text label and number next to it
 * (identity is never colour alone); values use text colours; 2px gaps between stacked segments.
 */
import { themed } from '../theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { chart, colors, radius, spacing } from '../tokens';
import { AppText } from './AppText';

const fmt = (n: number) => n.toLocaleString('en-IN');
const pctOf = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

export interface Part {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** One 100% bar split into parts, with a labelled legend row per part. */
export function StackedBar({ parts, a11yLabel }: { parts: Part[]; a11yLabel: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <View accessible accessibilityLabel={`${a11yLabel}: ${parts.map((p) => `${p.label} ${fmt(p.value)}`).join(', ')}`} style={s.pad}>
      <View style={s.stack}>
        {parts.filter((p) => p.value > 0).map((p) => (
          <View key={p.key} style={{ flex: p.value, backgroundColor: p.color, borderRadius: 4 }} />
        ))}
      </View>
      <View style={s.legend}>
        {parts.map((p) => (
          <View key={p.key} style={s.legendRow}>
            <View style={[s.swatch, { backgroundColor: p.color }]} />
            <AppText variant="callout" style={s.flex}>{p.label}</AppText>
            <AppText variant="callout" weight="semibold" tabular>{fmt(p.value)}</AppText>
            <AppText variant="callout" color={colors.textSecondary} tabular style={s.pct}>{`${pctOf(p.value, total)}%`}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** Text shown at the end of the bar (defaults to the value). */
  display?: string;
  sub?: string;
}

/** Horizontal bars, one series. `max` sets the scale (defaults to the largest value). */
export function BarList({ items, max, onPress, a11yLabel }: { items: BarItem[]; max?: number; onPress?: (key: string) => void; a11yLabel: string }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={s.pad} accessibilityLabel={a11yLabel}>
      {items.map((i) => {
        const body = (
          <>
            <View style={s.barHead}>
              <AppText variant="callout" style={s.flex} numberOfLines={2}>{i.label}</AppText>
              <AppText variant="callout" weight="semibold" tabular>{i.display ?? fmt(i.value)}</AppText>
            </View>
            {i.sub ? <AppText variant="footnote" color={colors.textSecondary}>{i.sub}</AppText> : null}
            <View style={s.track}>
              <View style={[s.bar, { width: `${Math.max(1.5, (i.value / top) * 100)}%` }]} />
            </View>
          </>
        );
        return onPress ? (
          <Pressable key={i.key} accessibilityRole="button" accessibilityLabel={`${i.label}, ${i.display ?? fmt(i.value)}`} onPress={() => onPress(i.key)} style={({ pressed }) => [s.barRow, pressed && { opacity: 0.6 }]}>
            {body}
          </Pressable>
        ) : (
          <View key={i.key} style={s.barRow} accessible accessibilityLabel={`${i.label}, ${i.display ?? fmt(i.value)}`}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

/** Daily columns (e.g. contacted per day for 7 days). The last value is labelled; each column has its day. */
export function Columns({ items, a11yLabel }: { items: { key: string; label: string; value: number }[]; a11yLabel: string }) {
  const top = Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={s.pad} accessible accessibilityLabel={`${a11yLabel}: ${items.map((i) => `${i.label} ${fmt(i.value)}`).join(', ')}`}>
      <View style={s.cols}>
        {items.map((i, idx) => (
          <View key={i.key} style={s.col}>
            <AppText variant="caption" color={idx === items.length - 1 ? colors.text : colors.textSecondary} tabular weight={idx === items.length - 1 ? 'semibold' : undefined}>
              {fmt(i.value)}
            </AppText>
            <View style={s.colTrack}>
              <View style={[s.colBar, { height: `${Math.max(2, (i.value / top) * 100)}%`, opacity: idx === items.length - 1 ? 1 : 0.55 }]} />
            </View>
            <AppText variant="caption" color={colors.textSecondary}>{i.label}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

export const groupParts = (v: { our: number; target: number; opp: number; none?: number }, labels: { our: string; target: string; opp: string; none?: string }): Part[] => [
  { key: 'our', label: labels.our, value: v.our, color: chart.our },
  { key: 'target', label: labels.target, value: v.target, color: chart.target },
  { key: 'opp', label: labels.opp, value: v.opp, color: chart.opp },
  ...(v.none != null && labels.none ? [{ key: 'none', label: labels.none, value: v.none, color: chart.none }] : []),
];

const s = themed(() => StyleSheet.create({
  pad: { padding: spacing.lg, gap: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  stack: { flexDirection: 'row', height: 16, gap: 2, borderRadius: 4, overflow: 'hidden', backgroundColor: chart.track },
  legend: { gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  pct: { width: 44, textAlign: 'right' },
  barRow: { gap: 4 },
  barHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: chart.track, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4, backgroundColor: chart.series },
  cols: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 140 },
  col: { flex: 1, alignItems: 'center', gap: 4, height: '100%' },
  colTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  colBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: chart.series, borderRadius: radius.sm / 2 },
}));
