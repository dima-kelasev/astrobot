import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api, codeOf, type PayMethod } from '../api/client';
import type { Plans, ProductKey } from '../api/schemas';
import { telegram } from '../telegram';
import { createAppAsyncThunk } from './hooks';
import { meLoaded } from './profileSlice';

export type PaySheet = { product: ProductKey; partnerId: string | null; partnerName: string | null };

type Step = 'choose' | 'creating' | 'waiting' | 'success' | 'canceled' | 'error';

type PaymentState = {
  plans: Plans | null;
  plansStatus: 'idle' | 'loading' | 'ready' | 'error';
  sheet: PaySheet | null;
  step: Step;
  paymentId: string | null;
  url: string | null;
  error: string | null;
};

const initialState: PaymentState = { plans: null, plansStatus: 'idle', sheet: null, step: 'choose', paymentId: null, url: null, error: null };

export const fetchPlans = createAppAsyncThunk('payment/plans', async (_: void, { signal, rejectWithValue }) => {
  try {
    return await api.plans(signal);
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const startPayment = createAppAsyncThunk('payment/start', async (method: PayMethod, { getState, rejectWithValue }) => {
  const sheet = getState().payment.sheet;
  if (!sheet) return rejectWithValue('no_sheet');
  try {
    const created = await api.pay({ product: sheet.product, method, partnerId: sheet.partnerId ?? undefined });
    telegram.openLink(created.url);
    return created;
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const checkPayment = createAppAsyncThunk('payment/check', async (_: void, { getState, dispatch, rejectWithValue }) => {
  const id = getState().payment.paymentId;
  if (!id) return rejectWithValue('no_payment');
  try {
    const result = await api.paymentStatus(id);
    dispatch(meLoaded(result.me));
    return result.status;
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    openPay: (state, action: PayloadAction<PaySheet>) => {
      state.sheet = action.payload;
      state.step = 'choose';
      state.paymentId = null;
      state.url = null;
      state.error = null;
    },
    closePay: (state) => {
      state.sheet = null;
      state.step = 'choose';
      state.paymentId = null;
      state.url = null;
      state.error = null;
    },
    backToChoose: (state) => {
      state.step = 'choose';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlans.pending, (state) => {
        if (!state.plans) state.plansStatus = 'loading';
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.plansStatus = 'ready';
        state.plans = action.payload;
      })
      .addCase(fetchPlans.rejected, (state, action) => {
        if (action.meta.aborted) {
          if (!state.plans) state.plansStatus = 'idle';
          return;
        }
        if (!state.plans) state.plansStatus = 'error';
      })
      .addCase(startPayment.pending, (state) => {
        state.step = 'creating';
        state.error = null;
      })
      .addCase(startPayment.fulfilled, (state, action) => {
        state.step = 'waiting';
        state.paymentId = action.payload.id;
        state.url = action.payload.url;
      })
      .addCase(startPayment.rejected, (state, action) => {
        state.step = 'error';
        state.error = action.payload ?? 'unknown';
      })
      .addCase(checkPayment.fulfilled, (state, action) => {
        if (action.payload === 'succeeded') state.step = 'success';
        if (action.payload === 'canceled') state.step = 'canceled';
      })
      .addCase(meLoaded, (state, action) => {
        if (state.plans) {
          state.plans.access = action.payload.access;
          state.plans.email = action.payload.email;
        }
      });
  }
});

export const { openPay, closePay, backToChoose } = paymentSlice.actions;
export const paymentReducer = paymentSlice.reducer;
