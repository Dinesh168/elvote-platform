import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { getTotalVotersCount } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import PollingStationIntermediateScreen from '../../screens/PollingStationIntermediateScreen';
import { INTERMEDIATE_ROUTES } from '../../constant';
import { STRINGS } from '../../strings';
import { THEME } from '../../theme';

export default function VoterListWithPS({filters, navigation}) {
  const dispatch = useDispatch();
  const [isLoadingCount, setIsLoadingCount] = useState(true);

  const [votersPSData, setVotersPSData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setIsLoadingCount(true);
    dispatch(getTotalVotersCount({
      filters,
      onSuccess: (votersCount) => {
        setVotersPSData(votersCount)
      }, 
      onComplete: () => {
        setIsLoadingCount(false);
      }
    }))
  }

  return (
    <>
      {!isLoadingCount && votersPSData.length > 0 && <PollingStationIntermediateScreen
        navigation={navigation}
        route={{
          params: {
            votersPSData,
            nextScreen: INTERMEDIATE_ROUTES.VOTERS_LIST_WITH_FILTERS,
            filters
          }
        }}
      />}

      {!isLoadingCount && votersPSData.length === 0 && <View><Text>{STRINGS.NO_VOTER_DATA_AVAILABLE}</Text></View>}

      {isLoadingCount && <View style={{flex:1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" color={THEME.COLOR.PRIMARY} /></View>}
    </>
  );
}
