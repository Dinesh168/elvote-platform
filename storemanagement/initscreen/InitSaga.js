import { store } from '@betacrew/jars-flux';
import {
  put, all, call, takeLeading, takeLatest,
} from 'redux-saga/effects';
import UsersDataService from '../../services/UsersDataService';
import { componentKey, selectConstituency, setConstituency, setPatyData, setUser } from './InitSlice';
import ConstituencyDataService from '../../services/ConstituencyDataService';
import { USER_ROLE } from '../../constant';

export const {
  getSelfUser, 
  getPartyData,
  setInitSelfUser,
  setSelectConstituency,
} = {
  getSelfUser: (payload) => ({
    type: 'INIT/GET_SELF_USER',
    payload,
  }),
  getPartyData: (payload) => ({
    type: 'INIT/GET_PARTY_DATA',
    payload,
  }),
  setInitSelfUser: (payload) => ({
    type: 'INIT/SET_INIT_SELF_USER',
    payload,
  }),
  setSelectConstituency: (payload) => ({
    type: 'INIT/SELECT_CONSTITUENCY',
    payload,
  }),
};

function* getSelfUserAsync(action) {
  const user = yield UsersDataService.getSelfUser();
  
  const response = yield ConstituencyDataService.getConstituencyList();
  yield put(setConstituency(response.data.constituency_list));
    
  yield call(setSelectConstituencyAsync, {payload: { constituencyNumber: response.data.constituency_list?.[0]?.constituency_number }});
  yield call(getPartyDataAsync, {payload: {}});
  yield put(setUser(user.data));
}

function* getPartyDataAsync(action) {
  const response = yield ConstituencyDataService.getPartyData();
  yield put(setPatyData({
    ballotNo: response.data.ballotNo,
    leaderName: response.data.leaderName,
    voterSlipImage: response.data.image
  }));

}

function* setSelectConstituencyAsync(action) {
  const { constituencyNumber } = action.payload;
  yield put(selectConstituency(constituencyNumber));
  
}

function* setInitSelfUserAsync(action) {
  const { name, passKey, mobile } = action.payload;
  const user = yield UsersDataService.setSelfUser({ name, passKey, mobile });
  yield call(getSelfUserAsync);
}

function handleErrors(fn) {
  return function* wrapper(action) {
    try {
      yield call(fn, action);
    } catch (e) {
      console.log(e);
    }
    action?.payload?.onComplete?.();
  };
}

function* rootSaga() {
  yield all([
    takeLatest(getSelfUser().type, handleErrors(getSelfUserAsync)),
    takeLatest(getPartyData().type, handleErrors(getPartyDataAsync)),
    takeLatest(setSelectConstituency().type, handleErrors(setSelectConstituencyAsync)),
    takeLeading(setInitSelfUser().type, handleErrors(setInitSelfUserAsync)),
  ]);
}

store.sagaManager.addSaga(componentKey, rootSaga);
