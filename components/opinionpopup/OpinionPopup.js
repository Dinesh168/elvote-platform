import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Modal, RadioButton, Button, ActivityIndicator } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { setVoterOpinion } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { VOTER_OPINION } from '../../constant';
import { STRINGS } from '../../strings';

const OpinionPopup = ({ voterId, visible, onClose, onValue }) => {
  const dispatch = useDispatch();
  const [opinion, setOpinion] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    if (opinion.length === 1) {
      setLoading(true);
      dispatch(setVoterOpinion({
        voterId, 
        opinion, 
        onSuccess: () => {
          onValue(opinion);
          onClose();
        }, 
        onComplete: () => {
          setLoading(false);
        }
      }));
    }
  };

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.container}>
      <View style={styles.overlayContainer}>
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}
        <View style={[styles.row, loading && styles.translucent]}></View>
        <View style={styles.popup}>
          <Text style={styles.title}>{STRINGS.COLLECT_OPINION_POPUP_TITLE}</Text>
          <RadioButton.Group onValueChange={newValue => setOpinion(newValue)} value={opinion}>
            <View style={styles.radioButton}>
              <RadioButton value={VOTER_OPINION.P.VAL} />
              <Text>{VOTER_OPINION.P.LABEL}</Text>
            </View>
            <View style={styles.radioButton}>
              <RadioButton value={VOTER_OPINION.N.VAL} />
              <Text>{VOTER_OPINION.N.LABEL}</Text>
            </View>
            <View style={styles.radioButton}>
              <RadioButton value={VOTER_OPINION.U.VAL} />
              <Text>{VOTER_OPINION.U.LABEL}</Text>
            </View>
          </RadioButton.Group>
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

export default OpinionPopup;
