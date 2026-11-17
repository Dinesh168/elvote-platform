// HomeScreen.js
import React from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import SingleComposite from '../components/singlecomposite/SingleComposite';

export default function VoterOpinionScreen({ navigation }) {

  return (
    <View style={{flex: 1}}>
      <SingleComposite 
        searchAndFilterBar={true}
        votersOpinionChart={true}
        navigation={navigation}
      />
    </View>
  );
};
