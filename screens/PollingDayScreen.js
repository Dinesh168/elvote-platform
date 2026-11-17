import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { STRINGS } from '../strings';
import { THEME } from '../theme';
import useResponsive from '../utils/hooks/useResponsive';

export default function PollingDayScreen() {
  
  const defaultStats = {
    PollingPercent: 0,
    voted: null,
    NotVoted: null,
    CongressNotVoted: null,
    OthersNotVoted: null,
    RecentlyAdded: null,
    RecentlyDeleted: null,
    Duplicate: null,
    SearchByEpic: null,
    SearchByDetails: null
  };

  const [stats, setStats] = React.useState({ ...defaultStats });
  
  const statsData = [
    { count: stats.PollingPercent.toLocaleString() + '%', label: STRINGS.POLLING_DAY_POLLING_PERCENT_LABEL, color: THEME.COLOR.PRIMARY },
    { count: stats.voted, label: STRINGS.POLLING_DAY_VOTED_LABEL, color: THEME.COLOR.SUCCESS },
    { count: stats.NotVoted, label: STRINGS.POLLING_DAY_NOT_VOTED_LABEL, color: THEME.COLOR.WARNING },
    { count: stats.CongressNotVoted, label: STRINGS.POLLING_DAY_OURS_NOT_VOTED_LABEL, color: THEME.COLOR.ACCENT },
    { count: stats.OthersNotVoted, label: STRINGS.POLLING_DAY_OPP_NOT_VOTED_LABEL, color: THEME.COLOR.DANGER },
    { count: stats.RecentlyAdded, label: STRINGS.POLLING_DAY_RECENTLY_ADDED_LABEL, color: '#6366F1' },
    { count: stats.RecentlyDeleted, label: STRINGS.POLLING_DAY_RECENTLY_DELETED_LABEL, color: '#EC4899' },
    { count: stats.Duplicate, label: STRINGS.POLLING_DAY_DUPLICATE_LABEL, color: '#8B5CF6' },
    { count: stats.SearchByEpic, label: STRINGS.POLLING_DAY_SEARCH_BY_EPIC_LABEL, color: '#10B981' },
    { count: stats.SearchByDetails, label: STRINGS.POLLING_DAY_SEARCH_BY_DETAILS_LABEL, color: '#F59E0B' }
  ];

  const { columns, gridItemWidth, containerStyle, responsiveValue } = useResponsive();
  const gap = THEME.SPACING.MD;
  const itemWidth = gridItemWidth(gap, columns, responsiveValue(THEME.SPACING.LG, THEME.SPACING.XL, THEME.SPACING.XXL));
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ alignItems: 'center', paddingBottom: THEME.SPACING.XXXL }}
    >
      <View style={[containerStyle, { paddingHorizontal: 0, marginTop: THEME.SPACING.XL }]}>
        <View style={[styles.statsContainer, { gap, paddingHorizontal: responsiveValue(THEME.SPACING.LG, THEME.SPACING.XL, THEME.SPACING.XXL) }]}>
          {statsData.map((item, index) => {
            const isClickable = item.count === null || item.count === 'null%';
            return (
              <View
                key={index}
                style={[
                  styles.statBox,
                  { width: itemWidth, borderLeftColor: item.color },
                  isClickable && styles.clickableBox
                ]}
              >
                {!isClickable && (
                  <Text style={[styles.statCount, { color: item.color }]}>{item.count}</Text>
                )}
                {isClickable && (
                  <Text style={styles.clickableIcon}>🔍</Text>
                )}
                <Text style={styles.statText}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statBox: {
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.MD,
    paddingVertical: THEME.SPACING.XL,
    paddingHorizontal: THEME.SPACING.MD,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 4,
    minHeight: 120,
    ...THEME.SHADOW.LIGHT,
  },
  clickableBox: {
    backgroundColor: THEME.COLOR.SURFACE_ELEVATED,
    borderStyle: 'dashed',
    borderLeftWidth: 4,
  },
  clickableIcon: {
    fontSize: 24,
    marginBottom: THEME.SPACING.XS,
  },
  statCount: {
    fontSize: THEME.FONT_SIZE.XXL,
    fontWeight: THEME.FONT_WEIGHT.EXTRABOLD,
    textAlign: 'center',
  },
  statText: {
    fontSize: THEME.FONT_SIZE.SM,
    color: THEME.COLOR.TEXT_SECONDARY,
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
    textAlign: 'center',
    marginTop: THEME.SPACING.XS,
  },
});
