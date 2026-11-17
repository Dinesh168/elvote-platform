import React, { useEffect, useState } from 'react';
import './firebaseConfig';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import { useAuthentication } from './utils/hooks/useAuthentication';
import ErrorPubSub from './libs/networkerror/ErrorPubSub';
import { useDispatch, useSelector } from 'react-redux';
import { componentKey as stagingSliceComponentKey, setErrorStatus } from './storemanagement/stagingscreen/StagingSlice';
import { NETWORK_ERROR_STATUS_CODES } from './libs/networkerror/constant';
import InitialProfileScreen from './screens/InitialProfileScreen';
import PendingApprovalScreen from './screens/PendingApprovalScreen';
import RejectedApprovalScreen from './screens/RejectedApprovalScreen';
import PermissionsNullScreen from './screens/PermissionsNullScreen';
import InitStack from './InitStack';
import { ROUTES } from './constant';
import PollingStationIntermediateScreen from './screens/PollingStationIntermediateScreen';
import VotersIntermediateScreen from './screens/VotersIntermediateScreen';
import VotersApproachedListScreen from './screens/VotersApproachedListScreen';
import VolunteersIntermediateScreen from './screens/VolunteersIntermediateScreen';
import PollingStationAllDataScreen from './screens/PollingStationAllDataScreen';
import VoterListScreen from './screens/VoterListScreen';
import VolunteerAnalysisScreen from './screens/VolunteerAnalysisScreen';
import { DefaultTheme } from 'react-native-paper';
import { THEME } from './theme';
import VotersVotedScreen from './screens/VotersVotedScreen';
import { STRINGS } from './strings';
import Age18To22VoterListScreen from './screens/FilteredVoterListScreen/Age18To22VoterListScreen';
import Age60PlusVoterListScreen from './screens/FilteredVoterListScreen/Age60PlusVoterListScreen';
import ApproachedVoterListScreen from './screens/FilteredVoterListScreen/ApproachedVoterListScreen';
import ChristianVoterListScreen from './screens/FilteredVoterListScreen/ChristianVoterListScreen';
import SikhVoterListScreen from './screens/FilteredVoterListScreen/SikhVoterListScreen';
import MuslimVoterListScreen from './screens/FilteredVoterListScreen/MuslimVoterListScreen';
import HinduVoterListScreen from './screens/FilteredVoterListScreen/HinduVoterListScreen';
import FemaleVoterListScreen from './screens/FilteredVoterListScreen/FemaleVoterListScreen';
import MaleVoterListScreen from './screens/FilteredVoterListScreen/MaleVoterListScreen';
import OtherReligionVoterListScreen from './screens/FilteredVoterListScreen/OtherReligionVoterListScreen';
import GeneralCategoryVoterListScreen from './screens/FilteredVoterListScreen/GeneralCategoryVoterListScreen';
import SCCategoryVoterListScreen from './screens/FilteredVoterListScreen/SCCategoryVoterListScreen';
import STCategoryVoterListScreen from './screens/FilteredVoterListScreen/STCategoryVoterListScreen';
import OBCCategoryVoterListScreen from './screens/FilteredVoterListScreen/OBCCategoryVoterListScreen';
import Last7DaysVoterListScreen from './screens/FilteredVoterListScreen/Last7DaysVoterListScreen';
import Last30DaysVoterListScreen from './screens/FilteredVoterListScreen/Last30DaysVoterListScreen';
import Last15DaysVoterListScreen from './screens/FilteredVoterListScreen/Last15DaysVoterListScreen';
import Last180DaysVoterListScreen from './screens/FilteredVoterListScreen/Last180DaysVoterListScreen';
import MobileAvailableVoterListScreen from './screens/FilteredVoterListScreen/MobileAvailableVoterListScreen';
import MobileNotAvailableVoterListScreen from './screens/FilteredVoterListScreen/MobileNotAvailableVoterListScreen';
import NegativeOpinionVoterListScreen from './screens/FilteredVoterListScreen/NegativeOpinionVoterListScreen';
import PositiveOpinionVoterListScreen from './screens/FilteredVoterListScreen/PositiveOpinionVoterListScreen';
import UndecidedOpinionVoterListScreen from './screens/FilteredVoterListScreen/UndecidedOpinionVoterListScreen';
import SameAddressVoterListScreen from './screens/FilteredVoterListScreen/SameAddressVoterListScreen';
import SerialNumberSortedVoterListScreen from './screens/FilteredVoterListScreen/SerialNumberSortedVoterListScreen';
import ThirdGenderVoterListScreen from './screens/FilteredVoterListScreen/ThirdGenderVoterListScreen';
import UnapproachedVoterListScreen from './screens/FilteredVoterListScreen/UnapproachedVoterListScreen';
import OtherCategoryVoterListScreen from './screens/FilteredVoterListScreen/OtherCategoryVoterListScreen';
import Age35To60VoterListScreen from './screens/FilteredVoterListScreen/Age35To60VoterListScreen';
import Age18To35VoterListScreen from './screens/FilteredVoterListScreen/Age18To35VoterListScreen';
import UncapturedOpinionVoterListScreen from './screens/FilteredVoterListScreen/UncapturedOpinionVoterListScreen';
import MigratedVoterListScreen from './screens/FilteredVoterListScreen/MigratedVoterListScreen';
import NotMigratedVoterListScreen from './screens/FilteredVoterListScreen/NotMigratedVoterListScreen';
import VoterHouseIntermediateScreen from './screens/VoterHouseIntermediateScreen';
import MobileAvailableOurVoterListScreen from './screens/FilteredVoterListScreen/MobileAvailableOurVoterListScreen';
import MobileAvailableOppVoterListScreen from './screens/FilteredVoterListScreen/MobileAvailableOppVoterListScreen';
import MobileAvailableSwingVoterListScreen from './screens/FilteredVoterListScreen/MobileAvailableSwingVoterListScreen';
import SurnameListScreen from './screens/SurnameListScreen';
import VoterListWithPS from './components/voterlist/VoterListWithPS';

