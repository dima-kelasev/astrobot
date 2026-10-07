import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api, codeOf } from '../api/client';
import type { Card } from '../api/schemas';
import { createAppAsyncThunk } from './hooks';

export const PICKS = 3;

type PickEntry = { index: number; card: Card | null };

type SpreadState = {
  step: 'ask' | 'pick' | 'done';
  question: string;
  id: string | null;
  size: number;
  picks: PickEntry[];
  starting: boolean;
  errorCode: string | null;
};

const initialState: SpreadState = { step: 'ask', question: '', id: null, size: 0, picks: [], starting: false, errorCode: null };

export const startSpread = createAppAsyncThunk('spread/start', async (question: string, { rejectWithValue }) => {
  try {
    return await api.startSpread(question);
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
      const { step, id, picks } = getState().spread;
      return step === 'pick' && id !== null && picks.length < PICKS && !picks.some((pick) => pick.index === index);
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
    resetSpread: () => initialState
  },
  extraReducers: (builder) => {
    builder
      .addCase(startSpread.pending, (state) => {
        state.starting = true;
        state.errorCode = null;
      })
      .addCase(startSpread.fulfilled, (state, action) => {
        state.starting = false;
        state.step = 'pick';
        state.id = action.payload.id;
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
