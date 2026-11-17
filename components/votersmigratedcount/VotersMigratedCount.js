import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getVotersMigratedCount } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { FILTERS_LIST, INTERMEDIATE_ROUTES, ROUTES } from '../../constant';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import { THEME } from '../../theme';
import { STRINGS } from '../../strings';
import StatCard from '../ui/StatCard';

export default function VotersMigratedCount({filters, navigation, style, refreshKey = 0}) {
  const dispatch = useDispatch();
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [votersMigratedCount, setVotersMigratedCount] = useState(0);
  const [votersPSData, setVotersPSData] = useState([]);

  useEffect(() => {
    setIsLoadingCount(true);
    
    dispatch(getVotersMigratedCount({
      filters,
      onSuccess: (votersMigratedCount) => {
        setVotersPSData(votersMigratedCount)
        setVotersMigratedCount(votersMigratedCount.reduce((prev, curr) => prev + parseInt(curr.count), 0));
      }, 
      onComplete: () => {
        setIsLoadingCount(false);
      }
    }))
  }, [JSON.stringify(filters), refreshKey])

  return (
    <StatCard
      count={votersMigratedCount}
      label={STRINGS.VOTERS_MIGRATED_CARD}
      icon="airplane"
      accentColor={THEME.COLOR.ACCENT_LIGHT}
      isLoading={isLoadingCount}
      onPress={() => navigation.navigate(
        ROUTES.POLLING_STATIONS_LIST, {
          votersPSData, 
          nextScreen: INTERMEDIATE_ROUTES.VOTERS_APPROACHED_LIST, 
          filters: {
            ...filters,
            [FILTERS_LIST.is_voter_migrated]: true
          }
        }
      )}
      style={style}
    />
  );
}
