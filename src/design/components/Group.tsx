import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useWide } from '../layout';
import { colors, hairline, radius, spacing, touch, web } from '../tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** iOS inset grouped section: optional uppercase header, white rounded group, optional footnote. */
export function Group({ header, headerRight, footer, children, style }: { header?: string; headerRight?: ReactNode; footer?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const wide = useWide();
  return (
    <View style={s.section}>
      {(header || headerRight) && (
        <View style={[s.header, wide && s.headerWide]}>
          {header ? (
            wide ? (
              <AppText variant="headline" accessibilityRole="header">{header}</AppText>
            ) : (
            <AppText variant="footnote" color={colors.textSecondary} style={s.headerText} accessibilityRole="header">
              {header.toLocaleUpperCase()}
            </AppText>
            )
          ) : (
            <View />
          )}
          {headerRight}
        </View>
      )}
      <View style={[s.group, wide && s.groupWide, style]}>{children}</View>
      {footer ? (
        <AppText variant="footnote" color={colors.textSecondary} style={s.footer}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

export interface RowProps {
  title: string;
  subtitle?: string;
  value?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  last?: boolean;
  a11yLabel?: string;
  titleColor?: string;
}

/** Grouped-list row. The hairline divider is inset to start after the leading element. */
export function Row({ title, subtitle, value, leading, trailing, chevron, onPress, last, a11yLabel, titleColor }: RowProps) {
  const body = (
    <>
      {leading}
      <View style={[s.inner, !last && s.divider]}>
        <View style={s.texts}>
          <AppText variant="body" color={titleColor ?? colors.text} numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="callout" color={colors.textSecondary} numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {value ? (
          <AppText variant="body" color={colors.textSecondary} tabular>
            {value}
          </AppText>
        ) : null}
        {trailing}
        {chevron ? <Icon name="chevron-forward" size={18} color={colors.chevron} /> : null}
      </View>
    </>
  );
  if (!onPress) return <View style={s.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
      onPress={onPress}
      style={(st) => [s.row, (st as { hovered?: boolean }).hovered && { backgroundColor: web.hover }, st.pressed && { backgroundColor: colors.pressed }]}
    >
      {body}
    </Pressable>
  );
}

export function IconSquare({ name, bg }: { name: string; bg: string }) {
  return (
    <View style={[s.square, { backgroundColor: bg }]}>
      <Icon name={name} size={18} color={colors.textOnAccent} />
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginTop: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: spacing.xxxl, paddingBottom: 7, minHeight: 22 },
  headerText: { letterSpacing: 0.2 },
  headerWide: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  groupWide: { borderWidth: 1, borderColor: web.border },
  group: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  footer: { paddingHorizontal: spacing.xxxl, paddingTop: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.lg, backgroundColor: colors.surface, minHeight: touch.row },
  inner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch', minHeight: touch.row, paddingRight: spacing.lg, paddingVertical: 8 },
  divider: { borderBottomWidth: hairline, borderBottomColor: colors.separator },
  texts: { flex: 1, minWidth: 0 },
  square: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
