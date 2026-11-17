import { View } from "react-native";
import SingleComposite from "../components/singlecomposite/SingleComposite";
import { FILTERS_LIST } from "../constant";

export default function VotersVotedScreen({navigation, route}) {
  return (
    <View style={{flex: 1}}>
      <SingleComposite
        voterListLiveVoting={true}
        navigation={navigation}
        filtersObj={{
          ...(route?.params?.filters ?? {})
        }}
      />
    </View>
  )
}
