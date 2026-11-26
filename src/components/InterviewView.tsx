"use client";

import { useEffect, useEffectEvent, useRef, useState, type Dispatch } from "react";
import { computeStats, formatScore, scoreColor } from "@/lib/score";
import type { Action } from "@/lib/state";
import type { AppState } from "@/lib/types";
import Brand from "./Brand";
import ScoreSelector from "./ScoreSelector";
import {
  IconArrowLeft,
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconFlag,
  IconLightbulb,
  IconMessage,
  IconPencil,
} from "./icons";

type Props = { state: AppState; dispatch: Dispatch<Action> };

function isTyping(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

function ScoreDot({ score, size = "md" }: { score: number | undefined; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "size-6 text-[11px]" : "size-7 text-xs";
  if (score === undefined) {
    return <span className={`${cls} grid shrink-0 place-items-center rounded-full ring-1 ring-zinc-200 ring-inset`} />;
  }
  return (
    <span
      className={`${cls} grid shrink-0 place-items-center rounded-full font-semibold text-white tabular-nums`}
      style={{ backgroundColor: scoreColor(score) }}
    >
      {score}
    </span>
  );
}

export default function InterviewView({ state, dispatch }: Props) {
  const { questions, current, scores, notes } = state;
  const q = questions[current];
  const total = questions.length;
  const isLast = current === total - 1;
  const stats = computeStats(questions, scores);

  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const go = (index: number) => {
    if (index < 0 || index >= total || index === current) return;
    setDirection(index > current ? "next" : "prev");
    dispatch({ type: "goTo", index });
  };

  // Keep the active item visible in the lists.
  useEffect(() => {
    for (const root of [listRef.current, stripRef.current]) {
      root
        ?.querySelector<HTMLElement>(`[data-index="${current}"]`)
        ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
  }, [current]);

  // Keyboard: ←/→ navigate, 1–9 and 0 (=10) score.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (isLast) dispatch({ type: "finish" });
      else go(current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(current - 1);
    } else if (/^[0-9]$/.test(e.key) && q) {
      dispatch({ type: "setScore", id: q.id, score: e.key === "0" ? 10 : Number(e.key) });
    }
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  if (!q) return null;

  const progress = ((current + 1) / total) * 100;
  const anim =
    direction === "next" ? "animate-slide-next" : direction === "prev" ? "animate-slide-prev" : "animate-fade-up";

  return (
    <div className="flex h-dvh flex-col bg-zinc-100/70">
      {/* Top bar */}
      <header className="relative z-10 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <div className="hidden sm:block">
            <Brand compact />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-zinc-900">
              {state.candidate.trim() || "Співбесіда"}
            </div>
            <div className="text-xs text-zinc-500 tabular-nums">
              Питання {current + 1} з {total} · оцінено {stats.scoredCount}
              {stats.average !== null && <> · середній {formatScore(stats.average)}</>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: "editQuestions" })}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <IconPencil />
            <span className="hidden sm:inline">Редагувати питання</span>
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "finish" })}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <IconFlag />
            <span className="hidden sm:inline">Завершити</span>
          </button>
        </div>
        <div className="h-1 bg-zinc-100">
          <div
            className="h-full bg-linear-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar list (desktop) */}
        <aside className="hidden w-80 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex">
          <div className="px-5 pt-5 pb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            Питання
          </div>
          <ol ref={listRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            {questions.map((item, i) => {
              const active = i === current;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    data-index={i}
                    onClick={() => go(i)}
                    aria-current={active ? "step" : undefined}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      active ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-zinc-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-5 shrink-0 text-right text-xs font-semibold tabular-nums ${
                        active ? "text-indigo-600" : "text-zinc-400"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`line-clamp-2 text-sm leading-snug ${
                          active ? "font-semibold text-zinc-900" : "text-zinc-700"
                        }`}
                      >
                        {item.title || "Без назви"}
                      </span>
                      {item.level && <span className="mt-0.5 block text-xs text-zinc-400">{item.level}</span>}
                    </span>
                    <ScoreDot score={scores[item.id]} size="sm" />
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="border-t border-zinc-100 px-5 py-4 text-xs text-zinc-500">
            <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono">←</kbd>{" "}
            <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono">→</kbd> навігація ·{" "}
            <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono">1</kbd>–
            <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono">0</kbd> оцінка
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          {/* Compact list (mobile / tablet) */}
          <div
            ref={stripRef}
            className="flex gap-2 overflow-x-auto border-b border-zinc-200 bg-white px-4 py-3 lg:hidden"
          >
            {questions.map((item, i) => {
              const s = scores[item.id];
              const active = i === current;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-index={i}
                  onClick={() => go(i)}
                  title={item.title}
                  aria-current={active ? "step" : undefined}
                  className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-semibold tabular-nums transition ${
                    active ? "ring-2 ring-indigo-500 ring-offset-2" : ""
                  } ${s === undefined ? "bg-zinc-100 text-zinc-600" : "text-white"}`}
                  style={s !== undefined ? { backgroundColor: scoreColor(s) } : undefined}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
            <article
              key={q.id}
              className={`${anim} rounded-3xl bg-white shadow-xl ring-1 shadow-zinc-300/30 ring-zinc-200`}
            >
              <div className="p-6 sm:p-10">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-indigo-600 tabular-nums">
                    {String(current + 1).padStart(2, "0")}
                    <span className="text-zinc-300"> / {String(total).padStart(2, "0")}</span>
                  </span>
                  {q.level && (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {q.level}
                    </span>
                  )}
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-3xl">
                  {q.title || "Без назви"}
                </h1>

                {q.question && (
                  <p className="mt-6 text-xl leading-relaxed text-pretty whitespace-pre-line text-zinc-800 sm:text-2xl">
                    {q.question}
                  </p>
                )}

                {q.followUp && (
                  <div className="mt-6 flex gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100 sm:p-5">
                    <IconMessage className="mt-0.5 size-5 shrink-0 text-sky-600" />
                    <div>
                      <div className="text-xs font-semibold tracking-wide text-sky-700 uppercase">Уточнення</div>
                      <p className="mt-1 leading-relaxed whitespace-pre-line text-zinc-800 sm:text-lg">
                        {q.followUp}
                      </p>
                    </div>
                  </div>
                )}

                {q.expected && (
                  <div className="mt-4 rounded-2xl bg-amber-50 ring-1 ring-amber-100">
                    <div className="flex items-center justify-between gap-2 px-4 pt-3 sm:px-5">
                      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-700 uppercase">
                        <IconLightbulb className="size-4" />
                        Що спостерігаємо
                      </div>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "toggleExpected" })}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                        title="Зручно, коли ви показуєте екран кандидату"
                      >
                        {state.showExpected ? <IconEyeOff /> : <IconEye />}
                        {state.showExpected ? "Сховати" : "Показати"}
                      </button>
                    </div>
                    {state.showExpected ? (
                      <p className="px-4 pt-1 pb-4 leading-relaxed whitespace-pre-line text-zinc-800 sm:px-5">
                        {q.expected}
                      </p>
                    ) : (
                      <p className="px-4 pt-1 pb-3 text-sm text-amber-700/70 sm:px-5">Підказку для інтерв’юера приховано</p>
                    )}
                  </div>
                )}
              </div>

              {/* Scoring */}
              <div className="rounded-b-3xl border-t border-zinc-100 bg-zinc-50/60 p-6 sm:px-10 sm:py-8">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900">Оцінка відповіді</h2>
                  {scores[q.id] !== undefined && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "setScore", id: q.id, score: null })}
                      className="text-xs text-zinc-400 hover:text-zinc-700"
                    >
                      Скинути
                    </button>
                  )}
                </div>
                <ScoreSelector
                  value={scores[q.id]}
                  onChange={(score) => dispatch({ type: "setScore", id: q.id, score })}
                />
                <textarea
                  value={notes[q.id] ?? ""}
                  onChange={(e) => dispatch({ type: "setNote", id: q.id, value: e.target.value })}
                  placeholder="Нотатки щодо відповіді (необов’язково)…"
                  rows={2}
                  className="mt-4 min-h-16 w-full field-sizing-content resize-y rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm leading-relaxed ring-1 ring-zinc-200 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </article>

            {/* Navigation */}
            <nav className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => go(current - 1)}
                disabled={current === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:opacity-40"
              >
                <IconArrowLeft />
                <span className="hidden sm:inline">Попереднє</span>
              </button>
              {isLast ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "finish" })}
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:-translate-y-0.5"
                >
                  Завершити та подивитись результат
                  <IconArrowRight />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go(current + 1)}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Наступне
                  <IconArrowRight />
                </button>
              )}
            </nav>
          </div>
        </main>
      </div>
    </div>
  );
}
