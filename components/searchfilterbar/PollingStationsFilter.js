import { StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { STRINGS } from "../../strings"

export default function PollingStationsFilter({children}) {
  return (
    <View>
      <Text style={styles.heading}>{STRINGS.FILTER_POLLING_STATIONS}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  heading: {
    fontWeight: 'bold'
  },
})
