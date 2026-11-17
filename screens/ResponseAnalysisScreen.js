import React from 'react';
import { ScrollView } from 'react-native';
import SingleComposite from '../components/singlecomposite/SingleComposite';
import { FILTERS_LIST, LIST_TYPE } from '../constant';

export default function ResponseAnalysisScreen({ navigation }) {
  return (
    <ScrollView style={{flex: 1}}>
      <SingleComposite 
        searchPollingStationBar={true}
        votersApproachedTotal={true}
        votersOpinionChart={true}
        votersAgeCountChart={true}
        votersGenderCountChart={true}
        votersReligionCountChart={true}
        votersCasteCountChart={true}
        navigation={navigation}
        filtersObj={{
          [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS
        }}
      />
    </ScrollView>
  );
}
