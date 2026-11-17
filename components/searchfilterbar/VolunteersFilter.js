import { StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { STRINGS } from "../../strings"

export default function VolunteersFilter({children}) {
  return (
    <View>
      <Text style={styles.heading}>{STRINGS.FILTER_VOLUNTEERS}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  heading: {
    fontWeight: 'bold'
  },
})
