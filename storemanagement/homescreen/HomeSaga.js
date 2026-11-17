import { store } from '@betacrew/jars-flux';
import {
  put, all, call, takeLeading, takeLatest,
} from 'redux-saga/effects';
import UsersDataService from '../../services/UsersDataService';
import { componentKey, setUserPermissions, setUsers } from './HomeSlice';

export const {
  getUsers, 
} = {
  getUsers: (payload) => ({
    type: 'HOME/GET_USERS',
    payload,
  })
};

function* getUsersAsync(action) {
  
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
    takeLatest(getUsers().type, handleErrors(getUsersAsync)),
  ]);
}

store.sagaManager.addSaga(componentKey, rootSaga);
