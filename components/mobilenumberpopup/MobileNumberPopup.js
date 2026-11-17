import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Modal, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { setVoterMobileNumber } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { STRINGS } from '../../strings';

const MobileNumberPopup = ({ voterId, visible, onClose, onValue }) => {
  const dispatch = useDispatch();
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    if (mobileNumber.length === 10) {
      setLoading(true);
      dispatch(setVoterMobileNumber({
        voterId, 
        mobileNumber, 
        onSuccess: () => {
          onValue(mobileNumber);
          onClose();
        }, 
        onComplete: () => {
          setLoading(false);
        }
      }));
      
    } else {
      alert(STRINGS.MOBILE_NUMBER_ERROR_ALERT);
    }
  };

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.container} dismissable={true} dismissableBackButton={true}>
      <View style={styles.overlayContainer}>
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}
        <View style={[styles.row, loading && styles.translucent]}></View>
        <View style={styles.popup}>
          <Text style={styles.title}>{STRINGS.MOBILE_NUMBER_POPUP_TITLE}</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            maxLength={10}
            placeholder={STRINGS.MOBILE_NUMBER_FIELD_PLACEHOLDER}
            value={mobileNumber}
            onChangeText={setMobileNumber}
          />
          
          <Button onPress={handleSave}>{STRINGS.SAVE_BUTTON}</Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContainer: {
    position: 'relative',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  translucent: {
    opacity: 0.5,
  },
  popup: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 20,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
});

export default MobileNumberPopup;
