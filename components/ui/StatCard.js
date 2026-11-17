import React from 'react';
import { StyleSheet, View, Pressable, Animated } from 'react-native';
import { ActivityIndicator, Text, Icon } from 'react-native-paper';
import { THEME } from '../../theme';

/**
 * StatCard — Unified summary card for dashboard metrics.
 *
 * Props:
 *   count       {number|string}  The metric value to display
 *   label       {string}         Description of the metric
 *   icon        {string}         MaterialCommunityIcons icon name (optional)
 *   accentColor {string}         Accent color for top bar and icon bg (default: PRIMARY)
 *   isLoading   {boolean}        Whether data is still loading
 *   onPress     {function}       Press handler for navigation
 *   style       {object}         Additional style overrides
 */
export default function StatCard({
  count = 0,
  label = '',
  icon,
  accentColor = THEME.COLOR.PRIMARY,
  isLoading = false,
  onPress,
  style,
}) {
  const formattedCount = typeof count === 'number'
    ? count.toLocaleString()
    : count;

  const getLowOpacityColor = (color) => {
    if (!color) return 'rgba(0,0,0,0.05)';
    if (color.startsWith('rgba')) {
      return color.replace(/,?\s*[\d\.]+\s*\)$/, ', 0.12)');
    }
    return `${color}1E`;
  };

  const iconBgColor = getLowOpacityColor(accentColor);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed, hovered }) => [
        styles.card,
        style,
        pressed && { opacity: THEME.OPACITY.PRESSED, transform: [{ scale: 0.98 }] },
        hovered && onPress && { transform: [{ scale: 1.02 }] },
      ]}
    >
      {/* Accent top bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        {/* Icon */}
        {icon && (
          <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
            <Icon source={icon} size={THEME.ICON_SIZE.MD} color={accentColor} />
          </View>
        )}

        {/* Count */}
        <View style={styles.countContainer}>
          {isLoading ? (
            <View style={styles.shimmerBlock}>
              <ActivityIndicator color={accentColor} size="small" />
            </View>
          ) : (
            <Text style={[styles.count, { color: accentColor }]} numberOfLines={1}>
              {formattedCount}
            </Text>
          )}
        </View>

        {/* Label */}
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      </View>

      {/* Subtle press indicator */}
      {onPress && (
        <View style={styles.chevronContainer}>
          <Icon source="chevron-right" size={14} color={THEME.COLOR.TEXT_MUTED} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.CARD.BORDER_RADIUS,
    overflow: 'hidden',
    ...THEME.SHADOW.MEDIUM,
  },
  accentBar: {
    height: THEME.CARD.ACCENT_BAR_HEIGHT,
  },
  content: {
    alignItems: 'center',
    paddingVertical: THEME.SPACING.XL,
    paddingHorizontal: THEME.SPACING.MD,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: THEME.BORDER_RADIUS.FULL,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.SPACING.SM,
  },
  countContainer: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmerBlock: {
    width: 60,
    height: 32,
    borderRadius: THEME.BORDER_RADIUS.SM,
    backgroundColor: THEME.COLOR.BORDER_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  count: {
    fontSize: THEME.FONT_SIZE.XXXL,
    fontWeight: THEME.FONT_WEIGHT.EXTRABOLD,
    lineHeight: THEME.FONT_SIZE.XXXL * THEME.LINE_HEIGHT.TIGHT,
  },
  label: {
    fontSize: THEME.FONT_SIZE.SM,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
    color: THEME.COLOR.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: THEME.SPACING.XS,
    lineHeight: THEME.FONT_SIZE.SM * THEME.LINE_HEIGHT.NORMAL,
  },
  chevronContainer: {
    position: 'absolute',
    top: THEME.CARD.ACCENT_BAR_HEIGHT + 8,
    right: 8,
    opacity: 0.4,
  },
});
