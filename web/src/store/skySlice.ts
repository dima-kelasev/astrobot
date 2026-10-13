import { createSlice } from '@reduxjs/toolkit';
import { api, codeOf } from '../api/client';
import type { Sky } from '../api/schemas';
import { createAppAsyncThunk } from './hooks';
import { birthChanged } from './profileSlice';

type SkyState = { status: 'idle' | 'loading' | 'ready' | 'error'; data: Sky | null; errorCode: string | null };

const initialState: SkyState = { status: 'idle', data: null, errorCode: null };

export const fetchSky = createAppAsyncThunk('sky/fetch', async (_: void, { signal, rejectWithValue }) => {
  try {
    return await api.sky(signal);
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

const skySlice = createSlice({
  name: 'sky',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSky.pending, (state) => {
        state.status = 'loading';
        state.errorCode = null;
      })
      .addCase(fetchSky.fulfilled, (state, action) => {
        state.status = 'ready';
        state.data = action.payload;
      })
      .addCase(fetchSky.rejected, (state, action) => {
        if (action.meta.aborted) {
          state.status = state.data ? 'ready' : 'idle';
          return;
        }
        state.status = 'error';
        state.errorCode = action.payload ?? 'unknown';
      })
      .addMatcher(birthChanged, () => initialState);
  }
});

export const skyReducer = skySlice.reducer;
