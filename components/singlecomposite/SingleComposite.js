import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import useResponsive from '../../utils/hooks/useResponsive';
import { IconButton } from 'react-native-paper';
import VotersApproachedToday from '../votersapproachedtoday/VotersApproachedToday';
import VotersApproachedCountChart from '../votersapproachedchart/VotersApproachedCountChart';
import VotersApproachedTotal from '../votersapproachedtotal/VotersApproachedTotal';
import VotersOpinionChart from '../votersopinionchart/VotersOpinionChart';
import VolunteersCount from '../volunteerscount/VolunteersCount';
import VotersMobileCount from '../votersmobilecount/VotersMobileCount';
import VoterList from '../voterlist/VoterList';
import SearchFilterBar from '../searchfilterbar/SearchFilterBar';
import SearchPollingStationBar from '../searchfilterbar/SearchPollingStationBar';
import { FILTERS_LIST } from '../../constant';
import VotersCount from '../voterscount/VotersCount';
import VotersAgeChart from '../votersagechart/VotersAgeChart';
import VotersReligionChart from '../votersreligionchart/VotersReligionChart';
import VotersCasteChart from '../voterscastechart/VotersCasteChart';
import VotersGenderChart from '../votersgenderchart/VotersGenderChart';
import VolunteerListWithPS from '../volunteerlist/VolunteerListWithPS';
import VolunteerList from '../volunteerlist/VolunteerList';
import VoterListWithPS from '../voterlist/VoterListWithPS';
import PollingStationListWithPS from '../pollingstationlist/PollingStationListWithPS';
import { THEME } from '../../theme';
import SearchBar from '../searchfilterbar/SearchBar';
import VoterListForSearch from '../voterlist/VoterListForSearch';
import VotersApproachedList from '../votersapproachedlist/VotersApproachedList';
import LiveVotingVoterList from '../voterlist/LiveVotingVoterList';
import LiveVotingSearchFilterBar from '../searchfilterbar/LiveVotingSearchFilterBar';
import VotersVotedTotal from '../votersvotedtotal/VotersVotedTotal';
import AddedFilterInfo from '../sortfilter/AddedFilterInfo';
import VotersMigratedCount from './../votersmigratedcount/VotersMigratedCount';
import ACOverview from '../acoverview/ACOverview';

