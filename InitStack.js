import React, { useEffect, useState } from 'react';
import './firebaseConfig';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer';
import HomeScreen from './screens/HomeScreen';
import { useDispatch, useSelector } from 'react-redux';
import { componentKey as initSliceComponentKey } from './storemanagement/initscreen/InitSlice';
import { getPartyData, getSelfUser } from './storemanagement/initscreen/InitSaga';
import useGarbageCollector from './utils/hooks/garbageCollectorHooks';
import LogoutScreen from './screens/LogoutScreen';
import UploadVotersScreen from './screens/UploadVotersScreen';
import {PRIVATE_USER_ID, ROUTES, USER_ROLE} from './constant';
import CreateConstituencyScreen from './screens/CreateConstituencyScreen';
import CreateAccountScreen from './screens/CreateAccountScreen';
import CreateAdminUserScreen from './screens/CreateAdminUserScreen';
import { useAuthentication } from './utils/hooks/useAuthentication';
import VoterListScreen from './screens/VoterListScreen';
import VolunteersListScreen from './screens/VolunteersListScreen';
import VoterOpinionScreen from './screens/VoterOpinionScreen';
import TrendAnalyticsScreen from './screens/TrendAnalyticsScreen';
import VoterSlipPrintingScreen from './screens/VoterSlipPrintingScreen';
import LiveVotingScreen from './screens/LiveVotingScreen';
import MapScreen from './screens/MapScreen';
import IssuesScreen from './screens/IssuesScreen';
import AssignTaskScreen from './screens/AssignTaskScreen';
import ScheduleMeetingScreen from './screens/ScheduleMeetingScreen';
import CasteEquationsScreen from './screens/CasteEquationsScreen';
import ActivateVolunteersScreen from './screens/ActivateVolunteersScreen';
import VotersStatisticsScreen from './screens/VotersStatisticsScreen';
import { useGetPollingStations } from './utils/hooks/useGetPollingStations';
import { setPollingStationsList } from './storemanagement/filtersort/FilterSortSlice';
import VoterListWithPS from './components/voterlist/VoterListWithPS';
import ResponseAnalysisScreen from './screens/ResponseAnalysisScreen';
import { Image, View, Text, StyleSheet } from 'react-native';
import PollingStationListScreen from './screens/PollingStationListScreen';
import { THEME } from './theme';
import { ActivityIndicator, Button, Icon } from 'react-native-paper';
import { getAuth, signOut } from 'firebase/auth';
import DownloadVotersApproachedDataScreen from './screens/DownloadVotersApproachedDataScreen';
import VotersSearchScreen from './screens/VotersSearchScreen';
import { STRINGS } from './strings';
import LanguageScreen from './screens/LanguageScreen';
import MenuScreen from './screens/MenuScreen';
import PollingDayScreen from './screens/PollingDayScreen';
import ACOverviewScreen from './screens/ACOverviewScreen';
import ForumScreen from './screens/ForumScreen';
import MessagesScreen from './screens/MessagesScreen';
import SurnameListScreen from './screens/SurnameListScreen';
import PartyUpdatesScreen from './screens/PartyUpdatesScreen';
import PracharKitScreen from './screens/PracharKitScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import useResponsive from './utils/hooks/useResponsive';

const auth = getAuth();

const Drawer = createDrawerNavigator();

