import { StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { useDispatch, useSelector } from "react-redux";
import { componentKey } from "../../storemanagement/filtersort/FilterSortSlice";
import { useEffect, useState } from "react";
import { getReligions } from "../../storemanagement/filtersort/FilterSortSaga";
import MultiSelect from "../multiselect/MultiSelect";
import { RELIGIONS } from "../../constant";
import { STRINGS } from "../../strings";

export default function VotersReligionsFilter({ religions = [], updateReligionsCb }) {
  const { religionsList } = useSelector(state => state[componentKey]);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getReligions());
  }, [])

  return (
    <View style={styles.flexHorizontal}>
      <Text>{STRINGS.FILTER_RELIGIONS}</Text>
      <View style={styles.ageSlider}>
        {religionsList.length > 0 && <MultiSelect
          selectedText={`${religions?.length ?? 0} ${STRINGS.FILTER_RELIGIONS_SELECTED_COUNT}`}
          selectedValuesList={religions ?? []}
          setSelectedValuesListCb={updateReligionsCb}
          completeList={religionsList.map(religion => ({ id: religion, value: RELIGIONS[religion].LABEL }))}
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
