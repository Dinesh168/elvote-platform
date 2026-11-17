import { View } from "react-native";
import SingleComposite from "../components/singlecomposite/SingleComposite";
import { FILTERS_LIST, LIST_TYPE } from "../constant";

export default function VolunteersIntermediateScreen({navigation, route}) {
  return (
    <View style={{flex: 1}}>
      <SingleComposite
        volunteerList={true}
        navigation={navigation}
        filtersObj={{
          ...(route?.params?.filters ?? {}),
          [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS
        }}
      />
    </View>
  )
}
