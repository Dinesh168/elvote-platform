import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getVotersMobileCount } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { FILTERS_LIST, INTERMEDIATE_ROUTES, ROUTES } from '../../constant';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import { THEME } from '../../theme';
import { STRINGS } from '../../strings';
import StatCard from '../ui/StatCard';

export default function VotersMobileCount({filters, navigation, style, refreshKey = 0}) {
  const dispatch = useDispatch();
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [votersCount, setVotersCount] = useState(0);
  const [votersPSData, setVotersPSData] = useState([]);
  const PollingStationsList = useGetPollingStations();

  useEffect(() => {
    setIsLoadingCount(true);
    
    dispatch(getVotersMobileCount({
      filters,
      onSuccess: (votersMobileCount) => {
        setVotersPSData(votersMobileCount)
        setVotersCount(votersMobileCount.reduce((prev, curr) => prev + parseInt(curr.count), 0));
      }, 
      onComplete: () => {
        setIsLoadingCount(false);
      }
    }))
  }, [JSON.stringify(filters), refreshKey])

  return (
    <StatCard
      count={votersCount}
      label={STRINGS.MOBILE_NUMBER_COLLECTED_CARD}
      icon="cellphone"
      accentColor={THEME.COLOR.INFO}
      isLoading={isLoadingCount}
      onPress={() => navigation.navigate(
        ROUTES.POLLING_STATIONS_LIST, {
          votersPSData, 
          nextScreen: INTERMEDIATE_ROUTES.VOTERS_APPROACHED_LIST, 
          filters: {
            ...filters,
            [FILTERS_LIST.is_voter_mobile_number]: true
          }
        }
      )}
      style={style}
    />
  );
}
