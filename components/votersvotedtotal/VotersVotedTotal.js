import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getVotersVotedCount } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import { FILTERS_LIST, INTERMEDIATE_ROUTES, LIST_TYPE, ROUTES } from '../../constant';
import { THEME } from '../../theme';
import { STRINGS } from '../../strings';
import StatCard from '../ui/StatCard';

export default function VotersVotedTotal({ navigation, filters, style, refreshKey = 0 }) {
  const dispatch = useDispatch();
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [votersCount, setVotersCount] = useState(0);
  const [votersPSData, setVotersPSData] = useState([]);
  const PollingStationsList = useGetPollingStations();

  useEffect(() => {
    setIsLoadingCount(true);
    
    dispatch(getVotersVotedCount({
      filters: {
        ...filters,
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
      label={STRINGS.TOTAL_VOTERS_VOTED_CARD}
      icon="vote"
      accentColor={THEME.COLOR.SUCCESS}
      isLoading={isLoadingCount}
      onPress={() => navigation.navigate(
        ROUTES.POLLING_STATIONS_LIST, 
        {
          votersPSData, 
          nextScreen: INTERMEDIATE_ROUTES.LIVE_VOTING_VOTERS_LIST, 
          filters: {
            ...filters,
          }
        }
      )}
      style={style}
    />
  );
}
