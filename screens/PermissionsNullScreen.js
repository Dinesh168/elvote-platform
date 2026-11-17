import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Card, IconButton } from 'react-native-paper';
import { getAuth, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { resetUser } from '../storemanagement/initscreen/InitSlice';
import { THEME } from '../theme';
import useResponsive from '../utils/hooks/useResponsive';
import { STRINGS } from '../strings';

const auth = getAuth();

const PermissionsNullScreen = ({ navigation }) => {
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
    <View style={styles.container}>
      <Card style={[styles.card, { maxWidth: responsiveValue('100%', 400, 440) }]}>
        <View style={styles.header}>
          <IconButton icon="shield-alert-outline" size={64} iconColor={THEME.COLOR.WARNING} />
        </View>
        <Card.Content style={styles.cardContent}>
          <Text style={styles.title}>No Permissions</Text>
          <Text style={styles.subtitle}>You have no permissions. Contact your admin and ask them to grant you permissions.</Text>
          
          <Button 
            mode="contained" 
            onPress={handleLogout}
            style={styles.button}
            buttonColor={THEME.COLOR.WARNING}
            textColor={THEME.COLOR.PRIMARY_FOREGROUND}
            labelStyle={styles.buttonLabel}
          >
            {STRINGS.LOGOUT_BUTTON}
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.SPACING.LG,
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  card: {
    width: '100%',
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.LG,
    ...THEME.SHADOW.MEDIUM,
  },
  header: {
    padding: THEME.SPACING.MD,
    alignItems: 'center',
    backgroundColor: THEME.COLOR.WARNING_BACKGROUND,
    borderTopLeftRadius: THEME.BORDER_RADIUS.LG,
    borderTopRightRadius: THEME.BORDER_RADIUS.LG,
  },
  cardContent: {
    padding: THEME.SPACING.LG,
    paddingTop: THEME.SPACING.XL,
    alignItems: 'center',
  },
  title: {
    fontSize: THEME.FONT_SIZE.XL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.WARNING,
    marginBottom: THEME.SPACING.SM,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: THEME.FONT_SIZE.MD,
    color: THEME.COLOR.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: THEME.SPACING.XL,
  },
  button: {
    width: '100%',
    borderRadius: THEME.BORDER_RADIUS.MD,
  },
  buttonLabel: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    paddingVertical: THEME.SPACING.XS,
  }
});

export default PermissionsNullScreen;
