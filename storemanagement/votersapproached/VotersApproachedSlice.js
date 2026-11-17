import { store } from '@betacrew/jars-flux';

export const componentKey = 'VOTERS_APPROACHED';

const { actions } = store.reducerManager.add({
  key: componentKey,
  addedReducers: {
    setVotersCount: (state, action) => {
      state.voters_count = action.payload;
    },
  },
  initialReducerState: {
    voters_count: null
  },
});

export const {
  setVotersCount
} = actions;
