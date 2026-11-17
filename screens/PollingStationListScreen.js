// HomeScreen.js
import React from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import SingleComposite from '../components/singlecomposite/SingleComposite';

export default function PollingStationListScreen({ navigation }) {

  return (
    <View style={{flex: 1}}>
      <SingleComposite 
        searchPollingStationBar={true}
        pollingStationListWithPS={true}
        navigation={navigation}
      />
    </View>
  );
};
