import type { AppState, Question } from "./types";

const STORAGE_KEY = "interview-deck:v1";

export const initialState: AppState = {
  version: 1,
  phase: "setup",
  questions: [],
  candidate: "",
  current: 0,
  scores: {},
  notes: {},
  summary: "",
  startedAt: null,
  finishedAt: null,
  showExpected: true,
};

export type Action =
  | { type: "addQuestions"; questions: Question[] }
  | { type: "updateQuestion"; id: string; patch: Partial<Omit<Question, "id">> }
  | { type: "removeQuestion"; id: string }
  | { type: "restoreQuestion"; question: Question; index: number }
  | { type: "moveQuestion"; id: string; delta: -1 | 1 }
  | { type: "clearAll" }
  | { type: "setCandidate"; value: string }
  | { type: "start" }
  | { type: "restart" }
  | { type: "goTo"; index: number }
  | { type: "setScore"; id: string; score: number | null }
  | { type: "setNote"; id: string; value: string }
  | { type: "setSummary"; value: string }
  | { type: "toggleExpected" }
  | { type: "finish" }
  | { type: "resume"; index?: number }
  | { type: "editQuestions" }
  | { type: "newInterview" };

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const resetSession = (s: AppState): AppState => ({
  ...s,
  candidate: "",
  current: 0,
  scores: {},
  notes: {},
  summary: "",
  startedAt: null,
  finishedAt: null,
});

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "addQuestions":
      return { ...state, questions: [...state.questions, ...action.questions] };

    case "updateQuestion":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.id ? { ...q, ...action.patch } : q,
        ),
      };

    case "removeQuestion":
      return { ...state, questions: state.questions.filter((q) => q.id !== action.id) };

    case "restoreQuestion": {
      const questions = [...state.questions];
      questions.splice(clamp(action.index, 0, questions.length), 0, action.question);
      return { ...state, questions };
    }

    case "moveQuestion": {
      const i = state.questions.findIndex((q) => q.id === action.id);
      const j = i + action.delta;
      if (i < 0 || j < 0 || j >= state.questions.length) return state;
      const questions = [...state.questions];
      [questions[i], questions[j]] = [questions[j], questions[i]];
      return { ...state, questions };
    }

    case "clearAll":
      return { ...initialState, showExpected: state.showExpected };

    case "setCandidate":
      return { ...state, candidate: action.value };

    case "start":
      if (state.questions.length === 0) return state;
      return {
        ...state,
        phase: "interview",
        current: state.startedAt ? clamp(state.current, 0, state.questions.length - 1) : 0,
        startedAt: state.startedAt ?? new Date().toISOString(),
        finishedAt: null,
      };

    case "restart": {
      if (state.questions.length === 0) return state;
      const fresh = resetSession(state);
      return {
        ...fresh,
        candidate: state.candidate,
        phase: "interview",
        startedAt: new Date().toISOString(),
      };
    }

    case "goTo":
      return { ...state, current: clamp(action.index, 0, state.questions.length - 1) };

    case "setScore": {
      const scores = { ...state.scores };
      if (action.score === null) delete scores[action.id];
      else scores[action.id] = clamp(Math.round(action.score), 1, 10);
      return { ...state, scores };
    }

    case "setNote":
      return { ...state, notes: { ...state.notes, [action.id]: action.value } };

    case "setSummary":
      return { ...state, summary: action.value };

    case "toggleExpected":
      return { ...state, showExpected: !state.showExpected };

    case "finish":
      return { ...state, phase: "results", finishedAt: new Date().toISOString() };

    case "resume":
      return {
        ...state,
        phase: "interview",
        current: clamp(action.index ?? state.current, 0, Math.max(0, state.questions.length - 1)),
      };

    case "editQuestions":
      return { ...state, phase: "setup" };

    case "newInterview":
      return { ...resetSession(state), phase: "setup" };
  }
}

function isQuestion(v: unknown): v is Question {
  if (!v || typeof v !== "object") return false;
  const q = v as Record<string, unknown>;
  return ["id", "title", "level", "question", "followUp", "expected"].every(
    (k) => typeof q[k] === "string",
  );
}

export function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const data = JSON.parse(raw) as Partial<AppState>;
    if (data.version !== 1) return initialState;
    const questions = Array.isArray(data.questions) ? data.questions.filter(isQuestion) : [];
    const merged: AppState = { ...initialState, ...data, questions };
    if (questions.length === 0) merged.phase = "setup";
    merged.current = clamp(merged.current || 0, 0, Math.max(0, questions.length - 1));
    return merged;
  } catch {
    return initialState;
  }
}

export function saveState(state: AppState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked (private mode) — the app keeps working in memory
  }
}
