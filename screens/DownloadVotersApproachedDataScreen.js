import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, TextInput, Snackbar, ActivityIndicator, HelperText, Card } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { clearVotersList } from '../storemanagement/uploadvotersscreen/UploadVotersSaga';
import { STRINGS } from '../strings';
import { THEME } from '../theme';
import useResponsive from '../utils/hooks/useResponsive';

const DownloadVotersApproachedDataScreen = () => {
  const dispatch = useDispatch();
  const { responsiveValue } = useResponsive();

  const [uploadError, setUploadError] = useState('');
  const [passKey, setPassKey] = useState('');
  const [passKeyError, setPassKeyError] = useState('');
  const [dataSuccess, setDataSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    setDataSuccess('');
    if (!passKey) {
      setPassKeyError(STRINGS.PASS_KEY_REQUIRED_ERROR);
      return;
    } else {
      setPassKeyError('');
    }

    dispatch(clearVotersList({ 
      passKey,
      onSuccess: () => {
        setDataSuccess(STRINGS.CLEAR_VOTERS_LIST_SUCCESS);
        setPassKey('');
      },
      onError: (error) => {
        setUploadError(error);
        setDataSuccess("");
      },
      onComplete: () => {
        setIsUploading(false);
      }
    }));
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <Card style={[styles.card, { maxWidth: responsiveValue('100%', 440, 480) }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{STRINGS.CLEAR_VOTERS_DATA}</Text>
          <Text style={styles.headerSubtitle}>Wipe approached voter records</Text>
        </View>

        <Card.Content style={styles.cardContent}>
          <TextInput
            label={STRINGS.PASS_KEY_FIELD_LABEL}
            value={passKey}
            onChangeText={setPassKey}
            error={!!passKeyError}
            mode="outlined"
            style={styles.input}
            outlineColor={THEME.COLOR.BORDER}
            activeOutlineColor={THEME.COLOR.DANGER}
            left={<TextInput.Icon icon="key" color={THEME.COLOR.DANGER} />}
          />
          <HelperText type="error" visible={!!passKeyError} style={styles.helperText}>
            {passKeyError}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleUpload}
            style={styles.uploadButton}
            labelStyle={styles.uploadButtonLabel}
            buttonColor={THEME.COLOR.DANGER}
            loading={isUploading}
            icon="delete-alert"
          >
            {STRINGS.CLEAR_DATA_BUTTON}
          </Button>

          <HelperText type="info" visible={!!dataSuccess} style={styles.successText}>
            {dataSuccess}
          </HelperText>
        </Card.Content>
      </Card>

      <Snackbar
        visible={!!uploadError}
        onDismiss={() => setUploadError('')}
        style={styles.snackbarError}
      >
        {uploadError}
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
    backgroundColor: THEME.COLOR.DANGER_BACKGROUND,
    borderTopLeftRadius: THEME.BORDER_RADIUS.LG,
    borderTopRightRadius: THEME.BORDER_RADIUS.LG,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: THEME.FONT_SIZE.XL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.DANGER,
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
  uploadButton: {
    marginTop: THEME.SPACING.MD,
    paddingVertical: THEME.SPACING.XS,
    borderRadius: THEME.BORDER_RADIUS.MD,
  },
  uploadButtonLabel: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
  },
  successText: {
    marginTop: THEME.SPACING.MD,
    textAlign: 'center',
    color: THEME.COLOR.SUCCESS,
  },
  snackbarError: {
    backgroundColor: THEME.COLOR.DANGER,
  }
});

export default DownloadVotersApproachedDataScreen;