export default function SingleComposite({
  searchBar,
  searchAndFilterBar,
  addedFilterInfoBar,
  searchPollingStationBar,
  searchAndFilterBarLiveVoting,
  acOverview,
  votersApproachedToday,
  votersApproachedCountChart,
  votersVotedTotal,
  votersApproachedTotal,
  votersOpinionChart,
  volunteersCount,
  votersMobileCount,
  votersMigratedCount,
  voterList,
  voterListLiveVoting,
  voterListWithPS,
  voterListForSearch,
  voterApproachedList,
  volunteerList,
  volunteerListWithPS,
  votersCount,
  votersAgeCountChart,
  votersReligionCountChart,
  votersCasteCountChart,
  votersGenderCountChart,
  pollingStationListWithPS,
  navigation,
  filtersObj = {},
  extraData = {}
}) {
  const { summaryCardWidth, dashboardChartWidth } = useResponsive();
  const [filters, setFilters] = useState(filtersObj);
  // Incrementing this causes all child stat components to re-fetch without unmounting them
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="refresh"
          iconColor={THEME.COLOR.PRIMARY_FOREGROUND}
          size={20}
          onPress={() => setRefreshKey(k => k + 1)}
        />
      ),
    });
  }, [navigation]);

  return (
    <View style={{ flex: 1 }}>
      {searchBar && <SearchBar navigation={navigation} extraData={extraData} />}
      {!searchBar && searchAndFilterBar && (
        <SearchFilterBar navigation={navigation} extraData={extraData} />
      )}
      {!searchBar && !searchAndFilterBar && searchPollingStationBar && (
        <SearchPollingStationBar
          onSetPollingStation={pollingStations =>
            setFilters(prevFilter => ({
              ...prevFilter,
              [FILTERS_LIST.polling_station_ids]: pollingStations,
            }))
          }
          navigation={navigation}
        />
      )}
      {!searchBar && !searchAndFilterBar && !searchPollingStationBar && searchAndFilterBarLiveVoting && (
        <LiveVotingSearchFilterBar navigation={navigation} extraData={extraData} />
      )}
      {addedFilterInfoBar && (
        <AddedFilterInfo navigation={navigation} filters={filters} extraData={extraData} />
      )}

      <View style={{ flexDirection: 'column', justifyContent: 'flex-start', flex: 1, overflow: 'hidden' }}>
        {acOverview && (
          <ACOverview
            navigation={navigation}
            filters={filters}
            extraData={extraData}
            refreshKey={refreshKey}
          />
        )}

        {/* Summary Cards Grid */}
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          paddingHorizontal: THEME.SPACING.XS,
        }}>
          {votersApproachedToday && (
            <View style={{ width: summaryCardWidth, padding: 4 }}>
              <VotersApproachedToday
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                style={{ flex: 1, marginHorizontal: 0, marginVertical: 0 }}
              />
            </View>
          )}
          {votersVotedTotal && (
            <View style={{ width: summaryCardWidth, padding: 4 }}>
              <VotersVotedTotal
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                style={{ flex: 1, marginHorizontal: 0, marginVertical: 0 }}
              />
            </View>
          )}
          {votersApproachedTotal && (
            <View style={{ width: summaryCardWidth, padding: 4 }}>
              <VotersApproachedTotal
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                style={{ flex: 1, marginHorizontal: 0, marginVertical: 0 }}
              />
            </View>
          )}
          {volunteersCount && (
            <View style={{ width: summaryCardWidth, padding: 4 }}>
              <VolunteersCount
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                style={{ flex: 1, marginHorizontal: 0, marginVertical: 0 }}
              />
            </View>
          )}
          {votersMobileCount && (
            <View style={{ width: summaryCardWidth, padding: 4 }}>
              <VotersMobileCount
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                style={{ flex: 1, marginHorizontal: 0, marginVertical: 0 }}
              />
            </View>
          )}
          {votersMigratedCount && (
            <View style={{ width: summaryCardWidth, padding: 4 }}>
              <VotersMigratedCount
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                style={{ flex: 1, marginHorizontal: 0, marginVertical: 0 }}
              />
            </View>
          )}
          {votersCount && (
            <View style={{ width: summaryCardWidth, padding: 4 }}>
              <VotersCount
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                style={{ flex: 1, marginHorizontal: 0, marginVertical: 0 }}
              />
            </View>
          )}
        </View>

        {/* Charts Grid */}
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          paddingHorizontal: THEME.SPACING.XS,
        }}>
          {votersApproachedCountChart && (
            <View style={{ width: dashboardChartWidth, padding: 4 }}>
              <VotersApproachedCountChart
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                chartWidth={dashboardChartWidth}
              />
            </View>
          )}
          {votersOpinionChart && (
            <View style={{ width: dashboardChartWidth, padding: 4 }}>
              <VotersOpinionChart
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                chartWidth={dashboardChartWidth}
              />
            </View>
          )}
          {votersAgeCountChart && (
            <View style={{ width: dashboardChartWidth, padding: 4 }}>
              <VotersAgeChart
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                chartWidth={dashboardChartWidth}
              />
            </View>
          )}
          {votersReligionCountChart && (
            <View style={{ width: dashboardChartWidth, padding: 4 }}>
              <VotersReligionChart
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                chartWidth={dashboardChartWidth}
              />
            </View>
          )}
          {votersCasteCountChart && (
            <View style={{ width: dashboardChartWidth, padding: 4 }}>
              <VotersCasteChart
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                chartWidth={dashboardChartWidth}
              />
            </View>
          )}
          {votersGenderCountChart && (
            <View style={{ width: dashboardChartWidth, padding: 4 }}>
              <VotersGenderChart
                navigation={navigation}
                filters={filters}
                extraData={extraData}
                refreshKey={refreshKey}
                chartWidth={dashboardChartWidth}
              />
            </View>
          )}
        </View>

        {/* Full-width Lists */}
        {voterListLiveVoting && (
          <LiveVotingVoterList
            navigation={navigation}
            filters={filters}
            isFilterSort={searchAndFilterBar}
            extraData={extraData}
          />
        )}
        {voterList && (
          <VoterList
            navigation={navigation}
            filters={filters}
            isFilterSort={searchAndFilterBar}
            extraData={extraData}
            refreshKey={refreshKey}
          />
        )}
        {voterListWithPS && (
          <VoterListWithPS navigation={navigation} filters={filters} extraData={extraData} />
        )}
        {voterListForSearch && (
          <VoterListForSearch navigation={navigation} filters={filters} extraData={extraData} />
        )}
        {voterApproachedList && (
          <VotersApproachedList navigation={navigation} filters={filters} extraData={extraData} />
        )}
        {volunteerList && (
          <VolunteerList navigation={navigation} filters={filters} extraData={extraData} />
        )}
        {volunteerListWithPS && (
          <VolunteerListWithPS navigation={navigation} filters={filters} extraData={extraData} />
        )}
        {pollingStationListWithPS && (
          <PollingStationListWithPS navigation={navigation} filters={filters} extraData={extraData} />
        )}
      </View>
    </View>
  );
}
