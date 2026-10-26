import { createSlice } from '@reduxjs/toolkit';
import { api, codeOf, type BirthInput } from '../api/client';
import type { Partner, PartnerDetail } from '../api/schemas';
import { createAppAsyncThunk } from './hooks';
import { openPartner } from './navSlice';
import { birthChanged, fetchMe, limitsChanged } from './profileSlice';

type PartnersState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  list: Partner[];
  adding: boolean;
  addError: string | null;
  detail: PartnerDetail | null;
  detailStatus: 'idle' | 'loading' | 'ready' | 'error';
  detailError: string | null;
};

const initialState: PartnersState = { status: 'idle', list: [], adding: false, addError: null, detail: null, detailStatus: 'idle', detailError: null };

export const fetchPartners = createAppAsyncThunk('partners/list', async (_: void, { signal, rejectWithValue }) => {
  try {
    return (await api.partners(signal)).partners;
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const addPartner = createAppAsyncThunk('partners/add', async (body: BirthInput & { name: string }, { dispatch, rejectWithValue }) => {
  try {
    const result = await api.addPartner(body);
    dispatch(limitsChanged(result.limits));
    await dispatch(fetchMe());
    dispatch(openPartner(result.partner.id));
    return result.partner;
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const fetchPartner = createAppAsyncThunk('partners/detail', async (id: string, { signal, rejectWithValue }) => {
  try {
    return await api.partner(id, signal);
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const removePartner = createAppAsyncThunk('partners/remove', async (id: string, { rejectWithValue }) => {
  try {
    await api.deletePartner(id);
    return id;
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

const partnersSlice = createSlice({
  name: 'partners',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPartners.pending, (state) => {
        if (state.status !== 'ready') state.status = 'loading';
      })
      .addCase(fetchPartners.fulfilled, (state, action) => {
        state.status = 'ready';
        state.list = action.payload;
      })
      .addCase(fetchPartners.rejected, (state, action) => {
        if (!action.meta.aborted) state.status = 'error';
        else if (state.status === 'loading') state.status = 'idle';
      })
      .addCase(addPartner.pending, (state) => {
        state.adding = true;
        state.addError = null;
      })
      .addCase(addPartner.fulfilled, (state, action) => {
        state.adding = false;
        state.list = [action.payload, ...state.list];
      })
      .addCase(addPartner.rejected, (state, action) => {
        state.adding = false;
        state.addError = action.payload ?? 'unknown';
      })
      .addCase(fetchPartner.pending, (state, action) => {
        state.detailStatus = 'loading';
        state.detailError = null;
        if (state.detail?.partner.id !== action.meta.arg) state.detail = null;
      })
      .addCase(fetchPartner.fulfilled, (state, action) => {
        state.detailStatus = 'ready';
        state.detail = action.payload;
      })
      .addCase(fetchPartner.rejected, (state, action) => {
        if (action.meta.aborted) {
          state.detailStatus = state.detail ? 'ready' : 'idle';
          return;
        }
        state.detailStatus = 'error';
        state.detailError = action.payload ?? 'unknown';
      })
      .addCase(removePartner.fulfilled, (state, action) => {
        state.list = state.list.filter((partner) => partner.id !== action.payload);
        if (state.detail?.partner.id === action.payload) state.detail = null;
      })
      .addMatcher(birthChanged, () => initialState);
  }
});

export const partnersReducer = partnersSlice.reducer;
