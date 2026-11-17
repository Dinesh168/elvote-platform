// HomeScreen.js
import React from 'react';
import { ScrollView } from 'react-native';
import SingleComposite from '../components/singlecomposite/SingleComposite';

export default function VotersSearchScreen({ navigation }) {

  return (
    <ScrollView style={{flex: 1}}>
      <SingleComposite 
        searchBar={true}
        voterListForSearch={true}
        navigation={navigation}
      />
    </ScrollView>
  );
};
