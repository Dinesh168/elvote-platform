import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useDispatch } from 'react-redux';
import { getVotersCasteCountPerGroup, getVotersReligionCountPerGroup } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import { FILTERS_LIST, INTERMEDIATE_ROUTES, ROUTES } from '../../constant';
import { THEME } from '../../theme';
import { Card } from 'react-native-paper';
import { STRINGS } from '../../strings';
import useResponsive from '../../utils/hooks/useResponsive';


export default function VotersCasteChart({ filters, navigation, chartWidth }) {
  const dispatch = useDispatch();
  const { responsiveValue, windowWidth, contentMaxWidth } = useResponsive();
  const containerWidth = chartWidth ? chartWidth : Math.min(windowWidth, contentMaxWidth);
  const actualChartWidth = containerWidth - 100;
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [votersCasteData, setVotersCasteData] = useState([]);

  const [votersPSData, setVotersPSData] = useState({});
  const pollingStationsList = useGetPollingStations();

  const votersCountDataRef = useRef({});

  useEffect(() => {
    setIsLoadingCount(true);

    dispatch(getVotersCasteCountPerGroup({
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
        
        setVotersCasteData(Object.entries(votersCountDataRef.current).map(([key, val]) => ({
          value: val ?? 0,
          label: !key || key === 'null' || key.trim() === '' ? 'Unknown' : key,
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
    votersCasteData.forEach(voterData => {
      const val = voterData.value;
      if (max < val) {
        max = val;
      }
    })

    const maxVal = max + Math.floor(max / 5);

    return maxVal > 4 ? maxVal : 5
  }

  const valueSum = () => {
    const total = votersCasteData.reduce((acc, curr) => acc + curr.value, 0);
    return total === 0 ? 1 : total;
  }

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.container}>
          {
            isLoadingCount && <ActivityIndicator color={'blue'} />
          }
          <Text style={styles.axisLabelX}>{STRINGS.MAP_LABEL_CASTE}</Text>
          <Text style={styles.axisLabelY}>{STRINGS.MAP_LABEL_COUNT}</Text>
          {votersCasteData.length > 0 && <BarChart
            data={votersCasteData.map((item) => ({
              ...item,
              frontColor: '#FAA',
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
                    [FILTERS_LIST.voter_castes]: [item.labelKey]
                  }
                }
              )
            }}
            barWidth={60}
            spacing={votersCasteData.length > 1 ? Math.max(10, (actualChartWidth - 40 - (60 * votersCasteData.length)) / (votersCasteData.length - 1)) : 20}
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
