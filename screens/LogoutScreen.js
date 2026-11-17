// LogoutScreen.js
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { getAuth, signOut } from 'firebase/auth';
import { useDispatch } from 'react-redux';
import { resetUser } from '../storemanagement/initscreen/InitSlice';
import { STRINGS } from '../strings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../theme';

const auth = getAuth();

const LogoutScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        dispatch(resetUser());
        await signOut(auth);
        await AsyncStorage.clear();

      } catch (error) {
        console.error('Error signing out:', error);
      }
    };

    handleLogout();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator animating={true} size="large" color={THEME.COLOR.PRIMARY} />
      <Text style={styles.text}>{STRINGS.LOGGING_OUT}...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.SPACING.XL,
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  text: {
    marginTop: THEME.SPACING.LG,
    fontSize: THEME.FONT_SIZE.MD,
    color: THEME.COLOR.TEXT_SECONDARY,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  }
});

export default LogoutScreen;
