import { View } from "react-native";
import SingleComposite from "../components/singlecomposite/SingleComposite";
import { FILTERS_LIST } from "../constant";

export default function VotersApproachedListScreen({navigation, route}) {
  return (
    <View style={{flex: 1}}>
      <SingleComposite
        voterApproachedList={true}
        navigation={navigation}
        filtersObj={{
          ...(route?.params?.filters ?? {})
        }}
      />
    </View>
  )
}
