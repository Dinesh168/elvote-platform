import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { getUsersCount } from '../../storemanagement/usersmanagement/UsersManagementSaga';
import PollingStationIntermediateScreen from '../../screens/PollingStationIntermediateScreen';
import { INTERMEDIATE_ROUTES } from '../../constant';

export default function VolunteerListWithPS({navigation, filters}) {
  const dispatch = useDispatch();
  const [isLoadingCount, setIsLoadingCount] = useState(true);

  const [votersPSData, setVotersPSData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setIsLoadingCount(true);
    dispatch(getUsersCount({
      filters,
      onSuccess: (volunteersCount) => {
        setVotersPSData(volunteersCount)
      }, 
      onComplete: () => {
        setIsLoadingCount(false);
      }
    }))
  }

  return (
    <>
      {!isLoadingCount && <PollingStationIntermediateScreen
        navigation={navigation}
        route={{
          params: {
            votersPSData,
            nextScreen: INTERMEDIATE_ROUTES.VOLUNTEERS_LIST,
            filters
          }
        }}
      />}

      {isLoadingCount && <View style={{flex:1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" color="#0000ff" /></View>}
    </>
  );
}
