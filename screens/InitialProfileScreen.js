// InitialProfileForm.js
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, HelperText, Text } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { setInitSelfUser } from '../storemanagement/initscreen/InitSaga';
import { STRINGS } from '../strings';
import { ROUTES } from '../constant';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../theme';
import { GradientHeader } from '../components/ui';
import useResponsive from '../utils/hooks/useResponsive';

const InitialProfileScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { responsiveValue } = useResponsive();
  
  const [name, setName] = useState('');
  const [passKey, setPassKey] = useState('');
  const [mobile, setMobile] = useState('');

  const [nameError, setNameError] = useState('');
  const [passKeyError, setPassKeyError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    let isValid = true;
    if (!name) {
      setNameError(STRINGS.NAME_REQUIRED_ERROR);
      isValid = false;
    } else {
      setNameError('');
    }
    if (!passKey) {
      setPassKeyError(STRINGS.PASS_KEY_REQUIRED_ERROR);
      isValid = false;
    } else {
      setPassKeyError('');
    }

    if (!mobile) {
      setMobileError(STRINGS.MOBILE_REQUIRED_ERROR);
      isValid = false;
    } else {
      setMobileError('');
    }

    if (isValid) {
      setLoading(true);
      dispatch(setInitSelfUser({ 
        name, 
        passKey,
        mobile 
      }));
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
          <GradientHeader title="Complete Your Profile" />

          {/* Card */}
          <View style={[styles.card, { maxWidth: responsiveValue(480, 440, 440) }]}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarIcon}>👤</Text>
              </View>
              <Text style={styles.brandSubtitle}>Tell us a bit about yourself</Text>
            </View>

            <TextInput
              label={STRINGS.NAME_FIELD_LABEL}
              value={name}
              onChangeText={(t) => { setName(t); setNameError(''); }}
              error={!!nameError}
              mode="outlined"
              left={<TextInput.Icon icon="account-outline" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              outlineColor={THEME.COLOR.BORDER}
              activeOutlineColor={THEME.COLOR.PRIMARY}
              theme={{ roundness: THEME.BORDER_RADIUS.MD }}
            />
            <HelperText type="error" visible={!!nameError} style={styles.helperText}>
              {nameError}
            </HelperText>

            <TextInput
              label={STRINGS.PASS_KEY_FIELD_LABEL}
              value={passKey}
              onChangeText={(t) => { setPassKey(t); setPassKeyError(''); }}
              error={!!passKeyError}
              mode="outlined"
              left={<TextInput.Icon icon="key-outline" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              outlineColor={THEME.COLOR.BORDER}
              activeOutlineColor={THEME.COLOR.PRIMARY}
              theme={{ roundness: THEME.BORDER_RADIUS.MD }}
            />
            <HelperText type="error" visible={!!passKeyError} style={styles.helperText}>
              {passKeyError}
            </HelperText>

            <TextInput
              label={STRINGS.MOBILE_FIELD_LABEL}
              value={mobile}
              onChangeText={(t) => { setMobile(t); setMobileError(''); }}
              error={!!mobileError}
              keyboardType="phone-pad"
              mode="outlined"
              left={<TextInput.Icon icon="phone-outline" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              outlineColor={THEME.COLOR.BORDER}
              activeOutlineColor={THEME.COLOR.PRIMARY}
              theme={{ roundness: THEME.BORDER_RADIUS.MD }}
            />
            <HelperText type="error" visible={!!mobileError} style={styles.helperText}>
              {mobileError}
            </HelperText>
            
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.primaryButton}
              labelStyle={styles.primaryButtonLabel}
              contentStyle={styles.primaryButtonContent}
              buttonColor={THEME.COLOR.PRIMARY}
            >
              {STRINGS.SUBMIT_BUTTON}
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate(ROUTES.LOGOUT)}
              style={styles.logoutButton}
              labelStyle={styles.logoutButtonLabel}
              icon="logout"
            >
              {STRINGS.LOGOUT_BUTTON}
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
    height: 320,
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
    paddingTop: 50,
    paddingBottom: 24,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: THEME.SPACING.XL,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.SPACING.MD,
    borderWidth: 1,
    borderColor: THEME.COLOR.BORDER,
  },
  avatarIcon: {
    fontSize: 36,
  },
  brandSubtitle: {
    fontSize: THEME.FONT_SIZE.MD,
    color: THEME.COLOR.TEXT_SECONDARY,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
  card: {
    width: '90%',
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.XL,
    padding: THEME.SPACING.XL,
    ...THEME.SHADOW.HEAVY,
  },
  input: {
    backgroundColor: THEME.COLOR.SURFACE,
  },
  inputOutline: {
    borderRadius: THEME.BORDER_RADIUS.MD,
  },
  helperText: {
    marginBottom: THEME.SPACING.SM,
  },
  primaryButton: {
    borderRadius: THEME.BORDER_RADIUS.MD,
    marginTop: THEME.SPACING.MD,
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
  logoutButton: {
    marginTop: THEME.SPACING.XL,
  },
  logoutButtonLabel: {
    color: THEME.COLOR.TEXT_SECONDARY,
    fontSize: THEME.FONT_SIZE.SM,
  },
});

export default InitialProfileScreen;
