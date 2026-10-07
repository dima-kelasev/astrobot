import { createSlice } from '@reduxjs/toolkit';
import { api, codeOf } from '../api/client';
import type { Me } from '../api/schemas';
import { createAppAsyncThunk } from './hooks';
import { startSpread } from './spreadSlice';

type ProfileState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorCode: string | null;
  me: Me | null;
  saving: boolean;
  saveError: string | null;
};

const initialState: ProfileState = { status: 'idle', errorCode: null, me: null, saving: false, saveError: null };

export const fetchMe = createAppAsyncThunk('profile/fetchMe', async (_: void, { signal, rejectWithValue }) => {
  try {
    return await api.me(signal);
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const updateMe = createAppAsyncThunk('profile/updateMe', async (patch: { birthDate?: string; notify?: boolean }, { rejectWithValue }) => {
  try {
    return await api.updateMe(patch);
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        if (!state.me) state.status = 'loading';
        state.errorCode = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.status = 'ready';
        state.me = action.payload;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        if (state.me) return;
        if (action.meta.aborted) {
          state.status = 'idle';
          return;
        }
        state.status = 'error';
        state.errorCode = action.payload ?? 'unknown';
      })
      .addCase(updateMe.pending, (state, action) => {
        state.saving = true;
        state.saveError = null;
        if (state.me && action.meta.arg.notify !== undefined) state.me.notify = action.meta.arg.notify;
      })
      .addCase(updateMe.fulfilled, (state, action) => {
        state.saving = false;
        state.me = action.payload;
      })
      .addCase(updateMe.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload ?? 'unknown';
        if (state.me && action.meta.arg.notify !== undefined) state.me.notify = !action.meta.arg.notify;
      })
      .addCase(startSpread.fulfilled, (state, action) => {
        if (state.me) state.me.quota = action.payload.quota;
      });
  }
});

export const profileReducer = profileSlice.reducer;
