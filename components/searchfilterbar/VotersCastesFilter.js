import { Dimensions, StyleSheet, View } from "react-native"
import { PaperProvider, Text } from "react-native-paper"
import {PaperSelect} from "react-native-paper-select";
import { useDispatch, useSelector } from "react-redux";
import { componentKey } from "../../storemanagement/filtersort/FilterSortSlice";
import { useEffect } from "react";
import { getCastes } from "../../storemanagement/filtersort/FilterSortSaga";
import MultiSelect from "../multiselect/MultiSelect";
import { STRINGS } from "../../strings";

export default function VotersCastesFilter({ castes = [], updateCastesCb }) {
  const { castesList } = useSelector(state => state[componentKey]);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getCastes());
  }, [])

  return (
    <View style={styles.flexHorizontal}>
      <Text>{STRINGS.FILTER_CASTES}</Text>
      <View style={styles.ageSlider}>
        {castesList.length > 0 && <MultiSelect
          selectedText={`${castes?.length ?? 0} ${STRINGS.FILTER_CASTES_SELECTED_COUNT}`}
          selectedValuesList={castes ?? []}
          setSelectedValuesListCb={updateCastesCb}
          completeList={castesList.map(caste => ({id: caste, value: caste}))}
        />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flexHorizontal: {
    flexDirection: 'row',
    flex: 1,
    gap: 20,
    alignItems: 'center',
    marginBottom: 16
  },
  ageSlider: {
    flexDirection: 'row',
    flex: 1,
  },
  
})
