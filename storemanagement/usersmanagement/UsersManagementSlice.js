import { store } from '@betacrew/jars-flux';

export const componentKey = 'USERS_MANAGEMENT';

const { actions } = store.reducerManager.add({
  key: componentKey,
  addedReducers: {
    setVotersCount: (state, action) => {
      state.voters_count = action.payload;
    },
    setVolunteersToApprove: (state, action) => {
      state.volunteers_to_approve = action.payload;
    },
    setVolunteersRejected: (state, action) => {
      state.volunteers_rejected = action.payload;
    },
    removeVolunteerFromApprove: (state, action) => {
      const approveList = JSON.parse(JSON.stringify(state.volunteers_to_approve));
      state.volunteers_to_approve = approveList.filter(list => list.unique_id !== action.payload);
    },
    removeVolunteerFromRejected: (state, action) => {
      const rejectedList = JSON.parse(JSON.stringify(state.volunteers_rejected));
      state.volunteers_rejected = rejectedList.filter(list => list.unique_id !== action.payload);
    },
    addVolunteerToRejected: (state, action) => {
      state.volunteers_rejected = [
        action.payload,
        ...state.volunteers_rejected
      ];
    },
  },
  initialReducerState: {
    voters_count: null,
    volunteers_to_approve: [],
    volunteers_rejected: []
  },
});

export const {
  setVotersCount,
  setVolunteersToApprove,
  setVolunteersRejected,
  removeVolunteerFromApprove,
  removeVolunteerFromRejected,
  addVolunteerToRejected
} = actions;
