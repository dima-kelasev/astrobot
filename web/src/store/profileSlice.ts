import { createSlice, type PayloadAction, type UnknownAction } from '@reduxjs/toolkit';
import { api, codeOf, type MePatch } from '../api/client';
import type { Limits, Me } from '../api/schemas';
import { createAppAsyncThunk } from './hooks';

type ProfileState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorCode: string | null;
  me: Me | null;
  saving: boolean;
  saveError: string | null;
  deleting: boolean;
};

const initialState: ProfileState = { status: 'idle', errorCode: null, me: null, saving: false, saveError: null, deleting: false };

export const fetchMe = createAppAsyncThunk('profile/fetchMe', async (_: void, { signal, rejectWithValue }) => {
  try {
    return await api.me(signal);
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const updateMe = createAppAsyncThunk('profile/updateMe', async (patch: MePatch, { rejectWithValue }) => {
  try {
    return await api.updateMe(patch);
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const deleteMe = createAppAsyncThunk('profile/deleteMe', async (_: void, { dispatch, rejectWithValue }) => {
  try {
    await api.deleteMe();
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
  await dispatch(fetchMe());
});

export const birthChanged = (action: UnknownAction) =>
  (updateMe.fulfilled.match(action) && action.meta.arg.birth !== undefined) || deleteMe.fulfilled.match(action);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    limitsChanged: (state, action: PayloadAction<Limits>) => {
      if (state.me) state.me.limits = action.payload;
    }
  },
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
        const { notifyMorning, notifyEvening } = action.meta.arg;
        if (state.me && notifyMorning !== undefined) state.me.notifyMorning = notifyMorning;
        if (state.me && notifyEvening !== undefined) state.me.notifyEvening = notifyEvening;
      })
      .addCase(updateMe.fulfilled, (state, action) => {
        state.saving = false;
        state.me = action.payload;
      })
      .addCase(updateMe.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload ?? 'unknown';
        const { notifyMorning, notifyEvening } = action.meta.arg;
        if (state.me && notifyMorning !== undefined) state.me.notifyMorning = !notifyMorning;
        if (state.me && notifyEvening !== undefined) state.me.notifyEvening = !notifyEvening;
      })
      .addCase(deleteMe.pending, (state) => {
        state.deleting = true;
      })
      .addCase(deleteMe.fulfilled, (state) => {
        state.deleting = false;
      })
      .addCase(deleteMe.rejected, (state, action) => {
        state.deleting = false;
        state.saveError = action.payload ?? 'unknown';
      });
  }
});

export const { limitsChanged } = profileSlice.actions;
export const profileReducer = profileSlice.reducer;
