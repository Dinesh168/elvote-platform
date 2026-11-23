/**
 * Charts (spec flow-fixes O3): real charts from react-native-gifted-charts, read by people first.
 * Every chart has a legend or labels with numbers (identity is never colour alone), values in text colours, thin marks,
 * 2px surface gaps between filled marks, recessive axes, and an accessibilityLabel that reads the numbers.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { themed } from '../theme';
import { chart, colors, spacing } from '../tokens';
import { AppText } from './AppText';

const fmt = (n: number) => n.toLocaleString('en-IN');
const pctOf = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

/** Width of the chart area, measured from the layout (charts need a number). */
function useWidth(initial = 300): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(initial);
  return [w, (e) => { const x = Math.floor(e.nativeEvent.layout.width); if (x > 0 && Math.abs(x - w) > 1) setW(x); }];
}

const axisText = () => ({ color: colors.textSecondary, fontSize: 11 });

export interface Part {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Parts of a whole: a donut (total in the middle) with a legend row per part (number and %). */
export function StackedBar({ parts, a11yLabel }: { parts: Part[]; a11yLabel: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const shown = parts.filter((p) => p.value > 0);
  return (
    <View accessible accessibilityLabel={`${a11yLabel}: ${parts.map((p) => `${p.label} ${fmt(p.value)}, ${pctOf(p.value, total)}%`).join('; ')}`} style={[s.pad, s.donutRow]}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <PieChart
          donut
          radius={48}
          innerRadius={33}
          strokeWidth={2}
          strokeColor={colors.surface}
          innerCircleColor={colors.surface}
          data={shown.length ? shown.map((p) => ({ value: p.value, color: p.color })) : [{ value: 1, color: chart.track }]}
          centerLabelComponent={() => (
            <View style={s.center}>
              <AppText variant="headline" tabular>{fmt(total)}</AppText>
            </View>
          )}
        />
      </View>
      <View style={[s.legend, s.flex]}>
        {parts.map((p) => (
          <View key={p.key} style={s.legendRow}>
            <View style={[s.swatch, { backgroundColor: p.color }]} />
            <AppText variant="callout" style={s.flex} numberOfLines={2}>{p.label}</AppText>
            <AppText variant="callout" weight="semibold" tabular>{fmt(p.value)}</AppText>
            <AppText variant="footnote" color={colors.textSecondary} tabular style={s.pct}>{`${pctOf(p.value, total)}%`}</AppText>
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

/** Ranked horizontal bars (long labels read well), one series. `max` sets the scale (defaults to the largest value). */
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

/** Daily columns (e.g. contacted per day): y-axis, value on the last column, tap a column to see its value. */
export function Columns({ items, a11yLabel }: { items: { key: string; label: string; value: number }[]; a11yLabel: string }) {
  const [w, onLayout] = useWidth();
  const top = Math.max(1, ...items.map((i) => i.value));
  const n = Math.max(1, items.length);
  const yAxis = 36;
  const plot = Math.max(120, w - yAxis - spacing.lg * 2);
  const gap = 8;
  const barWidth = Math.max(10, Math.min(36, (plot - gap * (n + 1)) / n));
  return (
    <View onLayout={onLayout} style={s.pad} accessible accessibilityLabel={`${a11yLabel}: ${items.map((i) => `${i.label} ${fmt(i.value)}`).join(', ')}`}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <BarChart
          data={items.map((i, idx) => ({
            value: i.value,
            label: i.label,
            frontColor: chart.series,
            ...(idx === items.length - 1 ? { topLabelComponent: () => <AppText variant="caption" weight="semibold" tabular>{fmt(i.value)}</AppText> } : {}),
          }))}
          width={plot}
          height={140}
          barWidth={barWidth}
          spacing={gap}
          initialSpacing={gap}
          roundedTop
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          maxValue={niceMax(top)}
          noOfSections={4}
          yAxisLabelWidth={yAxis}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={colors.separator}
          rulesColor={chart.track}
          rulesType="solid"
          yAxisTextStyle={axisText()}
          xAxisLabelTextStyle={axisText()}
          disableScroll
          renderTooltip={(item: { value: number }) => <View style={s.tip}><AppText variant="caption" tabular>{fmt(item.value)}</AppText></View>}
        />
      </View>
    </View>
  );
}

/** Vote share by party for one year: a column per party, our party in the "our" colour, others neutral; % on top. */
export function PartyShare({ shares, ours, a11yLabel }: { shares: Record<string, number>; ours: string; a11yLabel: string }) {
  const [w, onLayout] = useWidth();
  const rows = Object.entries(shares).sort((a, b) => b[1] - a[1]);
  const n = Math.max(1, rows.length);
  const yAxis = 32;
  const plot = Math.max(140, w - yAxis - spacing.lg * 2);
  const gap = 14;
  const barWidth = Math.max(16, Math.min(44, (plot - gap * (n + 1)) / n));
  return (
    <View onLayout={onLayout} style={s.pad} accessible accessibilityLabel={`${a11yLabel}: ${rows.map(([k, v]) => `${k} ${v}%`).join(', ')}`}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <BarChart
          data={rows.map(([k, v]) => ({
            value: v,
            label: k,
            frontColor: k === ours ? chart.our : chart.series,
            topLabelComponent: () => <AppText variant="caption" weight={k === ours ? 'semibold' : undefined} tabular>{`${v}%`}</AppText>,
          }))}
          width={plot}
          height={150}
          barWidth={barWidth}
          spacing={gap}
          initialSpacing={gap}
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          maxValue={100}
          noOfSections={4}
          yAxisLabelSuffix="%"
          yAxisLabelWidth={yAxis}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={colors.separator}
          rulesColor={chart.track}
          rulesType="solid"
          yAxisTextStyle={axisText()}
          xAxisLabelTextStyle={axisText()}
          disableScroll
        />
      </View>
      <View style={s.legendInline}>
        <View style={s.legendRow}><View style={[s.swatch, { backgroundColor: chart.our }]} /><AppText variant="footnote" color={colors.textSecondary}>{ours}</AppText></View>
        <View style={s.legendRow}><View style={[s.swatch, { backgroundColor: chart.series }]} /><AppText variant="footnote" color={colors.textSecondary}>{rows.filter(([k]) => k !== ours).map(([k]) => k).join(', ')}</AppText></View>
      </View>
    </View>
  );
}

/** Our share vs the main rival across years (needs 2+ years): two lines, end labels, legend. */
export function ShareTrend({ years, ours, rival, a11yLabel }: { years: { year: number; ours: number; rival: number }[]; ours: string; rival: string; a11yLabel: string }) {
  const [w, onLayout] = useWidth();
  const yAxis = 32;
  const n = Math.max(2, years.length);
  const plot = Math.max(160, w - yAxis - spacing.lg * 2);
  const step = Math.max(40, (plot - 40) / (n - 1));
  const last = years.at(-1);
  return (
    <View onLayout={onLayout} style={s.pad} accessible accessibilityLabel={`${a11yLabel}: ${years.map((y) => `${y.year} ${ours} ${y.ours}%, ${rival} ${y.rival}%`).join('; ')}`}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <LineChart
          data={years.map((y) => ({ value: y.ours, label: String(y.year) }))}
          data2={years.map((y) => ({ value: y.rival }))}
          color1={chart.our}
          color2={chart.opp}
          dataPointsColor1={chart.our}
          dataPointsColor2={chart.opp}
          dataPointsRadius={4}
          thickness={2}
          width={plot}
          height={150}
          spacing={step}
          initialSpacing={20}
          maxValue={100}
          noOfSections={4}
          yAxisLabelSuffix="%"
          yAxisLabelWidth={yAxis}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={colors.separator}
          rulesColor={chart.track}
          rulesType="solid"
          yAxisTextStyle={axisText()}
          xAxisLabelTextStyle={axisText()}
          disableScroll
        />
      </View>
      <View style={s.legendInline}>
        {/* Latest values in the legend (labels drawn inside the chart do not render on the web). */}
        <View style={s.legendRow}><View style={[s.swatch, { backgroundColor: chart.our }]} /><AppText variant="footnote" color={colors.textSecondary}>{`${ours} ${last?.ours ?? 0}%`}</AppText></View>
        <View style={s.legendRow}><View style={[s.swatch, { backgroundColor: chart.opp }]} /><AppText variant="footnote" color={colors.textSecondary}>{`${rival} ${last?.rival ?? 0}%`}</AppText></View>
      </View>
    </View>
  );
}

/** A round axis maximum just above the top value (1, 2, 5 × 10ⁿ steps of 4 sections). */
function niceMax(v: number) {
  const raw = v * 1.15;
  const p = 10 ** Math.floor(Math.log10(Math.max(1, raw)));
  for (const m of [1, 2, 4, 5, 8, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
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
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  center: { alignItems: 'center', justifyContent: 'center' },
  legend: { gap: 8 },
  legendInline: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  pct: { width: 36, textAlign: 'right' },
  barRow: { gap: 4 },
  barHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: chart.track, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4, backgroundColor: chart.series },
  tip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator },
}));