export default function InitStack() {
  useGarbageCollector(initSliceComponentKey);
  const { user, isLoading } = useAuthentication();
  const dispatch = useDispatch();
  const { userDetails } = useSelector(state => state[initSliceComponentKey]);
  const pollingStationsList = useGetPollingStations();
  const [isRefresh, setIsRefresh] = useState(true);
  const { isMobile, responsiveValue } = useResponsive();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  useEffect(() => {
    const userId = userDetails.id;
    if (!userId) {
      setIsRefresh(true);
      dispatch(setPollingStationsList([]))
      dispatch(getSelfUser({
        onComplete: () => {
          setIsRefresh(false);
        }
      }))
    }
  }, [userDetails.id])

  const refresh = () => {
    setIsRefresh(true)
    dispatch(setPollingStationsList([]))
    dispatch(getSelfUser({
      onComplete: () => {
        setIsRefresh(false);
      }
    }))
  }

  if (isRefresh) {
    return (
      <View style={drawerStyles.loadingRoot}>
        <LinearGradient
          colors={[THEME.COLOR.GRADIENT_PRIMARY_START, THEME.COLOR.GRADIENT_PRIMARY_END]}
          style={drawerStyles.loadingGradient}
        />
        <View style={drawerStyles.loadingCard}>
          <Image
            source={require('./assets/icon-horizontal.png')}
            style={drawerStyles.loadingLogo}
            resizeMode="contain"
          />
          <ActivityIndicator animating={true} size={'large'} color={THEME.COLOR.PRIMARY} style={{ marginTop: THEME.SPACING.XL }} />
          <Text style={drawerStyles.loadingText}>Loading your data...</Text>
        </View>
      </View>
    )
  }

  if (!userDetails.id || pollingStationsList.length === 0) {
    return (
      <View style={drawerStyles.loadingRoot}>
        <View style={drawerStyles.emptyCard}>
          <View style={drawerStyles.emptyIconCircle}>
            <Text style={{ fontSize: 36 }}>📋</Text>
          </View>
          <Text style={drawerStyles.emptyTitle}>Setup Required</Text>
          <Text style={drawerStyles.emptySubtitle}>{STRINGS.VOTERS_DATA_UPLOADING}</Text>
          <Button
            mode="contained"
            onPress={refresh}
            style={drawerStyles.emptyPrimaryBtn}
            labelStyle={drawerStyles.emptyPrimaryBtnLabel}
            contentStyle={{ height: 48 }}
            buttonColor={THEME.COLOR.PRIMARY}
            icon="refresh"
          >
            {STRINGS.REFRESH_BUTTON}
          </Button>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={drawerStyles.emptySecondaryBtn}
            labelStyle={drawerStyles.emptySecondaryBtnLabel}
            contentStyle={{ height: 48 }}
            icon="logout"
          >
            {STRINGS.LOGOUT_BUTTON}
          </Button>
        </View>
      </View>
    )
  }

  return (
    <Drawer.Navigator 
      initialRouteName={userDetails?.role === USER_ROLE.ADMIN ? ROUTES.DASHBOARD : ROUTES.MENU_LIST_SCREEN}
      drawerContent={props => <CustomDrawerContent {...props} userDetails={userDetails} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: THEME.COLOR.PRIMARY,
          ...THEME.SHADOW.MEDIUM,
        },
        headerTintColor: THEME.COLOR.PRIMARY_FOREGROUND,
        drawerStyle: {
          backgroundColor: THEME.COLOR.SURFACE,
          width: responsiveValue(280, 320, 340),
        },
        drawerActiveBackgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
        drawerActiveTintColor: THEME.COLOR.PRIMARY,
        drawerInactiveTintColor: THEME.COLOR.TEXT_SECONDARY,
        drawerItemStyle: {
          borderRadius: THEME.BORDER_RADIUS.MD,
          marginHorizontal: THEME.SPACING.SM,
          marginVertical: 0,
        },
        drawerLabelStyle: {
          fontSize: THEME.FONT_SIZE.MD,
          fontWeight: THEME.FONT_WEIGHT.MEDIUM,
          marginLeft: -THEME.SPACING.SM,
        },
        headerBackTitle: STRINGS.HEADER_BACK_TITLE,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: THEME.FONT_SIZE.LG,
          fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
        },
      }}
    >
      { PRIVATE_USER_ID === user?.uid && (
        <>
          <Drawer.Screen name={ROUTES.ADD_POLITICAL_PARTY} component={CreateAccountScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="flag" color={color} size={size} /> }} />
          <Drawer.Screen name={ROUTES.CREATE_ADMIN_USER} component={CreateAdminUserScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="shield-account" color={color} size={size} /> }} />
          <Drawer.Screen name={ROUTES.CREATE_CONSTITUENCY} component={CreateConstituencyScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="map-marker-radius" color={color} size={size} /> }} />
          <Drawer.Screen name={ROUTES.UPLOAD_VOTERS} component={UploadVotersScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="upload" color={color} size={size} /> }} />
          <Drawer.Screen name={ROUTES.CLEAR_VOTER_DATA} component={DownloadVotersApproachedDataScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="download" color={color} size={size} /> }} />
        </>
      ) }
      {
        userDetails?.role === USER_ROLE.VOLUNTEER && (
          <Drawer.Screen name={ROUTES.MENU_LIST_SCREEN} component={MenuScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="view-grid" color={color} size={size} /> }} />
        )
      }
      {
        userDetails?.role === USER_ROLE.ADMIN && (
          <>
            <Drawer.Screen name={ROUTES.DASHBOARD} component={HomeScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="view-dashboard" color={color} size={size} /> }} />
            <Drawer.Screen name={ROUTES.AC_OVERVIEW_SCREEN} component={ACOverviewScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="chart-arc" color={color} size={size} /> }} />
          </>
        )
      }
      <Drawer.Screen name={ROUTES.VOTERS_LIST} component={VoterListWithPS} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="account-group" color={color} size={size} /> }} />
      {
        userDetails?.role === USER_ROLE.ADMIN && (
          <>
            <Drawer.Screen name={ROUTES.TREND_ANALYTICS} component={TrendAnalyticsScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="trending-up" color={color} size={size} /> }} />
            <Drawer.Screen name={ROUTES.VOLUNTEERS_LIST} component={VolunteersListScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="account-multiple" color={color} size={size} /> }} />
            <Drawer.Screen name={ROUTES.POLLING_STATIONS} component={PollingStationListScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="office-building-marker" color={color} size={size} /> }} />
            <Drawer.Screen name={ROUTES.VOTERS_STATISTICS} component={VotersStatisticsScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="chart-bar" color={color} size={size} /> }} />
          </>
        )
      }
      
      <Drawer.Screen name={ROUTES.VOTERS_SEARCH_LIST} component={VotersSearchScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="magnify" color={color} size={size} /> }} />

      {
        userDetails?.role === USER_ROLE.ADMIN && (
          <>
            <Drawer.Screen name={ROUTES.MAP} component={MapScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="map" color={color} size={size} /> }} />
            <Drawer.Screen name={ROUTES.RECENTLY_ADDED_VOTERS_SCREEN} component={IssuesScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="account-plus" color={color} size={size} /> }} />
            <Drawer.Screen name={ROUTES.RECENTLY_DELETED_VOTERS_SCREEN} component={IssuesScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="account-minus" color={color} size={size} /> }} /> 
          </>
        )
      }
      <Drawer.Screen name={ROUTES.FORUM} component={ForumScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="forum" color={color} size={size} /> }} />
      <Drawer.Screen name={ROUTES.PARTY_UPDATES} component={PartyUpdatesScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="bullhorn" color={color} size={size} /> }} />
      <Drawer.Screen name={ROUTES.PRACHAR_KIT} component={PracharKitScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="toolbox" color={color} size={size} /> }} />
      <Drawer.Screen name={ROUTES.MESSAGES} component={MessagesScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="message-text" color={color} size={size} /> }} />
      <Drawer.Screen name={ROUTES.ASSIGN_TASK} component={AssignTaskScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="clipboard-check" color={color} size={size} /> }} />
      {
        userDetails?.role === USER_ROLE.ADMIN && (
          <>
            <Drawer.Screen name={ROUTES.ACTIVATE_VOLUNTEERS} component={ActivateVolunteersScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="account-check" color={color} size={size} /> }} />
          </>
        )
      }
      <Drawer.Screen name={ROUTES.POLLING_DAY} component={PollingDayScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="calendar-check" color={color} size={size} /> }} /> 
      <Drawer.Screen name={ROUTES.CHANGE_LANGUAGE} component={LanguageScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="translate" color={color} size={size} /> }} /> 
      <Drawer.Screen name={ROUTES.LOGOUT} component={LogoutScreen} options={{ drawerIcon: ({color, size}) => <DrawerIconMD name="logout" color={color} size={size} /> }} />
    </Drawer.Navigator>
  )
}

