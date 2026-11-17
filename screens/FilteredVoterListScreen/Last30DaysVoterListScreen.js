// HomeScreen.js
import React, { useMemo } from 'react';
import { View } from 'react-native';
import SingleComposite from '../../components/singlecomposite/SingleComposite';
import { INITIAL_FILTER_SORT } from '../../storemanagement/filtersort/FilterSortSlice';
import Utility from '../../utils/Utility';

export default function Last30DaysVoterListScreen({ navigation, route }) {
  const last7daysTimestamps = Utility.getPastDaysFromTodayTimestamps(30);
  
  return (
    <View style={{flex: 1}}>
      <SingleComposite 
        addedFilterInfoBar={true}
        voterApproachedList={true}
        navigation={navigation}
        filtersObj={{
          [INITIAL_FILTER_SORT.from_epoch.key]: last7daysTimestamps.startTime,
          [INITIAL_FILTER_SORT.to_epoch.key]: last7daysTimestamps.endTime
        }}
      />
    </View>
  );
};
