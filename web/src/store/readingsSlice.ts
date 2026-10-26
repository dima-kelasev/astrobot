import { createAction, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { codeOf, streamReading } from '../api/client';
import { createAppAsyncThunk } from './hooks';
import { birthChanged } from './profileSlice';

export type ReadingKind = 'sky' | 'day' | 'spread' | 'natal' | 'natalPart' | 'asc' | 'why' | 'compat' | 'question';

export type ReadingState = {
  key: string | null;
  status: 'idle' | 'loading' | 'streaming' | 'done' | 'error';
  text: string;
  source: 'ai' | 'template' | null;
  note: string | null;
  locked: boolean;
  requestId: string | null;
};

type ReadingsState = Record<ReadingKind, ReadingState>;

const empty: ReadingState = { key: null, status: 'idle', text: '', source: null, note: null, locked: false, requestId: null };

const initialState: ReadingsState = {
  sky: empty,
  day: empty,
  spread: empty,
  natal: empty,
  natalPart: empty,
  asc: empty,
  why: empty,
  compat: empty,
  question: empty
};

const readingChunk = createAction<{ kind: ReadingKind; key: string; requestId: string; delta: string }>('readings/chunk');

export const fetchReading = createAppAsyncThunk(
  'readings/fetch',
  async (arg: { kind: ReadingKind; key: string; path: string }, { dispatch, signal, requestId, rejectWithValue }) => {
    try {
      return await streamReading(arg.path, (delta) => dispatch(readingChunk({ kind: arg.kind, key: arg.key, requestId, delta })), signal);
    } catch (error) {
      return rejectWithValue(codeOf(error));
    }
  }
);

const readingsSlice = createSlice({
  name: 'readings',
  initialState,
  reducers: {
    resetReading: (state, action: PayloadAction<ReadingKind>) => {
      state[action.payload] = empty;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReading.pending, (state, action) => {
        state[action.meta.arg.kind] = { ...empty, key: action.meta.arg.key, status: 'loading', requestId: action.meta.requestId };
      })
      .addCase(readingChunk, (state, action) => {
        const reading = state[action.payload.kind];
        if (reading.key !== action.payload.key || reading.requestId !== action.payload.requestId) return;
        reading.text += action.payload.delta;
        reading.status = 'streaming';
      })
      .addCase(fetchReading.fulfilled, (state, action) => {
        const reading = state[action.meta.arg.kind];
        if (reading.key !== action.meta.arg.key || reading.requestId !== action.meta.requestId) return;
        reading.status = 'done';
        reading.source = action.payload.source;
        reading.note = action.payload.note;
        reading.locked = action.payload.locked;
      })
      .addCase(fetchReading.rejected, (state, action) => {
        const { kind, key } = action.meta.arg;
        if (state[kind].key !== key || state[kind].requestId !== action.meta.requestId) return;
        if (action.meta.aborted) {
          state[kind] = empty;
          return;
        }
        state[kind].status = 'error';
        state[kind].note = action.payload ?? 'unknown';
      })
      .addMatcher(birthChanged, () => initialState);
  }
});

export const { resetReading } = readingsSlice.actions;
export const readingsReducer = readingsSlice.reducer;
