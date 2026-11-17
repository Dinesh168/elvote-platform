// HomeScreen.js
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import SingleComposite from '../components/singlecomposite/SingleComposite';

const PollingStationAllDataScreen = ({ navigation, route }) => {

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
        votersCount={true}
        votersAgeCountChart={true}
        votersReligionCountChart={true}
        votersCasteCountChart={true}
        votersGenderCountChart={true}

        navigation={navigation}
        filtersObj={{
          ...(route?.params?.filters ?? {})
        }}
      />
    </ScrollView>
  );
};

export default PollingStationAllDataScreen;
