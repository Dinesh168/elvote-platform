// HomeScreen.js
import React, { useMemo } from 'react';
import { View } from 'react-native';
import SingleComposite from '../../components/singlecomposite/SingleComposite';
import { INITIAL_FILTER_SORT } from '../../storemanagement/filtersort/FilterSortSlice';
import Utility from '../../utils/Utility';
import { GENDERS } from '../../constant';

export default function FemaleVoterListScreen({ navigation, route }) {
  return (
    <View style={{flex: 1}}>
      <SingleComposite 
        addedFilterInfoBar={true}
        voterList={true}
        navigation={navigation}
        filtersObj={{
          [INITIAL_FILTER_SORT.voter_genders.key]: [GENDERS.F.VAL]
        }}
      />
    </View>
  );
};
