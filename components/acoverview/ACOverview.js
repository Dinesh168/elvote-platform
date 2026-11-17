import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOOTH_STRENGTH, FILTERS_LIST, INTERMEDIATE_ROUTES, LIST_TYPE, ROUTES, VOTER_OPINION } from '../../constant';
import { STRINGS } from '../../strings';
import { THEME } from '../../theme';
import { useDispatch, useSelector } from 'react-redux';
import { componentKey as initSliceComponentKey } from '../../storemanagement/initscreen/InitSlice';
import { getTotalAddressCount, getTotalVotersCount, getVotersCount, getVotersMigratedCount, getVotersMobileCount } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { getUsersCount } from '../../storemanagement/usersmanagement/UsersManagementSaga';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import useResponsive from '../../utils/hooks/useResponsive';
import VotersApproachedCountChart from '../votersapproachedchart/VotersApproachedCountChart';

const SECTION_COLORS = [
  { accent: THEME.COLOR.PRIMARY, bg: THEME.COLOR.PRIMARY_BACKGROUND },
  { accent: THEME.COLOR.ACCENT, bg: THEME.COLOR.ACCENT_BACKGROUND },
  { accent: THEME.COLOR.WARNING, bg: THEME.COLOR.WARNING_BACKGROUND },
  { accent: THEME.COLOR.SUCCESS, bg: THEME.COLOR.SUCCESS_BACKGROUND },
];

// Maps each stat row to a stable key so we don't dispatch by label string comparison
const STAT_KEY = {
  VOTERS: 'VOTERS',
  CONTACTED: 'CONTACTED',
  NOT_CONTACTED: 'NOT_CONTACTED',
  OUR: 'OUR',
  OPP: 'OPP',
  SWING: 'SWING',
  MIGRATED: 'MIGRATED',
  MOBILE: 'MOBILE',
  OUR_MOB: 'OUR_MOB',
  OPP_MOB: 'OPP_MOB',
  SWING_MOB: 'SWING_MOB',
  PS_TOTAL: 'PS_TOTAL',
  PS_STRONG: 'PS_STRONG',
  PS_MODERATE: 'PS_MODERATE',
  PS_WEAK: 'PS_WEAK',
  PS_WITH_WORKERS: 'PS_WITH_WORKERS',
  PS_WITHOUT_WORKERS: 'PS_WITHOUT_WORKERS',
  HOUSES_TOTAL: 'HOUSES_TOTAL',
  HOUSES_VISITED: 'HOUSES_VISITED',
  OUR_HOUSES: 'OUR_HOUSES',
  OPP_HOUSES: 'OPP_HOUSES',
  SWING_HOUSES: 'SWING_HOUSES',
};

const initialCounts = Object.fromEntries(Object.values(STAT_KEY).map(k => [k, 0]));
const initialLoading = Object.fromEntries(Object.values(STAT_KEY).map(k => [k, true]));

