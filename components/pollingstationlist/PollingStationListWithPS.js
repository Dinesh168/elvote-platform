import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { getUsersCount } from '../../storemanagement/usersmanagement/UsersManagementSaga';
import PollingStationIntermediateScreen from '../../screens/PollingStationIntermediateScreen';
import { INTERMEDIATE_ROUTES } from '../../constant';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';

export default function PollingStationListWithPS({navigation, filters}) {
  const dispatch = useDispatch();
  const [isLoadingCount, setIsLoadingCount] = useState(true);

  const [votersPSData, setVotersPSData] = useState([]);

  const pollingStations = useGetPollingStations();

  useEffect(() => {
    setIsLoadingCount(true)
    if (pollingStations.length > 0) {
      setVotersPSData(pollingStations.map(ps => ({polling_station_id: ps.id})))
      setIsLoadingCount(false)
    }
  }, [pollingStations]);

  return (
    <>
      {!isLoadingCount && <PollingStationIntermediateScreen
        navigation={navigation}
        route={{
          params: {
            votersPSData,
            noCount: true,
            nextScreen: INTERMEDIATE_ROUTES.ALL_POLLING_STATION_DATA,
            filters
          }
        }}
      />}

      {isLoadingCount && <View style={{flex:1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" color="#0000ff" /></View>}
    </>
  );
}
