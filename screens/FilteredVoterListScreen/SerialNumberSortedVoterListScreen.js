// HomeScreen.js
import React from 'react';
import { View } from 'react-native';
import SingleComposite from '../../components/singlecomposite/SingleComposite';

export default function SerialNumberSortedVoterListScreen({ navigation, route }) {

  return (
    <View style={{flex: 1}}>
      <SingleComposite 
        addedFilterInfoBar={true}
        voterList={true}
        navigation={navigation}
        filtersObj={{}}
      />
    </View>
  );
};
