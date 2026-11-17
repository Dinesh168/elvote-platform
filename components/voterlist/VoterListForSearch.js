import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import FlashListCompat from '../ui/FlashListCompat';
import { useDispatch, useSelector } from 'react-redux';
import { getSearchedVoter, getVotersList } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { componentKey as componentKeyInitSlice } from '../../storemanagement/initscreen/InitSlice';
import { componentKey as filterSortComponentKey } from '../../storemanagement/filtersort/FilterSortSlice';
import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import { FILTERS_LIST } from '../../constant';
import VoterListSlip from '../voterlistslip/VoterListSlip';
import { STRINGS } from '../../strings';

export default function VoterListForSearch() {
  const dispatch = useDispatch();

  const { filterSort } = useSelector(state => state[filterSortComponentKey]);

  const { ballotNo, leaderName, voterSlipImage } = useSelector(state => state[componentKeyInitSlice]);

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const voterSlipImageVar = {leader: voterSlipImage};

  const returnFilterSortValues = () => {
    return (
      {
        [FILTERS_LIST.voter_epic]: filterSort[FILTERS_LIST.voter_epic] && filterSort[FILTERS_LIST.voter_epic].length > 0 ?  filterSort[FILTERS_LIST.voter_epic] : "@@@#@@$"
      }
    )
  }

  const oldFilterSort = useRef(returnFilterSortValues());

  useEffect(() => {
    const filterNew = returnFilterSortValues();
    if (filterNew[FILTERS_LIST.voter_epic] === "@@@#@@$") {
      setData(prev => []);
      return;
    }

    const filterEquality = isEqual(oldFilterSort.current, filterNew);

    if (!filterEquality) {
      setData(prev => []);
      setTimeout(() => fetchData(1), 60);
    }
  }, [filterSort])

  const fetchData = (pageNum) => {
    setIsLoading(true);
    dispatch(getSearchedVoter({
      filters: returnFilterSortValues(),
      onSuccess: (_data) => {
        if (_data.length === 0) {
          return;
        }
        setData(prevData => [...prevData, ..._data]);
        oldFilterSort.current = cloneDeep(filterSort)
      }, 
      onComplete: () => {
        setIsLoading(false);
      }
    }));
  }


  const renderItem = ({ item }) => {
    return <VoterListSlip
      key={item.id}
      sno={item.sno}
      name={item.name}
      address={item.address}
      age={item.age}
      gender={item.gender}
      relativeName={item.relative_name}
      epicNo={item.epic}
      pollingStationName={item.polling_station_name}
      pollingStationAddress={item.polling_station_address}
      partNo={item.part_no}
      ballotNo={ballotNo}
      leaderName={leaderName}
      images={voterSlipImageVar}
    />
  }

  return (
    <View style={styles.appContainer}>
      {isLoading && <ActivityIndicator animating={true} size={'large'} />}
      {!isLoading && data.length === 0 && <Text variant='bodyLarge' style={styles.noDataText}>{STRINGS.NO_MATCHING_VOTER_SEARCH}</Text>}
      {!isLoading && data.length > 0  && <FlashListCompat
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        estimatedItemSize={150}
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    width: '100%',
    flex: 1,
    overflow: 'hidden',
  },
  noDataText: {
    textAlign: 'center'
  }
});
