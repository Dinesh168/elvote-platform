import { Children, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLayout } from '../layout';
import { colors, radius, spacing, web } from '../tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** W4: responsive grid. Phone renders children unchanged (one column); desktop lays them out in `cols` columns. */
export function Grid({ cols = 2, children }: { cols?: number; children: ReactNode }) {
  const layout = useLayout();
  const items = Children.toArray(children).filter(Boolean);
  if (layout === 'phone') return <>{items}</>;
  const n = layout === 'desktop' ? cols : Math.min(cols, 2);
  const width = `${100 / n}%` as DimensionValue;
  return (
    <View style={s.grid}>
      {items.map((c, i) => (
        <View key={i} style={{ width }}>
          {c}
        </View>
      ))}
    </View>
  );
}

export interface Column<T> {
  key: string;
  label: string;
  /** Sort / display value. Numbers sort numerically. */
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right';
  flex?: number;
  sortable?: boolean;
}

type Sort = { key: string; dir: 'asc' | 'desc' } | null;

/** W4: data table for the web desktop: sortable headers (aria-sort), hover rows, row click. */
export function DataTable<T>({
  columns, rows, rowKey, onRowPress, rowA11y, initialSort = null, empty,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowPress?: (row: T) => void;
  rowA11y?: (row: T) => string;
  initialSort?: Sort;
  empty?: string;
}) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<Sort>(initialSort);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const m = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = col.value(a);
      const y = col.value(b);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * m;
    });
  }, [rows, columns, sort]);

  const toggle = (key: string) =>
    setSort((cur) => (cur?.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  return (
    <View style={s.table} role="table">
      <View style={[s.tr, s.thead]} role="row">
        {columns.map((c) => {
          const on = sort?.key === c.key;
          const ariaSort = on ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : 'none';
          const label = (
            <View style={[s.thInner, c.align === 'right' && s.right]}>
              <AppText variant="footnote" weight="semibold" color={on ? colors.text : colors.textSecondary} numberOfLines={1}>{c.label}</AppText>
              {c.sortable !== false ? (
                <Icon name={on ? (sort?.dir === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'} size={12} color={on ? colors.text : colors.textTertiary} />
              ) : null}
            </View>
          );
          return (
            <View key={c.key} style={[s.cell, { flex: c.flex ?? 1 }]} role="columnheader" aria-sort={ariaSort}>
              {c.sortable !== false ? (
                <Pressable accessibilityRole="button" accessibilityLabel={t('table.sortBy', { col: c.label })} onPress={() => toggle(c.key)}
                  style={(st) => [s.th, (st as { hovered?: boolean }).hovered && { backgroundColor: web.hover }]}>
                  {label}
                </Pressable>
              ) : <View style={s.th}>{label}</View>}
            </View>
          );
        })}
      </View>
      {sorted.length === 0 && empty ? (
        <AppText variant="callout" color={colors.textSecondary} style={s.empty}>{empty}</AppText>
      ) : null}
      {sorted.map((r, i) => {
        const cells = columns.map((c) => (
          <View key={c.key} style={[s.cell, s.td, { flex: c.flex ?? 1 }, c.align === 'right' && s.right]} role="cell">
            {c.render ? c.render(r) : (
              <AppText variant="callout" tabular={c.align === 'right'} numberOfLines={1} align={c.align}>{String(c.value(r))}</AppText>
            )}
          </View>
        ));
        const last = i === sorted.length - 1;
        if (!onRowPress)
          return <View key={rowKey(r)} style={[s.tr, !last && s.divider]} role="row">{cells}</View>;
        return (
          <Pressable key={rowKey(r)} role="row" accessibilityLabel={rowA11y?.(r)} onPress={() => onRowPress(r)}
            style={(st) => [s.tr, !last && s.divider, (st as { hovered?: boolean }).hovered && { backgroundColor: web.hover }, st.pressed && { backgroundColor: colors.pressed }]}>
            {cells}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Desktop KPI tile row: one row of N tiles (phone: 2 per row). */
export function TileRow({ children }: { children: ReactNode }) {
  const layout = useLayout();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={s.tiles}>
      {items.map((c, i) => (
        <View key={i} style={layout === 'phone' ? s.tilePhone : s.tileWide}>{c}</View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  table: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: web.border, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: spacing.sm },
  thead: { minHeight: 40, backgroundColor: web.sidebarBg, borderBottomWidth: 1, borderBottomColor: web.border },
  cell: { minWidth: 0, paddingHorizontal: spacing.sm },
  td: { paddingVertical: 10 },
  th: { paddingVertical: 8, borderRadius: radius.sm },
  thInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  right: { justifyContent: 'flex-end', alignItems: 'flex-end' },
  divider: { borderBottomWidth: 1, borderBottomColor: web.border },
  empty: { padding: spacing.xl },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  tilePhone: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  tileWide: { flexBasis: 0, flexGrow: 1, minWidth: 160 },
});
