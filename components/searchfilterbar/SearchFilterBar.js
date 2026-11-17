import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Searchbar, IconButton, Button, Divider, Badge, Icon } from 'react-native-paper';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView
} from '@gorhom/bottom-sheet';
import { clearFilterSort, componentKey as filterSortComponentKey, setFilterSort } from '../../storemanagement/filtersort/FilterSortSlice';
import DateRangeFilter from './DateRangeFilter';
import VotersFilter from './VotersFilter';
import VotersAgeFilter from './VotersAgeFilter';
import VotersGenderFilter from './VotersGenderFilter';
import VotersMobileNumberAvailableFilter from './VotersMobileNumberAvailableFilter';
import VotersCastesFilter from './VotersCastesFilter';
import VotersReligionsFilter from './VotersReligionsFilter';
import VotersOpinionsFilter from './VotersOpinionsFilter';
import VolunteersFilter from './VolunteersFilter';
import VolunteersListFilter from './VolunteersListFilter';
import { componentKey as initComponentKey } from '../../storemanagement/initscreen/InitSlice';
import { USER_ROLE } from '../../constant';
import PollingStationsFilter from './PollingStationsFilter';
import PollingStationsListFilter from './PollingStationsListFilter';
import { THEME } from '../../theme';
import { STRINGS } from '../../strings';
import VotersMigrationStatusFilter from './VotersMigrationStatusFilter';
import useResponsive from '../../utils/hooks/useResponsive';

