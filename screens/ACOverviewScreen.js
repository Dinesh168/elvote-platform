import React from 'react';
import { View } from 'react-native';
import SingleComposite from '../components/singlecomposite/SingleComposite';

const ACOverviewScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1 }}>
      <SingleComposite
        acOverview={true}
        navigation={navigation}
        filtersObj={{}}
      />
    </View>
  );
};

export default ACOverviewScreen;
