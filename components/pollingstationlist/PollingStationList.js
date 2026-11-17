import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { useDispatch } from 'react-redux';
import BottomSheet from 'reanimated-bottom-sheet';
import SortFilterVoter from '../sortfilter/SortFilterVoter';
import VolunteerListItem from '../volunteerlistitem/VolunteerListItem';
import { STRINGS } from '../../strings';

export default function PollingStationList() {
  const dispatch = useDispatch();
  const sheetRef = useRef(null);

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


  const renderItem = ({ item }) => (
    <VolunteerListItem
      id={item.id}
      uniqueId={item.unique_id}
      name={item.name}
      role={item.role}
      mobile={item.mobile}
      pollingStationId={item.polling_station_id}
      pollingStationName={item.polling_station_name}
      pollingStationPartNo={item.part_no}
    />
  );

  const loadMore = () => {
    if (!isLoading) {
      fetchData();
    }
  };

  return (
    <View style={styles.appContainer}>
      <Button title={STRINGS.SHOW_FILTER_SORT_BUTTON} onPress={() => sheetRef.current.snapTo(0)} />
      <FlashList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        onEndReached={isMoreItems ? loadMore : () => {}}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoading ? <ActivityIndicator size="large" color="#0000ff" /> : null}
      />
      <BottomSheet
        ref={sheetRef}
        snapPoints={[450, 300, 0]}
        borderRadius={10}
        renderContent={<SortFilterVoter />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  container: {
    marginVertical: 5,
    borderRadius: 5,
    elevation: 2,
    overflow: 'hidden',
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
  },
  text: {
    flex: 1,
    marginHorizontal: 5,
  },
  details: {
    paddingLeft: 40,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  detailText: {
    fontSize: 14,
    marginBottom: 5,
  },
});
