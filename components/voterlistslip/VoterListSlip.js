import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import VoterListSlipPrint from './VoterListSlipPrint';
import { STRINGS } from '../../strings';

export default function VoterListSlip({ 
  sno,
  name,
  age,
  gender,
  relativeName,
  epicNo,
  address,
  pollingStationName,
  pollingStationAddress,
  partNo,
  leaderName,
  ballotNo,
  images = {
    party: '',
    leader: ''
  }
}) {  
  return (
    <>
      <View style={styles.container}>
        <View>
          <Text variant='bodyLarge' style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_SLIP_BOOTH_NO}:</Text> {partNo}</Text>
          <Text variant='bodyLarge' style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_SLIP_SERIAL_NO}:</Text> {sno}</Text>
          <Text variant='bodyLarge' style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_SLIP_EPIC}:</Text> {epicNo}</Text>
          <Text variant='bodyLarge' style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_SLIP_NAME}:</Text> {name}</Text>
          <Text variant='bodyLarge' style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_SLIP_REL_NAME}:</Text> {relativeName}</Text>
          <Text variant='bodyLarge' style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_SLIP_AGE}:</Text> {age}</Text>
          <Text variant='bodyLarge' style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_SLIP_GENDER}:</Text> {gender}</Text>
          <Text variant='bodyLarge' style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_SLIP_ADDRESS}:</Text> {address}</Text>
          <Text variant='bodyLarge' style={[styles.text, styles.bold]}>{STRINGS.VOTER_SLIP_POLLING_STATION}:</Text>
          <Text variant='bodyLarge' style={styles.text}>{pollingStationName}</Text>
          <Text variant='bodyLarge' style={styles.text}>{pollingStationAddress}</Text>
        </View>

        <View style={[styles.row, styles.right]}>
          <VoterListSlipPrint 
            sno={sno}
            name={name}
            age={age}
            gender={gender}
            relativeName={relativeName}
            epicNo={epicNo}
            address={address}
            pollingStationName={pollingStationName}
            pollingStationAddress={pollingStationAddress}
            partNo={partNo}
            leaderName={leaderName}
            ballotNo={ballotNo}
            images = {images}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderRadius: 5,
    marginHorizontal: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 5
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: 'black',
    marginTop: 10,
    paddingTop: 10
  },
  right: {
    justifyContent: 'flex-end'
  },
  bold: {
    fontWeight: 'bold'
  },
  text: {
    flex: 1,
    marginHorizontal: 5,
    gap: 10
  },
});
