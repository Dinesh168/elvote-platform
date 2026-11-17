import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useDispatch } from 'react-redux';
import { getVotersCountPerDay } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import Utility from '../../utils/Utility';
import { FILTERS_LIST, INTERMEDIATE_ROUTES, LIST_TYPE, ROUTES } from '../../constant';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import { Card, Icon } from 'react-native-paper';
import { THEME } from '../../theme';
import { STRINGS } from '../../strings';
import useResponsive from '../../utils/hooks/useResponsive';

// Accent light as hex so we can safely append 2-digit opacity suffixes
const CHART_LINE_COLOR = '#F05050';

export default function VotersApproachedCountChart({ navigation, filters, chartWidth, refreshKey = 0 }) {
  const dispatch = useDispatch();
  const { responsiveValue, windowWidth, contentMaxWidth } = useResponsive();
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [votersCountData, setVotersCountData] = useState([]);
  const [votersPSData, setVotersPSData] = useState({});
  const pollingStationsList = useGetPollingStations();

  const containerWidth = chartWidth ? chartWidth : Math.min(windowWidth, contentMaxWidth);
  const actualChartWidth = containerWidth - 80;
  const dynamicSpacing = votersCountData.length > 1
    ? (containerWidth - 120) / (votersCountData.length - 1)
    : 40;

  const votersCountDataRef = useRef({});
  const generationRef = useRef(0);

  useEffect(() => {
    setIsLoadingCount(true);
    votersCountDataRef.current = {};
    const generation = ++generationRef.current;

    let from_epoch = filters?.[FILTERS_LIST.from_epoch];
    let to_epoch = filters?.[FILTERS_LIST.to_epoch];

    if (!from_epoch && !to_epoch) {
      const last7daysTimestamps = Utility.getPastDaysFromTodayTimestamps(7);
      from_epoch = last7daysTimestamps.startTime;
      to_epoch = last7daysTimestamps.endTime;
    }

    Utility.convertEpochRangeToDateList(from_epoch, to_epoch).forEach(obj => {
      votersCountDataRef.current[
        `${String(obj.day).padStart(2, '0')}-${String(obj.month).padStart(2, '0')}-${obj.year}`
      ] = 0;
    });

    setVotersCountData(
      Object.entries(votersCountDataRef.current).map(([date, count]) => ({
        value: count,
        label: date,
        showXAxisIndex: true,
        dataPointText: count.toString(),
      }))
    );

    dispatch(getVotersCountPerDay({
      filters: {
        ...filters,
        [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS,
        [FILTERS_LIST.from_epoch]: from_epoch,
        [FILTERS_LIST.to_epoch]: to_epoch,
      },
      onSuccess: voters_count_daywise => {
        if (generation !== generationRef.current) return;
        const vdata = {};
        Object.entries(voters_count_daywise).forEach(([date, psCountObj]) => {
          votersCountDataRef.current[date] = 0;
          vdata[date] = [];
          Object.entries(psCountObj).forEach(([ps, count]) => {
            votersCountDataRef.current[date] += parseInt(count);
            vdata[date].push({ count, polling_station_id: parseInt(ps) });
          });
        });

        setVotersPSData(vdata);
        setVotersCountData(
          Object.entries(votersCountDataRef.current).map(([date, count]) => ({
            value: count,
            label: date,
            showXAxisIndex: true,
            dataPointText: count.toString(),
          }))
        );
      },
      onComplete: () => {
        if (generation !== generationRef.current) return;
        setIsLoadingCount(false);
      },
    }));
  }, [JSON.stringify(filters), refreshKey]);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Icon source="chart-line" size={18} color={THEME.COLOR.PRIMARY_FOREGROUND} />
        </View>
        <View>
          <Text style={styles.headerTitle}>{STRINGS.MAP_LABEL_DAYS}</Text>
          <Text style={styles.headerSubtitle}>{STRINGS.CHART_DAILY_TREND ?? 'Daily activity trend'}</Text>
        </View>
      </View>

      <Card.Content style={styles.cardContent}>
        <View style={styles.container}>
          {isLoadingCount && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={THEME.COLOR.PRIMARY_FOREGROUND} size="large" />
              <Text style={styles.loadingText}>
                {STRINGS.CHART_LOADING ?? 'Loading trend data...'}
              </Text>
            </View>
          )}
          {!isLoadingCount && (
            <LineChart
              data={votersCountData}
              isAnimated={true}
              width={actualChartWidth}
              height={200}
              onPress={(item) => {
                const date = item.label;
                const [d, m, y] = date.split('-');
                const from_epoch = Math.floor(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), 0, 0, 0) / 1000);
                const to_epoch = Math.floor(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), 23, 59, 59) / 1000);
                navigation.navigate(ROUTES.POLLING_STATIONS_LIST, {
                  votersPSData: votersPSData[item.label],
                  nextScreen: INTERMEDIATE_ROUTES.VOTERS_APPROACHED_LIST,
                  filters: {
                    ...filters,
                    [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS,
                    [FILTERS_LIST.to_epoch]: to_epoch,
                    [FILTERS_LIST.from_epoch]: from_epoch,
                  },
                });
              }}
              initialSpacing={20}
              spacing={dynamicSpacing}
              color={CHART_LINE_COLOR}
              hideDataPoints={false}
              dataPointsRadius={5}
              dataPointsColor={CHART_LINE_COLOR}
              textFontSize={10}
              textColor={THEME.COLOR.PRIMARY_FOREGROUND}
              yAxisThickness={1}
              xAxisThickness={1}
              xAxisColor="rgba(255,255,255,0.2)"
              yAxisColor="rgba(255,255,255,0.2)"
              yAxisIndicesColor="rgba(255,255,255,0.15)"
              xAxisIndicesColor="rgba(255,255,255,0.15)"
              dataPointsColor1={CHART_LINE_COLOR}
              xAxisLabelTextStyle={{ color: 'rgba(255,255,255,0.75)', fontSize: THEME.FONT_SIZE.XXS }}
              yAxisTextStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: THEME.FONT_SIZE.XXS }}
              rotateLabel={true}
              showVerticalLines
              verticalLinesColor="rgba(255,255,255,0.06)"
              showTooltip={true}
              tooltipTextColor={THEME.COLOR.TEXT_PRIMARY}
              tooltipTextBackgroundColor={THEME.COLOR.SURFACE}
              tooltipStyle={{ padding: 5, borderRadius: 5 }}
              textShiftY={-4}
              textShiftX={-5}
              hideRules={true}
              areaChart
              startFillColor={CHART_LINE_COLOR}
              endFillColor={CHART_LINE_COLOR}
              startOpacity={0.4}
              endOpacity={0.05}
              curved
            />
          )}
        </View>
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
  headerSubtitle: {
    fontSize: THEME.FONT_SIZE.XS,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
  cardContent: {
    paddingVertical: THEME.SPACING.MD,
  },
  container: {
    position: 'relative',
    paddingBottom: 20,
    minHeight: 240,
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
});
