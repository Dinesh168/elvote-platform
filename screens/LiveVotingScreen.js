import { View } from "react-native";
import { Text } from "react-native-paper";
import SingleComposite from "../components/singlecomposite/SingleComposite";
import { useSelector } from "react-redux";
import { componentKey as componentKeyInitSlice } from "../storemanagement/initscreen/InitSlice";
import { USER_ROLE } from "../constant";

export default function LiveVotingScreen({ navigation, route }) {
  const { userDetails } = useSelector(state => state[componentKeyInitSlice])
  return (
    <View style={{flex: 1}}>
      {
        userDetails.role === USER_ROLE.VOLUNTEER && 
        <SingleComposite 
          searchAndFilterBarLiveVoting={true}
          voterListLiveVoting={true}
          navigation={navigation}
          // filtersObj={{
          //   ...route.params.filters
          // }}
        />
      }
      {
        userDetails.role === USER_ROLE.ADMIN &&
        <SingleComposite 
          votersVotedTotal={true}
          navigation={navigation}
          // filtersObj={{
          //   ...route.params.filters
          // }}
        />
      }
    </View>
  );
}
