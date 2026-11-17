import { store } from '@betacrew/jars-flux';
import { LANGUAGES } from '../../strings';

export const componentKey = 'LANGUAGEKEY';

const { actions } = store.reducerManager.add({
  key: componentKey,
  addedReducers: {
    setLanguage: (state, action) => {
      state.language = action.payload;
    }
  },
  initialReducerState: {
    language: null,
  },
});

export const {
  setLanguage
} = actions;
