import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import FlashListCompat from '../ui/FlashListCompat';
import { useDispatch, useSelector } from 'react-redux';
import { getVotersList } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import VoterListItem from '../voterlistitem/VoterListItem';
import { componentKey as componentKeyInitSlice } from '../../storemanagement/initscreen/InitSlice';
import { clearFilterSort, componentKey as filterSortComponentKey, setFilterSort } from '../../storemanagement/filtersort/FilterSortSlice';
import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import { FILTERS_LIST, ROUTES } from '../../constant';
import { THEME } from '../../theme';

export default function VoterList({navigation, filters, isFilterSort, refreshKey = 0}) {
  const dispatch = useDispatch();

  const { filterSort } = useSelector(state => state[filterSortComponentKey]);

  const { ballotNo, leaderName, voterSlipImage, userDetails } = useSelector(state => state[componentKeyInitSlice])
  const voterSlipImageVar = useMemo(() => ({ leader: voterSlipImage }), [voterSlipImage]);

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isMoreItems, setIsMoreItems] = useState(true);

  const oldFilterSort = useRef({});
  const hasFetchStarted = useRef(false);
  const prevRefreshKey = useRef(refreshKey);

  useEffect(() => {
    dispatch(setFilterSort(filters ?? {}))
    // return () => dispatch(clearFilterSort({}))
  }, []);

  useEffect(() => {
    const filterEquality = isEqual(oldFilterSort.current, filterSort);
    const refreshKeyChanged = prevRefreshKey.current !== refreshKey;
    prevRefreshKey.current = refreshKey;

    if (!filterEquality || refreshKeyChanged) {
      setData([]);
      setPage(1);
      setIsMoreItems(true);
      setTimeout(() => fetchData(1), 60);
    }
  }, [filterSort, refreshKey])

  const fetchData = (pageNum) => {
    hasFetchStarted.current = true;
    setIsLoading(true);
    dispatch(getVotersList({
      filters: isFilterSort ? filterSort : filters,
      pageNum: pageNum ?? page,
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

  const filterSameAddressVoters = useCallback((address) => {
    navigation.navigate(ROUTES.SAME_ADDRESSS_VOTERS, {
      filters: {
        [FILTERS_LIST.voter_address]: address
      }
    });
  }, [navigation]);

  const renderItem = useCallback(({ item }) => {
    return <VoterListItem
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
      filterSameAddressVoters={() => filterSameAddressVoters(item.address)}
      onAddVoterMobileNumber={(number) => {
        item.data_collection_mobile_number = number
      }}
      voterOpinion={item.data_collection_opinion}
      onAddVoterOpinion={(opinion) => {
        item.data_collection_opinion = opinion
      }}
      voterMigrated={item.data_collection_is_voter_migrated}
      onAddVoterMigrated={(migrated) => {
        item.data_collection_is_voter_migrated = migrated
      }}
      voterApproached={!!item.data_collection_id}
      onAddVoterApproached={(data_collection_id) => {
        item.data_collection_id = data_collection_id
      }}
      ballotNo={ballotNo}
      leaderName={leaderName}
      images={voterSlipImageVar}
    />
  }, [userDetails.role, ballotNo, leaderName, voterSlipImageVar, filterSameAddressVoters]);

  const loadMore = () => {
    if (!isLoading) {
      fetchData();
    }
  };

  if (hasFetchStarted.current && !isLoading && (!data || data.length === 0)) {
    return (
      <View style={[styles.appContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>No Voters Found</Text>
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <FlashListCompat
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        onEndReached={isMoreItems ? loadMore : () => {}}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoading ? <ActivityIndicator size="large" color={THEME.COLOR.PRIMARY} /> : null}
        estimatedItemSize={140}
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
