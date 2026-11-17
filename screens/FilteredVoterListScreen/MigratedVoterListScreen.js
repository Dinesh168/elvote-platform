// HomeScreen.js
import React, { useMemo } from 'react';
import { View } from 'react-native';
import SingleComposite from '../../components/singlecomposite/SingleComposite';
import { INITIAL_FILTER_SORT } from '../../storemanagement/filtersort/FilterSortSlice';
import { RELIGIONS } from '../../constant';

export default function MigratedVoterListScreen({ navigation, route }) {
  return (
    <View style={{flex: 1}}>
      <SingleComposite 
        addedFilterInfoBar={true}
        voterApproachedList={true}
        navigation={navigation}
        filtersObj={{
          [INITIAL_FILTER_SORT.is_voter_migrated.key]: true
        }}
      />
    </View>
  );
};