// Simple icon component using MaterialCommunityIcons via react-native-paper
function DrawerIconMD({ name, color, size }) {
  return <Icon source={name} size={size ?? 22} color={color} />;
}

function CustomDrawerContent(props) {
  const { userDetails } = props;
  const initials = (userDetails?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');

  const roleBadgeColor = userDetails?.role === USER_ROLE.ADMIN
    ? THEME.COLOR.ACCENT
    : THEME.COLOR.PRIMARY;

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      {/* User Profile Header */}
      <LinearGradient
        colors={[THEME.COLOR.GRADIENT_PRIMARY_START, THEME.COLOR.GRADIENT_PRIMARY_END]}
        style={drawerStyles.profileHeader}
      >
        <View style={drawerStyles.avatarCircle}>
          <Text style={drawerStyles.avatarText}>{initials}</Text>
        </View>
        <Text style={drawerStyles.profileName} numberOfLines={1}>{userDetails?.name ?? 'User'}</Text>
        <View style={[drawerStyles.roleBadge, { backgroundColor: roleBadgeColor }]}>
          <Text style={drawerStyles.roleText}>
            {userDetails?.role === USER_ROLE.ADMIN ? 'Admin' : 'Volunteer'}
          </Text>
        </View>
      </LinearGradient>

      {/* Drawer Items */}
      <View style={drawerStyles.itemsContainer}>
        <DrawerItemList {...props} />
      </View>
    </DrawerContentScrollView>
  );
}

