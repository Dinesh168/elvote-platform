import { store } from '@betacrew/jars-flux';
import { STRINGS } from '../../strings';
import { CATEGORIES, GENDERS, RELIGIONS, VOTER_OPINION } from '../../constant';
import Utility from '../../utils/Utility';

export const componentKey = 'FILTERSORTSLICE';

const _INITIAL_FILTER_SORT = {
  sno: { 
    label: STRINGS.FILTER_SNO_LABEL, 
    value: null,
    callback: () =>  ({ label: STRINGS.FILTER_SNO_CALLBACK_LABEL })
  },
  from_epoch: { 
    label: STRINGS.FILTER_FROM_DATE_LABEL, 
    value: null,
    callback: (filters) =>  ({ 
      label: STRINGS.FILTER_LAST_X_DAYS_CALLBACK_LABEL.replace('{{count}}', Math.abs(Utility.convertUTCTimestampToDaysFromToday(filters.from_epoch)).toString())
    })
  },
  to_epoch: { 
    label: STRINGS.FILTER_TO_DATE_LABEL, 
    value: null,
    callback: (filters) => ({ label: '' })
  },
  polling_station_ids: { 
    label: STRINGS.FILTER_POLLING_STATION_LABEL, 
    value: null,
    callback: (filters) => ({ label: '' }) 
  },
  account_approved_statuses: { 
    label: STRINGS.FILTER_ACCOUNT_APPROVED_STATUS_LABEL, 
    value: null,
    callback: (filters) => ({ label: '' }) 
  },
  from_voter_age: { 
    label: STRINGS.FILTER_FROM_VOTER_AGE_LABEL, 
    value: null,
    callback: (filters) => ({
      label: filters.from_voter_age >= 18 && filters.to_voter_age <= 22
        ? STRINGS.FILTER_FROM_VOTER_AGE_FIRST_TIME_CALLBACK_LABEL
        : filters.from_voter_age >= 18 && filters.to_voter_age <= 35
          ? STRINGS.FILTER_FROM_VOTER_AGE_YOUNG_CALLBACK_LABEL
          : filters.from_voter_age >= 35 && filters.to_voter_age <= 60
            ? STRINGS.FILTER_FROM_VOTER_AGE_MIDDLE_AGED_CALLBACK_LABEL
            : filters.from_voter_age >= 60
              ? STRINGS.FILTER_FROM_VOTER_AGE_SENIOR_CITIZENS_CALLBACK_LABEL
              : ''
    }) 
  },
  to_voter_age: { 
    label: STRINGS.FILTER_TO_VOTER_AGE_LABEL, 
    value: null,
    callback: (filters) => ({ label: '' })  
  },
  voter_genders: { 
    label: STRINGS.FILTER_VOTER_GENDERS_LABEL, 
    value: null,
    callback: (filters) => ({ 
      label: filters.voter_genders.length === 1 && filters.voter_genders[0] === GENDERS.M.VAL
        ? STRINGS.FILTER_VOTER_GENDERS_MALE_CALLBACK_LABEL
        : filters.voter_genders.length === 1 && filters.voter_genders[0] === GENDERS.F.VAL
          ? STRINGS.FILTER_VOTER_GENDERS_FEMALE_CALLBACK_LABEL
          : filters.voter_genders.length === 1 && filters.voter_genders[0] === GENDERS.O.VAL
            ? STRINGS.FILTER_VOTER_GENDERS_OTHER_CALLBACK_LABEL
            : ''
    }) 
  },
  is_voter_voted: { 
    label: STRINGS.FILTER_IS_VOTER_VOTED_LABEL, 
    value: null,
    callback: (filters) => ({ 
      label: filters.is_voter_voted === true
        ? STRINGS.FILTER_IS_VOTER_VOTED_CALLBACK_LABEL
        : STRINGS.FILTER_IS_VOTER_NOT_VOTED_CALLBACK_LABEL
    })
  },
  is_voter_mobile_number: { 
    label: STRINGS.FILTER_IS_VOTER_MOBILE_NUMBER_LABEL, 
    value: null,
    callback: (filters) => ({ 
      label: filters.is_voter_mobile_number === true
        ? STRINGS.FILTER_IS_VOTER_MOBILE_NUMBER_CALLBACK_LABEL
        : STRINGS.FILTER_IS_VOTER_WITHOUT_MOBILE_NUMBER_CALLBACK_LABEL
    }) 
  },
  is_voter_migrated: { 
    label: STRINGS.FILTER_VOTER_MIGRATION_STATUS_LABEL, 
    value: null,
    callback: (filters) => ({ 
      label: filters.is_voter_migrated === true
        ? STRINGS.FILTER_VOTER_MIGRATION_STATUS_CALLBACK_LABEL
        : STRINGS.FILTER_VOTER_NOT_MIGRATION_STATUS_CALLBACK_LABEL
    })  
  },
  voter_castes: { 
    label: STRINGS.FILTER_VOTER_CASTES_LABEL, 
    value: null,
    callback: (filters) => ({ 
      label: filters.voter_castes.length === 1 && filters.voter_castes[0] === CATEGORIES.G.VAL
        ? STRINGS.FILTER_VOTER_CASTES_GENERAL_CALLBACK_LABEL
        : filters.voter_castes.length === 1 && filters.voter_castes[0] === CATEGORIES.B.VAL
          ? STRINGS.FILTER_VOTER_CASTES_OBC_CALLBACK_LABEL
          : filters.voter_castes.length === 1 && filters.voter_castes[0] === CATEGORIES.C.VAL
            ? STRINGS.FILTER_VOTER_CASTES_SC_CALLBACK_LABEL
            : filters.voter_castes.length === 1 && filters.voter_castes[0] === CATEGORIES.T.VAL
              ? STRINGS.FILTER_VOTER_CASTES_ST_CALLBACK_LABEL
              : STRINGS.FILTER_VOTER_CASTES_OTHER_CALLBACK_LABEL
    }) 
  },
  voter_religions: { 
    label: STRINGS.FILTER_VOTER_RELIGIONS_LABEL, 
    value: null,
    callback: (filters) => ({ 
      label: filters.voter_religions.length === 1 && filters.voter_religions[0] === RELIGIONS.H.VAL
        ? STRINGS.FILTER_VOTER_RELIGIONS_HINDU_CALLBACK_LABEL
        : filters.voter_religions.length === 1 && filters.voter_religions[0] === RELIGIONS.M.VAL
          ? STRINGS.FILTER_VOTER_RELIGIONS_MUSLIM_CALLBACK_LABEL
          : filters.voter_religions.length === 1 && filters.voter_religions[0] === RELIGIONS.S.VAL
            ? STRINGS.FILTER_VOTER_RELIGIONS_SIKH_CALLBACK_LABEL
            : filters.voter_religions.length === 1 && filters.voter_religions[0] === RELIGIONS.C.VAL
              ? STRINGS.FILTER_VOTER_RELIGIONS_CHRISTIAN_CALLBACK_LABEL
              : STRINGS.FILTER_VOTER_RELIGIONS_OTHER_CALLBACK_LABEL
    }) 
  },
  volunteer_ids: { 
    label: STRINGS.FILTER_VOLUNTEER_IDS_LABEL, 
    value: null,
    callback: () => ({ label: '' })
  },
  voter_opinions: { 
    label: STRINGS.FILTER_VOTER_OPINIONS_LABEL, 
    value: null,
    callback: (filters) => {
      return ({ 
        label: filters.voter_opinions.length === 1 && filters.voter_opinions[0] === VOTER_OPINION.P.VAL
          ? STRINGS.FILTER_VOTER_OPINIONS_POSITIVE_CALLBACK_LABEL
          : filters.voter_opinions.length === 1 && filters.voter_opinions[0] === VOTER_OPINION.N.VAL
            ? STRINGS.FILTER_VOTER_OPINIONS_NEGATIVE_CALLBACK_LABEL
            : filters.voter_opinions.length === 1 && filters.voter_opinions[0] === VOTER_OPINION.U.VAL
              ? STRINGS.FILTER_VOTER_OPINIONS_NEUTRAL_CALLBACK_LABEL
              : filters.voter_opinions.length === 1 && filters.voter_opinions[0] === VOTER_OPINION.O.VAL
                ? STRINGS.FILTER_VOTER_OPINIONS_UNCAPTURED_CALLBACK_LABEL
                : STRINGS.FILTER_VOTER_APPROACHED_CALLBACK_LABEL
      })
    }
  },
  voter_name: { 
    label: STRINGS.FILTER_VOTER_NAME_LABEL, 
    value: null,
    callback: () => ({ label: '' })
  },
  voter_epic: { label: STRINGS.FILTER_VOTER_EPIC_LABEL, value: null, callback: () => ({ label: '' }) },
  voter_address: { 
    label: STRINGS.FILTER_VOTER_ADDRESS_LABEL, 
    value: null, 
    callback: (filters) => ({ label: `List of voters with address - ${filters.voter_address}` }) 
  },
  is_voter_approached: { 
    label: STRINGS.FILTER_VOTER_APPROACHED_LABEL, 
    value: null, 
    callback: (filters) => ({ label: filters.is_voter_approached === true
      ? STRINGS.FILTER_VOTER_APPROACHED_CALLBACK_LABEL
      : STRINGS.FILTER_VOTER_NOT_APPROACHED_CALLBACK_LABEL
    }) 
  },
}

