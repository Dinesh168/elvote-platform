import { useEffect, useState } from "react";
import { View, useWindowDimensions, StyleSheet, Pressable } from "react-native";
import { SceneMap, TabView, TabBar } from "react-native-tab-view";
import { useDispatch, useSelector } from "react-redux";
import { componentKey as usersManagementComponentKey } from "../storemanagement/usersmanagement/UsersManagementSlice";
import { getVolunteersRejected, getVolunteersToApprove, setApproveUser, setRejectUser } from "../storemanagement/usersmanagement/UsersManagementSaga";
import { ActivityIndicator, Button, IconButton, Text, Icon } from "react-native-paper";
import FlashListCompat from '../components/ui/FlashListCompat';
import SingleSelectModal from "../components/singleselect/SingleSelectModal";
import { useGetPollingStations } from "../utils/hooks/useGetPollingStations";
import { THEME } from "../theme";
import { STRINGS } from "../strings";
import useResponsive from '../utils/hooks/useResponsive';

const PendingRoute = () => {
  const dispatch = useDispatch();
  const { volunteers_to_approve } = useSelector(state => state[usersManagementComponentKey])
  const [isLoading, setIsLoading] = useState(false);

  const pollingStationsList = useGetPollingStations();

  useEffect(() => {
    setIsLoading(true);
    dispatch(getVolunteersToApprove({
      onComplete: () => {
        setIsLoading(false);
      }
    }))
  }, [])

  const RenderItem = ({ item }) => {
    const dispatch = useDispatch();
    const [openModal, setOpenModal] = useState(false);
    const [selectedPollingStation, setSelectedPollingStation] = useState(null);

    const reject = () => {
      dispatch(setRejectUser({ 
        item,
        onSuccess: () => {}, 
        onComplete: () => {}
      }))
    }

    const approve = () => {
      dispatch(setApproveUser({
        uniqueId: item.unique_id, 
        pollingStationId: selectedPollingStation,
        onSuccess: () => {
          setOpenModal(false);
        }, 
        onComplete: () => {}
      }))
    }

    const { responsiveValue } = useResponsive();

    return (
      <>
        <View style={[styles.itemContainer, {
          maxWidth: responsiveValue('100%', 720, 800),
          borderLeftColor: THEME.COLOR.WARNING,
        }]}>
          <View style={styles.itemHeader}>
            <View style={[styles.avatarCircle, { backgroundColor: THEME.COLOR.WARNING_BACKGROUND }]}>
              <Text style={[styles.avatarText, { color: THEME.COLOR.WARNING }]}>
                {item.name?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemEmail}>{item.email}</Text>
            </View>
          </View>
          
          <View style={styles.actionRow}>
            <Button 
              mode="contained" 
              buttonColor={THEME.COLOR.SUCCESS} 
              onPress={() => setOpenModal(true)}
              style={styles.actionButton}
              labelStyle={styles.btnLabel}
              icon="check-decagram"
            >
              {STRINGS.APPROVE_VOLUNTEER_BUTTON}
            </Button>
            <Button 
              mode="outlined" 
              textColor={THEME.COLOR.DANGER} 
              borderColor={THEME.COLOR.DANGER}
              onPress={reject}
              style={[styles.actionButton, { borderColor: THEME.COLOR.DANGER }]}
              labelStyle={styles.btnLabel}
              icon="close-octagon-outline"
            >
              {STRINGS.REJECT_VOLUNTEER_BUTTON}
            </Button>
          </View>
        </View>
        {pollingStationsList.length > 0 && <SingleSelectModal
          openModal={openModal}
          setOpenModal={setOpenModal}
          selectedValue={selectedPollingStation}
          setSelectedValueCb={setSelectedPollingStation}
          completeList={pollingStationsList.map(pollingStation => ({ id: pollingStation.id, value: `${pollingStation.name} (${STRINGS.PART_NO_LABEL} - ${pollingStation.part_no})` }))}
          onPressSubmit={approve}
        />}
      </>
    )
  }

  const renderItem = ({ item }) => {
    return <RenderItem item={item} />
  }

  return (
    <View style={styles.routeContainer}>
      {volunteers_to_approve.length === 0 && !isLoading && (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: THEME.COLOR.SUCCESS_BACKGROUND }]}>
            <Text style={{ fontSize: 32 }}>🎉</Text>
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>{STRINGS.NO_PENDING_VOLUNTEER}</Text>
        </View>
      )}
      {isLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={THEME.COLOR.PRIMARY} />
        </View>
      )}
      {pollingStationsList.length > 0 && volunteers_to_approve.length > 0 && !isLoading && (
        <FlashListCompat
          data={volunteers_to_approve}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          estimatedItemSize={80}
        />
      )}
    </View>
  )
}

