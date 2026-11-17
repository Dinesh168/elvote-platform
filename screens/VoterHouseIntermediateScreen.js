import { Pressable, StyleSheet, View } from "react-native";
import { useGetPollingStations } from "../utils/hooks/useGetPollingStations.js";
import { useEffect, useState } from "react";
import FlashListCompat from '../components/ui/FlashListCompat';
import { ActivityIndicator, Button, DefaultTheme, Text, ThemeProvider } from "react-native-paper";
import { BOOTH_STRENGTH, FILTERS_LIST, INTERMEDIATE_ROUTES, ROUTES } from "../constant.js";
import { THEME } from "../theme.js";
import {STRINGS} from "../strings.js";
import { getTotalVotersCountByAddress } from "../storemanagement/votersapproached/VotersApproachedSaga.js";
import { useDispatch } from "react-redux";
import useResponsive from '../utils/hooks/useResponsive';

export default function VoterHouseIntermediateScreen({navigation, route}) {
  const { responsiveValue } = useResponsive();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isMoreItems, setIsMoreItems] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = (pageNum) => {
    setIsLoading(true);
    dispatch(getTotalVotersCountByAddress({
      pageNum: pageNum ?? page,
      filters: route.params?.filters ?? {},
      onSuccess: (_data) => {
        if (_data.length === 0) {
          setIsMoreItems(false); 
          return;
        }
        setData(prevData => [...prevData, ..._data]);
        setPage(prevPage => prevPage + 1);
      }, 
      onComplete: () => {
        setIsLoading(false);
      }
    }));
  }

  const renderItem = ({ item }) => {
    const count = item?.count?.toString() ?? "0";

    return (
      <Pressable onPress={
        () => navigation.navigate(
            ROUTES.SAME_ADDRESSS_VOTERS
          , {
            filters: {
              [FILTERS_LIST.voter_address]: item.address
            }
          }
        )
      }>
        <View style={[styles.itemContainer, {
          backgroundColor: THEME.COLOR.SURFACE,
          maxWidth: responsiveValue('100%', 720, 800),
          alignSelf: 'center',
          width: '100%',
        }]}>
          <View style={styles.left}>
            <Text variant='titleMedium' style={styles.addressText}>{item.address}</Text>
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

  const loadMore = () => {
    if (!isLoading) {
      fetchData();
    }
  };

  return (
    <View style={styles.appContainer}>
      <View style={{width: '100%', flex: 1, overflow: 'hidden'}}>
        <FlashListCompat
          data={data}
          renderItem={renderItem}
          keyExtractor={item => item.address.toString()}
          onEndReached={isMoreItems ? loadMore : () => {}}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isLoading ? <ActivityIndicator size="large" color={THEME.COLOR.PRIMARY} style={{ marginVertical: THEME.SPACING.MD }} /> : null}
          estimatedItemSize={70}
          ListEmptyComponent={() => !isLoading && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Text style={{ fontSize: 32 }}>🏠</Text>
              </View>
              <Text style={styles.emptyTitle}>No house addresses</Text>
              <Text style={styles.emptySubtitle}>No voters or addresses match your current filters</Text>
            </View>
          )}
        />
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
  itemContainer: {
    marginHorizontal: THEME.SPACING.MD,
    marginVertical: THEME.SPACING.XS,
    padding: THEME.SPACING.LG,
    borderRadius: THEME.CARD.BORDER_RADIUS,
    flexDirection: 'row', 
    alignItems: 'center',
    gap: THEME.SPACING.LG,
    ...THEME.SHADOW.LIGHT,
    borderLeftWidth: 4,
    borderLeftColor: THEME.COLOR.PRIMARY,
  },
  left: {
    flex: 1,
    gap: THEME.SPACING.SM,
  },
  addressText: {
    textTransform: 'capitalize',
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
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