const Stack = createStackNavigator();

const SUBSCRIBER_KEY = 'NAVIGATION_STACK_ERROR_STATUS'

export default function NavigationStack() {
  const { user, isLoading } = useAuthentication();
  const dispatch = useDispatch();
  const { errorStatus } = useSelector(state => state[stagingSliceComponentKey]);
  
  useEffect(() => {
    ErrorPubSub.addSubscriber(SUBSCRIBER_KEY, (statusCode) => {
      if (!(!errorStatus && !statusCode) || (errorStatus !== statusCode)) {
        dispatch(setErrorStatus(statusCode));
      }
    });

    return () => ErrorPubSub.removeSubscriber(SUBSCRIBER_KEY);
  }, [])

  if (isLoading) {
    return null; // Render nothing while checking the user's authentication status
  }

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: '#FFF'
        }
      }}
    >
        {
          !user ? (
            <Stack.Navigator initialRouteName={ROUTES.LOGIN}>
              <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
              <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
              <Stack.Screen name={ROUTES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
            </Stack.Navigator>
          ) 
          : errorStatus === NETWORK_ERROR_STATUS_CODES.USER_NOT_EXIST
            ? (
                <Stack.Navigator initialRouteName={ROUTES.FILL_PROFILE}>
                  <Stack.Screen name={ROUTES.FILL_PROFILE} component={InitialProfileScreen} />
                </Stack.Navigator>
              )
            : errorStatus === NETWORK_ERROR_STATUS_CODES.USER_REQUEST_PENDING
              ? (
                  <Stack.Navigator initialRouteName={ROUTES.PENDING_APPROVAL}>
                    <Stack.Screen name={ROUTES.PENDING_APPROVAL} component={PendingApprovalScreen} />
                  </Stack.Navigator>
                )
                : errorStatus === NETWORK_ERROR_STATUS_CODES.USER_REQUEST_REJECTED
                  ? (
                      <Stack.Navigator initialRouteName={ROUTES.REJECTED_APPROVAL}>
                        <Stack.Screen name={ROUTES.REJECTED_APPROVAL} component={RejectedApprovalScreen} />
                      </Stack.Navigator>
                    )
                    : errorStatus === NETWORK_ERROR_STATUS_CODES.USER_PERMISSIONS_NULL
                      ? (
                          <Stack.Navigator initialRouteName={ROUTES.NO_PERMISSIONS}>
                            <Stack.Screen name={ROUTES.NO_PERMISSIONS} component={PermissionsNullScreen} />
                          </Stack.Navigator>
                        )
                      : (
                        <Stack.Navigator 
                          initialRouteName={ROUTES.INIT_STACK}
                          screenOptions={{
                            headerStyle: {
                              backgroundColor: THEME.COLOR.PRIMARY, // Change the background color of the header
                            },
                            headerTintColor: THEME.COLOR.PRIMARY_FOREGROUND, // Change the color of the header text and icons
                            drawerStyle: {
                              backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND, // Change the background color of the drawer
                            },
                            drawerActiveBackgroundColor: THEME.COLOR.PRIMARY,
                            drawerActiveTintColor: THEME.COLOR.PRIMARY_FOREGROUND, // Change the color of the active item
                            drawerInactiveTintColor: THEME.COLOR.PRIMARY, // Change the color of the inactive items
                            headerBackTitle: STRINGS.HEADER_BACK_TITLE,
                            headerShadowVisible: false,
                          }}
                        >
                          <Stack.Screen
                            name={ROUTES.INIT_STACK}
                            component={InitStack}
                            options={{ headerShown: false }}
                          />
                          <Stack.Screen
                            name={ROUTES.POLLING_STATIONS_LIST}
                            component={PollingStationIntermediateScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.VOTER_HOUSE_LIST}
                            component={VoterHouseIntermediateScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.SURNAME_LIST}
                            component={SurnameListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.VOTERS_COUNT_LIST}
                            component={VotersIntermediateScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.VOTERS_VOTED_LIST}
                            component={VotersVotedScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.VOTERS_LIST_WITH_FILTERS}
                            component={VoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.VOTERS_LIST_WITH_PS}
                            component={VoterListWithPS}
                          />
                          <Stack.Screen
                            name={ROUTES.VOTERS_APPROACHED_LIST}
                            component={VotersApproachedListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.VOLUNTEERS_INTERMEDIATE_LIST}
                            component={VolunteersIntermediateScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.POLLING_STATION_ALL_DATA}
                            component={PollingStationAllDataScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.VOLUNTEER_ANALYSIS}
                            component={VolunteerAnalysisScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.NEW_VOTERS}
                            component={Age18To22VoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.AGE_18_35_VOTERS}
                            component={Age18To35VoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.AGE_35_60_VOTERS}
                            component={Age35To60VoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.SENIOR_CITIZENS_VOTERS}
                            component={Age60PlusVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.APPROACHED_VOTERS}
                            component={ApproachedVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.CHRISTIAN_VOTERS}
                            component={ChristianVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.SIKH_VOTERS}
                            component={SikhVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.MUSLIM_VOTERS}
                            component={MuslimVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.HINDU_VOTERS}
                            component={HinduVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.FEMALE_VOTERS}
                            component={FemaleVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.MALE_VOTERS}
                            component={MaleVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.OTHER_RELIGION_VOTERS}
                            component={OtherReligionVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.GENERAL_CATEGORY_VOTERS}
                            component={GeneralCategoryVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.SC_CATEGORY_VOTERS}
                            component={SCCategoryVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.ST_CATEGORY_VOTERS}
                            component={STCategoryVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.OBC_CATEGORY_VOTERS}
                            component={OBCCategoryVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.LAST_7_DAYS_APPROACHED_VOTERS}
                            component={Last7DaysVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.LAST_30_DAYS_APPROACHED_VOTERS}
                            component={Last30DaysVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.LAST_15_DAYS_APPROACHED_VOTERS}
                            component={Last15DaysVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.LAST_180_DAYS_APPROACHED_VOTERS}
                            component={Last180DaysVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.MOBILE_AVAILABLE_VOTERS}
                            component={MobileAvailableVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.MOBILE_AVAILABLE_OUR_VOTERS}
                            component={MobileAvailableOurVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.MOBILE_AVAILABLE_OPP_VOTERS}
                            component={MobileAvailableOppVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.MOBILE_AVAILABLE_SWING_VOTERS}
                            component={MobileAvailableSwingVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.MOBILE_NOT_AVAILABLE_VOTERS}
                            component={MobileNotAvailableVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.NEGATIVE_OPINION_VOTERS}
                            component={NegativeOpinionVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.POSITIVE_OPINION_VOTERS}
                            component={PositiveOpinionVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.UNDECIDED_OPINION_VOTERS}
                            component={UndecidedOpinionVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.UNCAPTURED_OPINION_VOTERS}
                            component={UncapturedOpinionVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.SAME_ADDRESSS_VOTERS}
                            component={SameAddressVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.SERIAL_NUMBER_SORTED_VOTERS}
                            component={SerialNumberSortedVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.THIRD_GENDER_VOTERS}
                            component={ThirdGenderVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.UNAPPROACHED_VOTERS}
                            component={UnapproachedVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.OTHER_CATEGORY_VOTERS}
                            component={OtherCategoryVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.MIGRATED_VOTERS_SCREEN}
                            component={MigratedVoterListScreen}
                          />
                          <Stack.Screen
                            name={ROUTES.NOT_MIGRATED_VOTERS_SCREEN}
                            component={NotMigratedVoterListScreen}
                          />
                        </Stack.Navigator>
                      )
      }
    </NavigationContainer>
  )
}
