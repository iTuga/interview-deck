export type Question = {
  id: string;
  title: string;
  level: string;
  question: string;
  followUp: string;
  expected: string;
};

export type QuestionField = Exclude<keyof Question, "id">;

export type Phase = "setup" | "interview" | "results";

export type AppState = {
  version: 1;
  phase: Phase;
  questions: Question[];
  candidate: string;
  current: number;
  /** question id -> score 1..10 */
  scores: Record<string, number>;
  /** question id -> interviewer note */
  notes: Record<string, string>;
  summary: string;
  startedAt: string | null;
  finishedAt: string | null;
  showExpected: boolean;
};

export const FIELD_LABELS: Record<QuestionField, string> = {
  title: "Назва",
  level: "Рівень",
  question: "Питання",
  followUp: "Уточнення",
  expected: "Що спостерігаємо",
};
