import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';
import { THEME } from '../../theme';

/**
 * GradientHeader — Reusable branded gradient header for auth/profile screens.
 *
 * Props:
 *   title        {string}   Tagline text under logo
 *   gradientColors {array}  Gradient color pair (default: primary blue)
 *   height       {number}   Gradient height (default: 300)
 *   showLogo     {boolean}  Show brand logo (default: true)
 */
export default function GradientHeader({
  title,
  gradientColors = ['#FFFFFF', '#F0F2F8'],
  height = 260,
  showLogo = true,
}) {
  return (
    <>
      <LinearGradient
        colors={gradientColors}
        style={[styles.gradient, { height }]}
      />
      <View style={styles.brandSection}>
        {showLogo && (
          <Image
            source={require('../../assets/icon-horizontal.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        {title && (
          <Text style={styles.tagline}>{title}</Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  brandSection: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 32,
  },
  logo: {
    height: 48,
    width: 260,
  },
  tagline: {
    color: THEME.COLOR.TEXT_SECONDARY,
    fontSize: THEME.FONT_SIZE.MD,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
    marginTop: THEME.SPACING.SM,
    letterSpacing: 0.5,
  },
});
