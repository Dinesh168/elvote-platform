import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getVotersCount } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import Utility from '../../utils/Utility';
import { FILTERS_LIST, INTERMEDIATE_ROUTES, LIST_TYPE, ROUTES } from '../../constant';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import { THEME } from '../../theme';
import { STRINGS } from '../../strings';
import StatCard from '../ui/StatCard';

export default function VotersApproachedToday({ navigation, filters, style, refreshKey = 0 }) {
  const dispatch = useDispatch();
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [votersCount, setVotersCount] = useState(0);
  const [votersPSData, setVotersPSData] = useState([]);
  const pollingStationsList = useGetPollingStations();

  const { startTime, endTime } = Utility.currentDayTimestamps();

  useEffect(() => {
    setIsLoadingCount(true);
    
    dispatch(getVotersCount({
      filters: {
        ...filters,
        [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS,
        [FILTERS_LIST.from_epoch]: startTime,
        [FILTERS_LIST.to_epoch]: endTime
      },
      onSuccess: (voters_count) => {
        setVotersPSData(voters_count)
        setVotersCount(voters_count.reduce((prev, curr) => prev + parseInt(curr.count), 0));
      }, 
      onComplete: () => {
        setIsLoadingCount(false);
      }
    }))
  }, [JSON.stringify(filters), refreshKey])

  return (
    <StatCard
      count={votersCount}
      label={STRINGS.VOTERS_APPROACHED_TODAY_CARD}
      icon="account-clock"
      accentColor={THEME.COLOR.ACCENT}
      isLoading={isLoadingCount}
      onPress={() => navigation.navigate(
        ROUTES.POLLING_STATIONS_LIST, 
        {
          votersPSData, 
          nextScreen: INTERMEDIATE_ROUTES.VOTERS_APPROACHED_LIST, 
          filters: {
            ...filters,
            [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS,
            [FILTERS_LIST.from_epoch]: startTime,
            [FILTERS_LIST.to_epoch]: endTime
          }
        }
      )}
      style={style}
    />
  );
}
