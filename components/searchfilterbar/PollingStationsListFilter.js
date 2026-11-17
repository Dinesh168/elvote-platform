import { StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { useDispatch } from "react-redux";
import MultiSelect from "../multiselect/MultiSelect";
import { useGetPollingStations } from "../../utils/hooks/useGetPollingStations";
import { STRINGS } from "../../strings";

export default function PollingStationsListFilter({ pollingStations = [], updatePollingStationsListCb }) {
  const dispatch = useDispatch();
  const pollingStationsList = useGetPollingStations();

  return (
    <View style={styles.flexHorizontal}>
      <Text>{STRINGS.FILTER_POLLING_STATIONS_SELECT}</Text>
      <View style={styles.ageSlider}>
        {pollingStationsList.length > 0 && <MultiSelect
          selectedText={`${pollingStations?.length ?? 0} ${STRINGS.FILTER_POLLING_STATIONS_SELECTED_COUNT}`}
          selectedValuesList={pollingStations ?? []}
          setSelectedValuesListCb={updatePollingStationsListCb}
          completeList={pollingStationsList.map(pollingStation => ({ id: pollingStation.id, value: `${pollingStation.name} (${STRINGS.PART_NO_LABEL} - ${pollingStation.part_no})` }))}
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
