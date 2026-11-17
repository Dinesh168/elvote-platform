import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button } from 'react-native-paper';
import FlashListCompat from '../ui/FlashListCompat';
import { useDispatch } from 'react-redux';
import { getUsersList } from '../../storemanagement/usersmanagement/UsersManagementSaga';
import VolunteerListItem from '../volunteerlistitem/VolunteerListItem';
import { FILTERS_LIST, ROUTES } from '../../constant';
import { THEME } from '../../theme';

export default function VolunteerList({navigation, filters}) {
  const dispatch = useDispatch();

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isMoreItems, setIsMoreItems] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setIsLoading(true);
    dispatch(getUsersList({
      filters,
      pageNum: page,
      onSuccess: (_data) => {
        if (_data.length === 0) {
          setIsMoreItems(false);
          return;
        }
        setData(prevData => [...prevData, ..._data]);
        setPage(prevPage => prevPage + 1);
      }, 
      onComplete: () => {
        setIsLoading(false);
      }
    }));
  }

  const navigateToVolunteerAnalysis = (volunteerId) => {
    navigation.navigate(ROUTES.VOLUNTEER_ANALYSIS, {
      filters: {
        ...filters,
        [FILTERS_LIST.volunteer_ids]: [volunteerId]
      }
    });
  }

  const renderItem = ({ item }) => {
    return <VolunteerListItem
      id={item.id}
      uniqueId={item.unique_id}
      name={item.name}
      role={item.role}
      mobile={item.mobile}
      pollingStationId={item.polling_station_id}
      pollingStationName={item.polling_station_name}
      pollingStationPartNo={item.polling_station_part_no}
      onClick={() => navigateToVolunteerAnalysis(item.id)}
    />
  }

  const loadMore = () => {
    if (!isLoading) {
      fetchData();
    }
  };

  return (
    <View style={styles.appContainer}>
      <FlashListCompat
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        onEndReached={isMoreItems ? loadMore : () => {}}
        onEndReachedThreshold={0.5}
        estimatedItemSize={80}
        ListFooterComponent={isLoading ? <ActivityIndicator size="large" color={THEME.COLOR.PRIMARY} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    width: '100%',
    flex: 1,
    overflow: 'hidden',
  },
});
