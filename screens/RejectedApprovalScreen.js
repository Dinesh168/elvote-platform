import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, IconButton } from 'react-native-paper';
import { getAuth, signOut } from 'firebase/auth';
import { STRINGS } from '../strings.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { resetUser } from '../storemanagement/initscreen/InitSlice.js';
import { THEME } from '../theme';
import { GradientHeader } from '../components/ui';
import useResponsive from '../utils/hooks/useResponsive';

const auth = getAuth();

const RejectedApprovalScreen = ({ navigation }) => {
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
            <Text style={styles.iconText}>❌</Text>
          </View>
          <Text style={styles.title}>{STRINGS.ACCOUNT_REJECTED}</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Your account registration request has been rejected by the administrator. Please contact your administrator or supervisor for assistance.
            </Text>
          </View>

          <Button 
            mode="contained" 
            onPress={handleLogout}
            style={styles.logoutButton}
            buttonColor={THEME.COLOR.DANGER}
            labelStyle={styles.logoutLabel}
            contentStyle={styles.logoutContent}
            icon="logout"
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
    backgroundColor: THEME.COLOR.DANGER_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.SPACING.LG,
    borderWidth: 1,
    borderColor: THEME.COLOR.DANGER,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: THEME.FONT_SIZE.XXL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.DANGER,
    marginBottom: THEME.SPACING.XL,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: THEME.COLOR.DANGER_BACKGROUND,
    borderRadius: THEME.BORDER_RADIUS.MD,
    padding: THEME.SPACING.LG,
    marginBottom: THEME.SPACING.XL,
    borderLeftWidth: 3,
    borderLeftColor: THEME.COLOR.DANGER,
    width: '100%',
  },
  infoText: {
    fontSize: THEME.FONT_SIZE.SM,
    color: THEME.COLOR.TEXT_SECONDARY,
    lineHeight: 20,
  },
  logoutButton: {
    width: '100%',
    borderRadius: THEME.BORDER_RADIUS.MD,
  },
  logoutLabel: {
    fontSize: THEME.FONT_SIZE.MD,
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
    color: '#FFF',
  },
  logoutContent: {
    height: 48,
  },
});

export default RejectedApprovalScreen;
