// HomeScreen.js
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import SingleComposite from '../components/singlecomposite/SingleComposite';

const HomeScreen = ({ navigation }) => {

  return (
    <ScrollView style={{flex: 1}}>
      <SingleComposite 
        searchPollingStationBar={true}
        votersApproachedToday={true}
        votersApproachedCountChart={true}
        votersApproachedTotal={true}
        votersOpinionChart={true}
        volunteersCount={true}
        votersMobileCount={true}
        votersMigratedCount={true}
        navigation={navigation}
      />
    </ScrollView>
  );
};

export default HomeScreen;
