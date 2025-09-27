import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentCandidateId: null,
  stage: 'idle', // 'collecting' | 'interview' | 'completed'
  currentQuestionIndex: 0,
  currentQuestionStartAt: null, // timestamp
  paused: false,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    startSession: (state, action) => {
      const { candidateId } = action.payload;
      state.currentCandidateId = candidateId;
      state.stage = 'collecting';
      state.currentQuestionIndex = 0;
      state.currentQuestionStartAt = null;
      state.paused = false;
    },
    startInterview: (state) => {
      state.stage = 'interview';
      state.currentQuestionIndex = 0;
      state.currentQuestionStartAt = Date.now();
    },
    nextQuestion: (state) => {
      state.currentQuestionIndex += 1;
      state.currentQuestionStartAt = Date.now();
    },
    completeInterview: (state) => {
      state.stage = 'completed';
      state.currentQuestionStartAt = null;
    },
    setPaused: (state, action) => {
      state.paused = action.payload;
    },
    resetSession: () => initialState,
  },
});

export const {
  startSession,
  startInterview,
  nextQuestion,
  completeInterview,
  setPaused,
  resetSession,
} = sessionSlice.actions;

export default sessionSlice.reducer;