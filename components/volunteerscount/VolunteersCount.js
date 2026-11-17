import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getUsersCount } from '../../storemanagement/usersmanagement/UsersManagementSaga';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import { FILTERS_LIST, INTERMEDIATE_ROUTES, LIST_TYPE, ROUTES } from '../../constant';
import { THEME } from '../../theme';
import { STRINGS } from '../../strings';
import StatCard from '../ui/StatCard';

export default function VolunteersCount({ filters, navigation, style, refreshKey = 0 }) {
  const dispatch = useDispatch();
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [volunteersCount, setVolunteersCount] = useState(0);
  const [votersPSData, setVotersPSData] = useState([]);
  const PollingStationsList = useGetPollingStations();

  useEffect(() => {
    setIsLoadingCount(true);
    
    dispatch(getUsersCount({
      filters,
      onSuccess: (volunteersCount) => {
        setVotersPSData(volunteersCount)
        setVolunteersCount(volunteersCount.reduce((prev, curr) => prev + parseInt(curr.count), 0));
      }, 
      onComplete: () => {
        setIsLoadingCount(false);
      }
    }))
  }, [JSON.stringify(filters), refreshKey])

  return (
    <StatCard
      count={volunteersCount}
      label={STRINGS.TOTAL_VOLUNTEERS_CARD}
      icon="account-multiple"
      accentColor={THEME.COLOR.WARNING}
      isLoading={isLoadingCount}
      onPress={() => navigation.navigate(
        ROUTES.POLLING_STATIONS_LIST, 
        {
          votersPSData, 
          nextScreen: INTERMEDIATE_ROUTES.VOLUNTEERS_LIST, 
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
