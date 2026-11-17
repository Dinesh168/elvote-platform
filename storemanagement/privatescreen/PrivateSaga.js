import { store } from '@betacrew/jars-flux';
import {
  put, all, call, takeLeading, takeLatest,
} from 'redux-saga/effects';
import { componentKey } from './PrivateSlice';
import PrivateDataService from '../../services/PrivateDataService';

export const {
  createConstituency,
  createAccount,
  createAdminUser
} = {
  createConstituency: (payload) => ({
    type: 'PRIVATE/CREATE_CONSTITUENCY',
    payload,
  }),
  createAccount: (payload) => ({
    type: 'PRIVATE/CREATE_ACCOUNT',
    payload,
  }),
  createAdminUser: (payload) => ({
    type: 'PRIVATE/CREATE_ADMIN_USER',
    payload,
  }),
};

function* createConstituencyAsync(action) {
  const { name, constituencyNumber, callback = () => {} } = action.payload;
  const response = yield PrivateDataService.createConstituency({ name, constituencyNumber });
  callback(!!(response && response.status === 200));
}

function* createAccountAsync(action) {
  const { name, constituencyNumberId, passKey, callback = () => {} } = action.payload;
  const response = yield PrivateDataService.createAccount({ name, constituencyNumberId, passKey });
  callback(!!(response && response.status === 200));
}

function* createAdminUserAsync(action) {
  const { email, passKey, callback = () => {} } = action.payload;
  const response = yield PrivateDataService.createAdminUser({ email, passKey });
  callback(!!(response && response.status === 200));
}

function handleErrors(fn) {
  return function* wrapper(action) {
    try {
      yield call(fn, action);
    } catch (e) {
      console.log(e);
    }
  };
}

function* rootSaga() {
  yield all([
    takeLatest(createConstituency().type, handleErrors(createConstituencyAsync)),
    takeLatest(createAccount().type, handleErrors(createAccountAsync)),
    takeLatest(createAdminUser().type, handleErrors(createAdminUserAsync)),
  ]);
}

store.sagaManager.addSaga(componentKey, rootSaga);
