import { StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import MultiSelect from "../multiselect/MultiSelect";
import { VOTER_OPINION } from "../../constant";
import { STRINGS } from "../../strings";

export default function VotersOpinionsFilter({ opinions = [], updateOpinionsCb }) {
  
  return (
    <View style={styles.flexHorizontal}>
      <Text>{STRINGS.FILTER_OPINIONS}</Text>
      <View style={styles.ageSlider}>
        <MultiSelect
          selectedText={`${opinions?.length ?? 0} ${STRINGS.FILTER_OPINIONS_SELECTED_COUNT}`}
          selectedValuesList={opinions ?? []}
          setSelectedValuesListCb={updateOpinionsCb}
          completeList={[
            { id: VOTER_OPINION.P.VAL, value: VOTER_OPINION.P.LABEL },
            { id: VOTER_OPINION.N.VAL, value: VOTER_OPINION.N.LABEL },
            { id: VOTER_OPINION.U.VAL, value: VOTER_OPINION.U.LABEL },
          ]}
        />
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
