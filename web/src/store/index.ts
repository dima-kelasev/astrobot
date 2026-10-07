import { configureStore } from '@reduxjs/toolkit';
import { dayReducer } from './daySlice';
import { navReducer } from './navSlice';
import { profileReducer } from './profileSlice';
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
    readings: readingsReducer
  }
});

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
