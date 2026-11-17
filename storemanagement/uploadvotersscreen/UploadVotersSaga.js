import { store } from '@betacrew/jars-flux';
import {
  put, all, call, takeLeading, takeLatest,
} from 'redux-saga/effects';
import { componentKey } from './UploadVotersSlice';
import PrivateDataService from '../../services/PrivateDataService';

export const {
  uploadVotersXLSX,
  clearVotersList
} = {
  uploadVotersXLSX: (payload) => ({
    type: 'UPLOADVOTERS/UPLOAD_VOTERS_XLSX',
    payload,
  }),
  clearVotersList: (payload) => ({
    type: 'UPLOADVOTERS/CLEAR_VOTERS_LIST',
    payload,
  }),
};

function* uploadVotersXLSXAsync(action) {
  const { formData, passKey, uploadProgressCb, uploadCompleteCb, onError = () => {}, onComplete = () => {} } = action.payload;
  try {
    formData.append('pass_key', passKey);

    const response = yield PrivateDataService.uploadVotersXLSX({ uploadProgressCb, formData });
    uploadCompleteCb(!!(response && response.status === 200));
  } catch (e) {
    uploadCompleteCb(false);
    onError(e.message);
  }
  
  onComplete();
}

function* clearVotersListAsync(action) {
  const { passKey, onSuccess = () => {}, onError = () => {}, onComplete = () => {} } = action.payload;
  try {
    const response = yield PrivateDataService.clearVotersListDownloadData({ pass_key: passKey });
    onSuccess(!!(response && response.status === 200));
  } catch (e) {
    onError(e.message);
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
    takeLatest(uploadVotersXLSX().type, handleErrors(uploadVotersXLSXAsync)),
    takeLatest(clearVotersList().type, handleErrors(clearVotersListAsync)),
  ]);
}

store.sagaManager.addSaga(componentKey, rootSaga);
