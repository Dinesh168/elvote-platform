import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Button, Text, TextInput, Snackbar, ProgressBar, ActivityIndicator, HelperText, Card } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useDispatch } from 'react-redux';
import { uploadVotersXLSX } from '../storemanagement/uploadvotersscreen/UploadVotersSaga';
import { THEME } from '../theme';
import useResponsive from '../utils/hooks/useResponsive';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const UploadVotersScreen = () => {
  const dispatch = useDispatch();
  const { responsiveValue } = useResponsive();

  const [fileName, setFileName] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [fileObject, setFileObject] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [passKey, setPassKey] = useState('');
  const [passKeyError, setPassKeyError] = useState('');

  const handleFilePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: XLSX_MIME,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFileName(result.assets[0].name);
        setFileUri(result.assets[0].uri);
        setFileObject(result.assets[0].file ?? null); // real File on web; undefined on native
        setUploadError('');
        setUploadProgress(0);
        setIsUploaded(false);
      } else  {
        setUploadError('Not selected any file');
      }
    } catch (err) {
      setUploadError('Failed to pick the file');
    }
  };

  const handleUpload = async () => {
    let isValid = true;
    if (!fileUri) {
      setUploadError('No file selected');
      return;
    } else {
      setUploadError('');
    }

    if (!passKey) {
      setPassKeyError('Pass key is required');
      return;
    } else {
      setPassKeyError('');
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    if (Platform.OS === 'web') {
      // On web the browser's native FormData needs a real File/Blob; the
      // { uri, name, type } shape only works with React Native's polyfill.
      if (!fileObject) {
        setIsUploading(false);
        setUploadError('Could not read the selected file. Please pick it again.');
        return;
      }
      formData.append('file', fileObject, fileName);
    } else {
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: XLSX_MIME, // MIME type for XLSX
      });
    }

    dispatch(uploadVotersXLSX({ 
      formData, 
      passKey,
      uploadProgressCb: (progress) => {
        console.log({progress});
        setUploadProgress(progress);
      },
      uploadCompleteCb: (_isUploaded) => {
        console.log({_isUploaded});
        setIsUploading(false);
        setIsUploaded(_isUploaded)
      }, 
      onError: (error) => {
        setUploadError(error);
      },
      onComplete: () => {
        setIsUploading(false);
      }
    }));
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <Card style={[styles.card, { maxWidth: responsiveValue('100%', 500, 600) }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upload XLSX File</Text>
          <Text style={styles.headerSubtitle}>Upload voter list data</Text>
        </View>

        <Card.Content style={styles.cardContent}>
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
            mode="contained-tonal" 
            onPress={handleFilePicker} 
            disabled={isUploading}
            icon="file-upload"
            style={styles.pickButton}
          >
            Pick a file
          </Button>
          {fileName ? <Text style={styles.fileName}>Selected File: {fileName}</Text> : null}
          
          <Button
            mode="contained"
            onPress={handleUpload}
            disabled={!fileUri || isUploading}
            style={styles.uploadButton}
            labelStyle={styles.uploadButtonLabel}
            buttonColor={THEME.COLOR.PRIMARY}
          >
            {isUploading ? <ActivityIndicator color="white" size="small" /> : 'Upload File'}
          </Button>
          
          {isUploading && (
            <ProgressBar progress={uploadProgress} color={THEME.COLOR.PRIMARY} style={styles.progressBar} />
          )}

          {isUploaded && (
            <Text style={styles.successText}>{fileName} uploaded successfully</Text>
          )}
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
  pickButton: {
    marginVertical: THEME.SPACING.MD,
    borderRadius: THEME.BORDER_RADIUS.MD,
  },
  fileName: {
    textAlign: 'center',
    color: THEME.COLOR.TEXT_SECONDARY,
    marginBottom: THEME.SPACING.MD,
    fontSize: THEME.FONT_SIZE.SM,
  },
  uploadButton: {
    marginTop: THEME.SPACING.SM,
    paddingVertical: THEME.SPACING.XS,
    borderRadius: THEME.BORDER_RADIUS.MD,
  },
  uploadButtonLabel: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
  },
  progressBar: {
    width: '100%',
    marginTop: THEME.SPACING.LG,
    height: 8,
    borderRadius: 4,
  },
  successText: {
    marginTop: THEME.SPACING.LG,
    textAlign: 'center',
    color: THEME.COLOR.SUCCESS,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
  snackbarError: {
    backgroundColor: THEME.COLOR.DANGER,
  }
});

export default UploadVotersScreen;
