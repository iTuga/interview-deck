import { parseQuestions, uid } from "./parse";
import { computeStats, formatScore, verdict } from "./score";
import type { AppState, Question } from "./types";

const formatDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("uk-UA", { dateStyle: "long", timeStyle: "short" }).format(
        new Date(iso),
      )
    : "—";

function fileSlug(state: AppState): string {
  const name = state.candidate
    .trim()
    .toLowerCase()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-");
  const date = (state.finishedAt ?? new Date().toISOString()).slice(0, 10);
  return `interview-${name || "candidate"}-${date}`;
}

export function buildResult(state: AppState) {
  const stats = computeStats(state.questions, state.scores);
  return {
    candidate: state.candidate.trim() || null,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    summary: state.summary.trim() || null,
    stats: {
      average: stats.average === null ? null : Math.round(stats.average * 100) / 100,
      total: stats.total,
      max: stats.max,
      percent: stats.percent === null ? null : Math.round(stats.percent),
      scored: stats.scoredCount,
      questions: stats.questionCount,
      byLevel: stats.byLevel,
    },
    questions: state.questions.map((q, i) => ({
      number: i + 1,
      title: q.title,
      level: q.level,
      question: q.question,
      followUp: q.followUp,
      expected: q.expected,
      score: state.scores[q.id] ?? null,
      note: state.notes[q.id]?.trim() || null,
    })),
  };
}

export function resultToJSON(state: AppState): { name: string; content: string } {
  return {
    name: `${fileSlug(state)}.json`,
    content: JSON.stringify(buildResult(state), null, 2),
  };
}

const quote = (text: string) =>
  text
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");

export function resultToMarkdown(state: AppState): { name: string; content: string } {
  const r = buildResult(state);
  const s = r.stats;
  const lines: string[] = [];

  lines.push(`# Результат співбесіди${r.candidate ? ` — ${r.candidate}` : ""}`, "");
  lines.push(`- **Дата:** ${formatDate(r.finishedAt ?? r.startedAt)}`);
  if (s.average !== null) {
    lines.push(`- **Середній бал:** ${formatScore(s.average)} / 10 (${verdict(s.average)})`);
    lines.push(`- **Сума балів:** ${s.total} з ${s.max} (${s.percent}%)`);
  }
  lines.push(`- **Оцінено питань:** ${s.scored} з ${s.questions}`, "");

  if (r.summary) lines.push("## Загальний висновок", "", r.summary, "");

  if (s.byLevel.length > 1) {
    lines.push("## За рівнями", "", "| Рівень | Питань | Середній бал |", "| --- | --- | --- |");
    for (const l of s.byLevel) {
      lines.push(`| ${l.level} | ${l.count} | ${formatScore(l.average)} |`);
    }
    lines.push("");
  }

  lines.push("## Підсумок", "", "| # | Питання | Оцінка |", "| --- | --- | --- |");
  for (const q of r.questions) {
    lines.push(`| ${q.number} | ${q.title.replace(/\|/g, "\\|")} | ${q.score ?? "—"} |`);
  }
  lines.push("", "## Деталі", "");

  for (const q of r.questions) {
    lines.push(`### ${q.number}. ${q.title} — ${q.score === null ? "без оцінки" : `${q.score}/10`}`, "");
    if (q.level) lines.push(`**Рівень:** ${q.level}`, "");
    if (q.question) lines.push(`**Питання:** ${q.question}`, "");
    if (q.followUp) lines.push(`**Уточнення:** ${q.followUp}`, "");
    if (q.expected) lines.push(`**Що спостерігаємо:** ${q.expected}`, "");
    if (q.note) lines.push("**Нотатки:**", "", quote(q.note), "");
  }

  return { name: `${fileSlug(state)}.md`, content: lines.join("\n") };
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Read questions from a .txt/.md (our text format) or .json (an exported result) file. */
export async function questionsFromFile(file: File): Promise<Question[]> {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith(".json") || /^\s*[[{]/.test(text)) {
    try {
      const data = JSON.parse(text) as unknown;
      const list = Array.isArray(data)
        ? data
        : data && typeof data === "object" && Array.isArray((data as { questions?: unknown }).questions)
          ? (data as { questions: unknown[] }).questions
          : null;
      if (list) {
        const str = (v: unknown) => (typeof v === "string" ? v : "");
        return list
          .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
          .map((x) => ({
            id: uid(),
            title: str(x.title),
            level: str(x.level),
            question: str(x.question),
            followUp: str(x.followUp),
            expected: str(x.expected),
          }))
          .filter((q) => q.title || q.question);
      }
    } catch {
      // not JSON — fall back to the text parser
    }
  }
  return parseQuestions(text);
}
