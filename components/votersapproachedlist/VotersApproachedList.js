import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button } from 'react-native-paper';
import FlashListCompat from '../ui/FlashListCompat';
import { useDispatch, useSelector } from 'react-redux';
import { getVotersApproachedList, getVotersList } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import VoterListItem from '../voterlistitem/VoterListItem';
import { componentKey as componentKeyInitSlice } from '../../storemanagement/initscreen/InitSlice';
import { FILTERS_LIST, ROUTES } from '../../constant';
import { setFilterSort } from '../../storemanagement/filtersort/FilterSortSlice';

export default function VotersApproachedList({navigation, filters}) {
  const dispatch = useDispatch();
  const sheetRef = useRef(null);

  const { ballotNo, leaderName, voterSlipImage, userDetails } = useSelector(state => state[componentKeyInitSlice])
  const voterSlipImageVar = {leader: voterSlipImage};

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isMoreItems, setIsMoreItems] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setIsLoading(true);
    dispatch(getVotersApproachedList({
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

  const filterSameAddressVoters = (address) => {
      navigation.navigate(ROUTES.SAME_ADDRESSS_VOTERS, {
                  filters: {
                    [FILTERS_LIST.voter_address]: address
                  }
                });
  }

  const renderItem = ({ item }) => {
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
        ListFooterComponent={isLoading ? <ActivityIndicator size="large" color="#0000ff" /> : null}
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
