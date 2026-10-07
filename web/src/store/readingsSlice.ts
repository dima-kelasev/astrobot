import { createAction, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { codeOf, streamReading } from '../api/client';
import { createAppAsyncThunk } from './hooks';
import { updateMe } from './profileSlice';

export type ReadingKind = 'sky' | 'day' | 'spread';

export type ReadingState = {
  key: string | null;
  status: 'idle' | 'loading' | 'streaming' | 'done' | 'error';
  text: string;
  source: 'ai' | 'template' | null;
  note: string | null;
};

type ReadingsState = Record<ReadingKind, ReadingState>;

const empty: ReadingState = { key: null, status: 'idle', text: '', source: null, note: null };

const initialState: ReadingsState = { sky: empty, day: empty, spread: empty };

const readingChunk = createAction<{ kind: ReadingKind; key: string; delta: string }>('readings/chunk');

export const fetchReading = createAppAsyncThunk(
  'readings/fetch',
  async (arg: { kind: ReadingKind; key: string; path: string }, { dispatch, signal, rejectWithValue }) => {
    try {
      return await streamReading(arg.path, (delta) => dispatch(readingChunk({ kind: arg.kind, key: arg.key, delta })), signal);
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
        state[action.meta.arg.kind] = { ...empty, key: action.meta.arg.key, status: 'loading' };
      })
      .addCase(readingChunk, (state, action) => {
        const reading = state[action.payload.kind];
        if (reading.key !== action.payload.key) return;
        reading.text += action.payload.delta;
        reading.status = 'streaming';
      })
      .addCase(fetchReading.fulfilled, (state, action) => {
        const reading = state[action.meta.arg.kind];
        if (reading.key !== action.meta.arg.key) return;
        reading.status = 'done';
        reading.source = action.payload.source;
        reading.note = action.payload.note;
      })
      .addCase(fetchReading.rejected, (state, action) => {
        const { kind, key } = action.meta.arg;
        if (state[kind].key !== key) return;
        if (action.meta.aborted) {
          state[kind] = empty;
          return;
        }
        state[kind].status = 'error';
        state[kind].note = action.payload ?? 'unknown';
      })
      .addCase(updateMe.fulfilled, (state, action) => {
        if (action.meta.arg.birthDate === undefined) return;
        state.sky = empty;
        state.day = empty;
      });
  }
});

export const { resetReading } = readingsSlice.actions;
export const readingsReducer = readingsSlice.reducer;
