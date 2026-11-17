import { store } from '@betacrew/jars-flux';

export const componentKey = 'STAGINGSCREEN';

const { actions } = store.reducerManager.add({
  key: componentKey,
  addedReducers: {
    setErrorStatus: (state, action) => {
      state.errorStatus = action.payload;
    },
  },
  initialReducerState: {
    errorStatus: null,
  },
});

export const {
  setErrorStatus,
} = actions;
