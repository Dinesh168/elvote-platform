import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getVotersCount } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import { FILTERS_LIST, INTERMEDIATE_ROUTES, LIST_TYPE, ROUTES } from '../../constant';
import { THEME } from '../../theme';
import { STRINGS } from '../../strings';
import StatCard from '../ui/StatCard';

export default function VotersApproachedTotal({ navigation, filters, style, refreshKey = 0 }) {
  const dispatch = useDispatch();
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [votersCount, setVotersCount] = useState(0);
  const [votersPSData, setVotersPSData] = useState([]);
  const PollingStationsList = useGetPollingStations();

  useEffect(() => {
    setIsLoadingCount(true);
    
    dispatch(getVotersCount({
      filters: {
        ...filters,
        [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS
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
      label={STRINGS.TOTAL_VOTERS_APPROACHED_CARD}
      icon="account-check"
      accentColor={THEME.COLOR.PRIMARY}
      isLoading={isLoadingCount}
      onPress={() => navigation.navigate(
        ROUTES.POLLING_STATIONS_LIST, 
        {
          votersPSData, 
          nextScreen: INTERMEDIATE_ROUTES.VOTERS_APPROACHED_LIST, 
          filters: {
            ...filters,
            [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS
          }
        }
      )}
      style={style}
    />
  );
}
