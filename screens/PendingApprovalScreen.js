import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { getAuth, signOut } from 'firebase/auth';
import { STRINGS } from '../strings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { resetUser } from '../storemanagement/initscreen/InitSlice';
import useGarbageCollector from '../utils/hooks/garbageCollectorHooks';
import { THEME } from '../theme';
import { GradientHeader } from '../components/ui';
import useResponsive from '../utils/hooks/useResponsive';

const auth = getAuth();

const PendingApprovalScreen = ({ navigation }) => {
  useGarbageCollector();
  const dispatch = useDispatch();
  const { responsiveValue } = useResponsive();
  
  const handleLogout = async () => {
    try {
      dispatch(resetUser());
      await signOut(auth);
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GradientHeader title="Verification Status" />

        <View style={[styles.card, { maxWidth: responsiveValue(480, 440, 440) }]}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>⏳</Text>
          </View>
          <Text style={styles.title}>Approval Pending</Text>
          <Text style={styles.subtitle}>{STRINGS.PENDING_APPROVAL}</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Your account is being reviewed by the administrator. You'll be notified once approved.
            </Text>
          </View>

          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
            labelStyle={styles.logoutLabel}
            contentStyle={styles.logoutContent}
            icon="logout"
            textColor={THEME.COLOR.TEXT_SECONDARY}
          >
            {STRINGS.LOGOUT_BUTTON}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: THEME.SPACING.XXXL,
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.COLOR.WARNING_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.SPACING.LG,
    borderWidth: 1,
    borderColor: THEME.COLOR.WARNING,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: THEME.FONT_SIZE.XXL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    marginBottom: THEME.SPACING.SM,
  },
  subtitle: {
    fontSize: THEME.FONT_SIZE.MD,
    color: THEME.COLOR.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: THEME.SPACING.XL,
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
    borderRadius: THEME.BORDER_RADIUS.MD,
    padding: THEME.SPACING.LG,
    marginBottom: THEME.SPACING.XL,
    borderLeftWidth: 3,
    borderLeftColor: THEME.COLOR.PRIMARY,
    width: '100%',
  },
  infoText: {
    fontSize: THEME.FONT_SIZE.SM,
    color: THEME.COLOR.TEXT_SECONDARY,
    lineHeight: 20,
  },
  logoutButton: {
    borderRadius: THEME.BORDER_RADIUS.MD,
    borderColor: THEME.COLOR.BORDER,
    borderWidth: 1,
    width: '100%',
  },
  logoutLabel: {
    fontSize: THEME.FONT_SIZE.MD,
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
  },
  logoutContent: {
    height: 48,
  },
});

export default PendingApprovalScreen;
