import { store } from '@betacrew/jars-flux';
import {
  put, all, call, takeLeading, takeLatest,
} from 'redux-saga/effects';
import { componentKey, setPollingStationsList, setVolunteersList } from './FilterSortSlice';
import VotersDataService from '../../services/VotersDataService';
import { setCastesList, setReligionsList } from './FilterSortSlice';
import UsersDataService from '../../services/UsersDataService';
import ConstituencyDataService from '../../services/ConstituencyDataService';

export const {
  getCastes, 
  getReligions,
  getVolunteers,
  getPollingStations
} = {
  getCastes: (payload) => ({
    type: 'FILTER_SORT/GET_CASTES',
    payload,
  }),
  getReligions: (payload) => ({
    type: 'FILTER_SORT/GET_RELIGIONS',
    payload,
  }),
  getVolunteers: (payload) => ({
    type: 'FILTER_SORT/GET_VOLUNTEERS',
    payload,
  }),
  getPollingStations: (payload) => ({
    type: 'FILTER_SORT/GET_POLLING_STATIONS',
    payload,
  }),
};

function* getCastesAsync(action) {
  const response = yield VotersDataService.getVotersCastesList();
  
  yield put(setCastesList(response.data.castes_list));
    
}

function* getReligionsAsync(action) {
  const response = yield VotersDataService.getVotersReligionsList();
  
  yield put(setReligionsList(response.data.religions_list));
    
}

function* getVolunteersAsync(action) {
  const response = yield UsersDataService.getVolunteersList();
  
  yield put(setVolunteersList(response.data.volunteers_list));
    
}

function* getPollingStationsAsync(action) {
  const response = yield ConstituencyDataService.getPollingStationsIdNameList();
  yield put(setPollingStationsList(response.data.polling_stations_list));
    
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
    takeLatest(getCastes().type, handleErrors(getCastesAsync)),
    takeLatest(getReligions().type, handleErrors(getReligionsAsync)),
    takeLatest(getVolunteers().type, handleErrors(getVolunteersAsync)),
    takeLatest(getPollingStations().type, handleErrors(getPollingStationsAsync)),
  ]);
}

store.sagaManager.addSaga(componentKey, rootSaga);
