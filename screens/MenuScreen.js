// MenuScreen.js
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { FILTERS_LIST, LIST_TYPE, ROUTES } from '../constant';
import { STRINGS } from '../strings';
import { THEME } from '../theme';
import { useDispatch, useSelector } from 'react-redux';
import { componentKey as initSliceComponentKey } from '../storemanagement/initscreen/InitSlice';
import { getTotalVotersCount, getVotersCount } from '../storemanagement/votersapproached/VotersApproachedSaga';
import useResponsive from '../utils/hooks/useResponsive';

const SECTION_COLORS = [
  { accent: THEME.COLOR.PRIMARY, bg: THEME.COLOR.PRIMARY_BACKGROUND },
  { accent: THEME.COLOR.ACCENT, bg: THEME.COLOR.ACCENT_BACKGROUND },
  { accent: THEME.COLOR.WARNING, bg: THEME.COLOR.WARNING_BACKGROUND },
  { accent: THEME.COLOR.SUCCESS, bg: THEME.COLOR.SUCCESS_BACKGROUND },
  { accent: THEME.COLOR.PRIMARY_LIGHT, bg: '#EEF4FF' },
  { accent: THEME.COLOR.ACCENT_LIGHT, bg: '#FFF0F0' },
  { accent: '#6366F1', bg: '#EEF2FF' },
];

