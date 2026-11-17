// HomeScreen.js
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import SingleComposite from '../components/singlecomposite/SingleComposite';

export default function VotersStatisticsScreen({ navigation }) {

  return (
    <ScrollView style={{flex: 1}}>
      <SingleComposite 
        searchPollingStationBar={true}
        votersCount={true}
        votersAgeCountChart={true}
        votersReligionCountChart={true}
        votersCasteCountChart={true}
        votersGenderCountChart={true}
        navigation={navigation}
      />
    </ScrollView>
  );
};
