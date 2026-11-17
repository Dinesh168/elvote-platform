import { store } from '@betacrew/jars-flux';
import {
  put, all, call, takeLeading, takeLatest,
} from 'redux-saga/effects';
import UsersDataService from '../../services/UsersDataService';
import { componentKey, setUserPermissions, setUsers } from './LanguageSlice';

export const {
   
} = {

};


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
    
  ]);
}

store.sagaManager.addSaga(componentKey, rootSaga);
