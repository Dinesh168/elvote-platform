import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { THEME } from '../../theme';

/**
 * SectionHeader — Consistent section divider with accent bar and title.
 *
 * Props:
 *   title       {string}  Section title
 *   accentColor {string}  Left accent bar color (default: PRIMARY)
 *   subtitle    {string}  Optional subtitle text
 *   icon        {string}  Optional icon name
 *   style       {object}  Additional style overrides
 */
export default function SectionHeader({
  title,
  accentColor = THEME.COLOR.PRIMARY,
  subtitle,
  icon,
  style,
}) {
  if (!title) return null;

  return (
    <View style={[styles.container, { borderLeftColor: accentColor }, style]}>
      <View style={styles.row}>
        {icon && (
          <View style={styles.iconWrapper}>
            <Icon source={icon} size={THEME.ICON_SIZE.SM} color={accentColor} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
    paddingVertical: THEME.SPACING.MD,
    paddingHorizontal: THEME.SPACING.LG,
    marginBottom: THEME.SPACING.MD,
    backgroundColor: THEME.COLOR.SURFACE_ELEVATED,
    borderRadius: THEME.BORDER_RADIUS.SM,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    marginRight: THEME.SPACING.SM,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    lineHeight: THEME.FONT_SIZE.LG * THEME.LINE_HEIGHT.TIGHT,
  },
  subtitle: {
    fontSize: THEME.FONT_SIZE.SM,
    color: THEME.COLOR.TEXT_MUTED,
    marginTop: THEME.SPACING.XXS,
  },
});
