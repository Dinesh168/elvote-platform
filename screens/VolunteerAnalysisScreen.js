import React from 'react';
import { ScrollView } from 'react-native';
import SingleComposite from '../components/singlecomposite/SingleComposite';
import { FILTERS_LIST, LIST_TYPE } from '../constant';

export default function VolunteerAnalysisScreen({ navigation, route }) {
  return (
    <ScrollView style={{flex: 1}}>
      <SingleComposite 
        votersApproachedTotal={true}
        votersApproachedCountChart={true}
        votersApproachedToday={true}
        votersCount={true}
        votersMobileCount={true}
        votersMigratedCount={true}
        votersOpinionChart={true}
        votersAgeCountChart={true}
        votersGenderCountChart={true}
        votersReligionCountChart={true}
        votersCasteCountChart={true}
        navigation={navigation}
        filtersObj={{
          ...(route?.params?.filters ?? {}),
          [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS
        }}
      />
    </ScrollView>
  );
}
