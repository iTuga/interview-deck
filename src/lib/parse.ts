import type { Question } from "./types";

type FieldKey = "level" | "question" | "followUp" | "expected";

const FIELD_ORDER: Record<FieldKey, number> = {
  level: 0,
  question: 1,
  followUp: 2,
  expected: 3,
};

const LABEL_PATTERNS: [FieldKey, RegExp][] = [
  ["level", /^(рівень|грейд|level|grade|seniority)$/i],
  ["question", /^(питання|запитання|question)$/i],
  [
    "followUp",
    /^(уточнення|уточнююче питання|уточнюючі питання|додаткове питання|follow[\s-]?up)$/i,
  ],
  [
    "expected",
    /^(що спостерігаємо|що очікуємо|очікування|очікувана відповідь|на що звертаємо увагу|expected|what we look for)$/i,
  ],
];

const TITLE_RE = /^(?:#{1,6}\s*)?(\d{1,3})\s*[.)]\s+(.+)$/;
const LABEL_RE = /^([^:]{2,40}?)\s*[:：]\s*(.*)$/;

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      // insecure context (http on LAN) — fall through
    }
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Strip markdown decorations and invisible characters from a line. */
function normalizeLine(raw: string): string {
  return raw
    .replace(/[   ]/g, " ")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+$/g, "");
}

function stripDecor(s: string): string {
  return s
    .trim()
    .replace(/^[-*•>]+\s*/, "")
    .replace(/\*\*|__/g, "")
    .trim();
}

function matchLabel(line: string): { key: FieldKey; rest: string } | null {
  const m = LABEL_RE.exec(stripDecor(line));
  if (!m) return null;
  const name = m[1].trim().replace(/\s+/g, " ");
  for (const [key, re] of LABEL_PATTERNS) {
    if (re.test(name)) return { key, rest: m[2].trim() };
  }
  return null;
}

function matchTitle(line: string): string | null {
  const cleaned = stripDecor(line);
  if (matchLabel(line)) return null;
  const m = TITLE_RE.exec(cleaned);
  return m ? m[2].trim() : null;
}

function tidy(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function deriveTitle(q: { question: string; followUp: string; expected: string }): string {
  const source = q.question || q.followUp || q.expected;
  const firstLine = source.split("\n")[0] ?? "";
  const sentence = firstLine.split(/(?<=[.?!])\s/)[0] ?? firstLine;
  if (sentence.length <= 70) return sentence;
  return sentence.slice(0, 67).trimEnd() + "…";
}

type Draft = {
  title: string;
  pre: string[];
  fields: Record<FieldKey, string[]>;
  used: Set<FieldKey>;
  current: FieldKey | null;
};

function newDraft(title = ""): Draft {
  return {
    title,
    pre: [],
    fields: { level: [], question: [], followUp: [], expected: [] },
    used: new Set(),
    current: null,
  };
}

function finalize(d: Draft): Question | null {
  const pre = tidy(d.pre.join("\n"));
  let question = tidy(d.fields.question.join("\n"));
  if (pre) question = question ? `${pre}\n\n${question}` : pre;
  const q = {
    level: tidy(d.fields.level.join("\n")),
    question,
    followUp: tidy(d.fields.followUp.join("\n")),
    expected: tidy(d.fields.expected.join("\n")),
  };
  let title = d.title.trim();
  if (!title && !q.question && !q.followUp && !q.expected) return null;
  if (!title) title = deriveTitle(q);
  return { id: uid(), title, ...q };
}

/**
 * Parse a free-form block of interview questions.
 *
 * Expected shape (labels are flexible, blank lines optional):
 *
 *   1. Title
 *   Рівень: Middle
 *   Питання: ...
 *   Уточнення: ...
 *   Що спостерігаємо: ...
 */
export function parseQuestions(input: string): Question[] {
  const lines = input.replace(/\r\n?/g, "\n").split("\n").map(normalizeLine);
  const titles = lines.map(matchTitle);
  const labels = lines.map(matchLabel);

  const hasLabels = labels.some(Boolean);
  const hasTitles = titles.some((t) => t !== null);

  if (!hasLabels) return parseLoose(lines, titles);

  /** Label keys that appear between line i and the next numbered line. */
  const lookahead = (i: number): FieldKey[] => {
    const keys: FieldKey[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (titles[j] !== null) break;
      const l = labels[j];
      if (l) keys.push(l.key);
    }
    return keys;
  };

  const out: Question[] = [];
  let draft: Draft | null = null;

  const push = () => {
    if (!draft) return;
    const q = finalize(draft);
    if (q) out.push(q);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const title = titles[i];
    const label = labels[i];

    if (title !== null) {
      const ahead = lookahead(i);
      let startsNew = false;
      if (ahead.length > 0) {
        if (!draft || draft.used.size === 0) {
          startsNew = true;
        } else {
          const cur = draft.current;
          // A real new question repeats labels the current one already used
          // (or goes back in the canonical order). A numbered list inside a
          // field is followed only by "later" labels, so it stays as content.
          startsNew = ahead.some(
            (k) => draft!.used.has(k) || (cur !== null && FIELD_ORDER[k] < FIELD_ORDER[cur]),
          );
        }
      }
      if (startsNew) {
        push();
        draft = newDraft(title);
        continue;
      }
    }

    if (label) {
      if (!draft) draft = newDraft();
      else if (!hasTitles && draft.used.has(label.key)) {
        // Unnumbered input: a repeated label means a new question started.
        push();
        draft = newDraft();
      }
      draft.used.add(label.key);
      draft.current = label.key;
      if (label.rest) draft.fields[label.key].push(label.rest);
      continue;
    }

    if (!draft) continue; // preamble before the first question
    if (draft.current) draft.fields[draft.current].push(line);
    else if (line.trim()) draft.pre.push(line);
  }
  push();
  return out;
}

/** Fallback for text without any known labels. */
function parseLoose(lines: string[], titles: (string | null)[]): Question[] {
  const out: Question[] = [];
  if (titles.some((t) => t !== null)) {
    let cur: { title: string; body: string[] } | null = null;
    const push = () => {
      if (!cur) return;
      out.push({
        id: uid(),
        title: cur.title,
        level: "",
        question: tidy(cur.body.join("\n")),
        followUp: "",
        expected: "",
      });
    };
    lines.forEach((line, i) => {
      const t = titles[i];
      if (t !== null) {
        push();
        cur = { title: t, body: [] };
      } else if (cur) {
        cur.body.push(line);
      }
    });
    push();
    return out;
  }

  const paragraphs = lines
    .join("\n")
    .split(/\n\s*\n/)
    .map(tidy)
    .filter(Boolean);
  for (const p of paragraphs) {
    const q = { question: p, followUp: "", expected: "" };
    out.push({ id: uid(), title: deriveTitle(q), level: "", ...q });
  }
  return out;
}

/** Serialize questions back to the same text format the parser reads. */
export function questionsToText(questions: Question[]): string {
  return questions
    .map((q, i) => {
      const parts = [`${i + 1}. ${q.title}`];
      if (q.level) parts.push(`Рівень: ${q.level}`);
      if (q.question) parts.push(`Питання: ${q.question}`);
      if (q.followUp) parts.push(`Уточнення: ${q.followUp}`);
      if (q.expected) parts.push(`Що спостерігаємо: ${q.expected}`);
      return parts.join("\n\n");
    })
    .join("\n\n\n");
}
