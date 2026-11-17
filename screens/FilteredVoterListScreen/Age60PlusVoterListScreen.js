// HomeScreen.js
import React from 'react';
import { View } from 'react-native';
import { INITIAL_FILTER_SORT } from '../../storemanagement/filtersort/FilterSortSlice';
import SingleComposite from '../../components/singlecomposite/SingleComposite';

export default function Age60PlusVoterListScreen({ navigation, route }) {

  return (
    <View style={{flex: 1}}>
      <SingleComposite 
        addedFilterInfoBar={true}
        voterList={true}
        navigation={navigation}
        filtersObj={{
          [INITIAL_FILTER_SORT.from_voter_age.key]: 60,
          [INITIAL_FILTER_SORT.to_voter_age.key]: 150
        }}
      />
    </View>
  );
};
