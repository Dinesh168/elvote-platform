import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Searchbar, IconButton, Button, Divider, Badge } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { clearFilterSort, componentKey as filterSortComponentKey, setFilterSort } from '../../storemanagement/filtersort/FilterSortSlice';
import VotersFilter from './VotersFilter';
import VotersAgeFilter from './VotersAgeFilter';
import VotersGenderFilter from './VotersGenderFilter';
import VotersMobileNumberAvailableFilter from './VotersMobileNumberAvailableFilter';
import VotersCastesFilter from './VotersCastesFilter';
import VotersReligionsFilter from './VotersReligionsFilter';
import VotersOpinionsFilter from './VotersOpinionsFilter';
import { componentKey as initComponentKey } from '../../storemanagement/initscreen/InitSlice';
import { USER_ROLE } from '../../constant';
import PollingStationsFilter from './PollingStationsFilter';
import PollingStationsListFilter from './PollingStationsListFilter';
import { THEME } from '../../theme';
import useGarbageCollector from '../../utils/hooks/garbageCollectorHooks';
import VotersVotedFilter from './VotersVotedFilter';
import { STRINGS } from '../../strings';
import VotersMigrationStatusFilter from './VotersMigrationStatusFilter';

export default function LiveVotingSearchFilterBar() {
  useGarbageCollector(filterSortComponentKey);
  const dispatch = useDispatch();
  const { filterSort } = useSelector(state => state[filterSortComponentKey]);
  const { userDetails } = useSelector(state => state[initComponentKey])

  const bottomSheetModalRef = useRef(null);

  const [pollingStationIds, setPollingStationIds] = useState(filterSort.polling_station_ids)
  const [fromVoterAge, setFromVoterAge] = useState(filterSort.from_voter_age)
  const [toVoterAge, setToVoterAge] = useState(filterSort.to_voter_age)
  const [voterGenders, setVoterGenders] = useState(filterSort.voter_genders)
  const [isVoterVoted, setIsVoterVoted] = useState(filterSort.is_voter_voted)
  const [isVoterMobileNumber, setIsVoterMobileNumber] = useState(filterSort.is_voter_mobile_number)
  const [isVoterMigrated, setIsVoterMigrated] = useState(filterSort.is_voter_migrated)
  const [voterCastes, setVoterCastes] = useState(filterSort.voter_castes)
  const [voterReligions, setVoterReligions] = useState(filterSort.voter_religions)
  const [voterOpinions, setVoterOpinions] = useState(filterSort.voter_opinions)

  const [sno, setSno] = useState(filterSort.sno)
  const [searchText, setSearchText] = useState(filterSort.sno);
  
  const setSearchTextValues = (text) => {
    setSearchText(text);
    setSno(text);
  }
  
  const filterSortCountFn = () => {
    return Object.values(filterSort).filter(fs => fs !== null && fs !== '').length;
  }

  const [filterSortCount, setFilterSortCount] = useState(filterSortCountFn());

  useEffect(() => {
    setFilterSortCount(filterSortCountFn())
  }, [filterSort])

  useEffect(() => {
    setPollingStationIds(filterSort.polling_station_ids)
    setFromVoterAge(filterSort.from_voter_age)
    setToVoterAge(filterSort.to_voter_age)
    setVoterGenders(filterSort.voter_genders)
    setIsVoterVoted(filterSort.is_voter_voted)
    setIsVoterMobileNumber(filterSort.is_voter_mobile_number)
    setIsVoterMigrated(filterSort.is_voter_migrated)
    setVoterCastes(filterSort.voter_castes)
    setVoterReligions(filterSort.voter_religions)
    setVoterOpinions(filterSort.voter_opinions)
    setSno(filterSort.sno);
  }, [filterSort])
  
  // variables
  const snapPoints = useMemo(() => ['25%', '90%'], []);

  // callbacks
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const handleClosePress = () => bottomSheetModalRef.current.close()

  const onClearFilter = () => {
    dispatch(clearFilterSort())
  }

  useEffect(() => {
    dispatch(setFilterSort({
      sno: sno,
    }))
  }, [searchText])

  const onSaveFilter = () => {
    dispatch(setFilterSort({
      polling_station_ids: pollingStationIds,
      from_voter_age: fromVoterAge,
      to_voter_age: toVoterAge,
      voter_genders: voterGenders,
      is_voter_voted: isVoterVoted,
      is_voter_mobile_number: isVoterMobileNumber,
      is_voter_migrated: isVoterMigrated,
      voter_castes: voterCastes,
      voter_religions: voterReligions,
      voter_opinions: voterOpinions,
    }))
    handleClosePress();
  }
  
  const renderFooter = props => (
    <BottomSheetFooter {...props} bottomInset={0}>
      <View style={styles.footerContainer}>
        <Button style={styles.footerButton} mode='text' onPress={onClearFilter}>{STRINGS.CLEAR_FILTER_BUTTON}</Button>
        <Button style={styles.footerButton} mode='contained' onPress={onSaveFilter}>{STRINGS.SAVE_BUTTON}</Button>
      </View>
    </BottomSheetFooter>
  )

  return (
    <>
      <View style={styles.container}>
        <Searchbar
          placeholder={STRINGS.SEARCH_PLACEHOLDER}
          onChangeText={setSearchTextValues}
          value={searchText}
          mode={'view'}
          showDivider={false}
          inputStyle={{
            minHeight: 20,
          }}
          style={styles.searchWrapper}
        />
        <View style={styles.filterButtonWrapper}>
          <IconButton
            icon="filter"
            iconColor={THEME.COLOR.PRIMARY_BACKGROUND}
            size={20}
            onPress={handlePresentModalPress}
          />
          {
            filterSortCount > 0 && <Badge style={styles.badge}>{filterSortCount}</Badge>
          }
        </View>
      </View>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={1}
        snapPoints={snapPoints}
        footerComponent={renderFooter}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.contentContainer}
        >
          <VotersFilter>
            <VotersVotedFilter
              isVoterVoted={isVoterVoted}
              updateVoterVotedCb={setIsVoterVoted}
            />

            <VotersAgeFilter 
              fromAge={fromVoterAge} 
              toAge={toVoterAge} 
              updateAgeCb={([fromAge, toAge]) => { 
                setFromVoterAge(fromAge); 
                setToVoterAge(toAge); 
              }} 
            />

            <VotersGenderFilter
              genders={voterGenders ?? []}
              updateGendersCb={gendersList => setVoterGenders(gendersList.length === 0 ? null : gendersList)}
            />

            <VotersMobileNumberAvailableFilter
              isVoterMobileAvailable={isVoterMobileNumber}
              updateVoterMobileAvailableCb={setIsVoterMobileNumber}
            />

            <VotersMigrationStatusFilter
              isVoterMigrated={isVoterMigrated}
              updateVoterMigratedCb={setIsVoterMigrated}
            />

            <VotersCastesFilter 
              castes={voterCastes}
              updateCastesCb={setVoterCastes}
            />

            <VotersReligionsFilter
              religions={voterReligions}
              updateReligionsCb={setVoterReligions}
            />

            <VotersOpinionsFilter
              opinions={voterOpinions}
              updateOpinionsCb={setVoterOpinions}
            />
          </VotersFilter>
          
          {
            userDetails.role === USER_ROLE.ADMIN &&
            <>
              <Divider style={{marginVertical: 10}} />
            
              <PollingStationsFilter>
                <PollingStationsListFilter
                  pollingStations={pollingStationIds}
                  updatePollingStationsListCb={setPollingStationIds}
                />
              </PollingStationsFilter>
            </>
          }
          
        </BottomSheetScrollView>
      </BottomSheetModal>
      
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.COLOR.PRIMARY
  },
  searchWrapper: {
    flex: 1,
    backgroundColor: THEME.COLOR.PRIMARY_FOREGROUND,
    margin: 10,
    borderRadius: 10,
    height: 40
  },
  filterButtonWrapper: {
    width: 60
  },
  badge: {
    position: 'absolute',
    right: 10
  },
  bottomSheetContent: {
    backgroundColor: 'white',
    padding: 16,
    height: 300,
  },
  contentText: {
    fontSize: 18,
    marginBottom: 20,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100
  },
  itemContainer: {
    padding: 6,
    margin: 6,
    backgroundColor: "#eee",
    color: "#000"
  },
  footerContainer: {
    padding: 16,
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#EEE',
  },
  footerButton: {
    flex: 1
  }
});
