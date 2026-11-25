/**
 * spec easy-redesign: building blocks of the easy screens — shortcut tiles, the Back + path bar, list tools (search,
 * filter, sort, removable chips), section bands, a donut, a line chart and tappable bars. Colour + icon + word always.
 */
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Polygon, Polyline } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import type { GroupCode } from '@/api/types';
import { themed } from '../theme';
import { chart, colors, easy, fonts, group, radius, spacing } from '../tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

export type Tone = GroupCode | 'grey' | 'blue';
const toneOf = (t: Tone = 'blue') =>
  t === 'blue' ? { bg: colors.surface, bd: easy.tileBorder, ic: colors.accent, text: easy.bandText }
    : t === 'grey' ? { bg: colors.surface, bd: easy.dashed, ic: group.none.strong, text: group.none.text }
      : { bg: group[t].card, bd: group[t].strong, ic: group[t].strong, text: group[t].text };

// ---------- Shortcut tiles ----------
export function ShortcutTile({ icon, num, word, tone, onPress, pct, big }: {
  icon: string; num: string; word: string; tone?: Tone; onPress?: () => void; pct?: string; big?: boolean;
}) {
  const c = toneOf(tone);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${word} ${num}`} onPress={onPress}
      style={({ pressed }) => [s.tile, { backgroundColor: c.bg, borderColor: c.bd, minHeight: big ? 108 : 100 }, pressed && s.pressed]}>
      <View style={s.tileTop}>
        <View style={[s.tileIcon, big && s.tileIconBig, { backgroundColor: c.ic }]}><Icon name={icon} size={big ? 22 : 20} color={colors.textOnAccent} /></View>
        {pct ? <AppText variant="footnote" weight="bold" color={c.text}>{pct}</AppText> : onPress ? <Icon name="chevron-forward" size={18} color={colors.textSecondary} /> : null}
      </View>
      <AppText style={[s.tileNum, { fontSize: big ? 30 : 22, lineHeight: big ? 34 : 26 }]} tabular>{num}</AppText>
      <AppText variant="callout" weight="bold" color={c.text} numberOfLines={2}>{word}</AppText>
    </Pressable>
  );
}

/** A titled group of tiles (2 or 3 per row; the first can span the row). */
export function TileGroup({ title, icon, cols = 3, children, note }: { title: string; icon: string; cols?: 2 | 3; children: ReactNode[]; note?: string }) {
  const items = children.filter(Boolean);
  return (
    <View style={s.groupWrap}>
      <View style={s.groupHead}>
        <Icon name={icon} size={20} color={colors.text} />
        <AppText variant="headline" style={{ fontSize: 18 }}>{title}</AppText>
        {note ? <AppText variant="footnote" color={colors.textSecondary}>{note}</AppText> : null}
      </View>
      <View style={s.grid}>
        {items.map((c, i) => (
          <View key={i} style={{ width: cols === 2 ? '48.5%' : '31.6%' }}>{c}</View>
        ))}
        {/* fill the last row so its tiles stay on the left */}
        {Array.from({ length: (cols - (items.length % cols)) % cols }, (_, i) => <View key={`pad-${i}`} style={{ width: cols === 2 ? '48.5%' : '31.6%' }} />)}
      </View>
    </View>
  );
}

// ---------- Back + path ----------
export interface Crumb { label: string; onPress?: () => void }
export function PathBar({ back, onBack, crumbs }: { back: string; onBack: () => void; crumbs: Crumb[] }) {
  const { t } = useTranslation();
  return (
    <View style={s.path}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('easy.backTo', { page: back })} onPress={onBack} style={({ pressed }) => [s.backBtn, pressed && s.pressed]}>
        <Icon name="chevron-back" size={22} color={easy.active} />
        <AppText variant="body" weight="bold" color={easy.active} numberOfLines={1}>{t('easy.backTo', { page: back })}</AppText>
      </Pressable>
      <View style={s.crumbs} accessibilityRole={'navigation' as never}>
        <Icon name="location" size={14} color={colors.textSecondary} />
        {crumbs.map((c, i) => (
          <View key={`${c.label}-${i}`} style={s.crumbItem}>
            {c.onPress && i < crumbs.length - 1 ? (
              <Pressable accessibilityRole="link" onPress={c.onPress} hitSlop={6}><AppText variant="footnote" weight="semibold" color={easy.active}>{c.label}</AppText></Pressable>
            ) : (
              <AppText variant="footnote" weight="bold">{c.label}</AppText>
            )}
            {i < crumbs.length - 1 ? <Icon name="chevron-forward" size={12} color={colors.textTertiary} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- List tools ----------
export function SearchBox({ value, onChange, placeholder, numeric }: { value: string; onChange: (s: string) => void; placeholder: string; numeric?: boolean }) {
  return (
    <View style={s.search}>
      <Icon name="search" size={22} color={colors.textSecondary} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textTertiary}
        accessibilityLabel={placeholder} keyboardType={numeric ? 'number-pad' : 'default'} autoCorrect={false} style={s.searchInput} />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear" onPress={() => onChange('')} hitSlop={8}>
          <Icon name="close-circle" size={22} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ToolRow({ filterCount, onFilter, sortWord, onSort }: { filterCount?: number; onFilter?: () => void; sortWord: string; onSort: () => void }) {
  const { t } = useTranslation();
  const on = !!filterCount;
  return (
    <View style={s.tools}>
      {onFilter ? (
        <Pressable accessibilityRole="button" onPress={onFilter} style={({ pressed }) => [s.toolBtn, on && s.toolOn, pressed && s.pressed]}>
          <Icon name="funnel" size={20} color={on ? colors.textOnAccent : colors.text} />
          <AppText variant="body" weight="bold" color={on ? colors.textOnAccent : colors.text}>{on ? t('easy.filterN', { n: filterCount }) : t('easy.filter')}</AppText>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`${t('easy.sort')}: ${sortWord}`} onPress={onSort} style={({ pressed }) => [s.toolBtn, pressed && s.pressed]}>
        <Icon name="swap-vertical" size={20} color={colors.text} />
        <AppText variant="callout" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{sortWord}</AppText>
      </Pressable>
    </View>
  );
}

export interface ChipItem { key: string; label: string; icon?: string; count?: number | string; selected: boolean; tone?: Tone; onPress: () => void }
export function ChipRow({ chips }: { chips: ChipItem[] }) {
  return (
    <View style={s.chipRow} accessibilityRole={'radiogroup' as never}>
      {chips.map((c) => {
        const tn = c.tone && c.tone !== 'blue' && c.tone !== 'grey' ? group[c.tone] : null;
        const strong = tn ? tn.strong : c.tone === 'grey' ? group.none.strong : easy.active;
        const fg = c.selected ? colors.textOnAccent : tn ? tn.text : strong;
        return (
          <Pressable key={c.key} accessibilityRole="radio" accessibilityState={{ selected: c.selected }} onPress={c.onPress}
            style={({ pressed }) => [s.chip, { borderColor: strong, backgroundColor: c.selected ? strong : tn ? tn.card : colors.surface }, pressed && s.pressed]}>
            {c.selected ? <Icon name="checkmark" size={16} color={fg} /> : null}
            {c.icon ? <Icon name={c.icon} size={18} color={fg} /> : null}
            <AppText variant="callout" weight="bold" color={fg}>{c.label}</AppText>
            {c.count !== undefined ? <AppText variant="callout" weight="bold" color={fg} tabular>{String(c.count)}</AppText> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function ActivePills({ pills, onClear }: { pills: { label: string; onRemove: () => void }[]; onClear: () => void }) {
  const { t } = useTranslation();
  if (!pills.length) return null;
  return (
    <View style={s.pills}>
      {pills.map((p) => (
        <Pressable key={p.label} accessibilityRole="button" accessibilityLabel={t('easy.remove', { what: p.label })} onPress={p.onRemove} style={({ pressed }) => [s.pill, pressed && s.pressed]}>
          <AppText variant="callout" weight="bold" color={colors.textOnAccent}>{p.label}</AppText>
          <Icon name="close" size={16} color={colors.textOnAccent} />
        </Pressable>
      ))}
      <Pressable accessibilityRole="button" onPress={onClear} hitSlop={6}><AppText variant="callout" weight="bold" color={easy.active}>{t('easy.clearAll')}</AppText></Pressable>
    </View>
  );
}

export interface FilterCat { title: string; icon: string; opts: { key: string; label: string; count?: number; selected: boolean; onPress: () => void }[] }
export function FilterSheet({ visible, onClose, cats, onClear, showLabel }: { visible: boolean; onClose: () => void; cats: FilterCat[]; onClear: () => void; showLabel: string }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} title={t('easy.filter')} onClose={onClose}>
      <View style={s.fBody}>
        {cats.map((c) => (
          <View key={c.title} style={s.fCat}>
            <View style={s.groupHead}><Icon name={c.icon} size={18} color={colors.textSecondary} /><AppText variant="callout" weight="bold" color={colors.textSecondary}>{c.title}</AppText></View>
            <View style={s.chipRow}>
              {c.opts.map((o) => (
                <Pressable key={o.key} accessibilityRole="checkbox" accessibilityState={{ checked: o.selected }} onPress={o.onPress}
                  style={({ pressed }) => [s.chip, { borderColor: o.selected ? easy.active : easy.tileBorder, backgroundColor: o.selected ? easy.active : colors.surface }, pressed && s.pressed]}>
                  {o.selected ? <Icon name="checkmark" size={16} color={colors.textOnAccent} /> : null}
                  <AppText variant="callout" weight="semibold" color={o.selected ? colors.textOnAccent : colors.text}>{o.label}</AppText>
                  {o.count !== undefined ? <AppText variant="callout" color={o.selected ? colors.textOnAccent : colors.textSecondary} tabular>{String(o.count)}</AppText> : null}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <View style={s.fFoot}>
          <Pressable accessibilityRole="button" onPress={onClear} style={({ pressed }) => [s.fClear, pressed && s.pressed]}><AppText variant="body" weight="bold" color={easy.active}>{t('easy.clearAll')}</AppText></Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [s.fShow, pressed && s.pressed]}><AppText variant="body" weight="bold" color={colors.textOnAccent}>{showLabel}</AppText></Pressable>
        </View>
      </View>
    </Sheet>
  );
}

export function SectionBand({ label, count }: { label: string; count?: string }) {
  return (
    <View style={s.band} accessibilityRole="header">
      <Icon name="location" size={18} color={easy.bandText} />
      <AppText variant="callout" weight="bold" color={easy.bandText} style={{ flex: 1 }} numberOfLines={1}>{label}</AppText>
      {count ? <AppText variant="callout" weight="bold" color={easy.bandText} tabular>{count}</AppText> : null}
    </View>
  );
}

// ---------- Charts (validated chart colours; numbers always shown as text) ----------
export interface DonutPart { key: string; label: string; value: number; color: string; onPress?: () => void }
export function Donut({ parts, centre, centreSub, a11y, size = 132 }: { parts: DonutPart[]; centre: string; centreSub?: string; a11y: string; size?: number }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = 40, c = 2 * Math.PI * r;
  const lens = parts.map((p) => (p.value / total) * c);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, x) => a + x, 0));
  return (
    <View style={s.donutRow}>
      <View accessibilityRole="image" accessibilityLabel={a11y} style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={r} stroke={chart.track} strokeWidth={16} fill="none" />
          {parts.map((p, i) => (
            <Circle key={p.key} cx={50} cy={50} r={r} stroke={p.color} strokeWidth={16} fill="none"
              strokeDasharray={`${Math.max(0, lens[i] - 1.2)} ${c}`} strokeDashoffset={-starts[i]} transform="rotate(-90 50 50)" />
          ))}
        </Svg>
        <View style={[StyleSheet.absoluteFill, s.donutMid]}>
          <AppText variant="headline" tabular>{centre}</AppText>
          {centreSub ? <AppText variant="caption" color={colors.textSecondary}>{centreSub}</AppText> : null}
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {parts.map((p) => (
          <Pressable key={p.key} accessibilityRole="button" disabled={!p.onPress} onPress={p.onPress} style={({ pressed }) => [s.legend, pressed && s.pressed]}>
            <View style={[s.swatch, { backgroundColor: p.color }]} />
            <AppText variant="callout" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{p.label}</AppText>
            <AppText variant="callout" weight="bold" tabular>{p.value.toLocaleString('en-IN')}</AppText>
            <AppText variant="footnote" color={colors.textSecondary} style={{ minWidth: 36, textAlign: 'right' }} tabular>{`${Math.round((p.value / total) * 100)}%`}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function LineChart({ values, a11y, height = 110 }: { values: number[]; a11y: string; height?: number }) {
  const w = 340;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 6 - (v / max) * (height - 14)).toFixed(1)}`);
  return (
    <View accessibilityRole="image" accessibilityLabel={a11y}>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
        <Polygon points={`0,${height} ${pts.join(' ')} ${w},${height}`} fill={easy.band} />
        <Polyline points={pts.join(' ')} fill="none" stroke={chart.series} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** One labelled, tappable bar (value as text on the right). `segs` draws a stacked bar. */
export function BarLine({ label, value, sub, pct, color = chart.series, segs, onPress }: {
  label: string; value: string; sub?: string; pct?: number; color?: string; segs?: { pct: number; color: string }[]; onPress?: () => void;
}) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={label ? `${label}: ${value}` : undefined} disabled={!onPress} onPress={onPress} style={({ pressed }) => [s.barLine, pressed && s.pressed]}>
      {label || value ? (
        <View style={s.barHead}>
          <AppText variant="callout" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{label}</AppText>
          <AppText variant="callout" weight="bold" tabular>{value}</AppText>
          {sub ? <AppText variant="footnote" color={colors.textSecondary} tabular>{sub}</AppText> : null}
        </View>
      ) : null}
      <View style={s.track}>
        {segs ? segs.map((g, i) => <View key={i} style={{ width: `${Math.max(0, g.pct)}%`, backgroundColor: g.color, marginRight: 2 }} />)
          : <View style={{ width: `${Math.max(2, Math.min(100, pct ?? 0))}%`, backgroundColor: color, borderRadius: 4 }} />}
      </View>
    </Pressable>
  );
}

