import React, { useEffect, useState } from 'react';
import { Text, Button } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { useSelector } from "react-redux";
import DateTimePicker from '@react-native-community/datetimepicker';
import { componentKey } from '../../storemanagement/filtersort/FilterSortSlice';
import Utility from '../../utils/Utility';
import { STRINGS } from '../../strings';

const DATEPICKER_TYPE = {
  FROM: 'from',
  TO: 'to'
}

export default function DateRangeFilter({ from, to, setFromCb, setToCb }) {

  const [showDate, setShowDate] = useState(false);
  const [datePickerType, setDatePickerType] = useState(null);

  const handleFromDate = () => {
    setDatePickerType(DATEPICKER_TYPE.FROM)
    setShowDate(true)
  }

  const handleToDate = () => {
    setDatePickerType(DATEPICKER_TYPE.TO)
    setShowDate(true)
  }

  const onChangeDatePicker = (event, selectedDate) => {
    setShowDate(false)
    if (event.type === 'set') {
      const timestamp = Math.floor(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate()) / 1000);
      if (datePickerType === DATEPICKER_TYPE.FROM) {
        setFromCb(timestamp)
      }

      if (datePickerType === DATEPICKER_TYPE.TO) {
        setToCb(timestamp)
      }
    }
    setDatePickerType(null)
  }

  const getDateFormat = (timestamp) => {
    if (!timestamp) return 'N.A.';

    const date = Utility.convertUTCTimestampToDate(timestamp);
    return `${String(date.day).padStart(2, '0')}-${String(date.month).padStart(2, '0')}-${date.year}`;
  }

  const getDateValue = () => {
    const val = datePickerType === DATEPICKER_TYPE.FROM ? from : to;
    if (val) {
      return new Date(val * 1000);
    }

    return new Date(Date.now());
  }

  return (
    <View>
      <Text style={styles.heading}>{STRINGS.FILTER_SELECT_DATE}</Text>
      <View style={styles.buttonWrapper}>
        <Button 
          style={styles.button} 
          mode='outlined' 
          onPress={handleFromDate}
          labelStyle={styles.buttonLabel}
        >
          {STRINGS.FILTER_FROM_DATE}: {getDateFormat(from)}
        </Button>
        <Button 
          style={styles.button} 
          mode='outlined' 
          onPress={handleToDate}
          labelStyle={styles.buttonLabel}
        >
          {STRINGS.FILTER_TO_DATE}: {getDateFormat(to)}
        </Button>
      </View>
      {showDate && (
        <DateTimePicker
          testID="dateTimePicker"
          value={getDateValue()}
          mode={'date'}
          is24Hour={true}
          onChange={onChangeDatePicker}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  heading: {
    fontWeight: 'bold'
  },
  buttonWrapper: {
    flexDirection: 'row',
    gap: 10
  },
  button: {
    flex: 1,
  },
  buttonLabel: {
    marginHorizontal: 8
  }
})
