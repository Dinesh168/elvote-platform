// InitialProfileForm.js
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, HelperText, Snackbar, Text, Card } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { createAdminUser } from '../storemanagement/privatescreen/PrivateSaga';
import { THEME } from '../theme';
import useResponsive from '../utils/hooks/useResponsive';


const CreateAdminUserScreen = () => {
  const dispatch = useDispatch();
  const { responsiveValue } = useResponsive();
  
  const [email, setEmail] = useState('');
  const [passKey, setPassKey] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passKeyError, setPassKeyError] = useState('');

  const [createSuccess, setCreateSuccess] = useState(false);

  const handleSubmit = () => {
    // Validate form fields
    let isValid = true;
    if (!email) {
      setEmailError('Admin email is required');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!passKey) {
      setPassKeyError('Pass key is required');
      isValid = false;
    } else {
      setPassKeyError('');
    }

    // If form is valid, submit the data
    if (isValid) {
      dispatch(createAdminUser({ 
        email, 
        passKey,
        callback: (isSuccess) => {
          if (isSuccess) {
            setEmail('');
            setPassKey('');
            setCreateSuccess(isSuccess);
          }
          
        } 
      }));
    }
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <Card style={[styles.card, { maxWidth: responsiveValue('100%', 440, 480) }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Admin</Text>
          <Text style={styles.headerSubtitle}>Set up a new admin user</Text>
        </View>

        <Card.Content style={styles.cardContent}>
          <TextInput
            label="Admin Email"
            value={email}
            onChangeText={setEmail}
            error={!!emailError}
            mode="outlined"
            style={styles.input}
            outlineColor={THEME.COLOR.BORDER}
            activeOutlineColor={THEME.COLOR.PRIMARY}
            left={<TextInput.Icon icon="email" color={THEME.COLOR.PRIMARY} />}
          />
          <HelperText type="error" visible={!!emailError} style={styles.helperText}>
            {emailError}
          </HelperText>

          <TextInput
            label="Pass Key"
            value={passKey}
            onChangeText={setPassKey}
            error={!!passKeyError}
            mode="outlined"
            style={styles.input}
            outlineColor={THEME.COLOR.BORDER}
            activeOutlineColor={THEME.COLOR.PRIMARY}
            left={<TextInput.Icon icon="key" color={THEME.COLOR.PRIMARY} />}
          />
          <HelperText type="error" visible={!!passKeyError} style={styles.helperText}>
            {passKeyError}
          </HelperText>

          <Button 
            mode="contained" 
            onPress={handleSubmit}
            style={styles.button}
            labelStyle={styles.buttonLabel}
            buttonColor={THEME.COLOR.PRIMARY}
          >
            Create Admin
          </Button>
        </Card.Content>
      </Card>

      <Snackbar
        visible={!!createSuccess}
        duration={3000}
        onDismiss={() => setCreateSuccess(false)}
        style={styles.snackbar}
      >
        {'Admin user created successfully'}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  scrollContent: {
    padding: THEME.SPACING.LG,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.LG,
    ...THEME.SHADOW.MEDIUM,
  },
  header: {
    padding: THEME.SPACING.XL,
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
    borderTopLeftRadius: THEME.BORDER_RADIUS.LG,
    borderTopRightRadius: THEME.BORDER_RADIUS.LG,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: THEME.FONT_SIZE.XXL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.PRIMARY,
    marginBottom: THEME.SPACING.XS,
  },
  headerSubtitle: {
    fontSize: THEME.FONT_SIZE.MD,
    color: THEME.COLOR.TEXT_SECONDARY,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
  cardContent: {
    padding: THEME.SPACING.LG,
    paddingTop: THEME.SPACING.XL,
  },
  input: {
    backgroundColor: THEME.COLOR.SURFACE,
  },
  helperText: {
    marginBottom: THEME.SPACING.XS,
    marginTop: -4,
  },
  button: {
    marginTop: THEME.SPACING.MD,
    paddingVertical: THEME.SPACING.XS,
    borderRadius: THEME.BORDER_RADIUS.MD,
  },
  buttonLabel: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
  },
  snackbar: {
    backgroundColor: THEME.COLOR.SUCCESS,
  }
});

export default CreateAdminUserScreen;
