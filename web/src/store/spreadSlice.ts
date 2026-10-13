import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api, codeOf } from '../api/client';
import type { Card, Theme } from '../api/schemas';
import { createAppAsyncThunk } from './hooks';
import { openTheme } from './navSlice';
import { limitsChanged } from './profileSlice';

type PickEntry = { index: number; card: Card | null };

type SpreadState = {
  themes: Theme[];
  themesStatus: 'idle' | 'loading' | 'ready' | 'error';
  theme: string;
  step: 'ask' | 'pick' | 'done';
  question: string;
  id: string | null;
  title: string;
  positions: string[];
  size: number;
  picks: PickEntry[];
  starting: boolean;
  errorCode: string | null;
};

const initialState: SpreadState = {
  themes: [],
  themesStatus: 'idle',
  theme: 'general',
  step: 'ask',
  question: '',
  id: null,
  title: '',
  positions: [],
  size: 0,
  picks: [],
  starting: false,
  errorCode: null
};

export const fetchThemes = createAppAsyncThunk('spread/themes', async (_: void, { signal, rejectWithValue }) => {
  try {
    return (await api.themes(signal)).themes;
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const startSpread = createAppAsyncThunk('spread/start', async (_: void, { getState, dispatch, rejectWithValue }) => {
  const { theme, question } = getState().spread;
  try {
    const result = await api.startSpread(theme, question.trim());
    dispatch(limitsChanged(result.limits));
    return result;
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const pickCard = createAppAsyncThunk(
  'spread/pick',
  async (index: number, { getState, rejectWithValue }) => {
    const { id } = getState().spread;
    if (!id) return rejectWithValue('not_found');
    try {
      return await api.pick(id, index);
    } catch (error) {
      return rejectWithValue(codeOf(error));
    }
  },
  {
    condition: (index, { getState }) => {
      const { step, id, picks, positions } = getState().spread;
      return step === 'pick' && id !== null && picks.length < positions.length && !picks.some((pick) => pick.index === index);
    }
  }
);

const spreadSlice = createSlice({
  name: 'spread',
  initialState,
  reducers: {
    setQuestion: (state, action: PayloadAction<string>) => {
      state.question = action.payload;
      state.errorCode = null;
    },
    finishSpread: (state) => {
      state.step = 'done';
    },
    resetSpread: (state) => ({ ...initialState, themes: state.themes, themesStatus: state.themesStatus, theme: state.theme })
  },
  extraReducers: (builder) => {
    builder
      .addCase(openTheme, (state, action) => ({
        ...initialState,
        themes: state.themes,
        themesStatus: state.themesStatus,
        theme: action.payload,
        question: action.payload === state.theme && state.step === 'ask' ? state.question : ''
      }))
      .addCase(fetchThemes.pending, (state) => {
        state.themesStatus = 'loading';
      })
      .addCase(fetchThemes.fulfilled, (state, action) => {
        state.themesStatus = 'ready';
        state.themes = action.payload;
      })
      .addCase(fetchThemes.rejected, (state, action) => {
        state.themesStatus = action.meta.aborted ? 'idle' : 'error';
      })
      .addCase(startSpread.pending, (state) => {
        state.starting = true;
        state.errorCode = null;
      })
      .addCase(startSpread.fulfilled, (state, action) => {
        state.starting = false;
        state.step = 'pick';
        state.id = action.payload.id;
        state.title = action.payload.title;
        state.positions = action.payload.positions;
        state.size = action.payload.size;
        state.picks = [];
      })
      .addCase(startSpread.rejected, (state, action) => {
        state.starting = false;
        state.errorCode = action.payload ?? 'unknown';
      })
      .addCase(pickCard.pending, (state, action) => {
        state.picks.push({ index: action.meta.arg, card: null });
      })
      .addCase(pickCard.fulfilled, (state, action) => {
        const entry = state.picks.find((pick) => pick.index === action.meta.arg);
        if (entry) entry.card = action.payload.card;
      })
      .addCase(pickCard.rejected, (state, action) => {
        state.picks = state.picks.filter((pick) => pick.index !== action.meta.arg);
        state.errorCode = action.payload ?? 'unknown';
      });
  }
});

export const { setQuestion, finishSpread, resetSpread } = spreadSlice.actions;
export const spreadReducer = spreadSlice.reducer;
