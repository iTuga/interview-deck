import type { Question } from "./types";

/** Red → green, one colour per score 1..10. */
const SCORE_COLORS = [
  "#dc2626",
  "#e4472a",
  "#ea580c",
  "#ee7711",
  "#d97706",
  "#c58a05",
  "#8fa514",
  "#65a30d",
  "#16a34a",
  "#059669",
];

export function scoreColor(score: number): string {
  const i = Math.min(Math.max(Math.round(score), 1), 10) - 1;
  return SCORE_COLORS[i];
}

export function verdict(average: number): string {
  if (average >= 8.5) return "Відмінно";
  if (average >= 7) return "Добре";
  if (average >= 5) return "Задовільно";
  return "Слабко";
}

export type Stats = {
  total: number;
  scoredCount: number;
  questionCount: number;
  max: number;
  average: number | null;
  percent: number | null;
  byLevel: { level: string; count: number; scored: number; average: number | null }[];
};

export function computeStats(questions: Question[], scores: Record<string, number>): Stats {
  let total = 0;
  let scoredCount = 0;
  const levels = new Map<string, { count: number; scored: number; total: number }>();

  for (const q of questions) {
    const s = scores[q.id];
    const key = q.level.trim() || "Без рівня";
    const lv = levels.get(key) ?? { count: 0, scored: 0, total: 0 };
    lv.count++;
    if (typeof s === "number") {
      total += s;
      scoredCount++;
      lv.scored++;
      lv.total += s;
    }
    levels.set(key, lv);
  }

  const max = scoredCount * 10;
  return {
    total,
    scoredCount,
    questionCount: questions.length,
    max,
    average: scoredCount ? total / scoredCount : null,
    percent: max ? (total / max) * 100 : null,
    byLevel: [...levels.entries()].map(([level, v]) => ({
      level,
      count: v.count,
      scored: v.scored,
      average: v.scored ? v.total / v.scored : null,
    })),
  };
}

export const formatScore = (n: number | null) =>
  n === null ? "—" : n.toLocaleString("uk-UA", { maximumFractionDigits: 1, minimumFractionDigits: n % 1 === 0 ? 0 : 1 });
