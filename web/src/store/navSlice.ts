import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const TABS = ['menu', 'sky', 'plan', 'profile'] as const;
export const SUB_SCREENS = ['tarot', 'day'] as const;

export type Tab = (typeof TABS)[number];
export type SubScreen = (typeof SUB_SCREENS)[number];
export type Screen = Tab | SubScreen;

type NavState = { screen: Screen };

const initialState: NavState = { screen: 'menu' };

const navSlice = createSlice({
  name: 'nav',
  initialState,
  reducers: {
    go: (state, action: PayloadAction<Screen>) => {
      state.screen = action.payload;
    }
  }
});

export const { go } = navSlice.actions;
export const navReducer = navSlice.reducer;
