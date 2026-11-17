// HomeScreen.js
import React, { useMemo } from 'react';
import { View } from 'react-native';
import SingleComposite from '../../components/singlecomposite/SingleComposite';
import { INITIAL_FILTER_SORT } from '../../storemanagement/filtersort/FilterSortSlice';
import { RELIGIONS, VOTER_OPINION } from '../../constant';

export default function NegativeOpinionVoterListScreen({ navigation, route }) {
  return (
    <View style={{flex: 1}}>
      <SingleComposite 
        addedFilterInfoBar={true}
        voterList={true}
        navigation={navigation}
        filtersObj={{
          [INITIAL_FILTER_SORT.voter_opinions.key]: [VOTER_OPINION.N.VAL]
        }}
      />
    </View>
  );
};
