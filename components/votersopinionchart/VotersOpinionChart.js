import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useDispatch } from 'react-redux';
import { getVotersOpinion } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { FILTERS_LIST, INTERMEDIATE_ROUTES, LIST_TYPE, ROUTES, VOTER_OPINION } from '../../constant';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import { Card, Icon } from 'react-native-paper';
import { THEME } from '../../theme';
import { STRINGS } from '../../strings';
import useResponsive from '../../utils/hooks/useResponsive';


export default function VotersOpinionChart({ filters, navigation, chartWidth, refreshKey = 0 }) {
  const dispatch = useDispatch();
  const { responsiveValue, windowWidth, contentMaxWidth } = useResponsive();
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [votersOpinionData, setVotersOpinionData] = useState([]);
  const [votersPSData, setVotersPSData] = useState({});
  const pollingStationsList = useGetPollingStations();

  const votersCountDataRef = useRef({});

  // Responsive chart dimensions
  const containerWidth = chartWidth ? chartWidth : Math.min(windowWidth, contentMaxWidth);
  const actualChartWidth = containerWidth - 100;
  const barWidth = responsiveValue(46, 56, 72);

  useEffect(() => {
    setIsLoadingCount(true);

    dispatch(getVotersOpinion({
      filters: {
        ...filters,
        [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS
      },
      onSuccess: (votersOpinion) => {
        const vdata = {};
        Object.entries(votersOpinion).map(([opinion, psCountObj]) => {
          if (VOTER_OPINION?.[opinion]) {
            votersCountDataRef.current[opinion] = 0;
            vdata[VOTER_OPINION[opinion].LABEL] = [];
            Object.entries(psCountObj).map(([ps, count]) => {
              if (parseInt(ps) !== 0) {
                votersCountDataRef.current[opinion] += parseInt(count)
                vdata[VOTER_OPINION[opinion].LABEL].push({count, polling_station_id: parseInt(ps)});
              }
            })      
          }    
        })

        setVotersPSData(vdata);
        
        setVotersOpinionData(Object.entries(votersCountDataRef.current).map(([opinion, count]) => ({
          value: count,
          label: VOTER_OPINION[opinion].LABEL,
          labelKey: opinion,
        })));
      }, 
      onComplete: () => {
        setIsLoadingCount(false);
      }
    }))
  }, [JSON.stringify(filters), refreshKey])

  const maxValue = () => {
    let max = 0;
    votersOpinionData.forEach(voterData => {
      const val = voterData.value;
      if (max < val) {
        max = val;
      }
    })

    const maxVal = max + Math.floor(max / 5);

    return maxVal > 4 ? maxVal : 5
  }

  const valueSum = () => {
    const total = votersOpinionData.reduce((acc, curr) => acc + curr.value, 0);
    return total === 0 ? 1 : total;
  }

  const getBarColor = (label) => {
    if (label === VOTER_OPINION.P.LABEL) return THEME.COLOR.SUCCESS;
    if (label === VOTER_OPINION.N.LABEL) return THEME.COLOR.DANGER;
    return THEME.COLOR.WARNING;
  };

  const getOpinionIcon = (label) => {
    if (label === VOTER_OPINION.P.LABEL) return 'thumb-up';
    if (label === VOTER_OPINION.N.LABEL) return 'thumb-down';
    return 'help-circle';
  };

  return (
    <Card style={styles.card}>
      {/* Chart Title Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Icon source="chart-bar" size={18} color={THEME.COLOR.PRIMARY_FOREGROUND} />
        </View>
        <Text style={styles.headerTitle}>{STRINGS.MAP_LABEL_OPINION}</Text>
      </View>

      <Card.Content style={styles.cardContent}>
        <View style={styles.container}>
          {isLoadingCount && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={THEME.COLOR.PRIMARY_FOREGROUND} size="large" />
              <Text style={styles.loadingText}>Loading chart data...</Text>
            </View>
          )}
          {!isLoadingCount && votersOpinionData.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No opinion data available</Text>
            </View>
          )}
          {votersOpinionData.length > 0 && <BarChart
            data={votersOpinionData.map((item) => ({
              ...item,
              frontColor: getBarColor(item.label),
              gradientColor: `${getBarColor(item.label)}CC`,
              topLabelComponent: () => (
                <View style={styles.topLabel}>
                  <Text style={styles.topLabelCount}>{item.value.toLocaleString()}</Text> 
                  <Text style={styles.topLabelPercent}>
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
                  nextScreen: INTERMEDIATE_ROUTES.VOTERS_APPROACHED_LIST, 
                  filters: {
                    ...filters,
                    [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS,
                    [FILTERS_LIST.voter_opinions]: [item.labelKey]
                  }
                }
              )
            }}
            barWidth={barWidth}
            spacing={votersOpinionData.length > 1 ? Math.max(10, (actualChartWidth - 40 - (barWidth * votersOpinionData.length)) / (votersOpinionData.length - 1)) : 20}
            topLabelContainerStyle={{width: barWidth}}
            maxValue={maxValue()}
            showYAxisIndices={true}
            showXAxisIndices={true}
            yAxisThickness={1}
            xAxisThickness={1}
            xAxisColor={'rgba(255,255,255,0.2)'}
            yAxisColor={'rgba(255,255,255,0.2)'}
            yAxisIndicesColor={'rgba(255,255,255,0.15)'}
            xAxisIndicesColor={'rgba(255,255,255,0.15)'}
            dataPointsColor={THEME.COLOR.PRIMARY_FOREGROUND}
            xAxisLabelTextStyle={{color: 'rgba(255,255,255,0.8)', fontSize: THEME.FONT_SIZE.XS, fontWeight: THEME.FONT_WEIGHT.MEDIUM}}
            yAxisTextStyle={{color: 'rgba(255,255,255,0.7)', fontSize: THEME.FONT_SIZE.XXS}}
            showVerticalLines
            verticalLinesColor="rgba(255,255,255,0.06)"
            noOfSections={5}
            height={220}
            width={actualChartWidth}
            yAxisLabelWidth={50}
            initialSpacing={10}
            hideRules={true}
            barBorderTopLeftRadius={6}
            barBorderTopRightRadius={6}
          />}
        </View>

        {/* Legend */}
        {!isLoadingCount && votersOpinionData.length > 0 && (
          <View style={styles.legendRow}>
            {votersOpinionData.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <Icon source={getOpinionIcon(item.label)} size={16} color={getBarColor(item.label)} />
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: THEME.SPACING.SM,
    marginHorizontal: THEME.SPACING.XS,
    backgroundColor: THEME.COLOR.PRIMARY,
    borderRadius: THEME.CARD.BORDER_RADIUS,
    overflow: 'hidden',
    ...THEME.SHADOW.MEDIUM,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.SPACING.LG,
    paddingTop: THEME.SPACING.LG,
    paddingBottom: THEME.SPACING.SM,
    gap: THEME.SPACING.SM,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: THEME.BORDER_RADIUS.SM,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.PRIMARY_FOREGROUND,
    letterSpacing: 0.3,
  },
  cardContent: {
    paddingVertical: THEME.SPACING.MD,
  },
  container: {
    position: 'relative',
    paddingBottom: 20,
    paddingLeft: 10,
    minHeight: 260,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 220,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: THEME.FONT_SIZE.SM,
    marginTop: THEME.SPACING.MD,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 220,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: THEME.FONT_SIZE.MD,
  },
  topLabel: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  topLabelCount: {
    color: THEME.COLOR.PRIMARY_FOREGROUND,
    fontSize: THEME.FONT_SIZE.XS,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    textAlign: 'center',
  },
  topLabelPercent: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: THEME.FONT_SIZE.XXS,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: THEME.SPACING.XL,
    paddingTop: THEME.SPACING.MD,
    paddingBottom: THEME.SPACING.SM,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.SPACING.SM,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: THEME.FONT_SIZE.SM,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
});
