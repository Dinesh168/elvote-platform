import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { THEME } from '../../theme';

export default function ComingSoonView({ title, description, icon = '🛠️', color = THEME.COLOR.PRIMARY, onBack }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: `${color}15`, borderColor: color }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        
        <Text style={styles.title}>{title}</Text>
        
        <Text style={styles.description}>
          {description || "We are working hard to build this feature. It will be available in the next system update. Stay tuned!"}
        </Text>
        
        <View style={styles.badge}>
          <View style={[styles.badgeDot, { backgroundColor: color }]} />
          <Text style={[styles.badgeText, { color }]}>Coming Soon</Text>
        </View>

        {onBack && (
          <Button
            mode="contained"
            onPress={onBack}
            style={[styles.button, { backgroundColor: color }]}
            labelStyle={styles.buttonLabel}
            contentStyle={{ height: 44 }}
            icon="arrow-left"
          >
            Go Back
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.COLOR.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.SPACING.LG,
  },
  card: {
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.CARD.BORDER_RADIUS,
    padding: THEME.SPACING.XXL,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    ...THEME.SHADOW.MEDIUM,
    borderWidth: 1,
    borderColor: THEME.COLOR.BORDER,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.SPACING.LG,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: THEME.FONT_SIZE.XL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: THEME.SPACING.SM,
  },
  description: {
    fontSize: THEME.FONT_SIZE.SM,
    color: THEME.COLOR.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: THEME.SPACING.LG,
    paddingHorizontal: THEME.SPACING.SM,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.COLOR.SURFACE_ELEVATED,
    paddingHorizontal: THEME.SPACING.MD,
    paddingVertical: THEME.SPACING.XS,
    borderRadius: THEME.BORDER_RADIUS.FULL,
    borderWidth: 1,
    borderColor: THEME.COLOR.BORDER,
    marginBottom: THEME.SPACING.XL,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: THEME.SPACING.XS,
  },
  badgeText: {
    fontSize: THEME.FONT_SIZE.XS,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  button: {
    width: '100%',
    borderRadius: THEME.BORDER_RADIUS.MD,
    ...THEME.SHADOW.LIGHT,
  },
  buttonLabel: {
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    fontSize: THEME.FONT_SIZE.SM,
  },
});
