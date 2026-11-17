import React from 'react';
import { View } from 'react-native';
import SingleComposite from '../components/singlecomposite/SingleComposite';

export default function VoterListScreen({ navigation, route }) {
  return (
    <View style={{ flex: 1 }}>
      <SingleComposite
        searchAndFilterBar={true}
        voterList={true}
        navigation={navigation}
        filtersObj={{ ...(route?.params?.filters ?? {}) }}
      />
    </View>
  );
}
