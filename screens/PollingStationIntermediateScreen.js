import { Pressable, StyleSheet, View } from "react-native";
import { useGetPollingStations } from "../utils/hooks/useGetPollingStations.js";
import { useEffect, useRef, useState } from "react";
import FlashListCompat from '../components/ui/FlashListCompat';
import { Button, DefaultTheme, Text, ThemeProvider, IconButton } from "react-native-paper";
import { BOOTH_STRENGTH, FILTERS_LIST, INTERMEDIATE_ROUTES, ROUTES } from "../constant.js";
import { THEME } from "../theme.js";
import {STRINGS} from "../strings.js";
import useResponsive from '../utils/hooks/useResponsive';

const LIST_ORDER = {
  ASC: 'ASC',
  DESC: 'DESC',
  NONE: 'NONE'
}

export default function PollingStationIntermediateScreen({navigation, route}) {
  const { responsiveValue, contentMaxWidth } = useResponsive();
  const pollingStationsList = useGetPollingStations();
  const [initialPsData, setInitialPsData] = useState(() => {
    const finalPsData = [];
    const addedData = [];
    route.params.votersPSData?.forEach(item => {
      const pollingStation = pollingStationsList.find(ps => ps.id === item.polling_station_id);
      if (!pollingStation) return;
      addedData.push(pollingStation.id);
      finalPsData.push({
        ...item,
        part_no: pollingStation.part_no
      });
    })

    if (route.params.includeAllPollingStations === false) {

    } else {
      pollingStationsList?.filter(ps => !addedData.includes(ps.id)).forEach(ps => {
        finalPsData.push({
          polling_station_id: ps.id,
          count: 0,
          part_no: ps.part_no
        });
      })
    }

    return finalPsData?.sort((a,b) => a.part_no - b.part_no);
  });

  const isBs = () => (pollingStationsList?.[0]?.booth_strength ?? BOOTH_STRENGTH.O.VAL) !== BOOTH_STRENGTH.O.VAL;
  
  const [psData, setPSData] = useState([...initialPsData]);
  const [refresh, setRefresh] = useState(false);
  const [listOrder, setListOrder] = useState(LIST_ORDER.NONE);
  const [boothStrength, setBoothStrength] = useState({
    [BOOTH_STRENGTH.S.VAL]: route.params?.defaultBoothStrengthFilter?.includes(BOOTH_STRENGTH.S.VAL) ?? true,
    [BOOTH_STRENGTH.M.VAL]: route.params?.defaultBoothStrengthFilter?.includes(BOOTH_STRENGTH.M.VAL) ?? true,
    [BOOTH_STRENGTH.W.VAL]: route.params?.defaultBoothStrengthFilter?.includes(BOOTH_STRENGTH.W.VAL) ?? true,
  });
  const [isBoothStrength, setIsBoothStrength] = useState(isBs());
  const [boothStrengthCount, setBoothStrengthCount] = useState({
    [BOOTH_STRENGTH.S.VAL]: 0,
    [BOOTH_STRENGTH.M.VAL]: 0,
    [BOOTH_STRENGTH.W.VAL]: 0,
  });

  
  useEffect(() => {
    setIsBoothStrength(isBs());
    if (isBs()) {
      const bsCount = {
        [BOOTH_STRENGTH.S.VAL]: 0,
        [BOOTH_STRENGTH.M.VAL]: 0,
        [BOOTH_STRENGTH.W.VAL]: 0,
      };

      pollingStationsList.forEach(element => {
        if (element?.booth_strength && element.booth_strength !== BOOTH_STRENGTH.O.VAL) {
          bsCount[element.booth_strength] += 1;
        }
      });

      setBoothStrengthCount(bsCount);
    }
  }, [pollingStationsList])

  useEffect(() => {
    if (isBoothStrength) {
      const filteredList = pollingStationsList.filter(psl => boothStrength[psl.booth_strength] === true).map(psl => psl.id)
      setPSData(initialPsData.filter(ps => filteredList.includes(ps.polling_station_id)))
      setListOrder(LIST_ORDER.NONE);
    }
  }, [boothStrength, isBoothStrength])

  const refreshList = () => {
    setRefresh(true);
    setTimeout(() => setRefresh(false), 60)
  }
  
  const handleSortToggle = () => {
    if (listOrder === LIST_ORDER.NONE) {
      setPSData(prev => [...prev].sort((a, b) => a.count - b.count));
      setListOrder(LIST_ORDER.ASC);
    } else if (listOrder === LIST_ORDER.ASC) {
      setPSData(prev => [...prev].sort((a, b) => b.count - a.count));
      setListOrder(LIST_ORDER.DESC);
    } else {
      setPSData(prev => [...prev].sort((a, b) => a.part_no - b.part_no));
      setListOrder(LIST_ORDER.NONE);
    }
    refreshList();
  };

  const renderItem = ({ item }) => {
    const pollingStation = pollingStationsList.find(ps => ps.id === item.polling_station_id);
    if (!pollingStation) return null;
    const count = item?.count?.toString() ?? "0";

    return (
      <Pressable onPress={
        () => item?.count > 0 ? navigation.navigate(
          route.params.nextScreen === INTERMEDIATE_ROUTES.VOTERS_LIST
          ? ROUTES.VOTERS_COUNT_LIST
          : route.params.nextScreen === INTERMEDIATE_ROUTES.VOTERS_LIST_WITH_FILTERS
            ? ROUTES.VOTERS_LIST_WITH_FILTERS
            : route.params.nextScreen === INTERMEDIATE_ROUTES.VOTERS_APPROACHED_LIST
              ? ROUTES.VOTERS_APPROACHED_LIST
              : route.params.nextScreen === INTERMEDIATE_ROUTES.VOLUNTEERS_LIST
                ? ROUTES.VOLUNTEERS_INTERMEDIATE_LIST
                : route.params.nextScreen === INTERMEDIATE_ROUTES.ALL_POLLING_STATION_DATA
                  ? ROUTES.POLLING_STATION_ALL_DATA
                  : route.params.nextScreen === INTERMEDIATE_ROUTES.LIVE_VOTING_VOTERS_LIST
                    ? ROUTES.VOTERS_VOTED_LIST
                    : route.params.nextScreen === INTERMEDIATE_ROUTES.VOTER_HOUSE_LIST
                      ? ROUTES.VOTER_HOUSE_LIST
                      : route.params.nextScreen === INTERMEDIATE_ROUTES.VOTERS_UNAPPROACHED_LIST
                        ? ROUTES.UNAPPROACHED_VOTERS
                        : route.params.nextScreen === INTERMEDIATE_ROUTES.POSITIVE_OPINION_VOTERS
                          ? ROUTES.POSITIVE_OPINION_VOTERS
                          : route.params.nextScreen === INTERMEDIATE_ROUTES.NEGATIVE_OPINION_VOTERS
                            ? ROUTES.NEGATIVE_OPINION_VOTERS
                            : route.params.nextScreen === INTERMEDIATE_ROUTES.UNDECIDED_OPINION_VOTERS
                              ? ROUTES.UNDECIDED_OPINION_VOTERS
                              : route.params.nextScreen === INTERMEDIATE_ROUTES.UNCAPTURED_OPINION_VOTERS
                                ? ROUTES.UNCAPTURED_OPINION_VOTERS
                                : route.params.nextScreen === INTERMEDIATE_ROUTES.MIGRATED_VOTERS_SCREEN
                                  ? ROUTES.MIGRATED_VOTERS_SCREEN
                                  : route.params.nextScreen === INTERMEDIATE_ROUTES.NOT_MIGRATED_VOTERS_SCREEN
                                    ? ROUTES.NOT_MIGRATED_VOTERS_SCREEN
                                    : route.params.nextScreen === INTERMEDIATE_ROUTES.MOBILE_AVAILABLE_VOTERS
                                      ? ROUTES.MOBILE_AVAILABLE_VOTERS
                                      : route.params.nextScreen === INTERMEDIATE_ROUTES.MOBILE_NOT_AVAILABLE_VOTERS
                                        ? ROUTES.MOBILE_NOT_AVAILABLE_VOTERS
                                        : route.params.nextScreen === INTERMEDIATE_ROUTES.MOBILE_AVAILABLE_OUR_VOTERS
                                          ? ROUTES.MOBILE_AVAILABLE_OUR_VOTERS
                                          : route.params.nextScreen === INTERMEDIATE_ROUTES.MOBILE_AVAILABLE_OPP_VOTERS
                                            ? ROUTES.MOBILE_AVAILABLE_OPP_VOTERS
                                            : route.params.nextScreen === INTERMEDIATE_ROUTES.MOBILE_AVAILABLE_SWING_VOTERS
                                              ? ROUTES.MOBILE_AVAILABLE_SWING_VOTERS
                                              : ROUTES.VOTERS_COUNT_LIST
          , {
            filters: {
              ...route.params.filters,
              [FILTERS_LIST.polling_station_ids]: [item.polling_station_id]
            }
          }
        ) : {}
      }>
        <View style={[styles.itemContainer, {
          borderColor: pollingStation?.booth_strength === BOOTH_STRENGTH.S.VAL 
                            ? THEME.COLOR.SUCCESS
                            : pollingStation?.booth_strength === BOOTH_STRENGTH.M.VAL
                              ? THEME.COLOR.WARNING
                              : pollingStation?.booth_strength === BOOTH_STRENGTH.W.VAL
                                ? THEME.COLOR.DANGER
                                : THEME.COLOR.BORDER,
          backgroundColor: THEME.COLOR.SURFACE,
          borderLeftWidth: 4,
          maxWidth: responsiveValue('100%', 720, 800),
          alignSelf: 'center',
          width: '100%',
        }]}>
          <View style={styles.left}>
            <Text variant='titleLarge' style={{textTransform: 'capitalize', fontWeight: THEME.FONT_WEIGHT.BOLD}}>{pollingStation.name}</Text>
            <Text variant='bodyLarge'>
              <Text style={{fontWeight: 'bold', color: THEME.COLOR.TEXT_SECONDARY}}>{STRINGS.PART_NO_LABEL}: </Text> 
              {pollingStation.part_no}
            </Text>
          </View>
          {
            !route.params?.noCount && 
            <View style={styles.right}>
              <Text variant={
                count.length <= 3
                ? 'headlineLarge'
                : count.length === 4
                  ? 'headlineSmall'
                  : 'bodyLarge'
              } style={styles.count}>{item.count}</Text>
            </View>
          }
          
        </View>
      </Pressable>
    )
  }

  
  return (
    <View style={styles.appContainer}>
      <View style={styles.controlHeader}>
        {isBoothStrength && (
          <View style={styles.boothStrengthBar}>
            <Pressable
              onPress={() => setBoothStrength(prev => ({...prev, [BOOTH_STRENGTH.S.VAL]: !prev[BOOTH_STRENGTH.S.VAL]}))}
              style={({ pressed }) => [
                styles.bsIndicator,
                {
                  backgroundColor: boothStrength[BOOTH_STRENGTH.S.VAL] ? THEME.COLOR.SUCCESS : THEME.COLOR.SURFACE,
                  borderColor: THEME.COLOR.SUCCESS,
                },
                pressed && { opacity: THEME.OPACITY.PRESSED }
              ]}
            >
              <View style={[styles.bsDot, { backgroundColor: boothStrength[BOOTH_STRENGTH.S.VAL] ? '#FFF' : THEME.COLOR.SUCCESS }]} />
              <Text style={[styles.bsLabel, { color: boothStrength[BOOTH_STRENGTH.S.VAL] ? '#FFF' : THEME.COLOR.SUCCESS }]}>
                {BOOTH_STRENGTH.S.LABEL}
              </Text>
              <Text style={[styles.bsCount, { color: boothStrength[BOOTH_STRENGTH.S.VAL] ? 'rgba(255,255,255,0.8)' : THEME.COLOR.TEXT_SECONDARY }]}>
                ({boothStrengthCount[BOOTH_STRENGTH.S.VAL]})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setBoothStrength(prev => ({...prev, [BOOTH_STRENGTH.M.VAL]: !prev[BOOTH_STRENGTH.M.VAL]}))}
              style={({ pressed }) => [
                styles.bsIndicator,
                {
                  backgroundColor: boothStrength[BOOTH_STRENGTH.M.VAL] ? THEME.COLOR.WARNING : THEME.COLOR.SURFACE,
                  borderColor: THEME.COLOR.WARNING,
                },
                pressed && { opacity: THEME.OPACITY.PRESSED }
              ]}
            >
              <View style={[styles.bsDot, { backgroundColor: boothStrength[BOOTH_STRENGTH.M.VAL] ? '#FFF' : THEME.COLOR.WARNING }]} />
              <Text style={[styles.bsLabel, { color: boothStrength[BOOTH_STRENGTH.M.VAL] ? '#FFF' : THEME.COLOR.WARNING }]}>
                {BOOTH_STRENGTH.M.LABEL}
              </Text>
              <Text style={[styles.bsCount, { color: boothStrength[BOOTH_STRENGTH.M.VAL] ? 'rgba(255,255,255,0.8)' : THEME.COLOR.TEXT_SECONDARY }]}>
                ({boothStrengthCount[BOOTH_STRENGTH.M.VAL]})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setBoothStrength(prev => ({...prev, [BOOTH_STRENGTH.W.VAL]: !prev[BOOTH_STRENGTH.W.VAL]}))}
              style={({ pressed }) => [
                styles.bsIndicator,
                {
                  backgroundColor: boothStrength[BOOTH_STRENGTH.W.VAL] ? THEME.COLOR.DANGER : THEME.COLOR.SURFACE,
                  borderColor: THEME.COLOR.DANGER,
                },
                pressed && { opacity: THEME.OPACITY.PRESSED }
              ]}
            >
              <View style={[styles.bsDot, { backgroundColor: boothStrength[BOOTH_STRENGTH.W.VAL] ? '#FFF' : THEME.COLOR.DANGER }]} />
              <Text style={[styles.bsLabel, { color: boothStrength[BOOTH_STRENGTH.W.VAL] ? '#FFF' : THEME.COLOR.DANGER }]}>
                {BOOTH_STRENGTH.W.LABEL}
              </Text>
              <Text style={[styles.bsCount, { color: boothStrength[BOOTH_STRENGTH.W.VAL] ? 'rgba(255,255,255,0.8)' : THEME.COLOR.TEXT_SECONDARY }]}>
                ({boothStrengthCount[BOOTH_STRENGTH.W.VAL]})
              </Text>
            </Pressable>
          </View>
        )}

        {!route.params?.noCount && (
          <View style={styles.sortingBar}>
            <Pressable
              onPress={handleSortToggle}
              style={({ pressed }) => [
                styles.sortIconButton,
                listOrder !== LIST_ORDER.NONE && styles.sortIconButtonActive,
                pressed && { opacity: THEME.OPACITY.PRESSED }
              ]}
            >
              <IconButton
                icon={
                  listOrder === LIST_ORDER.ASC ? "sort-ascending" :
                  listOrder === LIST_ORDER.DESC ? "sort-descending" :
                  "sort"
                }
                size={20}
                iconColor={listOrder !== LIST_ORDER.NONE ? '#FFF' : THEME.COLOR.PRIMARY}
                style={{ margin: 0 }}
              />
            </Pressable>
          </View>
        )}
      </View>

      <View style={{width: '100%', flex: 1, overflow: 'hidden'}}>
        {!refresh && <FlashListCompat
          data={psData}
          renderItem={renderItem}
          keyExtractor={item => item.polling_station_id.toString()}
          estimatedItemSize={90}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Text style={{ fontSize: 32 }}>🏛️</Text>
              </View>
              <Text style={styles.emptyTitle}>No polling stations</Text>
              <Text style={styles.emptySubtitle}>No polling stations match your current filters</Text>
            </View>
          )}
        />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    width: '100%',
    flex: 1,
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  controlHeader: {
    borderBottomWidth: 1, 
    borderBottomColor: THEME.COLOR.BORDER,
    backgroundColor: THEME.COLOR.SURFACE,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: THEME.SPACING.MD,
    paddingVertical: THEME.SPACING.SM,
    ...THEME.SHADOW.LIGHT,
    flexWrap: 'wrap',
    gap: THEME.SPACING.SM,
  },
  boothStrengthBar: {
    flexDirection: 'row', 
    gap: THEME.SPACING.SM, 
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  sortingBar: {
    flexDirection: 'row',
    gap: THEME.SPACING.XS,
    alignItems: 'center',
  },
  sortIconButton: {
    borderRadius: THEME.BORDER_RADIUS.SM,
    borderWidth: 1,
    borderColor: THEME.COLOR.BORDER,
    backgroundColor: THEME.COLOR.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortIconButtonActive: {
    backgroundColor: THEME.COLOR.PRIMARY,
    borderColor: THEME.COLOR.PRIMARY,
  },
  bsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.SPACING.XS,
    paddingHorizontal: THEME.SPACING.MD,
    paddingVertical: THEME.SPACING.XS,
    borderRadius: THEME.BORDER_RADIUS.FULL,
    borderWidth: 1,
  },
  bsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bsLabel: {
    fontSize: THEME.FONT_SIZE.SM,
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
  },
  bsCount: {
    fontSize: THEME.FONT_SIZE.XS,
    color: THEME.COLOR.TEXT_SECONDARY,
  },
  itemContainer: {
    marginHorizontal: THEME.SPACING.MD,
    marginVertical: THEME.SPACING.XS,
    padding: THEME.SPACING.LG,
    borderRadius: THEME.CARD.BORDER_RADIUS,
    flexDirection: 'row', 
    gap: THEME.SPACING.LG,
    ...THEME.SHADOW.LIGHT,
  },
  left: {
    flex: 1,
    gap: THEME.SPACING.SM,
  },
  right: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
    borderRadius: THEME.BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: 'rgba(24, 76, 161, 0.15)',
  },
  count: {
    color: THEME.COLOR.PRIMARY,
    fontWeight: THEME.FONT_WEIGHT.EXTRABOLD,
  },
  sortBar: {
    padding: THEME.SPACING.SM, 
    backgroundColor: THEME.COLOR.SURFACE, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: THEME.COLOR.BORDER,
    paddingHorizontal: THEME.SPACING.MD,
    ...THEME.SHADOW.LIGHT,
  },
  sortButton: {
    borderRadius: THEME.BORDER_RADIUS.SM,
  },
  boothFilterRow: {
    flexDirection: 'row',
  },
  boothBtnLeft: {
    borderTopLeftRadius: THEME.BORDER_RADIUS.SM,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: THEME.BORDER_RADIUS.SM,
    borderBottomRightRadius: 0,
  },
  boothBtnCenter: {
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  boothBtnRight: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: THEME.BORDER_RADIUS.SM,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: THEME.BORDER_RADIUS.SM,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: THEME.SPACING.XXXXL,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.SPACING.LG,
  },
  emptyTitle: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    marginBottom: THEME.SPACING.XS,
  },
  emptySubtitle: {
    fontSize: THEME.FONT_SIZE.SM,
    color: THEME.COLOR.TEXT_SECONDARY,
  },
});
