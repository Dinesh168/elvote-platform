import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useDispatch } from 'react-redux';
import { getVotersAgeCountPerGroup } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import { FILTERS_LIST, INTERMEDIATE_ROUTES, ROUTES } from '../../constant';
import { Card } from 'react-native-paper';
import { THEME } from '../../theme';
import { STRINGS } from '../../strings';
import useResponsive from '../../utils/hooks/useResponsive';


export default function VotersAgeChart({ filters, navigation, chartWidth }) {
  const dispatch = useDispatch();
  const { responsiveValue, windowWidth, contentMaxWidth } = useResponsive();
  const containerWidth = chartWidth ? chartWidth : Math.min(windowWidth, contentMaxWidth);
  const actualChartWidth = containerWidth - 100;
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [votersAgeData, setVotersAgeData] = useState([]);

  const [votersPSData, setVotersPSData] = useState({});
  const pollingStationsList = useGetPollingStations();

  const votersCountDataRef = useRef({});

  useEffect(() => {
    setIsLoadingCount(true);

    dispatch(getVotersAgeCountPerGroup({
      filters,
      onSuccess: (votersGroup) => {
        const vdata = {};
        Object.entries(votersGroup).map(([group, psCountObj]) => {
          votersCountDataRef.current[group] = 0;
          vdata[group] = [];
          Object.entries(psCountObj).map(([ps, count]) => {
            if (parseInt(ps) !== 0) {
              votersCountDataRef.current[group] += parseInt(count)
              vdata[group].push({count, polling_station_id: parseInt(ps)});
            }
          })          
        })

        setVotersPSData(vdata);
        
        setVotersAgeData(Object.entries(votersCountDataRef.current).map(([key, val]) => ({
          value: val ?? 0,
          label: key,
          labelKey: key,
        })));
        
      }, 
      onComplete: () => {
        setIsLoadingCount(false);
      }
    }))
  }, [])

  const maxValue = () => {
    let max = 0;
    votersAgeData.forEach(voterData => {
      const val = voterData.value;
      if (max < val) {
        max = val;
      }
    })

    const maxVal = max + Math.floor(max / 5);

    return maxVal > 4 ? maxVal : 5
  }

  const valueSum = () => {
    const total = votersAgeData.reduce((acc, curr) => acc + curr.value, 0);
    return total === 0 ? 1 : total;
  }

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.container}>
          {
            isLoadingCount && <ActivityIndicator color={'blue'} />
          }
          <Text style={styles.axisLabelX}>{STRINGS.MAP_LABEL_AGE}</Text>
          <Text style={styles.axisLabelY}>{STRINGS.MAP_LABEL_COUNT}</Text>
          {votersAgeData.length > 0 && <BarChart
            data={votersAgeData.map((item) => ({
              ...item,
              frontColor: '#FFA',
              topLabelComponent: () => (
                <View style={styles.topLabel}>
                  <Text style={styles.topLabelText}>{item.value}</Text> 
                  <Text style={styles.topLabelText}>
                    ({((parseInt(item.value) / valueSum()) * 100).toFixed(1)}%)
                  </Text>
                </View>
              ),
            }))}
            onPress={(item, index) => {
              const ages = item.labelKey.split('-');
              navigation.navigate(
                ROUTES.POLLING_STATIONS_LIST, 
                {
                  votersPSData: votersPSData[item.label], 
                  nextScreen: INTERMEDIATE_ROUTES.VOTERS_LIST, 
                  filters: {
                    ...filters,
                    [FILTERS_LIST.from_voter_age]: parseInt(ages[0]),
                    ...(ages.length === 2 ? {[FILTERS_LIST.to_voter_age]: parseInt(ages[1])} : {})
                  }
                }
              )
            }}
            barWidth={60}
            spacing={votersAgeData.length > 1 ? Math.max(10, (actualChartWidth - 40 - (60 * votersAgeData.length)) / (votersAgeData.length - 1)) : 20}
            topLabelContainerStyle={{width: 60}}
            maxValue={maxValue()}
            showYAxisIndices={true}
            showXAxisIndices={true}
            yAxisThickness={1}
            xAxisThickness={1}
            xAxisColor="black"
            yAxisColor="black"
            showVerticalLines
            verticalLinesColor="rgba(0,0,0,0.1)"
            noOfSections={5}
            height={250}
            width={actualChartWidth}
            yAxisLabelWidth={60}
            initialSpacing={10}
          />}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: THEME.SPACING.XS,
    marginHorizontal: THEME.SPACING.XS,
    backgroundColor: THEME.COLOR.SECONDARY_BACKGROUND
  },
  container: {
    position: 'relative',
    paddingBottom: 45,
    paddingLeft: 10,
  },
  axisLabelX: {
    position: 'absolute',
    bottom: 5,
    left: '50%',
    transform: [{ translateX: -20 }],
    fontSize: 14,
    fontWeight: 'bold',
  },
  axisLabelY: {
    position: 'absolute',
    top: 110,
    left: -40,
    fontSize: 14,
    fontWeight: 'bold',
    transform: [{ rotate: '270deg' }],
  },
  topLabel: {
    flexDirection: 'column'
  },
  topLabelText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});