const ACOverview = ({ navigation, filters, refreshKey = 0 }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { userDetails } = useSelector(state => state[initSliceComponentKey]);
  const { columns, gridItemWidth, containerStyle, responsiveValue, dashboardChartWidth } = useResponsive();
  const pollingStations = useGetPollingStations();

  const [counts, setCounts] = useState(initialCounts);
  const [loading, setLoading] = useState(initialLoading);

  // Per-PS data for house rows (needed for navigation routeParams)
  const [totalHousesPSCount, setTotalHousesPSCount] = useState([]);
  const [housesVisitedPSCount, setHousesVisitedPSCount] = useState([]);
  const [ourHousesPSCount, setOurHousesPSCount] = useState([]);
  const [oppHousesPSCount, setOppHousesPSCount] = useState([]);
  const [swingHousesPSCount, setSwingHousesPSCount] = useState([]);
  const [volunteersInPs, setVolunteersInPs] = useState([]);

  const [votersPSData, setVotersPSData] = useState([]);
  const [contactedVotersPSData, setContactedVotersPSData] = useState([]);
  const [notContactedVotersPSData, setNotContactedVotersPSData] = useState([]);
  const [ourVotersPSData, setOurVotersPSData] = useState([]);
  const [oppVotersPSData, setOppVotersPSData] = useState([]);
  const [swingVotersPSData, setSwingVotersPSData] = useState([]);
  const [migratedVotersPSData, setMigratedVotersPSData] = useState([]);
  const [mobileAvailableVotersPSData, setMobileAvailableVotersPSData] = useState([]);
  const [ourVotersMobAvailablePSData, setOurVotersMobAvailablePSData] = useState([]);
  const [oppVotersMobAvailablePSData, setOppVotersMobAvailablePSData] = useState([]);
  const [swingVotersMobAvailablePSData, setSwingVotersMobAvailablePSData] = useState([]);
  const [psWithoutWorkersPSData, setPsWithoutWorkersPSData] = useState([]);

  const filtersKey = JSON.stringify(filters);

  const setCount = (key, value) =>
    setCounts(prev => ({ ...prev, [key]: value }));
  const setLoad = (key, value) =>
    setLoading(prev => ({ ...prev, [key]: value }));

  // --- Total voters ---
  useEffect(() => {
    setLoad(STAT_KEY.VOTERS, true);
    dispatch(getTotalVotersCount({
      filters: { ...filters, [FILTERS_LIST.list_type]: LIST_TYPE.TOTAL_VOTERS },
      onSuccess: data => {
        setVotersPSData(data);
        setCount(STAT_KEY.VOTERS, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.VOTERS, false),
    }));
  }, [filtersKey, refreshKey]);

  // --- Contacted voters ---
  useEffect(() => {
    setLoad(STAT_KEY.CONTACTED, true);
    dispatch(getVotersCount({
      filters: { ...filters, [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS },
      onSuccess: data => {
        setContactedVotersPSData(data);
        setCount(STAT_KEY.CONTACTED, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.CONTACTED, false),
    }));
  }, [filtersKey, refreshKey]);

  // Reset NOT_CONTACTED to loading whenever filters/refresh changes
  useEffect(() => {
    setLoad(STAT_KEY.NOT_CONTACTED, true);
  }, [filtersKey, refreshKey]);

  // --- Not contacted: derived after both parents load, never negative ---
  useEffect(() => {
    if (loading[STAT_KEY.VOTERS] || loading[STAT_KEY.CONTACTED]) return;
    setNotContactedVotersPSData(votersPSData.map(item => ({
      ...item,
      count: item.count - (contactedVotersPSData.find(c => c.polling_station_id === item.polling_station_id)?.count || 0)
    })));
    setCount(STAT_KEY.NOT_CONTACTED, Math.max(0, counts[STAT_KEY.VOTERS] - counts[STAT_KEY.CONTACTED]));
    setLoad(STAT_KEY.NOT_CONTACTED, false);
  }, [counts[STAT_KEY.VOTERS], counts[STAT_KEY.CONTACTED], loading[STAT_KEY.VOTERS], loading[STAT_KEY.CONTACTED]]);

  // --- Opinion counts ---
  useEffect(() => {
    setLoad(STAT_KEY.OUR, true);
    dispatch(getVotersCount({
      filters: { ...filters, [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS, [FILTERS_LIST.voter_opinions]: [VOTER_OPINION.P.VAL] },
      onSuccess: data => {
        setOurVotersPSData(data);
        setCount(STAT_KEY.OUR, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.OUR, false),
    }));
  }, [filtersKey, refreshKey]);

  useEffect(() => {
    setLoad(STAT_KEY.OPP, true);
    dispatch(getVotersCount({
      filters: { ...filters, [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS, [FILTERS_LIST.voter_opinions]: [VOTER_OPINION.N.VAL] },
      onSuccess: data => {
        setOppVotersPSData(data);
        setCount(STAT_KEY.OPP, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.OPP, false),
    }));
  }, [filtersKey, refreshKey]);

  useEffect(() => {
    setLoad(STAT_KEY.SWING, true);
    dispatch(getVotersCount({
      filters: { ...filters, [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS, [FILTERS_LIST.voter_opinions]: [VOTER_OPINION.U.VAL] },
      onSuccess: data => {
        setSwingVotersPSData(data);
        setCount(STAT_KEY.SWING, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.SWING, false),
    }));
  }, [filtersKey, refreshKey]);

  // --- Migrated ---
  useEffect(() => {
    setLoad(STAT_KEY.MIGRATED, true);
    dispatch(getVotersMigratedCount({
      filters,
      onSuccess: data => {
        setMigratedVotersPSData(data);
        setCount(STAT_KEY.MIGRATED, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.MIGRATED, false),
    }));
  }, [filtersKey, refreshKey]);

  // --- Mobile counts ---
  useEffect(() => {
    setLoad(STAT_KEY.MOBILE, true);
    dispatch(getTotalVotersCount({
      filters: { ...filters, [FILTERS_LIST.is_voter_mobile_number]: true },
      onSuccess: data => {
        setMobileAvailableVotersPSData(data);
        setCount(STAT_KEY.MOBILE, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.MOBILE, false),
    }));
  }, [filtersKey, refreshKey]);

  useEffect(() => {
    setLoad(STAT_KEY.OUR_MOB, true);
    dispatch(getVotersMobileCount({
      filters: { ...filters, [FILTERS_LIST.voter_opinions]: [VOTER_OPINION.P.VAL] },
      onSuccess: data => {
        setOurVotersMobAvailablePSData(data);
        setCount(STAT_KEY.OUR_MOB, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.OUR_MOB, false),
    }));
  }, [filtersKey, refreshKey]);

  useEffect(() => {
    setLoad(STAT_KEY.OPP_MOB, true);
    dispatch(getVotersMobileCount({
      filters: { ...filters, [FILTERS_LIST.voter_opinions]: [VOTER_OPINION.N.VAL] },
      onSuccess: data => {
        setOppVotersMobAvailablePSData(data);
        setCount(STAT_KEY.OPP_MOB, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.OPP_MOB, false),
    }));
  }, [filtersKey, refreshKey]);

  useEffect(() => {
    setLoad(STAT_KEY.SWING_MOB, true);
    dispatch(getVotersMobileCount({
      filters: { ...filters, [FILTERS_LIST.voter_opinions]: [VOTER_OPINION.U.VAL] },
      onSuccess: data => {
        setSwingVotersMobAvailablePSData(data);
        setCount(STAT_KEY.SWING_MOB, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.SWING_MOB, false),
    }));
  }, [filtersKey, refreshKey]);

  // --- Polling station counts (sync from pollingStations array) ---
  useEffect(() => {
    setLoad(STAT_KEY.PS_TOTAL, true);
    setCount(STAT_KEY.PS_TOTAL, pollingStations.length);
    setLoad(STAT_KEY.PS_TOTAL, false);

    setLoad(STAT_KEY.PS_STRONG, true);
    setCount(STAT_KEY.PS_STRONG, pollingStations.filter(ps => ps.booth_strength === BOOTH_STRENGTH.S.VAL).length);
    setLoad(STAT_KEY.PS_STRONG, false);

    setLoad(STAT_KEY.PS_MODERATE, true);
    setCount(STAT_KEY.PS_MODERATE, pollingStations.filter(ps => ps.booth_strength === BOOTH_STRENGTH.M.VAL).length);
    setLoad(STAT_KEY.PS_MODERATE, false);

    setLoad(STAT_KEY.PS_WEAK, true);
    setCount(STAT_KEY.PS_WEAK, pollingStations.filter(ps => ps.booth_strength === BOOTH_STRENGTH.W.VAL).length);
    setLoad(STAT_KEY.PS_WEAK, false);
  }, [pollingStations.length, filtersKey, refreshKey]);

  // --- PS with/without workers ---
  useEffect(() => {
    setLoad(STAT_KEY.PS_WITH_WORKERS, true);
    setLoad(STAT_KEY.PS_WITHOUT_WORKERS, true);
    dispatch(getUsersCount({
      filters,
      onSuccess: data => {
        setVolunteersInPs(data);
        setPsWithoutWorkersPSData(data.filter(item => parseInt(item.count) === 0).map(item => ({ polling_station_id: item.polling_station_id, count: 0 })));
        const withWorkers = data.filter(item => parseInt(item.count) > 0).length;
        setCount(STAT_KEY.PS_WITH_WORKERS, withWorkers);
        setCount(STAT_KEY.PS_WITHOUT_WORKERS, Math.max(0, pollingStations.length - withWorkers));
      },
      onComplete: () => {
        setLoad(STAT_KEY.PS_WITH_WORKERS, false);
        setLoad(STAT_KEY.PS_WITHOUT_WORKERS, false);
      },
    }));
  }, [filtersKey, refreshKey, pollingStations.length]);

  // --- House counts ---
  useEffect(() => {
    setLoad(STAT_KEY.HOUSES_TOTAL, true);
    dispatch(getTotalAddressCount({
      filters,
      onSuccess: data => {
        setTotalHousesPSCount(data);
        setCount(STAT_KEY.HOUSES_TOTAL, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.HOUSES_TOTAL, false),
    }));
  }, [filtersKey, refreshKey]);

  useEffect(() => {
    setLoad(STAT_KEY.HOUSES_VISITED, true);
    dispatch(getTotalAddressCount({
      filters: { ...filters, [FILTERS_LIST.is_voter_approached]: true },
      onSuccess: data => {
        setHousesVisitedPSCount(data);
        setCount(STAT_KEY.HOUSES_VISITED, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.HOUSES_VISITED, false),
    }));
  }, [filtersKey, refreshKey]);

  useEffect(() => {
    setLoad(STAT_KEY.OUR_HOUSES, true);
    dispatch(getTotalAddressCount({
      filters: { ...filters, [FILTERS_LIST.voter_opinions]: [VOTER_OPINION.P.VAL] },
      onSuccess: data => {
        setOurHousesPSCount(data);
        setCount(STAT_KEY.OUR_HOUSES, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.OUR_HOUSES, false),
    }));
  }, [filtersKey, refreshKey]);

  useEffect(() => {
    setLoad(STAT_KEY.OPP_HOUSES, true);
    dispatch(getTotalAddressCount({
      filters: { ...filters, [FILTERS_LIST.voter_opinions]: [VOTER_OPINION.N.VAL] },
      onSuccess: data => {
        setOppHousesPSCount(data);
        setCount(STAT_KEY.OPP_HOUSES, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.OPP_HOUSES, false),
    }));
  }, [filtersKey, refreshKey]);

  useEffect(() => {
    setLoad(STAT_KEY.SWING_HOUSES, true);
    dispatch(getTotalAddressCount({
      filters: { ...filters, [FILTERS_LIST.voter_opinions]: [VOTER_OPINION.U.VAL] },
      onSuccess: data => {
        setSwingHousesPSCount(data);
        setCount(STAT_KEY.SWING_HOUSES, data.reduce((s, r) => s + parseInt(r.count), 0));
      },
      onComplete: () => setLoad(STAT_KEY.SWING_HOUSES, false),
    }));
  }, [filtersKey, refreshKey]);

  const gap = THEME.SPACING.MD;
  const itemWidth = gridItemWidth(gap, columns, responsiveValue(THEME.SPACING.LG, THEME.SPACING.XL, THEME.SPACING.XXL));

  const initials = (userDetails?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');

  // Each row knows its stat key and navigation target
  // routeParams that depend on async state are built at press time via closures, not at render time
  const gridItems = useMemo(() => [
    {
      heading: STRINGS.AC_OVERVIEW_VOTERS_SECTION ?? 'Voters',
      group: [
        { statKey: STAT_KEY.VOTERS,     label: STRINGS.AC_OVERVIEW_TOTAL_VOTERS_LABEL,        onPress: () => navigation.navigate(ROUTES.VOTERS_LIST_WITH_PS, { filters }) },
        { statKey: STAT_KEY.CONTACTED,  label: STRINGS.AC_OVERVIEW_CONTACTED_VOTERS_LABEL,    onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, { votersPSData: contactedVotersPSData, filters: { ...filters, [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS }, nextScreen: INTERMEDIATE_ROUTES.VOTERS_APPROACHED_LIST }) },
        { statKey: STAT_KEY.NOT_CONTACTED, label: STRINGS.AC_OVERVIEW_NOT_CONTACTED_VOTERS_LABEL, onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, { votersPSData: notContactedVotersPSData, filters: { ...filters, [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS }, nextScreen: INTERMEDIATE_ROUTES.VOTERS_UNAPPROACHED_LIST }) },
        { statKey: STAT_KEY.OUR,        label: STRINGS.AC_OVERVIEW_OUR_VOTERS_LABEL,           onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, { votersPSData: ourVotersPSData, filters: { ...filters }, nextScreen: INTERMEDIATE_ROUTES.POSITIVE_OPINION_VOTERS }) },
        { statKey: STAT_KEY.OPP,        label: STRINGS.AC_OVERVIEW_OPPOSITION_VOTERS_LABEL,    onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, { votersPSData: oppVotersPSData, filters: { ...filters }, nextScreen: INTERMEDIATE_ROUTES.NEGATIVE_OPINION_VOTERS }) },
        { statKey: STAT_KEY.SWING,      label: STRINGS.AC_OVERVIEW_SWING_VOTERS_LABEL,         onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, { votersPSData: swingVotersPSData, filters: { ...filters }, nextScreen: INTERMEDIATE_ROUTES.UNDECIDED_OPINION_VOTERS }) },
        { statKey: STAT_KEY.MIGRATED,   label: STRINGS.AC_OVERVIEW_MIGRATED_VOTERS_LABEL,      onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, { votersPSData: migratedVotersPSData, filters: { ...filters }, nextScreen: INTERMEDIATE_ROUTES.MIGRATED_VOTERS_SCREEN }) },
        { statKey: STAT_KEY.MOBILE,     label: STRINGS.AC_OVERVIEW_MOBILE_NUMBERS_LABEL,       onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, { votersPSData: mobileAvailableVotersPSData, filters: { ...filters }, nextScreen: INTERMEDIATE_ROUTES.MOBILE_AVAILABLE_VOTERS }) },
        { statKey: STAT_KEY.OUR_MOB,    label: STRINGS.AC_OVERVIEW_OUR_VOTERS_MOB_NO_LABEL,    onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, { votersPSData: ourVotersMobAvailablePSData, filters: { ...filters }, nextScreen: INTERMEDIATE_ROUTES.MOBILE_AVAILABLE_OUR_VOTERS }) },
        { statKey: STAT_KEY.OPP_MOB,    label: STRINGS.AC_OVERVIEW_OPPOSITION_VOTERS_MOB_NO_LABEL, onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, { votersPSData: oppVotersMobAvailablePSData, filters: { ...filters }, nextScreen: INTERMEDIATE_ROUTES.MOBILE_AVAILABLE_OPP_VOTERS }) },
        { statKey: STAT_KEY.SWING_MOB,  label: STRINGS.AC_OVERVIEW_SWING_VOTERS_MOB_NO_LABEL,  onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, { votersPSData: swingVotersMobAvailablePSData, filters: { ...filters }, nextScreen: INTERMEDIATE_ROUTES.MOBILE_AVAILABLE_SWING_VOTERS }) },
      ],
    },
    {
      heading: STRINGS.AC_OVERVIEW_PS_SECTION ?? 'Polling Stations',
      group: [
        {
          statKey: STAT_KEY.PS_TOTAL, label: STRINGS.AC_OVERVIEW_POLLING_STATION_LABEL,
          onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, {
            votersPSData,
            nextScreen: INTERMEDIATE_ROUTES.ALL_POLLING_STATION_DATA,
          }),
        },
        {
          statKey: STAT_KEY.PS_STRONG, label: STRINGS.AC_OVERVIEW_STRONG_PS_LABEL,
          onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, {
            votersPSData: votersPSData.filter(item => pollingStations.find(ps => ps.id === item.polling_station_id)?.booth_strength === BOOTH_STRENGTH.S.VAL),
            defaultBoothStrengthFilter: [BOOTH_STRENGTH.S.VAL],
            nextScreen: INTERMEDIATE_ROUTES.ALL_POLLING_STATION_DATA,
          }),
        },
        {
          statKey: STAT_KEY.PS_MODERATE, label: STRINGS.AC_OVERVIEW_MODERATE_PS_LABEL,
          onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, {
            votersPSData: votersPSData.filter(item => pollingStations.find(ps => ps.id === item.polling_station_id)?.booth_strength === BOOTH_STRENGTH.M.VAL),
            defaultBoothStrengthFilter: [BOOTH_STRENGTH.M.VAL],
            nextScreen: INTERMEDIATE_ROUTES.ALL_POLLING_STATION_DATA,
          }),
        },
        {
          statKey: STAT_KEY.PS_WEAK, label: STRINGS.AC_OVERVIEW_WEAK_PS_LABEL,
          onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, {
            votersPSData: votersPSData.filter(item => pollingStations.find(ps => ps.id === item.polling_station_id)?.booth_strength === BOOTH_STRENGTH.W.VAL),
            defaultBoothStrengthFilter: [BOOTH_STRENGTH.W.VAL],
            nextScreen: INTERMEDIATE_ROUTES.ALL_POLLING_STATION_DATA,
          }),
        },
        {
          statKey: STAT_KEY.PS_WITH_WORKERS, label: STRINGS.AC_OVERVIEW_PS_WITH_WORKERS_LABEL,
          onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, {
            votersPSData: volunteersInPs.filter(item => parseInt(item.count) > 0),
            includeAllPollingStations: false,
            nextScreen: INTERMEDIATE_ROUTES.VOLUNTEERS_LIST,
          }),
        },
        {
          statKey: STAT_KEY.PS_WITHOUT_WORKERS, label: STRINGS.AC_OVERVIEW_PS_WITHOUT_WORKERS_LABEL,
          onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, {
            votersPSData: psWithoutWorkersPSData,
            nextScreen: INTERMEDIATE_ROUTES.VOLUNTEERS_LIST,
          }),
        },
      ],
    },
    {
      heading: STRINGS.AC_OVERVIEW_HOUSES_SECTION ?? 'Houses',
      group: [
        {
          statKey: STAT_KEY.HOUSES_TOTAL, label: STRINGS.AC_OVERVIEW_TOTAL_HOUSES_LABEL,
          onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, {
            votersPSData: totalHousesPSCount, nextScreen: INTERMEDIATE_ROUTES.VOTER_HOUSE_LIST,
          }),
        },
        {
          statKey: STAT_KEY.HOUSES_VISITED, label: STRINGS.AC_OVERVIEW_HOUSE_VISITED_LABEL,
          onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, {
            votersPSData: housesVisitedPSCount,
            filters: { ...filters, [FILTERS_LIST.is_voter_approached]: true },
            nextScreen: INTERMEDIATE_ROUTES.VOTER_HOUSE_LIST,
          }),
        },
        {
          statKey: STAT_KEY.OUR_HOUSES, label: STRINGS.AC_OVERVIEW_OUR_HOUSES_LABEL,
          onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, {
            votersPSData: ourHousesPSCount,
            filters: { ...filters, [FILTERS_LIST.voter_opinions]: [VOTER_OPINION.P.VAL] },
            nextScreen: INTERMEDIATE_ROUTES.VOTER_HOUSE_LIST,
          }),
        },
        {
          statKey: STAT_KEY.OPP_HOUSES, label: STRINGS.AC_OVERVIEW_OPPOSITION_HOUSES_LABEL,
          onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, {
            votersPSData: oppHousesPSCount,
            filters: { ...filters, [FILTERS_LIST.voter_opinions]: [VOTER_OPINION.N.VAL] },
            nextScreen: INTERMEDIATE_ROUTES.VOTER_HOUSE_LIST,
          }),
        },
        {
          statKey: STAT_KEY.SWING_HOUSES, label: STRINGS.AC_OVERVIEW_SWING_HOUSES_LABEL,
          onPress: () => navigation.navigate(ROUTES.POLLING_STATIONS_LIST, {
            votersPSData: swingHousesPSCount,
            filters: { ...filters, [FILTERS_LIST.voter_opinions]: [VOTER_OPINION.U.VAL] },
            nextScreen: INTERMEDIATE_ROUTES.VOTER_HOUSE_LIST,
          }),
        },
      ],
    },
  ], [
    pollingStations,
    volunteersInPs,
    totalHousesPSCount,
    housesVisitedPSCount,
    ourHousesPSCount,
    oppHousesPSCount,
    swingHousesPSCount,
    votersPSData,
    contactedVotersPSData,
    notContactedVotersPSData,
    ourVotersPSData,
    oppVotersPSData,
    swingVotersPSData,
    migratedVotersPSData,
    mobileAvailableVotersPSData,
    ourVotersMobAvailablePSData,
    oppVotersMobAvailablePSData,
    swingVotersMobAvailablePSData,
    psWithoutWorkersPSData,
    filters,
    navigation,
  ]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: THEME.SPACING.XXXL + insets.bottom },
        ]}
        showsVerticalScrollIndicator={true}
      >
        <View style={[containerStyle, { paddingHorizontal: 0 }]}>
          <View style={styles.welcomeSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.welcomeTitle}>
              {STRINGS.MENU_PAGE_WELCOME_TITLE} {userDetails?.name ?? ''}
            </Text>
          </View>

          {gridItems.map((section, sectionIndex) => {
            const sColor = SECTION_COLORS[sectionIndex % SECTION_COLORS.length];
            return (
              <View key={sectionIndex} style={styles.section}>
                {!!section.heading && (
                  <View style={[styles.sectionHeader, { borderLeftColor: sColor.accent }]}>
                    <Text style={[styles.title, { color: sColor.accent }]}>{section.heading}</Text>
                  </View>
                )}

                <View style={[
                  styles.gridContainer,
                  { gap, paddingHorizontal: responsiveValue(THEME.SPACING.LG, THEME.SPACING.XL, THEME.SPACING.XXL) },
                ]}>
                  {section.group.map((item, itemIndex) => (
                    <Pressable
                      key={itemIndex}
                      onPress={item.onPress}
                      style={({ pressed, hovered }) => [
                        { opacity: pressed ? THEME.OPACITY.PRESSED : 1 },
                        hovered ? { transform: [{ scale: 1.02 }] } : {},
                      ]}
                    >
                      <View style={[styles.statBox, { width: itemWidth, borderLeftColor: sColor.accent }]}>
                        {loading[item.statKey] ? (
                          <ActivityIndicator size="small" color={sColor.accent} />
                        ) : (
                          <Text style={[styles.statCount, { color: sColor.accent }]}>
                            {(counts[item.statKey] ?? 0).toLocaleString()}
                          </Text>
                        )}
                        <Text style={styles.statText} numberOfLines={2}>{item.label}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}

          {/* Daily trend chart — scrolls naturally at the bottom of the page */}
          <View style={{ width: '100%', paddingHorizontal: responsiveValue(THEME.SPACING.LG, THEME.SPACING.XL, THEME.SPACING.XXL) }}>
            <VotersApproachedCountChart
              navigation={navigation}
              filters={filters}
              refreshKey={refreshKey}
              chartWidth={dashboardChartWidth}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
    paddingTop: THEME.SPACING.XL,
    paddingBottom: THEME.SPACING.LG,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.COLOR.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.SPACING.MD,
    ...THEME.SHADOW.MEDIUM,
  },
  avatarText: {
    fontSize: THEME.FONT_SIZE.XXL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.TEXT_INVERSE,
  },
  welcomeTitle: {
    fontSize: THEME.FONT_SIZE.XL,
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    textAlign: 'center',
  },
  section: {
    marginBottom: THEME.SPACING.XL,
    width: '100%',
  },
  sectionHeader: {
    borderLeftWidth: 4,
    paddingVertical: THEME.SPACING.SM,
    paddingHorizontal: THEME.SPACING.LG,
    marginHorizontal: THEME.SPACING.LG,
    marginBottom: THEME.SPACING.SM,
    backgroundColor: THEME.COLOR.SURFACE_ELEVATED,
    borderRadius: THEME.BORDER_RADIUS.SM,
  },
  title: {
    fontSize: THEME.FONT_SIZE.MD,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statBox: {
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.MD,
    paddingVertical: THEME.SPACING.LG,
    paddingHorizontal: THEME.SPACING.MD,
    alignItems: 'center',
    borderLeftWidth: 3,
    minHeight: 100,
    justifyContent: 'center',
    ...THEME.SHADOW.LIGHT,
  },
  statCount: {
    fontSize: THEME.FONT_SIZE.XXL,
    fontWeight: THEME.FONT_WEIGHT.EXTRABOLD,
    textAlign: 'center',
  },
  statText: {
    fontSize: THEME.FONT_SIZE.XS,
    color: THEME.COLOR.TEXT_SECONDARY,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
    textAlign: 'center',
    marginTop: THEME.SPACING.XS,
  },
});

export default ACOverview;