/** Vertical day bars (Daily work); the picked day is darker. */
export function DayBars({ days, picked, onPick }: { days: { label: string; value: number; a11y: string }[]; picked: number; onPick: (i: number) => void }) {
  const max = Math.max(1, ...days.map((d) => d.value));
  return (
    <View style={s.dayRow}>
      {days.map((d, i) => (
        <Pressable key={i} accessibilityRole="button" accessibilityLabel={d.a11y} accessibilityState={{ selected: i === picked }} onPress={() => onPick(i)} style={s.dayCol}>
          <AppText variant="caption" tabular>{d.value}</AppText>
          <View style={{ width: '100%', height: Math.max(6, (d.value / max) * 130), borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: i === picked ? easy.bandText : chart.series }} />
          <AppText variant="caption" color={i === picked ? colors.text : colors.textSecondary}>{d.label}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

export function Card({ children, border }: { children: ReactNode; border?: string }) {
  return <View style={[s.card, border ? { borderWidth: 2, borderColor: border } : null]}>{children}</View>;
}

/** Tiny chart path used for a sparkline in tiles (kept for future use). */
export const sparkPath = (vals: number[], w = 60, h = 20) => {
  const max = Math.max(1, ...vals);
  return vals.map((v, i) => `${i ? 'L' : 'M'}${((i / Math.max(1, vals.length - 1)) * w).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' ');
};
export const Spark = ({ vals }: { vals: number[] }) => (
  <Svg width={60} height={20}><Path d={sparkPath(vals)} stroke={chart.series} strokeWidth={2} fill="none" /></Svg>
);

const s = themed(() => StyleSheet.create({
  pressed: { opacity: 0.75 },
  tile: { borderRadius: 18, borderWidth: 2, padding: spacing.md, gap: 4 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tileIconBig: { width: 40, height: 40, borderRadius: 20 },
  tileNum: { fontFamily: fonts.bold, color: colors.text },
  groupWrap: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.lg },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  path: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, gap: 6 },
  backBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48, paddingLeft: 8, paddingRight: 16, borderRadius: 24, borderWidth: 2, borderColor: easy.active, backgroundColor: easy.helpTint, maxWidth: '100%' },
  crumbs: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  crumbItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 54, marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, borderRadius: 16, borderWidth: 2, borderColor: easy.tileBorder, backgroundColor: colors.surface },
  searchInput: { flex: 1, fontSize: 18, fontFamily: fonts.regular, color: colors.text },
  tools: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  toolBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 52, paddingHorizontal: spacing.sm, borderRadius: 16, borderWidth: 2, borderColor: easy.tileBorder, backgroundColor: colors.surface },
  toolOn: { backgroundColor: easy.active, borderColor: easy.active },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 14, borderRadius: 24, borderWidth: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingLeft: 12, paddingRight: 8, borderRadius: 20, backgroundColor: easy.active },
  fBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg },
  fCat: { gap: spacing.sm },
  fFoot: { flexDirection: 'row', gap: spacing.sm },
  fClear: { flex: 1, minHeight: 56, borderRadius: 16, borderWidth: 2, borderColor: easy.active, alignItems: 'center', justifyContent: 'center' },
  fShow: { flex: 2, minHeight: 56, borderRadius: 16, backgroundColor: easy.active, alignItems: 'center', justifyContent: 'center' },
  band: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: easy.band },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  donutMid: { alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, borderColor: easy.tileBorder },
  barLine: { paddingVertical: 6, gap: 4 },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { flexDirection: 'row', height: 18, borderRadius: 4, overflow: 'hidden', backgroundColor: chart.track },
  dayRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 180 },
  dayCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2, height: '100%' },
  card: { marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderRadius: 20, backgroundColor: colors.surface, gap: spacing.md },
}));