const gridItems = [
  {
    heading: '',
    group: [
      { label: STRINGS.VOTERS_LIST_SCREEN_TITLE, route: ROUTES.VOTERS_LIST, icon: '📋' },
      { label: STRINGS.VOTERS_SEARCH_LIST_SCREEN_TITLE, route: ROUTES.VOTERS_SEARCH_LIST, icon: '🔍' },
      { label: STRINGS.SERIAL_NUMBER_SORTED_VOTERS_SCREEN_TITLE, route: ROUTES.SERIAL_NUMBER_SORTED_VOTERS, icon: '🔢' },
      { label: STRINGS.HOUSE_NUMBER_VOTERS_SCREEN_TITLE, route: ROUTES.VOTER_HOUSE_LIST, icon: '🏠' },
      { label: STRINGS.SURNAME_SCREEN_TITLE, route: ROUTES.SURNAME_LIST, icon: '👥' },
      { label: STRINGS.PDA_VOTER_SCREEN_TITLE, route: null, icon: '📱' },
      { label: STRINGS.APPROACHED_VOTERS_SCREEN_TITLE, route: ROUTES.APPROACHED_VOTERS, icon: '✅' },
      { label: STRINGS.UNAPPROACHED_VOTERS_SCREEN_TITLE, route: ROUTES.UNAPPROACHED_VOTERS, icon: '⏳' },
      { label: STRINGS.MOBILE_AVAILABLE_VOTERS_SCREEN_TITLE, route: ROUTES.MOBILE_AVAILABLE_VOTERS, icon: '📞' },
      { label: STRINGS.MOBILE_NOT_AVAILABLE_VOTERS_SCREEN_TITLE, route: ROUTES.MOBILE_NOT_AVAILABLE_VOTERS, icon: '📵' },
      { label: STRINGS.MIGRATED_VOTERS_SCREEN_TITLE, route: ROUTES.MIGRATED_VOTERS_SCREEN, icon: '🚚' },
      { label: STRINGS.NOT_MIGRATED_VOTERS_SCREEN_TITLE, route: ROUTES.NOT_MIGRATED_VOTERS_SCREEN, icon: '🏡' },
      { label: STRINGS.RECENTLY_ADDED_VOTERS_SCREEN_TITLE, route: ROUTES.RECENTLY_ADDED_VOTERS_SCREEN, icon: '➕' },
      { label: STRINGS.RECENTLY_DELETED_VOTERS_SCREEN_TITLE, route: ROUTES.RECENTLY_DELETED_VOTERS_SCREEN, icon: '➖' },
    ]
  },
  {
    heading: STRINGS.MENU_HEADING_COLORWISE_VOTERS,
    group: [
      { label: STRINGS.NEGATIVE_OPINION_VOTERS_SCREEN_TITLE, route: ROUTES.NEGATIVE_OPINION_VOTERS, icon: '🔴' },
      { label: STRINGS.POSITIVE_OPINION_VOTERS_SCREEN_TITLE, route: ROUTES.POSITIVE_OPINION_VOTERS, icon: '🟢' },
      { label: STRINGS.UNDECIDED_OPINION_VOTERS_SCREEN_TITLE, route: ROUTES.UNDECIDED_OPINION_VOTERS, icon: '🔵' },
      { label: STRINGS.UNCAPTURED_OPINION_VOTERS_SCREEN_TITLE, route: ROUTES.UNCAPTURED_OPINION_VOTERS, icon: '⚪' },
    ]
  },
  {
    heading: STRINGS.MENU_HEADING_AGEWISE_VOTERS,
    group: [
      { label: STRINGS.NEW_VOTERS_SCREEN_TITLE, route: ROUTES.NEW_VOTERS, icon: '🧑' },
      { label: STRINGS.AGE_18_35_VOTERS_SCREEN_TITLE, route: ROUTES.AGE_18_35_VOTERS, icon: '👦' },
      { label: STRINGS.AGE_35_60_VOTERS_SCREEN_TITLE, route: ROUTES.AGE_35_60_VOTERS, icon: '👨' },
      { label: STRINGS.SENIOR_CITIZENS_VOTERS_SCREEN_TITLE, route: ROUTES.SENIOR_CITIZENS_VOTERS, icon: '👴' },
    ]
  },
  {
    heading: STRINGS.MENU_HEADING_GENDERWISE_VOTERS,
    group: [
      { label: STRINGS.FEMALE_VOTERS_SCREEN_TITLE, route: ROUTES.FEMALE_VOTERS, icon: '♀️' },
      { label: STRINGS.MALE_VOTERS_SCREEN_TITLE, route: ROUTES.MALE_VOTERS, icon: '♂️' },
      { label: STRINGS.THIRD_GENDER_VOTERS_SCREEN_TITLE, route: ROUTES.THIRD_GENDER_VOTERS, icon: '⚧️' },
    ]
  },
  {
    heading: STRINGS.MENU_HEADING_CONTACTED_DATEWISE_VOTERS,
    group: [
      { label: STRINGS.LAST_7_DAYS_APPROACHED_VOTERS_SCREEN_TITLE, route: ROUTES.LAST_7_DAYS_APPROACHED_VOTERS, icon: '7️⃣' },
      { label: STRINGS.LAST_15_DAYS_APPROACHED_VOTERS_SCREEN_TITLE, route: ROUTES.LAST_15_DAYS_APPROACHED_VOTERS, icon: '📅' },
      { label: STRINGS.LAST_30_DAYS_APPROACHED_VOTERS_SCREEN_TITLE, route: ROUTES.LAST_30_DAYS_APPROACHED_VOTERS, icon: '🗓️' },
      { label: STRINGS.LAST_180_DAYS_APPROACHED_VOTERS_SCREEN_TITLE, route: ROUTES.LAST_180_DAYS_APPROACHED_VOTERS, icon: '📆' },
    ]
  },
  {
    heading: STRINGS.MENU_HEADING_RELIGIONWISE_VOTERS,
    group: [
      { label: STRINGS.CHRISTIAN_VOTERS_SCREEN_TITLE, route: ROUTES.CHRISTIAN_VOTERS, icon: '✝️' },
      { label: STRINGS.MUSLIM_VOTERS_SCREEN_TITLE, route: ROUTES.MUSLIM_VOTERS, icon: '☪️' },
      { label: STRINGS.SIKH_VOTERS_SCREEN_TITLE, route: ROUTES.SIKH_VOTERS, icon: '🙏' },
      { label: STRINGS.HINDU_VOTERS_SCREEN_TITLE, route: ROUTES.HINDU_VOTERS, icon: '🕉️' },
      { label: STRINGS.OTHER_RELIGION_VOTERS_SCREEN_TITLE, route: ROUTES.OTHER_RELIGION_VOTERS, icon: '🌍' },
    ]
  },
  {
    heading: STRINGS.MENU_HEADING_CATEGORYWISE_VOTERS,
    group: [
      { label: STRINGS.GENERAL_CATEGORY_VOTERS_SCREEN_TITLE, route: ROUTES.GENERAL_CATEGORY_VOTERS, icon: '🏷️' },
      { label: STRINGS.OBC_CATEGORY_VOTERS_SCREEN_TITLE, route: ROUTES.OBC_CATEGORY_VOTERS, icon: '🏷️' },
      { label: STRINGS.SC_CATEGORY_VOTERS_SCREEN_TITLE, route: ROUTES.SC_CATEGORY_VOTERS, icon: '🏷️' },
      { label: STRINGS.ST_CATEGORY_VOTERS_SCREEN_TITLE, route: ROUTES.ST_CATEGORY_VOTERS, icon: '🏷️' },
      { label: STRINGS.OTHER_CATEGORY_VOTERS_SCREEN_TITLE, route: ROUTES.OTHER_CATEGORY_VOTERS, icon: '🏷️' },
    ]
  },
];

