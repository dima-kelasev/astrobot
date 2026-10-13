import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const TABS = ['home', 'sky', 'history', 'profile'] as const;
export const SUB_SCREENS = ['ask', 'day', 'topics', 'tarot', 'question', 'natal', 'asc', 'why', 'compat', 'partner', 'historyItem', 'birth', 'plan'] as const;

export type Tab = (typeof TABS)[number];
export type SubScreen = (typeof SUB_SCREENS)[number];
export type Screen = Tab | SubScreen;

const PARENT: Record<SubScreen, Screen> = {
  ask: 'home',
  day: 'home',
  topics: 'home',
  tarot: 'topics',
  question: 'ask',
  natal: 'home',
  asc: 'home',
  why: 'home',
  compat: 'home',
  partner: 'compat',
  historyItem: 'history',
  birth: 'profile',
  plan: 'profile'
};

export const isTab = (screen: Screen): screen is Tab => TABS.some((tab) => tab === screen);

export const tabOf = (screen: Screen): Tab => {
  let current: Screen = screen;
  while (!isTab(current)) current = PARENT[current];
  return current;
};

type Params = {
  theme: string | null;
  partnerId: string | null;
  historyKind: string | null;
  historyKey: string | null;
};

type NavState = { screen: Screen; params: Params; returnTo: Screen | null };

const emptyParams: Params = {
  theme: null,
  partnerId: null,
  historyKind: null,
  historyKey: null
};

const initialState: NavState = {
  screen: 'home',
  params: emptyParams,
  returnTo: null
};

const navSlice = createSlice({
  name: 'nav',
  initialState,
  reducers: {
    go: (state, action: PayloadAction<Screen>) => {
      state.screen = action.payload;
      if (action.payload !== 'birth') state.returnTo = null;
    },
    openTheme: (state, action: PayloadAction<string>) => {
      state.screen = 'tarot';
      state.params.theme = action.payload;
    },
    openPartner: (state, action: PayloadAction<string>) => {
      state.screen = 'partner';
      state.params.partnerId = action.payload;
    },
    openHistoryItem: (state, action: PayloadAction<{ kind: string; key: string }>) => {
      state.screen = 'historyItem';
      state.params.historyKind = action.payload.kind;
      state.params.historyKey = action.payload.key;
    },
    askBirth: (state, action: PayloadAction<Screen>) => {
      state.returnTo = action.payload;
      state.screen = 'birth';
    },
    back: (state) => {
      if (state.screen === 'birth' && state.returnTo) {
        state.screen = state.returnTo;
        state.returnTo = null;
        return;
      }
      state.screen = isTab(state.screen) ? 'home' : PARENT[state.screen];
    }
  }
});

export const { go, openTheme, openPartner, openHistoryItem, askBirth, back } = navSlice.actions;
export const navReducer = navSlice.reducer;
