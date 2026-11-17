import { store } from '@betacrew/jars-flux';
import {
  put, all, call, takeLeading, takeLatest,
  takeEvery,
} from 'redux-saga/effects';
import { componentKey } from './VotersApproachedSlice';
import VotersDataService from '../../services/VotersDataService';

export const {
  getVotersList,
  getSearchedVoter,
  getVotersApproachedList,
  getVotersCount, 
  getVotersVotedCount,
  getTotalVotersCount,
  getTotalVotersCountByAddress,
  getTotalAddressCount,
  getVotersCountPerDay,
  getVotersOpinion,
  getVotersAgeCountPerGroup,
  getVotersReligionCountPerGroup,
  getVotersCasteCountPerGroup,
  getVotersGenderCountPerGroup,
  getVotersMobileCount,
  getVotersMigratedCount,
  setVoterApproached,
  setVoterMigrated,
  setVoterVoted,
  setVoterMobileNumber,
  setVoterOpinion,
} = {
  getVotersList: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_VOTERS_LIST',
    payload,
  }),
  getSearchedVoter: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_SEARCHED_VOTER',
    payload,
  }),
  getVotersApproachedList: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_VOTERS_APPROACHED_LIST',
    payload,
  }),
  getVotersCount: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_VOTERS_COUNT',
    payload,
  }),
  getVotersVotedCount: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_VOTERS_VOTED_COUNT',
    payload,
  }),
  getTotalVotersCount: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_TOTAL_VOTERS_COUNT',
    payload,
  }),
  getTotalVotersCountByAddress: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_TOTAL_VOTERS_COUNT_BY_ADDRESS',
    payload,
  }),
  getTotalAddressCount: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_TOTAL_ADDRESS_COUNT',
    payload,
  }),
  getVotersCountPerDay: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_VOTERS_COUNT_PER_DAY',
    payload,
  }),
  getVotersOpinion: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_VOTERS_OPINION',
    payload,
  }),
  getVotersAgeCountPerGroup: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_VOTERS_AGE_COUNT_PER_GROUP',
    payload,
  }),
  getVotersReligionCountPerGroup: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_VOTERS_RELIGION_COUNT_PER_GROUP',
    payload,
  }),
  getVotersCasteCountPerGroup: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_VOTERS_CASTE_COUNT_PER_GROUP',
    payload,
  }),
  getVotersGenderCountPerGroup: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_VOTERS_GENDER_COUNT_PER_GROUP',
    payload,
  }),
  getVotersMobileCount: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_VOTERS_MOBILE_COUNT',
    payload,
  }),
  getVotersMigratedCount: (payload) => ({
    type: 'VOTERS_APPROACHED/GET_VOTERS_MIGRATED_COUNT',
    payload,
  }),
  setVoterApproached: (payload) => ({
    type: 'VOTERS_APPROACHED/SET_VOTER_APPROACHED',
    payload,
  }),
  setVoterMigrated: (payload) => ({
    type: 'VOTERS_APPROACHED/SET_VOTER_MIGRATED',
    payload,
  }),
  setVoterVoted: (payload) => ({
    type: 'VOTERS_APPROACHED/SET_VOTER_VOTED',
    payload,
  }),
  setVoterMobileNumber: (payload) => ({
    type: 'VOTERS_APPROACHED/SET_MOBILE_NUMBER',
    payload,
  }),
  setVoterOpinion: (payload) => ({
    type: 'VOTERS_APPROACHED/SET_VOTER_OPINION',
    payload,
  }),
};

function* getVotersListAsync(action) {
  const { filters, pageNum, isLiveVoting=false, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getVotersList({ filters, pageNum, isLiveVoting });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_list);
  }

  onComplete();
}

function* getSearchedVoterAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getSearchedVoter({ filters });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_list);
  }

  onComplete();
}

function* getVotersApproachedListAsync(action) {
  const { filters, pageNum, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getVotersApproachedList({ filters, pageNum });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_list);
  }

  onComplete();
}

function* getVotersCountAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  console.log("getVotersCountAsync", filters)
  const response = yield VotersDataService.getVotersApproachedCount({ 
    filters
  });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_count);
  }

  onComplete();
}

function* getVotersVotedCountAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  console.log("getVotersVotedCountAsync", filters)
  const response = yield VotersDataService.getVotersVotedCount({ 
    filters
  });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_count);
  }

  onComplete();
}

function* getTotalVotersCountAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getTotalVotersCount({ 
    filters
  });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_count);
  }

  onComplete();
}

function* getTotalVotersCountByAddressAsync(action) {
  const { filters, pageNum, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getTotalVotersCountByAddress({ 
    filters,
    pageNum
  });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_count);
  }

  onComplete();
}

function* getTotalAddressCountAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getTotalAddressCount({ 
    filters
  });

  if (response && response.status === 200) {
    onSuccess(response.data.address_count);
  }

  onComplete();
}

function* getVotersCountPerDayAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getVotersApproachedCountPerDay({ 
    filters
  });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_count_daywise);
  }

  onComplete();
}

function* getVotersOpinionAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getVotersOpinion({ 
    filters
  });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_opinion);
  }

  onComplete();
}

function* getVotersAgeCountPerGroupAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getVotersAgeCountPerGroup({ 
    filters
  });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_age_count_group);
  }

  onComplete();
}

function* getVotersReligionCountPerGroupAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getVotersReligionCountPerGroup({ 
    filters
  });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_religion_count_group);
  }

  onComplete();
}

function* getVotersCasteCountPerGroupAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getVotersCasteCountPerGroup({ 
    filters
  });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_caste_count_group);
  }

  onComplete();
}

function* getVotersGenderCountPerGroupAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getVotersGenderCountPerGroup({ 
    filters
  });

  if (response && response.status === 200) {
    onSuccess(response.data.voters_gender_count_group);
  }

  onComplete();
}

function* getVotersMobileCountAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getVotersMobileCount({filters});

  if (response && response.status === 200) {
    onSuccess(response.data.mobile_count);
  }

  onComplete();
}

function* getVotersMigratedCountAsync(action) {
  const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.getVotersMigratedCount({filters});

  if (response && response.status === 200) {
    onSuccess(response.data.migratory_count);
  }

  onComplete();
}

function* setVoterApproachedAsync(action) {
  const { voterId, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.setVoterApproached({ voter_id: voterId });

  if (response && response.status === 200) {
    onSuccess(response.data.data_collection_id);
  }

  onComplete();
}

function* setVoterVotedAsync(action) {
  const { voterId, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.setVoterVoted({ voter_id: voterId });

  if (response && response.status === 200) {
    onSuccess(response.data.live_voting_id);
  }

  onComplete();
}

function* setVoterMobileNumberAsync(action) {
  const { voterId, mobileNumber, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.setVoterMobileNumber({ voter_id: voterId, mobile_number: mobileNumber });

  if (response && response.status === 200) {
    onSuccess(true);
  }

  onComplete();
}

function* setVoterMigratoryStatusAsync(action) {
  const { voterId, isVoterMigrated, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.setVoterMigratoryStatus({ voter_id: voterId, is_voter_migrated: isVoterMigrated });

  if (response && response.status === 200) {
    onSuccess(true);
  }

  onComplete();
}

function* setVoterOpinionAsync(action) {
  const { voterId, opinion, onSuccess = () => {}, onComplete = () => {} } = action.payload;
  const response = yield VotersDataService.setVoterOpinion({ voter_id: voterId, opinion });

  if (response && response.status === 200) {
    onSuccess(true);
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
    takeLatest(getVotersList().type, handleErrors(getVotersListAsync)),
    takeLatest(getSearchedVoter().type, handleErrors(getSearchedVoterAsync)),
    takeEvery(getVotersApproachedList().type, handleErrors(getVotersApproachedListAsync)),
    takeEvery(getVotersCount().type, handleErrors(getVotersCountAsync)),
    takeEvery(getVotersVotedCount().type, handleErrors(getVotersVotedCountAsync)),
    takeEvery(getTotalVotersCount().type, handleErrors(getTotalVotersCountAsync)),
    takeEvery(getTotalVotersCountByAddress().type, handleErrors(getTotalVotersCountByAddressAsync)),
    takeEvery(getTotalAddressCount().type, handleErrors(getTotalAddressCountAsync)),
    takeEvery(getVotersCountPerDay().type, handleErrors(getVotersCountPerDayAsync)),
    takeEvery(getVotersOpinion().type, handleErrors(getVotersOpinionAsync)),
    takeEvery(getVotersAgeCountPerGroup().type, handleErrors(getVotersAgeCountPerGroupAsync)),
    takeEvery(getVotersReligionCountPerGroup().type, handleErrors(getVotersReligionCountPerGroupAsync)),
    takeEvery(getVotersCasteCountPerGroup().type, handleErrors(getVotersCasteCountPerGroupAsync)),
    takeEvery(getVotersGenderCountPerGroup().type, handleErrors(getVotersGenderCountPerGroupAsync)),
    takeEvery(getVotersMobileCount().type, handleErrors(getVotersMobileCountAsync)),
    takeEvery(getVotersMigratedCount().type, handleErrors(getVotersMigratedCountAsync)),
    takeLeading(setVoterApproached().type, handleErrors(setVoterApproachedAsync)),
    takeLeading(setVoterVoted().type, handleErrors(setVoterVotedAsync)),
    takeLeading(setVoterMobileNumber().type, handleErrors(setVoterMobileNumberAsync)),
    takeLeading(setVoterMigrated().type, handleErrors(setVoterMigratoryStatusAsync)),
    takeLeading(setVoterOpinion().type, handleErrors(setVoterOpinionAsync)),
  ]);
}

store.sagaManager.addSaga(componentKey, rootSaga);