const MenuScreen = ({ navigation }) => {

  const dispatch = useDispatch();
  const { userDetails } = useSelector(state => state[initSliceComponentKey]);
  const [isLoadingNotContactedVotersCount, setIsLoadingNotContactedVotersCount] = useState(false);
  const [notContactedVotersCount, setNotContactedVotersCount] = useState(0);
  const { columns, gridItemWidth, containerStyle, isMobile, responsiveValue } = useResponsive();
   
  useEffect(() => {
    setIsLoadingNotContactedVotersCount(true);

    dispatch(getTotalVotersCount({
      filters: {
        [FILTERS_LIST.list_type]: LIST_TYPE.TOTAL_VOTERS
      },
      onSuccess: (_votersCount) => {
        dispatch(getVotersCount({
          filters: {
            [FILTERS_LIST.list_type]: LIST_TYPE.APPROACHED_VOTERS
          },
          onSuccess: (_votersCountContacted) => {
            const votersCount = _votersCount.reduce((prev, curr) => prev + parseInt(curr.count), 0);
            const contactedVotersCount = _votersCountContacted.reduce((prev, curr) => prev + parseInt(curr.count), 0);
            setNotContactedVotersCount(votersCount - contactedVotersCount);
            
          }, 
          onComplete: () => {
            setIsLoadingNotContactedVotersCount(false);
          }
        }))
        
      }, 
      onComplete: () => {}
    }))
    
  }, [])

  const gap = THEME.SPACING.MD;
  const itemWidth = gridItemWidth(gap, columns, responsiveValue(THEME.SPACING.LG, THEME.SPACING.XL, THEME.SPACING.XXL));

  // Build initials avatar
  const initials = (userDetails?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent]}
        showsVerticalScrollIndicator={true}
      >
        <View style={[containerStyle, { paddingHorizontal: 0 }]}>
          {/* Welcome Header */}
          <View style={styles.welcomeSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.welcomeTitle}>
              {STRINGS.MENU_PAGE_WELCOME_TITLE} {userDetails?.name ?? ''}
            </Text>
          </View>

          {/* Grid Sections */}
          {gridItems.map((section, sectionIndex) => {
            const sColor = SECTION_COLORS[sectionIndex % SECTION_COLORS.length];
            return (
              <View key={sectionIndex} style={styles.section}>
                {section.heading ? (
                  <View style={[styles.sectionHeader, { borderLeftColor: sColor.accent }]}>
                    <Text style={[styles.sectionTitle, { color: sColor.accent }]}>{section.heading}</Text>
                  </View>
                ) : null}

                <View style={[styles.gridContainer, { gap, paddingHorizontal: responsiveValue(THEME.SPACING.LG, THEME.SPACING.XL, THEME.SPACING.XXL) }]}>
                  {section.group.map((item, ind) => (
                    <Pressable
                      key={ind}
                      onPress={() => item.route == null ? null : navigation.navigate(item.route)}
                      style={({ pressed, hovered }) => [
                        { opacity: item.route == null ? 0.5 : pressed ? 0.85 : 1 },
                        hovered && item.route != null ? { transform: [{ scale: 1.02 }] } : {},
                      ]}
                    >
                      <View style={[styles.statBox, { width: itemWidth, borderLeftColor: sColor.accent }]}>
                        <Text style={styles.statIcon}>{item.icon}</Text>
                        <Text style={styles.statCount}>
                          {
                            item.label === STRINGS.UNAPPROACHED_VOTERS_SCREEN_TITLE
                            ? isLoadingNotContactedVotersCount ? <ActivityIndicator size="small" color={THEME.COLOR.PRIMARY} /> : notContactedVotersCount
                            : ''
                          }
                        </Text>
                        <Text style={styles.statText} numberOfLines={2}>{item.label}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: THEME.SPACING.XXXL,
    alignItems: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
    paddingTop: THEME.SPACING.XL,
    paddingBottom: THEME.SPACING.LG,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.COLOR.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.SPACING.MD,
    ...THEME.SHADOW.MEDIUM,
  },
  avatarText: {
    fontSize: THEME.FONT_SIZE.XXL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: '#FFF',
  },
  welcomeTitle: {
    fontSize: THEME.FONT_SIZE.XL,
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    textAlign: 'center',
  },
  section: {
    marginBottom: THEME.SPACING.XL,
    width: '100%',
  },
  sectionHeader: {
    borderLeftWidth: 4,
    paddingVertical: THEME.SPACING.MD,
    paddingHorizontal: THEME.SPACING.LG,
    marginHorizontal: THEME.SPACING.LG,
    marginBottom: THEME.SPACING.SM,
    backgroundColor: THEME.COLOR.SURFACE_ELEVATED,
    borderRadius: THEME.BORDER_RADIUS.SM,
  },
  sectionTitle: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statBox: {
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.MD,
    paddingVertical: THEME.SPACING.LG,
    paddingHorizontal: THEME.SPACING.MD,
    alignItems: 'center',
    borderLeftWidth: 3,
    minHeight: 100,
    justifyContent: 'center',
    ...THEME.SHADOW.LIGHT,
  },
  statIcon: {
    fontSize: 22,
    marginBottom: THEME.SPACING.XS,
  },
  statCount: {
    fontSize: THEME.FONT_SIZE.XXL,
    fontWeight: THEME.FONT_WEIGHT.EXTRABOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    textAlign: 'center',
  },
  statText: {
    fontSize: THEME.FONT_SIZE.SM,
    color: THEME.COLOR.TEXT_SECONDARY,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
    textAlign: 'center',
    marginTop: THEME.SPACING.XS,
  },
});

export default MenuScreen;
