import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button } from 'react-native-paper';
import FlashListCompat from '../ui/FlashListCompat';
import { useDispatch, useSelector } from 'react-redux';
import { getVotersList } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import VoterListItem from '../voterlistitem/VoterListItem';
import { componentKey as componentKeyInitSlice } from '../../storemanagement/initscreen/InitSlice';
import { clearFilterSort, componentKey as filterSortComponentKey, setFilterSort } from '../../storemanagement/filtersort/FilterSortSlice';
import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import LiveVotingVoterListItem from '../voterlistitem/LiveVotingVoterListItem';
import { THEME } from '../../theme';

export default function LiveVotingVoterList({filters, isFilterSort}) {
  const dispatch = useDispatch();

  const { filterSort } = useSelector(state => state[filterSortComponentKey]);

  const { userDetails } = useSelector(state => state[componentKeyInitSlice])
  // const voterSlipImageVar = {leader: voterSlipImage};

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isMoreItems, setIsMoreItems] = useState(true);

  const oldFilterSort = useRef({});

  useEffect(() => {
    dispatch(setFilterSort(filters ?? {}))
    return () => dispatch(clearFilterSort({}))
  }, []);

  useEffect(() => {
    const filterEquality = isEqual(oldFilterSort.current, filterSort);
    if (!filterEquality) {
      setData(prev => []);
      setPage(prev => 1);
      setIsMoreItems(true);
      setTimeout(() => fetchData(1), 60);
    }
  }, [filterSort])

  const fetchData = (pageNum) => {
    setIsLoading(true);
    dispatch(getVotersList({
      filters: filterSort,
      pageNum: pageNum ?? page,
      isLiveVoting: true,
      onSuccess: (_data) => {
        if (_data.length === 0) {
          setIsMoreItems(false);
          return;
        }
        setData(prevData => [...prevData, ..._data]);
        setPage(prevPage => prevPage + 1);
        oldFilterSort.current = cloneDeep(filterSort)
      }, 
      onComplete: () => {
        setIsLoading(false);
      }
    }));
  }


  const renderItem = ({ item }) => {
    return <LiveVotingVoterListItem
      myRole={userDetails.role}
      id={item.id}
      key={item.id}
      sno={item.sno}
      name={item.name}
      address={item.address}
      age={item.age}
      gender={item.gender}
      relativeName={item.relative_name}
      relativeRelation={item.relative_relation}
      epicNo={item.epic}
      caste={item.caste}
      religion={item.religion}
      pollingStationName={item?.polling_station_name}
      pollingStationAddress={item?.polling_station_address}
      partNo={item?.part_no}
      mobileNumberElvote={item.mobile_number}
      voterMobileNumber={item.data_collection_mobile_number}
      voterMigrated={item.data_collection_is_voter_migrated}
      voterOpinion={item.data_collection_opinion}
      voterVoted={!!item.live_voting_id}
      onAddVoterVoted={(live_voting_id) => {
        item.live_voting_id = live_voting_id
      }}
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
        ListFooterComponent={isLoading ? <ActivityIndicator size="large" color={THEME.COLOR.PRIMARY} /> : null}
        estimatedItemSize={100}
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
