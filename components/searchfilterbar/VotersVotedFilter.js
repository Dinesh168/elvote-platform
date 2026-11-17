import { Dimensions, StyleSheet, View } from "react-native"
import { Checkbox, Text } from "react-native-paper"
import { STRINGS } from "../../strings"

export default function VotersVotedFilter({ isVoterVoted, updateVoterVotedCb }) {
  return (
    <View style={styles.flexHorizontal}>
      <Text>{STRINGS.FILTER_VOTER_VOTED}</Text>
      <View style={styles.ageSlider}>
        <Checkbox.Item
          status={isVoterVoted === true 
                    ? 'checked' 
                    : isVoterVoted === false
                      ? 'unchecked'
                      : 'indeterminate'
                  }
          onPress={() => updateVoterVotedCb(
            isVoterVoted === true
            ? null
            : isVoterVoted === false
              ? true
              : false
          )}
          label={
            isVoterVoted === true
            ? STRINGS.FILTER_VOTER_VOTED_ONLY_VOTED
            : isVoterVoted === false
              ? STRINGS.FILTER_VOTER_VOTED_NOT_VOTED
              : STRINGS.FILTER_VOTER_VOTED_ALL
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
