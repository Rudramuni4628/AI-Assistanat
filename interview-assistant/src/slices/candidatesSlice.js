import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  list: [],
};

const candidatesSlice = createSlice({
  name: 'candidates',
  initialState,
  reducers: {
    clearCandidates: (state) => {
      state.list = []
    },
    upsertCandidate: (state, action) => {
      const cand = action.payload;
      const idx = state.list.findIndex((c) => c.id === cand.id);
      if (idx >= 0) state.list[idx] = { ...state.list[idx], ...cand };
      else state.list.push(cand);
    },
    updateCandidateFields: (state, action) => {
      const { id, fields } = action.payload;
      const cand = state.list.find((c) => c.id === id);
      if (cand) Object.assign(cand, fields);
    },
    setQuestions: (state, action) => {
      const { id, questions } = action.payload;
      const cand = state.list.find((c) => c.id === id);
      if (cand) cand.questions = questions;
    },
    recordAnswer: (state, action) => {
      const { id, questionIndex, answer, aiScore, timeTaken, answeredAt } = action.payload;
      const cand = state.list.find((c) => c.id === id);
      if (!cand) return;
      if (cand.questions && cand.questions[questionIndex]) {
        cand.questions[questionIndex] = {
          ...cand.questions[questionIndex],
          answer,
          aiScore,
          timeTaken,
          answeredAt,
        };
      }
    },
    finalizeCandidate: (state, action) => {
      const { id, finalScore, summary, status } = action.payload;
      const cand = state.list.find((c) => c.id === id);
      if (cand) {
        cand.finalScore = finalScore;
        cand.summary = summary;
        cand.status = status || 'completed';
      }
    },
    setChatHistory: (state, action) => {
      const { id, chatHistory } = action.payload;
      const cand = state.list.find((c) => c.id === id);
      if (cand) cand.chatHistory = chatHistory;
    },
  },
});

export const {
  clearCandidates,
  upsertCandidate,
  updateCandidateFields,
  setQuestions,
  recordAnswer,
  finalizeCandidate,
  setChatHistory,
} = candidatesSlice.actions;

export default candidatesSlice.reducer;