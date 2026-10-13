import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api, codeOf } from '../api/client';
import type { Asc, Natal, Why } from '../api/schemas';
import { createAppAsyncThunk } from './hooks';
import { birthChanged } from './profileSlice';

type Resource<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null; errorCode: string | null };

export const NATAL_TABS = ['planets', 'houses', 'aspects'] as const;

export type NatalTab = (typeof NATAL_TABS)[number];

type NatalView = { tab: NatalTab; open: string | null };

type ChartState = { natal: Resource<Natal>; asc: Resource<Asc>; why: Resource<Why>; natalView: NatalView };

const idle = { status: 'idle', data: null, errorCode: null } as const;

const initialState: ChartState = { natal: idle, asc: idle, why: idle, natalView: { tab: 'planets', open: null } };

export const fetchNatal = createAppAsyncThunk('chart/natal', async (_: void, { signal, rejectWithValue }) => {
  try {
    return await api.natal(signal);
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const fetchAsc = createAppAsyncThunk('chart/asc', async (_: void, { signal, rejectWithValue }) => {
  try {
    return await api.asc(signal);
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const fetchWhy = createAppAsyncThunk('chart/why', async (_: void, { signal, rejectWithValue }) => {
  try {
    return await api.why(signal);
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

const chartSlice = createSlice({
  name: 'chart',
  initialState,
  reducers: {
    setNatalTab: (state, action: PayloadAction<NatalTab>) => {
      state.natalView.tab = action.payload;
    },
    toggleNatalPart: (state, action: PayloadAction<string>) => {
      state.natalView.open = state.natalView.open === action.payload ? null : action.payload;
    },
    showNatalPart: (state, action: PayloadAction<string>) => {
      state.natalView.tab = action.payload.startsWith('house') ? 'houses' : 'planets';
      state.natalView.open = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNatal.pending, (state) => {
        state.natal = { status: 'loading', data: state.natal.data, errorCode: null };
      })
      .addCase(fetchNatal.fulfilled, (state, action) => {
        state.natal = { status: 'ready', data: action.payload, errorCode: null };
      })
      .addCase(fetchNatal.rejected, (state, action) => {
        state.natal = action.meta.aborted
          ? { ...state.natal, status: state.natal.data ? 'ready' : 'idle' }
          : { status: 'error', data: null, errorCode: action.payload ?? 'unknown' };
      })
      .addCase(fetchAsc.pending, (state) => {
        state.asc = { status: 'loading', data: state.asc.data, errorCode: null };
      })
      .addCase(fetchAsc.fulfilled, (state, action) => {
        state.asc = { status: 'ready', data: action.payload, errorCode: null };
      })
      .addCase(fetchAsc.rejected, (state, action) => {
        state.asc = action.meta.aborted
          ? { ...state.asc, status: state.asc.data ? 'ready' : 'idle' }
          : { status: 'error', data: null, errorCode: action.payload ?? 'unknown' };
      })
      .addCase(fetchWhy.pending, (state) => {
        state.why = { status: 'loading', data: state.why.data, errorCode: null };
      })
      .addCase(fetchWhy.fulfilled, (state, action) => {
        state.why = { status: 'ready', data: action.payload, errorCode: null };
      })
      .addCase(fetchWhy.rejected, (state, action) => {
        state.why = action.meta.aborted
          ? { ...state.why, status: state.why.data ? 'ready' : 'idle' }
          : { status: 'error', data: null, errorCode: action.payload ?? 'unknown' };
      })
      .addMatcher(birthChanged, () => initialState);
  }
});

export const { setNatalTab, toggleNatalPart, showNatalPart } = chartSlice.actions;
export const chartReducer = chartSlice.reducer;
