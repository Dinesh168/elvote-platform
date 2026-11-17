import { Dimensions, StyleSheet, View } from "react-native"
import { Checkbox, Text } from "react-native-paper"
import { STRINGS } from "../../strings"

export default function VotersMigrationStatusFilter({ isVoterMigrated, updateVoterMigratedCb }) {
  return (
    <View style={styles.flexHorizontal}>
      <Text>{STRINGS.FILTER_MIGRATION_STATUS}</Text>
      <View style={styles.ageSlider}>
        <Checkbox.Item
          status={isVoterMigrated === true 
                    ? 'checked' 
                    : isVoterMigrated === false
                      ? 'unchecked'
                      : 'indeterminate'
                  }
          onPress={() => updateVoterMigratedCb(
            isVoterMigrated === true
            ? null
            : isVoterMigrated === false
              ? true
              : false
          )}
          label={
            isVoterMigrated === true
            ? STRINGS.FILTER_MIGRATION_STATUS_MIGRATED
            : isVoterMigrated === false
              ? STRINGS.FILTER_MIGRATION_STATUS_NOT_MIGRATED
              : STRINGS.FILTER_MIGRATION_STATUS_ALL
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
