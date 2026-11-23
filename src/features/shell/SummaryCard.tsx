/**
 * Summary card like the Polling day page (spec usability-r2 H1): progress ring, one headline line, a subtitle, an
 * optional action (e.g. Change booth), then up to four tappable counts.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, hairline, radius, spacing } from '@/design/tokens';

export type SummaryCell = { key: string; value: number; label: string; color: string; onPress?: () => void };

const fmt = (n: number) => n.toLocaleString('en-IN');

export function Ring({ pct, size = 56, stroke = 6, color = colors.accent, label }: { pct: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.ringTrack} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${(c * p) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <AppText variant="caption" weight="bold" tabular>{label ?? `${Math.round(p)}%`}</AppText>
      </View>
    </View>
  );
}

export function SummaryCard({ pct, title, subtitle, action, onAction, actionA11y, cells, ringColor }: {
  pct: number; title: string; subtitle?: string; action?: string; onAction?: () => void; actionA11y?: string; cells: SummaryCell[]; ringColor?: string;
}) {
  return (
    <View style={s.card}>
      <Pressable accessibilityRole={onAction ? 'button' : undefined} accessibilityLabel={actionA11y ?? `${title}. ${subtitle ?? ''}`} disabled={!onAction} onPress={onAction}
        style={({ pressed }) => [s.top, pressed && onAction ? { backgroundColor: colors.pressed } : null]}>
        <Ring pct={pct} color={ringColor} />
        <View style={s.flex}>
          <AppText variant="headline" tabular>{title}</AppText>
          {subtitle ? <AppText variant="callout" color={colors.textSecondary} numberOfLines={1}>{subtitle}</AppText> : null}
        </View>
        {action ? <AppText variant="callout" color={colors.accent}>{action}</AppText> : null}
      </Pressable>
      <View style={s.cells}>
        {cells.map((c, i) => (
          <Pressable key={c.key} accessibilityRole={c.onPress ? 'button' : 'text'} accessibilityLabel={`${c.label} ${fmt(c.value)}`} disabled={!c.onPress} onPress={c.onPress}
            style={({ pressed }) => [s.cell, i > 0 && s.cellDivider, pressed && c.onPress ? { backgroundColor: colors.pressed } : null]}>
            <AppText variant="title2" tabular color={c.color} style={s.num}>{fmt(c.value)}</AppText>
            <AppText variant="caption" weight="semibold" color={c.color === colors.text ? colors.textSecondary : c.color} numberOfLines={1}>{c.label}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, minHeight: 44 },
  flex: { flex: 1, minWidth: 0 },
  cells: { flexDirection: 'row', borderTopWidth: hairline, borderTopColor: colors.separator },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 10, minHeight: 44 },
  cellDivider: { borderLeftWidth: hairline, borderLeftColor: colors.separator },
  num: { fontSize: 20, lineHeight: 24 },
}));
