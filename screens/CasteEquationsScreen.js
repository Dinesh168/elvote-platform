// HomeScreen.js
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import SingleComposite from '../components/singlecomposite/SingleComposite';
import { FILTERS_LIST, LIST_TYPE } from '../constant';

const CasteEquationsScreen = ({ navigation }) => {

  return (
    <ScrollView style={{flex: 1}}>
      <SingleComposite 
        searchPollingStationBar={true}
        votersCasteCountChart={true}
        navigation={navigation}
        filtersObj={{
          [FILTERS_LIST.list_type]: LIST_TYPE.TOTAL_VOTERS
        }}
      />
    </ScrollView>
  );
};

export default CasteEquationsScreen;