export const INITIAL_FILTER_SORT = Object.fromEntries(
  Object.entries(_INITIAL_FILTER_SORT).map(([key, obj]) => [
    key,
    { key, ...obj }
  ])
);

const INITIAL_FILTER_SORT_KEY_VALUE_OBJ = Object.keys(INITIAL_FILTER_SORT).reduce((acc, key) => {
  acc[key] = INITIAL_FILTER_SORT[key].value;
  return acc;
}, {});

const { actions } = store.reducerManager.add({
  key: componentKey,
  addedReducers: {
    setFilterSort: (state, action) => {
      state.filterSort = {
        ...state.filterSort,
        ...action.payload
      }

      // RequestInterceptorPub.addHeaders(BODY_KEY.FILTERS, JSON.stringify(state.filterSort))
    },
    clearFilterSort: (state, action) => {
      state.filterSort = {
        ...INITIAL_FILTER_SORT_KEY_VALUE_OBJ 
      }
    },
    setCastesList: (state, action) => {
      state.castesList = action.payload
    },
    setReligionsList: (state, action) => {
      state.religionsList = action.payload
    },
    setVolunteersList: (state, action) => {
      state.volunteersList = action.payload
    },
    setPollingStationsList: (state, action) => {
      state.pollingStationsList = action.payload
    },
  },
  initialReducerState: {
    filterSort: {
      ...INITIAL_FILTER_SORT_KEY_VALUE_OBJ
    },
    castesList: [],
    religionsList: [],
    volunteersList: [],
    pollingStationsList: []
  },
});

export const {
  setFilterSort,
  clearFilterSort,
  setCastesList,
  setReligionsList,
  setVolunteersList,
  setPollingStationsList
} = actions;
