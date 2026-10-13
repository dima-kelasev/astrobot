import { createSlice } from '@reduxjs/toolkit';
import { api, codeOf } from '../api/client';
import type { Day } from '../api/schemas';
import { createAppAsyncThunk } from './hooks';
import { birthChanged } from './profileSlice';

type DayState = { status: 'idle' | 'loading' | 'ready' | 'error'; data: Day | null; opening: boolean; errorCode: string | null };

const initialState: DayState = { status: 'idle', data: null, opening: false, errorCode: null };

export const fetchDay = createAppAsyncThunk('day/fetch', async (_: void, { signal, rejectWithValue }) => {
  try {
    return await api.day(signal);
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const openDay = createAppAsyncThunk(
  'day/open',
  async (_: void, { rejectWithValue }) => {
    try {
      return await api.openDay();
    } catch (error) {
      return rejectWithValue(codeOf(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const { data, opening } = getState().day;
      return !opening && data !== null && !data.opened;
    }
  }
);

const daySlice = createSlice({
  name: 'day',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDay.pending, (state) => {
        state.status = 'loading';
        state.errorCode = null;
      })
      .addCase(fetchDay.fulfilled, (state, action) => {
        state.status = 'ready';
        state.data = action.payload;
      })
      .addCase(fetchDay.rejected, (state, action) => {
        if (action.meta.aborted) {
          state.status = state.data ? 'ready' : 'idle';
          return;
        }
        state.status = 'error';
        state.errorCode = action.payload ?? 'unknown';
      })
      .addCase(openDay.pending, (state) => {
        state.opening = true;
        state.errorCode = null;
      })
      .addCase(openDay.fulfilled, (state, action) => {
        state.opening = false;
        state.data = action.payload;
      })
      .addCase(openDay.rejected, (state, action) => {
        state.opening = false;
        state.errorCode = action.payload ?? 'unknown';
      })
      .addMatcher(birthChanged, () => initialState);
  }
});

export const dayReducer = daySlice.reducer;
