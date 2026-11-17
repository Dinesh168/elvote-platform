import { Dimensions, StyleSheet, View } from "react-native"
import { Checkbox, Text } from "react-native-paper"
import { STRINGS } from "../../strings"

export default function VotersMobileNumberAvailableFilter({ isVoterMobileAvailable, updateVoterMobileAvailableCb }) {
  return (
    <View style={styles.flexHorizontal}>
      <Text>{STRINGS.FILTER_MOBILE_AVAILABILITY}</Text>
      <View style={styles.ageSlider}>
        <Checkbox.Item
          status={isVoterMobileAvailable === true 
                    ? 'checked' 
                    : isVoterMobileAvailable === false
                      ? 'unchecked'
                      : 'indeterminate'
                  }
          onPress={() => updateVoterMobileAvailableCb(
            isVoterMobileAvailable === true
            ? null
            : isVoterMobileAvailable === false
              ? true
              : false
          )}
          label={
            isVoterMobileAvailable === true
            ? STRINGS.FILTER_MOBILE_AVAILABILITY_WITH
            : isVoterMobileAvailable === false
              ? STRINGS.FILTER_MOBILE_AVAILABILITY_WITHOUT
              : STRINGS.FILTER_MOBILE_AVAILABILITY_ALL
          }
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
    flex: 1,
    paddingRight: 10
  },
  checkbox: {
    paddingHorizontal: 0
  },
  checkboxLabel: {
    textAlign: 'left',
    paddingRight: 10
  }
})
