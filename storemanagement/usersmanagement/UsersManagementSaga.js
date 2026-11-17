import { store } from '@betacrew/jars-flux';
import {
  put, all, call, takeLeading, takeLatest,
  takeEvery,
} from 'redux-saga/effects';
import { addVolunteerToRejected, componentKey, removeVolunteerFromApprove, removeVolunteerFromRejected, setVolunteersRejected, setVolunteersToApprove } from './UsersManagementSlice';
import UsersDataService from '../../services/UsersDataService';


export const {
  getUsersCount,
  getUsersList, 
  getVolunteersToApprove,
  getVolunteersRejected,
  setApproveUser,
  setRejectUser
} = {
  getUsersCount: (payload) => ({
    type: 'USERS_MANAGEMENT/GET_USERS_COUNT',
    payload,
  }),
  getUsersList: (payload) => ({
    type: 'USERS_MANAGEMENT/GET_USERS_LIST',
    payload,
  }),
  getVolunteersToApprove: (payload) => ({
    type: 'USERS_MANAGEMENT/GET_VOLUNTEERS_TO_APPROVE',
    payload,
  }),
  getVolunteersRejected: (payload) => ({
    type: 'USERS_MANAGEMENT/GET_VOLUNTEERS_REJECTED',
    payload,
  }),
  setApproveUser: (payload) => ({
    type: 'USERS_MANAGEMENT/SET_APPROVE_USER',
    payload,
  }),
  setRejectUser: (payload) => ({
    type: 'USERS_MANAGEMENT/SET_REJECT_USER',
    payload,
  }),
};

function* getUsersListAsync(action) {
  const { filters, pageNum, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield UsersDataService.getUsersList({ filters, pageNum });

  if (response && response.status === 200) {
    onSuccess(response.data.users_list);
  }

  onComplete();
}

function* getUsersCountAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield UsersDataService.getUsersCount({ filters });

  if (response && response.status === 200) {
    onSuccess(response.data.users_count);
  }

  onComplete();
}

function* getVolunteersToApproveAsync(action) {
  const { onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield UsersDataService.getVolunteersListToApprove();

  if (response && response.status === 200) {
    yield put(setVolunteersToApprove(response.data.volunteers_list))
    onSuccess(response.data.volunteers_list);
  }

  onComplete();
}

function* getVolunteersRejectedAsync(action) {
  const { onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield UsersDataService.getVolunteersListRejected();

  if (response && response.status === 200) {
    yield put(setVolunteersRejected(response.data.volunteers_list))
    onSuccess(response.data.volunteers_list);
  }

  onComplete();
}

function* setApproveUserAsync(action) {
  const { uniqueId, pollingStationId, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield UsersDataService.updateUserApproveStatus({uniqueId, pollingStationId});

  if (response && response.status === 200) {
    yield put(removeVolunteerFromApprove(uniqueId));
    yield put(removeVolunteerFromRejected(uniqueId));
    onSuccess();
  }

  onComplete();
}

function* setRejectUserAsync(action) {
  const { item, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield UsersDataService.updateUserApproveStatus({uniqueId: item.unique_id});

  if (response && response.status === 200) {
    yield put(removeVolunteerFromApprove(item.unique_id));
    yield put(addVolunteerToRejected(item));
    onSuccess();
  }

  onComplete();
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
    takeEvery(getUsersCount().type, handleErrors(getUsersCountAsync)),
    takeEvery(getUsersList().type, handleErrors(getUsersListAsync)),
    takeEvery(getVolunteersToApprove().type, handleErrors(getVolunteersToApproveAsync)),
    takeEvery(getVolunteersRejected().type, handleErrors(getVolunteersRejectedAsync)),
    takeLeading(setApproveUser().type, handleErrors(setApproveUserAsync)),
    takeLeading(setRejectUser().type, handleErrors(setRejectUserAsync)),
  ]);
}

store.sagaManager.addSaga(componentKey, rootSaga);
