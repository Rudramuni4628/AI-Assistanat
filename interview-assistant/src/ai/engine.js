export const DIFFICULTY_ORDER = ['Easy', 'Easy', 'Medium', 'Medium', 'Hard', 'Hard'];
export const TIME_LIMITS = { Easy: 20, Medium: 60, Hard: 120 };

export function generateQuestions() {
  const pool = {
    Easy: [
      'Explain the purpose of React hooks.',
      'What is the difference between var, let, and const in JS?',
    ],
    Medium: [
      'How would you design state management in a medium-size React app?',
      'Describe how to implement server-side pagination in a Node/Express API.',
    ],
    Hard: [
      'Design a scalable file upload service in Node with chunking and retry.',
      'How does React reconciliation work and when to optimize rendering?',
    ],
  };
  const questions = DIFFICULTY_ORDER.map((diff, idx) => ({
    id: `q${idx + 1}`,
    difficulty: diff,
    prompt: pool[diff][idx % pool[diff].length],
    timeLimit: TIME_LIMITS[diff],
    answer: null,
    aiScore: null,
  }));
  return questions;
}

export function scoreAnswer(question, answerText) {
  if (!answerText || !answerText.trim()) return 0;
  const keywords = {
    hooks: ['useState', 'useEffect', 'custom hooks', 'useMemo', 'useCallback'],
    'var let const': ['scope', 'hoisting', 'block', 'immutable', 'reassignment'],
    'state management': ['Redux', 'Context', 'MobX', 'Zustand', 'thunk', 'selector'],
    pagination: ['limit', 'offset', 'cursor', 'page', 'filter', 'sort'],
    upload: ['chunk', 'retry', 'stream', 'S3', 'resumable'],
    reconciliation: ['diffing', 'virtual DOM', 'keys', 'memoization', 'shouldComponentUpdate'],
  };
  const lower = answerText.toLowerCase();
  let score = 1; // base
  Object.values(keywords).forEach((list) => {
    const hits = list.filter((k) => lower.includes(k.toLowerCase()));
    if (hits.length) score += Math.min(4, hits.length);
  });
  // length bonus
  if (answerText.length > 200) score += 2;
  if (answerText.length > 400) score += 2;
  return Math.min(10, score);
}

export function summarizeCandidate(candidate) {
  const answered = (candidate.questions || []).filter((q) => q.answer);
  const avg = answered.length ? answered.reduce((a, q) => a + (q.aiScore || 0), 0) / answered.length : 0;
  const difficultySpread = (candidate.questions || [])
    .map((q) => `${q.difficulty}:${q.aiScore ?? '-'}`)
    .join(', ');
  return {
    finalScore: Math.round(avg * 10) / 10,
    summary: `Candidate ${candidate.name || '(unknown)'} performed with average ${Math.round(avg * 10) / 10}/10. Spread: ${difficultySpread}.`,
  };
}