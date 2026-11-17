import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useDispatch } from 'react-redux';
import { getVotersGenderCountPerGroup } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { FILTERS_LIST, GENDERS, INTERMEDIATE_ROUTES, ROUTES } from '../../constant';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import { THEME } from '../../theme';
import { Card } from 'react-native-paper';
import { STRINGS } from '../../strings';
import useResponsive from '../../utils/hooks/useResponsive';


export default function VotersGenderChart({ filters, navigation, chartWidth }) {
  const dispatch = useDispatch();
  const { responsiveValue, windowWidth, contentMaxWidth } = useResponsive();
  const containerWidth = chartWidth ? chartWidth : Math.min(windowWidth, contentMaxWidth);
  const actualChartWidth = containerWidth - 100;
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [votersGenderData, setVotersGenderData] = useState([]);
  const [votersPSData, setVotersPSData] = useState({});
  const pollingStationsList = useGetPollingStations();

  const votersCountDataRef = useRef({});

  useEffect(() => {
    setIsLoadingCount(true);

    dispatch(getVotersGenderCountPerGroup({
      filters,
      onSuccess: (votersGroup) => {
        const vdata = {};
        Object.entries(votersGroup).map(([group, psCountObj]) => {
          if (GENDERS?.[group]) {
            votersCountDataRef.current[group] = 0;
            vdata[GENDERS[group].LABEL] = [];
            Object.entries(psCountObj).map(([ps, count]) => {
              if (parseInt(ps) !== 0) {
                votersCountDataRef.current[group] += parseInt(count)
                vdata[GENDERS[group].LABEL].push({count, polling_station_id: parseInt(ps)});
              }
            })  
          }        
        })

        setVotersPSData(vdata);
        
        setVotersGenderData(Object.entries(votersCountDataRef.current).map(([key, val]) => ({
          value: val ?? 0,
          label: GENDERS[key].LABEL,
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
    votersGenderData.forEach(voterData => {
      const val = voterData.value;
      if (max < val) {
        max = val;
      }
    })

    const maxVal = max + Math.floor(max / 5);

    return maxVal > 4 ? maxVal : 5
  }

  const valueSum = () => {
    const total = votersGenderData.reduce((acc, curr) => acc + curr.value, 0);
    return total === 0 ? 1 : total;
  }

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.container}>
          {
            isLoadingCount && <ActivityIndicator color={'blue'} />
          }
          <Text style={styles.axisLabelX}>{STRINGS.MAP_LABEL_GENDER}</Text>
          <Text style={styles.axisLabelY}>{STRINGS.MAP_LABEL_COUNT}</Text>
          {votersGenderData.length > 0 && <BarChart
            data={votersGenderData.map((item) => ({
              ...item,
              frontColor: '#AFF',
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
              navigation.navigate(
                ROUTES.POLLING_STATIONS_LIST, 
                {
                  votersPSData: votersPSData[item.label], 
                  nextScreen: INTERMEDIATE_ROUTES.VOTERS_LIST, 
                  filters: {
                    ...filters,
                    [FILTERS_LIST.voter_genders]: [item.labelKey]
                  }
                }
              )
            }}
            barWidth={60}
            spacing={votersGenderData.length > 1 ? Math.max(10, (actualChartWidth - 40 - (60 * votersGenderData.length)) / (votersGenderData.length - 1)) : 20}
            topLabelContainerStyle={{width: 60}}
            maxValue={maxValue()}
            showYAxisIndices={true}
            showXAxisIndices={true}
            yAxisThickness={1}
            xAxisThickness={1}
            xAxisColor={THEME.COLOR.PRIMARY_FOREGROUND}
            yAxisColor={THEME.COLOR.PRIMARY_FOREGROUND}
            yAxisIndicesColor={THEME.COLOR.PRIMARY_FOREGROUND}
            xAxisIndicesColor={THEME.COLOR.PRIMARY_FOREGROUND}
            dataPointsColor={THEME.COLOR.PRIMARY_FOREGROUND}
            xAxisLabelTextStyle={{color: THEME.COLOR.PRIMARY_FOREGROUND}}
            yAxisTextStyle={{color: THEME.COLOR.PRIMARY_FOREGROUND}}
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
    backgroundColor: THEME.COLOR.PRIMARY
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
    color: THEME.COLOR.PRIMARY_FOREGROUND
  },
  axisLabelY: {
    position: 'absolute',
    top: 110,
    left: -40,
    fontSize: 14,
    fontWeight: 'bold',
    transform: [{ rotate: '270deg' }],
    color: THEME.COLOR.PRIMARY_FOREGROUND
  },
  topLabel: {
    flexDirection: 'column'
  },
  topLabelText: {
    color: THEME.COLOR.PRIMARY_FOREGROUND,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});
