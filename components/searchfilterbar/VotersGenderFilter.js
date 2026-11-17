import { Dimensions, StyleSheet, View } from "react-native"
import { Checkbox, Text } from "react-native-paper"
import { GENDERS } from "../../constant"
import { STRINGS } from "../../strings"

export default function VotersGenderFilter({ genders = [], updateGendersCb }) {
  return (
    <View style={styles.flexHorizontal}>
      <Text>{STRINGS.FILTER_GENDERS}</Text>
      <View style={styles.ageSlider}>
        <Checkbox.Item
          status={(genders ?? []).includes(GENDERS.M.VAL) ? 'checked' : 'unchecked'}
          onPress={() => updateGendersCb((genders ?? []).includes(GENDERS.M.VAL) ? (genders ?? []).filter(val => val !== GENDERS.M.VAL) : [...(genders ?? []), GENDERS.M.VAL])}
          label={GENDERS.M.LABEL}
          position={'leading'}
          labelStyle={styles.checkboxLabel}
          style={styles.checkbox}
        />

        <Checkbox.Item 
          status={(genders ?? []).includes(GENDERS.F.VAL) ? 'checked' : 'unchecked'}
          onPress={() => updateGendersCb((genders ?? []).includes(GENDERS.F.VAL) ? (genders ?? []).filter(val => val !== GENDERS.F.VAL) : [...(genders ?? []), GENDERS.F.VAL])}
          label={GENDERS.F.LABEL}
          position={'leading'}
          labelStyle={styles.checkboxLabel}
          style={styles.checkbox}
        />

        <Checkbox.Item
          status={(genders ?? []).includes(GENDERS.O.VAL) ? 'checked' : 'unchecked'}
          onPress={() => updateGendersCb((genders ?? []).includes(GENDERS.O.VAL) ? (genders ?? []).filter(val => val !== GENDERS.O.VAL) : [...(genders ?? []), GENDERS.O.VAL])}
          label={GENDERS.O.LABEL}
          position={'leading'}
          labelStyle={styles.checkboxLabel}
          style={styles.checkbox}
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
    alignItems: 'center'
  },
  ageSlider: {
    flexDirection: 'row',
    flex: 1
  },
  checkbox: {
    paddingHorizontal: 0
  },
  checkboxLabel: {
    textAlign: 'left'
  }
})
