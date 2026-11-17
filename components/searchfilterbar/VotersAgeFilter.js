import { Dimensions, StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { STRINGS } from "../../strings";

const MIN_AGE = 18
const MAX_AGE = 120

export default function VotersAgeFilter({ fromAge, toAge, updateAgeCb }) {
  return (
    <View style={styles.flexHorizontal}>
      <Text>{STRINGS.FILTER_AGE_RANGE}</Text>
      <View style={styles.ageSlider}>
        <MultiSlider
          min={MIN_AGE}
          max={MAX_AGE}
          step={1}
          showSteps={true}
          showStepLabels={true}
          enabledOne={true}
          enabledTwo={true}
          isMarkersSeparated={true}
          sliderLength={Dimensions.get('window').width - 130}
          onValuesChangeFinish={updateAgeCb}
          values={[parseInt(fromAge ?? MIN_AGE), parseInt(toAge ?? MAX_AGE)]}
          customMarkerLeft={e => <Text style={styles.marker}>{e.currentValue}</Text>}
          customMarkerRight={e => <Text style={styles.marker}>{e.currentValue}</Text>}
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
  marker: {
    fontWeight: 'bold',
    backgroundColor: 'white',
    borderColor: '#888',
    borderWidth: 0.5,
    width: 30,
    textAlign: 'center',
  }
})
