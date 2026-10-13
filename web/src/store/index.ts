import { configureStore } from '@reduxjs/toolkit';
import { chartReducer } from './chartSlice';
import { dayReducer } from './daySlice';
import { historyReducer } from './historySlice';
import { navReducer } from './navSlice';
import { partnersReducer } from './partnersSlice';
import { profileReducer } from './profileSlice';
import { questionReducer } from './questionSlice';
import { readingsReducer } from './readingsSlice';
import { skyReducer } from './skySlice';
import { spreadReducer } from './spreadSlice';

export const store = configureStore({
  reducer: {
    nav: navReducer,
    profile: profileReducer,
    sky: skyReducer,
    day: dayReducer,
    spread: spreadReducer,
    readings: readingsReducer,
    chart: chartReducer,
    partners: partnersReducer,
    question: questionReducer,
    history: historyReducer
  }
});

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