const drawerStyles = StyleSheet.create({
  // Loading states
  loadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.COLOR.BACKGROUND,
  },
  loadingGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  loadingCard: {
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.XL,
    padding: THEME.SPACING.XXL,
    alignItems: 'center',
    maxWidth: 360,
    width: '85%',
    ...THEME.SHADOW.HEAVY,
  },
  loadingLogo: {
    height: 30,
    width: 180,
  },
  loadingText: {
    marginTop: THEME.SPACING.LG,
    fontSize: THEME.FONT_SIZE.MD,
    color: THEME.COLOR.TEXT_SECONDARY,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },

  // Empty / no data state
  emptyCard: {
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.XL,
    padding: THEME.SPACING.XXL,
    alignItems: 'center',
    maxWidth: 400,
    width: '85%',
    ...THEME.SHADOW.HEAVY,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.SPACING.XL,
  },
  emptyTitle: {
    fontSize: THEME.FONT_SIZE.XXL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    marginBottom: THEME.SPACING.SM,
  },
  emptySubtitle: {
    textAlign: 'center',
    fontSize: THEME.FONT_SIZE.MD,
    color: THEME.COLOR.TEXT_SECONDARY,
    marginBottom: THEME.SPACING.XL,
    lineHeight: 22,
  },
  emptyPrimaryBtn: {
    borderRadius: THEME.BORDER_RADIUS.MD,
    marginBottom: THEME.SPACING.MD,
    width: '100%',
  },
  emptyPrimaryBtnLabel: {
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
    fontSize: THEME.FONT_SIZE.MD,
  },
  emptySecondaryBtn: {
    borderRadius: THEME.BORDER_RADIUS.MD,
    borderColor: THEME.COLOR.BORDER,
    width: '100%',
  },
  emptySecondaryBtnLabel: {
    color: THEME.COLOR.TEXT_SECONDARY,
    fontSize: THEME.FONT_SIZE.MD,
  },

  // Drawer profile header
  profileHeader: {
    padding: THEME.SPACING.XL,
    paddingTop: THEME.SPACING.XXXL,
    paddingBottom: THEME.SPACING.XL,
    marginBottom: THEME.SPACING.SM,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.SPACING.MD,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: THEME.FONT_SIZE.XL,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: '#FFF',
  },
  profileName: {
    fontSize: THEME.FONT_SIZE.LG,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: '#FFF',
    marginBottom: THEME.SPACING.SM,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: THEME.SPACING.MD,
    paddingVertical: THEME.SPACING.XS,
    borderRadius: THEME.BORDER_RADIUS.FULL,
  },
  roleText: {
    fontSize: THEME.FONT_SIZE.XS,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Items container
  itemsContainer: {
    flex: 1,
    paddingTop: THEME.SPACING.SM,
    paddingBottom: THEME.SPACING.XL,
  },
});