const RejectedRoute = () => {
  const dispatch = useDispatch();
  const { volunteers_rejected } = useSelector(state => state[usersManagementComponentKey])
  const [isLoading, setIsLoading] = useState(false);

  const pollingStationsList = useGetPollingStations();

  useEffect(() => {
    setIsLoading(true);
    dispatch(getVolunteersRejected({
      onComplete: () => {
        setIsLoading(false);
      }
    }))
  }, [])

  const RenderItem = ({ item }) => {
    const dispatch = useDispatch();
    const [openModal, setOpenModal] = useState(false);
    const [selectedPollingStation, setSelectedPollingStation] = useState(null);

    const approve = () => {
      dispatch(setApproveUser({
        uniqueId: item.unique_id, 
        pollingStationId: selectedPollingStation,
        onSuccess: () => {
          setOpenModal(false);
        }, 
        onComplete: () => {}
      }))
    }

    const { responsiveValue } = useResponsive();

    return (
      <>
        <View style={[styles.itemContainer, {
          maxWidth: responsiveValue('100%', 720, 800),
          borderLeftColor: THEME.COLOR.DANGER,
        }]}>
          <View style={styles.itemHeader}>
            <View style={[styles.avatarCircle, { backgroundColor: THEME.COLOR.DANGER_BACKGROUND }]}>
              <Text style={[styles.avatarText, { color: THEME.COLOR.DANGER }]}>
                {item.name?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemEmail}>{item.email}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Button 
              mode="contained" 
              buttonColor={THEME.COLOR.SUCCESS} 
              onPress={() => setOpenModal(true)}
              style={styles.actionButton}
              labelStyle={styles.btnLabel}
              icon="check-decagram"
            >
              {STRINGS.APPROVE_VOLUNTEER_BUTTON}
            </Button>
          </View>
        </View>
        {pollingStationsList.length > 0 && <SingleSelectModal
          openModal={openModal}
          setOpenModal={setOpenModal}
          selectedValue={selectedPollingStation}
          setSelectedValueCb={setSelectedPollingStation}
          completeList={pollingStationsList.map(pollingStation => ({ id: pollingStation.id, value: `${pollingStation.name} (${STRINGS.PART_NO_LABEL} - ${pollingStation.part_no})` }))}
          onPressSubmit={approve}
        />}
      </>
    )
  }

  const renderItem = ({ item }) => {
    return <RenderItem item={item} />
  }

  return (
    <View style={styles.routeContainer}>
      {volunteers_rejected.length === 0 && !isLoading && (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND }]}>
            <Text style={{ fontSize: 32 }}>👍</Text>
          </View>
          <Text style={styles.emptyTitle}>No rejected requests</Text>
          <Text style={styles.emptySubtitle}>{STRINGS.NO_REJECTED_VOLUNTEER}</Text>
        </View>
      )}
      {isLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={THEME.COLOR.PRIMARY} />
        </View>
      )}
      {pollingStationsList.length > 0 && volunteers_rejected.length > 0 && !isLoading && (
        <FlashListCompat
          data={volunteers_rejected}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          estimatedItemSize={80}
        />
      )}
    </View>
  )
}

const renderScene = SceneMap({
  pending: PendingRoute,
  rejected: RejectedRoute,
});

export default function ActivateVolunteersScreen({ navigation }) {
  const layout = useWindowDimensions();

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'pending', title: STRINGS.PENDING_VOLUNTEER_TAB },
    { key: 'rejected', title: STRINGS.REJECTED_VOLUNTEER_TAB },
  ]);

  const [refresh, setRefresh] = useState(false);
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <IconButton
        icon="refresh"
        iconColor={THEME.COLOR.PRIMARY_FOREGROUND}
        size={20}
        onPress={() => {
          setRefresh(true);
          setTimeout(() => setRefresh(false), 60)
        }}
      />,
    });
  }, [navigation]);

  const renderTabBar = props => (
    <TabBar
      {...props}
      indicatorStyle={styles.tabIndicator}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
      activeColor={THEME.COLOR.PRIMARY}
      inactiveColor={THEME.COLOR.TEXT_SECONDARY}
    />
  );

  return (
    <View style={styles.container}>
      {!refresh && <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  routeContainer: {
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: THEME.SPACING.MD,
    paddingTop: THEME.SPACING.SM,
  },
  tabBar: {
    backgroundColor: THEME.COLOR.SURFACE,
    ...THEME.SHADOW.LIGHT,
  },
  tabIndicator: {
    backgroundColor: THEME.COLOR.PRIMARY,
    height: 3,
  },
  tabLabel: {
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    fontSize: THEME.FONT_SIZE.SM,
    textTransform: 'uppercase',
  },
  itemContainer: {
    padding: THEME.SPACING.LG, 
    marginVertical: THEME.SPACING.XS, 
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.CARD.BORDER_RADIUS,
    alignSelf: 'center',
    width: '100%',
    borderLeftWidth: 4,
    ...THEME.SHADOW.LIGHT,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.SPACING.MD,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: THEME.FONT_SIZE.MD,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
  },
  itemEmail: {
    fontSize: THEME.FONT_SIZE.SM,
    color: THEME.COLOR.TEXT_SECONDARY,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: THEME.SPACING.MD,
    marginTop: THEME.SPACING.LG,
  },
  actionButton: {
    flex: 1,
    borderRadius: THEME.BORDER_RADIUS.SM,
  },
  btnLabel: {
    fontSize: THEME.FONT_SIZE.XS,
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: THEME.SPACING.XXXXL,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    textAlign: 'center',
    paddingHorizontal: THEME.SPACING.XL,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
