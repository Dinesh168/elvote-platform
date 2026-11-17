// LoginScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Button, Text, TextInput as PaperTextInput, Icon } from 'react-native-paper';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { useCleanAllSliceSaga } from '../utils/hooks/cleanAllSliceSaga';
import { ROUTES } from '../constant';
import { STRINGS } from '../strings';
import { THEME } from '../theme';
import { GradientHeader } from '../components/ui';
import useResponsive from '../utils/hooks/useResponsive';

const auth = getAuth();

const LoginScreen = () => {
  useCleanAllSliceSaga();
  const navigation = useNavigation();
  const { isMobile, responsiveValue } = useResponsive();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      await signInWithEmailAndPassword(auth, email, password);
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
          <GradientHeader title={STRINGS.LOGIN_SCREEN_TITLE} />

          {/* Card */}
          <View style={[styles.card, { maxWidth: responsiveValue(460, 420, 420) }]}>
            {/* Title section */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{STRINGS.LOGIN_BUTTON}</Text>
              <Text style={styles.cardSubtitle}>Sign in to continue</Text>
            </View>

            {/* Email */}
            <PaperTextInput
              label={STRINGS.EMAIL_FIELD_LABEL}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
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

            {/* Password */}
            <PaperTextInput
              label={STRINGS.PASSWORD_FIELD_LABEL}
              value={password}
              autoCapitalize="none"
              onChangeText={(t) => { setPassword(t); setError(null); }}
              secureTextEntry={secureText}
              mode="outlined"
              left={<PaperTextInput.Icon icon="lock-outline" />}
              right={
                <PaperTextInput.Icon
                  icon={secureText ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setSecureText(!secureText)}
                />
              }
              style={styles.input}
              outlineStyle={styles.inputOutline}
              outlineColor={THEME.COLOR.BORDER}
              activeOutlineColor={THEME.COLOR.PRIMARY}
              theme={{ roundness: THEME.BORDER_RADIUS.MD }}
            />

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <View style={styles.errorIconRow}>
                  <Icon source="alert-circle" size={16} color={THEME.COLOR.DANGER} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              </View>
            )}

            {/* Login Button */}
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.primaryButton}
              labelStyle={styles.primaryButtonLabel}
              contentStyle={styles.primaryButtonContent}
              buttonColor={THEME.COLOR.PRIMARY}
            >
              {STRINGS.LOGIN_BUTTON}
            </Button>

            {/* Forgot Password */}
            <Pressable
              onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
              style={({ pressed }) => [styles.linkButton, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.linkButtonLabel}>{STRINGS.FORGOT_PASSWORD_BUTTON}</Text>
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register */}
            <Button
              mode="outlined"
              onPress={() => navigation.navigate(ROUTES.REGISTER)}
              style={styles.secondaryButton}
              labelStyle={styles.secondaryButtonLabel}
              contentStyle={styles.secondaryButtonContent}
            >
              {STRINGS.REGISTER_ENCOURAGE}
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: THEME.SPACING.XXXL,
  },
  card: {
    width: '92%',
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.XL,
    paddingHorizontal: THEME.SPACING.XL,
    paddingTop: THEME.SPACING.XXL,
    paddingBottom: THEME.SPACING.XL,
    ...THEME.SHADOW.HEAVY,
  },
  cardHeader: {
    marginBottom: THEME.SPACING.XL,
  },
  cardTitle: {
    fontSize: THEME.FONT_SIZE.XXL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    marginBottom: THEME.SPACING.XS,
  },
  cardSubtitle: {
    fontSize: THEME.FONT_SIZE.MD,
    color: THEME.COLOR.TEXT_SECONDARY,
  },
  input: {
    marginBottom: THEME.SPACING.MD,
    backgroundColor: THEME.COLOR.SURFACE,
  },
  inputOutline: {
    borderRadius: THEME.BORDER_RADIUS.MD,
  },
  errorBox: {
    backgroundColor: THEME.COLOR.DANGER_BACKGROUND,
    borderRadius: THEME.BORDER_RADIUS.MD,
    padding: THEME.SPACING.MD,
    marginBottom: THEME.SPACING.MD,
    borderLeftWidth: 3,
    borderLeftColor: THEME.COLOR.DANGER,
  },
  errorIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.SPACING.SM,
  },
  errorText: {
    color: THEME.COLOR.DANGER,
    fontSize: THEME.FONT_SIZE.SM,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
    flex: 1,
  },
  primaryButton: {
    borderRadius: THEME.BORDER_RADIUS.MD,
    marginTop: THEME.SPACING.SM,
    ...THEME.SHADOW.COLORED(THEME.COLOR.PRIMARY),
  },
  primaryButtonLabel: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  primaryButtonContent: {
    height: 52,
  },
  linkButton: {
    alignSelf: 'center',
    marginTop: THEME.SPACING.LG,
    paddingVertical: THEME.SPACING.SM,
  },
  linkButtonLabel: {
    color: THEME.COLOR.PRIMARY,
    fontSize: THEME.FONT_SIZE.SM,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: THEME.SPACING.XL,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.COLOR.BORDER,
  },
  dividerText: {
    paddingHorizontal: THEME.SPACING.LG,
    color: THEME.COLOR.TEXT_MUTED,
    fontSize: THEME.FONT_SIZE.SM,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
  secondaryButton: {
    borderRadius: THEME.BORDER_RADIUS.MD,
    borderColor: THEME.COLOR.PRIMARY,
    borderWidth: 1.5,
  },
  secondaryButtonLabel: {
    color: THEME.COLOR.PRIMARY,
    fontSize: THEME.FONT_SIZE.MD,
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
  },
  secondaryButtonContent: {
    height: 50,
  },
});

export default LoginScreen;
