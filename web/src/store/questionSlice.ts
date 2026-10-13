import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api, codeOf } from '../api/client';
import type { QuestionStart } from '../api/schemas';
import { createAppAsyncThunk } from './hooks';
import { go } from './navSlice';
import { limitsChanged } from './profileSlice';

type QuestionState = {
  text: string;
  status: 'idle' | 'asking' | 'ready' | 'error';
  result: QuestionStart | null;
  asked: string;
  errorCode: string | null;
};

const initialState: QuestionState = { text: '', status: 'idle', result: null, asked: '', errorCode: null };

export const askQuestion = createAppAsyncThunk('question/ask', async (text: string, { dispatch, rejectWithValue }) => {
  dispatch(go('question'));
  try {
    const result = await api.ask(text);
    dispatch(limitsChanged(result.limits));
    return result;
  } catch (error) {
    return rejectWithValue(codeOf(error));
  }
});

const questionSlice = createSlice({
  name: 'question',
  initialState,
  reducers: {
    setText: (state, action: PayloadAction<string>) => {
      state.text = action.payload;
    },
    resetQuestion: () => initialState
  },
  extraReducers: (builder) => {
    builder
      .addCase(askQuestion.pending, (state, action) => {
        state.status = 'asking';
        state.asked = action.meta.arg;
        state.result = null;
        state.errorCode = null;
      })
      .addCase(askQuestion.fulfilled, (state, action) => {
        state.status = 'ready';
        state.result = action.payload;
        state.text = '';
      })
      .addCase(askQuestion.rejected, (state, action) => {
        state.status = 'error';
        state.errorCode = action.payload ?? 'unknown';
      });
  }
});

export const { setText, resetQuestion } = questionSlice.actions;
export const questionReducer = questionSlice.reducer;
