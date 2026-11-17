import { StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { useDispatch, useSelector } from "react-redux";
import { componentKey } from "../../storemanagement/filtersort/FilterSortSlice";
import { useEffect, useState } from "react";
import { getVolunteers } from "../../storemanagement/filtersort/FilterSortSaga";
import MultiSelect from "../multiselect/MultiSelect";
import { RELIGIONS } from "../../constant";
import { STRINGS } from "../../strings";

export default function VolunteersListFilter({ volunteers = [], updateVolunteersListCb }) {
  const { volunteersList } = useSelector(state => state[componentKey]);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getVolunteers());
  }, [])

  return (
    <View style={styles.flexHorizontal}>
      <Text>{STRINGS.FILTER_VOLUNTEERS_SELECT}</Text>
      <View style={styles.ageSlider}>
        {volunteersList.length > 0 && <MultiSelect
          selectedText={`${volunteers?.length ?? 0} ${STRINGS.FILTER_VOLUNTEERS_SELECTED_COUNT}`}
          selectedValuesList={volunteers ?? []}
          setSelectedValuesListCb={updateVolunteersListCb}
          completeList={volunteersList.map(volunteer => ({ id: volunteer.id, value: `${volunteer.name} (${volunteer.email})` }))}
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
