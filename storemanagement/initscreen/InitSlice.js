import { store } from '@betacrew/jars-flux';
import RequestInterceptorPub from '../../libs/requestinterceptors/RequestInterceptorPub';
import { HEADERS_KEY } from '../../constant';

export const componentKey = 'INITSCREEN';

const DEFAULT_USER = {
  id: null,
  unique_id: null,
  name: null,
  email: null,
  role: null,
  photo: null,
  permissions_list: null,
  polling_station_id: null,
  account_id: null,
}

const { actions } = store.reducerManager.add({
  key: componentKey,
  addedReducers: {
    setUser: (state, action) => {
      const {
        id,
        unique_id,
        name,
        email,
        role,
        photo,
        permissions_list,
        polling_station_id,
        account_id
      } = action.payload;

      state.userDetails = {
        id,
        unique_id,
        name,
        email,
        role,
        photo,
        permissions_list,
        polling_station_id,
        account_id
      }
    },
    setConstituency: (state, action) => {
      state.constituency = [
        ...action.payload
      ]
    },
    setPatyData: (state, action) => {
      state.ballotNo = action.payload.ballotNo;
      state.leaderName = action.payload.leaderName;
      state.voterSlipImage = action.payload.voterSlipImage;
    },
    selectConstituency: (state, action) => {
      const constituency_number = action.payload;

      state.selectedConstituency = constituency_number;
      RequestInterceptorPub.addHeaders(HEADERS_KEY.CONSTITUENCY, constituency_number);
    },
    resetUser: (state, action) => {
      state.userDetails = {
        ...DEFAULT_USER
      }
    },
    resetConstituency: (state, action) => {
      state.constituency = []
    },
    resetSelectedConstituency: (state, action) => {
      state.selectedConstituency = null
      RequestInterceptorPub.addHeaders(HEADERS_KEY.CONSTITUENCY, null);
    }
  },
  initialReducerState: {
    errorStatus: null,
    userDetails: {
      ...DEFAULT_USER
    },
    constituency: [],
    ballotNo: 0,
    leaderName: '',
    voterSlipImage: '',
    selectedConstituency: null,
  },
});

export const {
  setUser,
  setConstituency,
  setPatyData,
  selectConstituency,
  resetUser,
  resetConstituency,
  resetSelectedConstituency
} = actions;
