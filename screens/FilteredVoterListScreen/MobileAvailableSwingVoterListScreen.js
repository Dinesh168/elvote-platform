// HomeScreen.js
import React, { useMemo } from 'react';
import { View } from 'react-native';
import SingleComposite from '../../components/singlecomposite/SingleComposite';
import { INITIAL_FILTER_SORT } from '../../storemanagement/filtersort/FilterSortSlice';
import { VOTER_OPINION } from '../../constant';

export default function MobileAvailableSwingVoterListScreen({ navigation, route }) {
  return (
    <View style={{flex: 1}}>
      <SingleComposite 
        addedFilterInfoBar={true}
        voterList={true}
        navigation={navigation}
        filtersObj={{
          [INITIAL_FILTER_SORT.is_voter_mobile_number.key]: true,
          [INITIAL_FILTER_SORT.voter_opinions.key]: [VOTER_OPINION.U.VAL]
        }}
      />
    </View>
  );
};
