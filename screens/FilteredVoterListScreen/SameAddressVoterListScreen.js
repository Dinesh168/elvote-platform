// HomeScreen.js
import React from 'react';
import { View } from 'react-native';
import SingleComposite from '../../components/singlecomposite/SingleComposite';
import { INITIAL_FILTER_SORT } from '../../storemanagement/filtersort/FilterSortSlice';

export default function SameAddressVoterListScreen({ navigation, route }) {

  return (
    <View style={{flex: 1}}>
      <SingleComposite 
        addedFilterInfoBar={true}
        voterList={true}
        navigation={navigation}
        filtersObj={{
          [INITIAL_FILTER_SORT.voter_address.key]: route?.params?.filters?.voter_address
        }}
      />
    </View>
  );
};
