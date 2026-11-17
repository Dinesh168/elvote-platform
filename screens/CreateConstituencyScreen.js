// InitialProfileForm.js
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, HelperText, Snackbar, Text, Card } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { createConstituency } from '../storemanagement/privatescreen/PrivateSaga';
import { THEME } from '../theme';
import useResponsive from '../utils/hooks/useResponsive';


const CreateConstituencyScreen = () => {
  const dispatch = useDispatch();
  const { responsiveValue } = useResponsive();
  
  const [name, setName] = useState('');
  const [constituencyNumber, setConstituencyNumber] = useState('');

  const [nameError, setNameError] = useState('');
  const [constituencyNumberError, setConstituencyNumberError] = useState('');

  const [createSuccess, setCreateSuccess] = useState(false);

  const handleConstituencyNumber = (text) => {
    setConstituencyNumber(text.replace(/[^0-9]/g, ''));
  }

  const handleSubmit = () => {
    // Validate form fields
    let isValid = true;
    if (!name) {
      setNameError('Name is required');
      isValid = false;
    } else {
      setNameError('');
    }

    if (!constituencyNumber) {
      setConstituencyNumberError('Constituency number is required');
      isValid = false;
    } else {
      setConstituencyNumberError('');
    }

    // If form is valid, submit the data
    if (isValid) {
      dispatch(createConstituency({ 
        name, 
        constituencyNumber,
        callback: (isSuccess) => {
          if (isSuccess) {
            setName('');
            setConstituencyNumber('');
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
          <Text style={styles.headerTitle}>Create Constituency</Text>
          <Text style={styles.headerSubtitle}>Add a new constituency area</Text>
        </View>

        <Card.Content style={styles.cardContent}>
          <TextInput
            label="Constituency Name"
            value={name}
            onChangeText={setName}
            error={!!nameError}
            mode="outlined"
            style={styles.input}
            outlineColor={THEME.COLOR.BORDER}
            activeOutlineColor={THEME.COLOR.PRIMARY}
            left={<TextInput.Icon icon="map-marker-radius" color={THEME.COLOR.PRIMARY} />}
          />
          <HelperText type="error" visible={!!nameError} style={styles.helperText}>
            {nameError}
          </HelperText>

          <TextInput
            label="Constituency Number"
            value={constituencyNumber}
            onChangeText={handleConstituencyNumber}
            keyboardType={"number-pad"}
            error={!!constituencyNumberError}
            mode="outlined"
            style={styles.input}
            outlineColor={THEME.COLOR.BORDER}
            activeOutlineColor={THEME.COLOR.PRIMARY}
            left={<TextInput.Icon icon="numeric" color={THEME.COLOR.PRIMARY} />}
          />
          <HelperText type="error" visible={!!constituencyNumberError} style={styles.helperText}>
            {constituencyNumberError}
          </HelperText>

          <Button 
            mode="contained" 
            onPress={handleSubmit}
            style={styles.button}
            labelStyle={styles.buttonLabel}
            buttonColor={THEME.COLOR.PRIMARY}
          >
            Create Constituency
          </Button>
        </Card.Content>
      </Card>

      <Snackbar
        visible={!!createSuccess}
        duration={3000}
        onDismiss={() => setCreateSuccess(false)}
        style={styles.snackbar}
      >
        {'Constituency created successfully'}
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

export default CreateConstituencyScreen;
