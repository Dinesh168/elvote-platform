import { View } from "react-native";
import SingleComposite from "../components/singlecomposite/SingleComposite";
import { FILTERS_LIST } from "../constant";

export default function VotersIntermediateScreen({navigation, route}) {
  return (
    <View style={{flex: 1}}>
      <SingleComposite
        voterList={true}
        navigation={navigation}
        filtersObj={{
          ...(route?.params?.filters ?? {})
        }}
      />
    </View>
  )
}
