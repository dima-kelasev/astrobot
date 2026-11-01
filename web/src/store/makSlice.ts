import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api, codeOf } from '../api/client';
import type { MakSession } from '../api/schemas';
import { createAppAsyncThunk } from './hooks';
import { limitsChanged } from './profileSlice';

export type MakStep = 'ask' | 'draw' | 'answer' | 'done';

type MakState = {
  step: MakStep;
  question: string;
  session: MakSession | null;
  index: number;
  drafts: string[];
  starting: boolean;
  saving: boolean;
  error: string | null;
};

const initialState: MakState = { step: 'ask', question: '', session: null, index: 0, drafts: [], starting: false, saving: false, error: null };

export const startMak = createAppAsyncThunk('mak/start', async (_: void, { getState, dispatch, rejectWithValue }) => {
  try {
    const result = await api.makStart(getState().mak.question.trim());
    dispatch(limitsChanged(result.limits));
    return result.session;
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

export const finishMak = createAppAsyncThunk('mak/finish', async (_: void, { getState, rejectWithValue }) => {
  const { session, drafts } = getState().mak;
  if (!session) return rejectWithValue('no_session');
  try {
    return (await api.makAnswers(session.id, drafts.map((draft) => draft.trim()))).session;
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

const makSlice = createSlice({
  name: 'mak',
  initialState,
  reducers: {
    setMakQuestion: (state, action: PayloadAction<string>) => {
      state.question = action.payload;
      state.error = null;
    },
    revealMak: (state) => {
      if (state.step === 'draw') state.step = 'answer';
    },
    setDraft: (state, action: PayloadAction<string>) => {
      state.drafts[state.index] = action.payload;
    },
    nextQuestion: (state) => {
      if (state.session && state.index < state.session.questions.length - 1) state.index += 1;
    },
    prevQuestion: (state) => {
      if (state.index > 0) state.index -= 1;
    },
    resetMak: () => initialState
  },
  extraReducers: (builder) => {
    builder
      .addCase(startMak.pending, (state) => {
        state.starting = true;
        state.error = null;
      })
      .addCase(startMak.fulfilled, (state, action) => {
        state.starting = false;
        state.session = action.payload;
        state.drafts = action.payload.questions.map(() => '');
        state.index = 0;
        state.step = 'draw';
      })
      .addCase(startMak.rejected, (state, action) => {
        state.starting = false;
        state.error = action.payload ?? 'unknown';
      })
      .addCase(finishMak.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(finishMak.fulfilled, (state, action) => {
        state.saving = false;
        state.session = action.payload;
        state.step = 'done';
      })
      .addCase(finishMak.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? 'unknown';
      })
  }
});

export const { setMakQuestion, revealMak, setDraft, nextQuestion, prevQuestion, resetMak } = makSlice.actions;
export const makReducer = makSlice.reducer;
