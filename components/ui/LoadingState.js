import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { THEME } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';

/**
 * LoadingState — Full-screen branded loading view.
 *
 * Props:
 *   message {string} Loading message (optional)
 *   showLogo {boolean} Show brand logo (default: true)
 */
export default function LoadingState({
  message = 'Loading your data...',
  showLogo = true,
}) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[THEME.COLOR.GRADIENT_PRIMARY_START, THEME.COLOR.GRADIENT_PRIMARY_END]}
        style={styles.gradient}
      />
      <View style={styles.card}>
        {showLogo && (
          <Image
            source={require('../../assets/icon-horizontal.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        <View style={styles.spinnerRow}>
          <ActivityIndicator
            animating={true}
            size="large"
            color={THEME.COLOR.PRIMARY}
          />
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  card: {
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.XL,
    paddingVertical: THEME.SPACING.XXXL,
    paddingHorizontal: THEME.SPACING.XXL,
    alignItems: 'center',
    maxWidth: 360,
    width: '85%',
    ...THEME.SHADOW.HEAVY,
  },
  logo: {
    height: 30,
    width: 180,
  },
  spinnerRow: {
    marginTop: THEME.SPACING.XXL,
    marginBottom: THEME.SPACING.LG,
  },
  message: {
    fontSize: THEME.FONT_SIZE.MD,
    color: THEME.COLOR.TEXT_SECONDARY,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
    textAlign: 'center',
  },
});
