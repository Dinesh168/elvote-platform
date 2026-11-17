// ForgotPasswordScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Text, TextInput as PaperTextInput } from 'react-native-paper';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { useCleanAllSliceSaga } from '../utils/hooks/cleanAllSliceSaga';
import { ROUTES } from '../constant';
import { STRINGS } from '../strings';
import { THEME } from '../theme';
import { GradientHeader } from '../components/ui';
import useResponsive from '../utils/hooks/useResponsive';

const auth = getAuth();

const ForgotPasswordScreen = () => {
  useCleanAllSliceSaga();
  const navigation = useNavigation();
  const { responsiveValue } = useResponsive();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(STRINGS.PASSWORD_RESET_EMAIL_SENT);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Gradient + Logo */}
          <GradientHeader title={STRINGS.FORGOT_PASSWORD_SCREEN_TITLE} />

          {/* Card */}
          <View style={[styles.card, { maxWidth: responsiveValue(480, 440, 440) }]}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🔑</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              Enter your email and we'll send you a password reset link
            </Text>

            <PaperTextInput
              label={STRINGS.EMAIL_FIELD_LABEL}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); setSuccess(null); }}
              autoCapitalize="none"
              keyboardType="email-address"
              mode="outlined"
              left={<PaperTextInput.Icon icon="email-outline" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              outlineColor={THEME.COLOR.BORDER}
              activeOutlineColor={THEME.COLOR.PRIMARY}
              theme={{ roundness: THEME.BORDER_RADIUS.MD }}
            />

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {success && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            <Button
              mode="contained"
              onPress={handleForgotPassword}
              loading={loading}
              disabled={loading}
              style={styles.primaryButton}
              labelStyle={styles.primaryButtonLabel}
              contentStyle={styles.primaryButtonContent}
              buttonColor={THEME.COLOR.PRIMARY}
            >
              {STRINGS.SEND_RESET_EMAIL_BUTTON}
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate(ROUTES.LOGIN)}
              style={styles.linkButton}
              labelStyle={styles.linkButtonLabel}
              icon="arrow-left"
            >
              {STRINGS.BACK_TO_LOGIN_BUTTON}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: THEME.SPACING.XXXL,
  },
  brandSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  logo: {
    height: 40,
    width: 220,
    tintColor: '#FFF',
  },
  card: {
    width: '90%',
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.XL,
    padding: THEME.SPACING.XL,
    marginTop: THEME.SPACING.LG,
    alignItems: 'center',
    ...THEME.SHADOW.HEAVY,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.SPACING.LG,
  },
  iconText: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: THEME.FONT_SIZE.XXL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    marginBottom: THEME.SPACING.SM,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: THEME.FONT_SIZE.MD,
    color: THEME.COLOR.TEXT_SECONDARY,
    marginBottom: THEME.SPACING.XL,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    marginBottom: THEME.SPACING.MD,
    backgroundColor: THEME.COLOR.SURFACE,
    width: '100%',
  },
  inputOutline: {
    borderRadius: THEME.BORDER_RADIUS.MD,
  },
  errorBox: {
    backgroundColor: THEME.COLOR.DANGER_BACKGROUND,
    borderRadius: THEME.BORDER_RADIUS.SM,
    padding: THEME.SPACING.MD,
    marginBottom: THEME.SPACING.MD,
    borderLeftWidth: 3,
    borderLeftColor: THEME.COLOR.DANGER,
    width: '100%',
  },
  errorText: {
    color: THEME.COLOR.DANGER,
    fontSize: THEME.FONT_SIZE.SM,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
  successBox: {
    backgroundColor: THEME.COLOR.SUCCESS_BACKGROUND,
    borderRadius: THEME.BORDER_RADIUS.SM,
    padding: THEME.SPACING.MD,
    marginBottom: THEME.SPACING.MD,
    borderLeftWidth: 3,
    borderLeftColor: THEME.COLOR.SUCCESS,
    width: '100%',
  },
  successText: {
    color: '#0d6e1e',
    fontSize: THEME.FONT_SIZE.SM,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
  primaryButton: {
    borderRadius: THEME.BORDER_RADIUS.MD,
    marginTop: THEME.SPACING.SM,
    width: '100%',
  },
  primaryButtonLabel: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  primaryButtonContent: {
    height: 50,
  },
  linkButton: {
    marginTop: THEME.SPACING.XL,
  },
  linkButtonLabel: {
    color: THEME.COLOR.PRIMARY,
    fontSize: THEME.FONT_SIZE.SM,
  },
});

export default ForgotPasswordScreen;
