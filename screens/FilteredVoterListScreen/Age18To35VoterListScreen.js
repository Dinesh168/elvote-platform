// HomeScreen.js
import React from 'react';
import { View } from 'react-native';
import SingleComposite from '../../components/singlecomposite/SingleComposite';
import { INITIAL_FILTER_SORT } from '../../storemanagement/filtersort/FilterSortSlice';

export default function Age18To35VoterListScreen({ navigation, route }) {

  return (
    <View style={{flex: 1}}>
      <SingleComposite 
        addedFilterInfoBar={true}
        voterList={true}
        navigation={navigation}
        filtersObj={{
          [INITIAL_FILTER_SORT.from_voter_age.key]: 18,
          [INITIAL_FILTER_SORT.to_voter_age.key]: 35
        }}
      />
    </View>
  );
};
