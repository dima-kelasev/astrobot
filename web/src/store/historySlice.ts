import { createSlice } from '@reduxjs/toolkit';
import { api, codeOf } from '../api/client';
import type { HistoryEntry, HistoryItem } from '../api/schemas';
import { createAppAsyncThunk } from './hooks';
import { deleteMe } from './profileSlice';

type HistoryState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: HistoryEntry[];
  item: HistoryItem | null;
  itemStatus: 'idle' | 'loading' | 'ready' | 'error';
};

const initialState: HistoryState = { status: 'idle', items: [], item: null, itemStatus: 'idle' };

export const fetchHistory = createAppAsyncThunk('history/list', async (_: void, { signal, rejectWithValue }) => {
  try {
    return (await api.history(signal)).items;
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const fetchHistoryItem = createAppAsyncThunk('history/item', async (arg: { kind: string; key: string }, { signal, rejectWithValue }) => {
  try {
    return await api.historyItem(arg.kind, arg.key, signal);
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHistory.pending, (state) => {
        if (state.status !== 'ready') state.status = 'loading';
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.status = 'ready';
        state.items = action.payload;
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        if (!action.meta.aborted) state.status = 'error';
        else if (state.status === 'loading') state.status = 'idle';
      })
      .addCase(fetchHistoryItem.pending, (state, action) => {
        state.itemStatus = 'loading';
        if (state.item?.key !== action.meta.arg.key) state.item = null;
      })
      .addCase(fetchHistoryItem.fulfilled, (state, action) => {
        state.itemStatus = 'ready';
        state.item = action.payload;
      })
      .addCase(fetchHistoryItem.rejected, (state, action) => {
        state.itemStatus = action.meta.aborted ? (state.item ? 'ready' : 'idle') : 'error';
      })
      .addCase(deleteMe.fulfilled, () => initialState);
  }
});

export const historyReducer = historySlice.reducer;