export default function SearchFilterBar() {
  const dispatch = useDispatch();
  const { filterSort } = useSelector(state => state[filterSortComponentKey]);
  const { userDetails } = useSelector(state => state[initComponentKey])
  const { responsiveValue, contentMaxWidth } = useResponsive();

  const bottomSheetModalRef = useRef(null);

  const [from, setFrom] = useState(filterSort.from_epoch)
  const [to, setTo] = useState(filterSort.to_epoch)
  const [pollingStationIds, setPollingStationIds] = useState(filterSort.polling_station_ids)
  const [accountApprovedStatus, setAccountApprovedStatus] = useState(filterSort.account_approved_statuses)
  const [fromVoterAge, setFromVoterAge] = useState(filterSort.from_voter_age)
  const [toVoterAge, setToVoterAge] = useState(filterSort.to_voter_age)
  const [voterGenders, setVoterGenders] = useState(filterSort.voter_genders)
  const [isVoterMobileNumber, setIsVoterMobileNumber] = useState(filterSort.is_voter_mobile_number)
  const [isVoterMigrated, setIsVoterMigrated] = useState(filterSort.is_voter_migrated)
  const [voterCastes, setVoterCastes] = useState(filterSort.voter_castes)
  const [voterReligions, setVoterReligions] = useState(filterSort.voter_religions)
  const [volunteerIds, setVolunteerIds] = useState(filterSort.volunteer_ids)
  const [voterOpinions, setVoterOpinions] = useState(filterSort.voter_opinions)

  const [voterName, setVoterName] = useState(filterSort.voter_name)
  const [voterEpic, setVoterEpic] = useState(filterSort.voter_epic)
  const [voterAddress, setVoterAddress] = useState(filterSort.voter_address)
  const [searchText, setSearchText] = useState(filterSort.voter_name);
  
  const setSearchTextValues = (text) => {
    setSearchText(text);
    setVoterName(text);
    setVoterEpic(text);
    setVoterAddress(text);
  }
  
  const filterSortCountFn = () => {
    return Object.values(filterSort).filter(fs => fs !== null && fs !== '').length;
  }

  const [filterSortCount, setFilterSortCount] = useState(filterSortCountFn());

  useEffect(() => {
    setFilterSortCount(filterSortCountFn())
  }, [filterSort])

  useEffect(() => {
    setFrom(filterSort.from_epoch);
    setTo(filterSort.to_epoch)
    setPollingStationIds(filterSort.polling_station_ids)
    setAccountApprovedStatus(filterSort.account_approved_statuses)
    setFromVoterAge(filterSort.from_voter_age)
    setToVoterAge(filterSort.to_voter_age)
    setVoterGenders(filterSort.voter_genders)
    setIsVoterMobileNumber(filterSort.is_voter_mobile_number)
    setIsVoterMigrated(filterSort.is_voter_migrated)
    setVoterCastes(filterSort.voter_castes)
    setVoterReligions(filterSort.voter_religions)
    setVolunteerIds(filterSort.volunteer_ids)
    setVoterOpinions(filterSort.voter_opinions)
    setVoterName(filterSort.voter_name);
    setVoterEpic(filterSort.voter_epic);
    setVoterAddress(filterSort.voter_address);
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
      voter_name: voterName,
      voter_epic: voterEpic,
      voter_address: voterAddress
    }))
  }, [searchText])

  const onSaveFilter = () => {
    dispatch(setFilterSort({
      from_epoch: from,
      to_epoch: to,
      polling_station_ids: pollingStationIds,
      account_approved_statuses: accountApprovedStatus,
      from_voter_age: fromVoterAge,
      to_voter_age: toVoterAge,
      voter_genders: voterGenders,
      is_voter_mobile_number: isVoterMobileNumber,
      is_voter_migrated: isVoterMigrated,
      voter_castes: voterCastes,
      voter_religions: voterReligions,
      volunteer_ids: volunteerIds,
      voter_opinions: voterOpinions,
    }))
    handleClosePress();
  }
  
  const renderFooter = props => (
    <BottomSheetFooter {...props} bottomInset={0}>
      <View style={styles.footerContainer}>
        <Button 
          style={styles.footerButtonClear} 
          mode='outlined' 
          onPress={onClearFilter}
          textColor={THEME.COLOR.TEXT_SECONDARY}
          icon="filter-remove"
        >
          {STRINGS.CLEAR_FILTER_BUTTON}
        </Button>
        <Button 
          style={styles.footerButtonSave} 
          mode='contained' 
          onPress={onSaveFilter}
          buttonColor={THEME.COLOR.PRIMARY}
          icon="check"
        >
          {STRINGS.SAVE_BUTTON}
        </Button>
      </View>
    </BottomSheetFooter>
  )

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.container, { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }]}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder={STRINGS.SEARCH_PLACEHOLDER}
            onChangeText={setSearchTextValues}
            value={searchText}
            mode={'view'}
            showDivider={false}
            inputStyle={styles.searchInput}
            style={styles.searchWrapper}
            iconColor={THEME.COLOR.TEXT_MUTED}
            placeholderTextColor={THEME.COLOR.TEXT_MUTED}
          />
        </View>

        {/* Filter Button */}
        <Pressable 
          onPress={handlePresentModalPress}
          style={({ pressed }) => [
            styles.filterButton,
            pressed && { opacity: THEME.OPACITY.PRESSED },
          ]}
        >
          <Icon source="tune-vertical" size={20} color={THEME.COLOR.PRIMARY_FOREGROUND} />
          {filterSortCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterSortCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={1}
        snapPoints={snapPoints}
        footerComponent={renderFooter}
        backgroundStyle={styles.bottomSheetBg}
        handleIndicatorStyle={styles.bottomSheetHandle}
      >
        <View style={styles.sheetHeader}>
          <Icon source="filter" size={20} color={THEME.COLOR.PRIMARY} />
          <Text style={styles.sheetHeaderTitle}>{STRINGS.FILTER_SHEET_TITLE}</Text>
          {filterSortCount > 0 && (
            <View style={styles.sheetBadge}>
              <Text style={styles.sheetBadgeText}>{filterSortCount} {STRINGS.FILTER_ACTIVE_LABEL}</Text>
            </View>
          )}
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.contentContainer}
        >
          {/* <DateRangeFilter from={from} to={to} setFromCb={setFrom} setToCb={setTo} /> */}
          <Divider style={styles.sectionDivider} />
          <VotersFilter>
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
              <Divider style={styles.sectionDivider} />
            
              <VolunteersFilter>
                <VolunteersListFilter
                  volunteers={volunteerIds}
                  updateVolunteersListCb={setVolunteerIds}
                />
              </VolunteersFilter>

              <Divider style={styles.sectionDivider} />
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
      
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: THEME.COLOR.PRIMARY,
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.SPACING.MD,
    paddingVertical: THEME.SPACING.SM,
    gap: THEME.SPACING.SM,
  },
  searchContainer: {
    flex: 1,
  },
  searchWrapper: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: THEME.BORDER_RADIUS.MD,
    height: 42,
    ...THEME.SHADOW.LIGHT,
  },
  searchInput: {
    minHeight: 20,
    fontSize: THEME.FONT_SIZE.MD,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: THEME.BORDER_RADIUS.MD,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: THEME.COLOR.ACCENT,
    borderRadius: THEME.BORDER_RADIUS.FULL,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
  },
  bottomSheetBg: {
    backgroundColor: THEME.COLOR.SURFACE,
    borderTopLeftRadius: THEME.BORDER_RADIUS.XL,
    borderTopRightRadius: THEME.BORDER_RADIUS.XL,
  },
  bottomSheetHandle: {
    backgroundColor: THEME.COLOR.BORDER,
    width: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.SPACING.SM,
    paddingHorizontal: THEME.SPACING.XL,
    paddingVertical: THEME.SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: THEME.COLOR.BORDER_LIGHT,
  },
  sheetHeaderTitle: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    flex: 1,
  },
  sheetBadge: {
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
    borderRadius: THEME.BORDER_RADIUS.FULL,
    paddingHorizontal: THEME.SPACING.MD,
    paddingVertical: THEME.SPACING.XXS,
  },
  sheetBadgeText: {
    color: THEME.COLOR.PRIMARY,
    fontSize: THEME.FONT_SIZE.XS,
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
  },
  sectionDivider: {
    marginVertical: THEME.SPACING.MD,
    backgroundColor: THEME.COLOR.BORDER_LIGHT,
  },
  contentContainer: {
    paddingHorizontal: THEME.SPACING.LG,
    paddingBottom: 120,
  },
  footerContainer: {
    padding: THEME.SPACING.LG,
    flexDirection: 'row',
    gap: THEME.SPACING.MD,
    backgroundColor: THEME.COLOR.SURFACE,
    borderTopWidth: 1,
    borderTopColor: THEME.COLOR.BORDER,
    ...THEME.SHADOW.MEDIUM,
  },
  footerButtonClear: {
    flex: 1,
    borderRadius: THEME.BORDER_RADIUS.MD,
    borderColor: THEME.COLOR.BORDER,
  },
  footerButtonSave: {
    flex: 1,
    borderRadius: THEME.BORDER_RADIUS.MD,
  },
});
