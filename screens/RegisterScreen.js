// RegisterScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Text, TextInput as PaperTextInput, Icon } from 'react-native-paper';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { useCleanAllSliceSaga } from '../utils/hooks/cleanAllSliceSaga';
import { ROUTES } from '../constant';
import { STRINGS } from '../strings';
import { THEME } from '../theme';
import { GradientHeader } from '../components/ui';
import useResponsive from '../utils/hooks/useResponsive';

const auth = getAuth();

const RegisterScreen = () => {
  useCleanAllSliceSaga();
  const navigation = useNavigation();
  const { responsiveValue } = useResponsive();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const handleRegister = async () => {
    setError(null);
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError(STRINGS.PASSWORD_NOT_MATCH_ERROR);
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
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
          <GradientHeader title={STRINGS.REGISTER_SCREEN_TITLE} />

          <View style={[styles.card, { maxWidth: responsiveValue(460, 420, 420) }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{STRINGS.REGISTER_BUTTON}</Text>
              <Text style={styles.cardSubtitle}>Create your account</Text>
            </View>

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

            <PaperTextInput
              label={STRINGS.PASSWORD_FIELD_LABEL}
              value={password}
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

            <PaperTextInput
              label={STRINGS.CONFIRM_PASSWORD_FIELD_LABEL}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
              secureTextEntry={secureConfirm}
              mode="outlined"
              left={<PaperTextInput.Icon icon="lock-check-outline" />}
              right={
                <PaperTextInput.Icon
                  icon={secureConfirm ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setSecureConfirm(!secureConfirm)}
                />
              }
              style={styles.input}
              outlineStyle={styles.inputOutline}
              outlineColor={THEME.COLOR.BORDER}
              activeOutlineColor={THEME.COLOR.PRIMARY}
              theme={{ roundness: THEME.BORDER_RADIUS.MD }}
            />

            {error && (
              <View style={styles.errorBox}>
                <View style={styles.errorIconRow}>
                  <Icon source="alert-circle" size={16} color={THEME.COLOR.DANGER} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              </View>
            )}

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.primaryButton}
              labelStyle={styles.primaryButtonLabel}
              contentStyle={styles.primaryButtonContent}
              buttonColor={THEME.COLOR.PRIMARY}
            >
              {STRINGS.REGISTER_BUTTON}
            </Button>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate(ROUTES.LOGIN)}
              style={styles.secondaryButton}
              labelStyle={styles.secondaryButtonLabel}
              contentStyle={styles.secondaryButtonContent}
            >
              {STRINGS.LOGIN_ENCOURAGE}
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

export default RegisterScreen;
