import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { THEME } from '../../theme';

/**
 * EmptyState — Reusable empty state with icon, title, subtitle, and optional CTA.
 *
 * Props:
 *   icon       {string}   Emoji or text icon
 *   title      {string}   Primary message
 *   subtitle   {string}   Secondary message
 *   buttonLabel{string}   Optional button label
 *   onPress    {function} Optional button press handler
 *   style      {object}   Additional style overrides
 */
export default function EmptyState({
  icon = '📋',
  title = 'No data available',
  subtitle,
  buttonLabel,
  onPress,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      {buttonLabel && onPress && (
        <Button
          mode="contained"
          onPress={onPress}
          style={styles.button}
          labelStyle={styles.buttonLabel}
          contentStyle={styles.buttonContent}
          buttonColor={THEME.COLOR.PRIMARY}
          icon="refresh"
        >
          {buttonLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: THEME.SPACING.XXL,
    paddingVertical: THEME.SPACING.XXXXL,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.SPACING.XL,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: THEME.FONT_SIZE.XL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: THEME.SPACING.SM,
  },
  subtitle: {
    fontSize: THEME.FONT_SIZE.MD,
    color: THEME.COLOR.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: THEME.FONT_SIZE.MD * THEME.LINE_HEIGHT.RELAXED,
    marginBottom: THEME.SPACING.XL,
  },
  button: {
    borderRadius: THEME.BORDER_RADIUS.MD,
    marginTop: THEME.SPACING.SM,
  },
  buttonLabel: {
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
    fontSize: THEME.FONT_SIZE.MD,
  },
  buttonContent: {
    height: 48,
  },
});
