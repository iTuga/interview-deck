"use client";

import type { Dispatch } from "react";
import { downloadFile, resultToJSON, resultToMarkdown } from "@/lib/export";
import { computeStats, formatScore, scoreColor, verdict } from "@/lib/score";
import type { Action } from "@/lib/state";
import type { AppState } from "@/lib/types";
import Brand from "./Brand";
import { IconArrowLeft, IconDownload, IconPencil, IconPrinter, IconRotate } from "./icons";

type Props = { state: AppState; dispatch: Dispatch<Action> };

function ScoreRing({ value }: { value: number | null }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = value === null ? 0 : value / 10;
  const color = value === null ? "#d4d4d8" : scoreColor(value);
  return (
    <div className="relative size-40 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f4f4f5" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-1000"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-4xl font-semibold tracking-tight tabular-nums">{formatScore(value)}</div>
          <div className="text-xs text-zinc-500">з 10</div>
        </div>
      </div>
    </div>
  );
}

const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition";

export default function ResultsView({ state, dispatch }: Props) {
  const { questions, scores, notes } = state;
  const stats = computeStats(questions, scores);
  const unscored = questions.length - stats.scoredCount;
  const date = state.finishedAt
    ? new Intl.DateTimeFormat("uk-UA", { dateStyle: "long", timeStyle: "short" }).format(
        new Date(state.finishedAt),
      )
    : "";

  const saveMd = () => {
    const f = resultToMarkdown(state);
    downloadFile(f.name, f.content, "text/markdown");
  };
  const saveJson = () => {
    const f = resultToJSON(state);
    downloadFile(f.name, f.content, "application/json");
  };

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,var(--color-indigo-50),transparent_55%)] print:bg-none">
      <header className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-5 sm:px-6 print:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => dispatch({ type: "resume" })}
          className={`${btn} text-zinc-600 hover:bg-white hover:text-zinc-900`}
        >
          <IconArrowLeft />
          До питань
        </button>
      </header>

      <main className="animate-fade-up mx-auto max-w-4xl space-y-5 px-4 pb-16 sm:px-6 print:p-0">
        {/* Summary card */}
        <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 shadow-zinc-200/50 ring-zinc-200 sm:p-8 print:shadow-none">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
            <ScoreRing value={stats.average} />
            <div className="w-full min-w-0 flex-1 text-center sm:text-left">
              <div className="text-sm text-zinc-500">Результат співбесіди</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {state.candidate.trim() || "Кандидат"}
              </h1>
              <div className="mt-1 text-sm text-zinc-500">{date}</div>
              {stats.average !== null && (
                <span
                  className="mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold text-white"
                  style={{ backgroundColor: scoreColor(stats.average) }}
                >
                  {verdict(stats.average)}
                </span>
              )}
              <dl className="mt-5 grid grid-cols-3 gap-2 text-left sm:gap-3">
                <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                  <dt className="text-xs text-zinc-500">Сума балів</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {stats.total}
                    <span className="text-sm font-normal text-zinc-400"> / {stats.max}</span>
                  </dd>
                </div>
                <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                  <dt className="text-xs text-zinc-500">Відсоток</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {stats.percent === null ? "—" : `${Math.round(stats.percent)}%`}
                  </dd>
                </div>
                <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                  <dt className="text-xs text-zinc-500">Оцінено</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {stats.scoredCount}
                    <span className="text-sm font-normal text-zinc-400"> / {stats.questionCount}</span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {unscored > 0 && (
            <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
              {unscored === 1 ? "1 питання не має оцінки" : `${unscored} питань не мають оцінки`} — вони не
              враховуються в середньому балі.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={saveMd}
              className={`${btn} bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 hover:-translate-y-0.5`}
            >
              <IconDownload />
              Зберегти результат (.md)
            </button>
            <button type="button" onClick={saveJson} className={`${btn} bg-white ring-1 ring-zinc-200 hover:bg-zinc-50`}>
              <IconDownload />
              JSON
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={`${btn} bg-white ring-1 ring-zinc-200 hover:bg-zinc-50`}
            >
              <IconPrinter />
              Друк / PDF
            </button>
          </div>
        </section>

        {/* By level */}
        {stats.byLevel.length > 1 && (
          <section className="rounded-3xl bg-white p-6 ring-1 ring-zinc-200 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">За рівнями</h2>
            <div className="mt-4 space-y-3">
              {stats.byLevel.map((l) => (
                <div key={l.level} className="flex items-center gap-3">
                  <div className="w-36 shrink-0 truncate text-sm text-zinc-700">{l.level}</div>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(l.average ?? 0) * 10}%`,
                        backgroundColor: l.average === null ? undefined : scoreColor(l.average),
                      }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-semibold tabular-nums">
                    {formatScore(l.average)}
                    <span className="font-normal text-zinc-400"> · {l.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Overall conclusion */}
        <section className="rounded-3xl bg-white p-6 ring-1 ring-zinc-200 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Загальний висновок</h2>
          <textarea
            value={state.summary}
            onChange={(e) => dispatch({ type: "setSummary", value: e.target.value })}
            placeholder="Сильні сторони, зони росту, рекомендація щодо наступного етапу…"
            rows={3}
            className="mt-3 min-h-24 w-full field-sizing-content resize-y rounded-xl border-0 bg-zinc-50 px-3.5 py-3 text-sm leading-relaxed ring-1 ring-zinc-200 outline-none placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 print:hidden"
          />
          <p className="mt-3 hidden text-sm leading-relaxed whitespace-pre-line print:block">
            {state.summary.trim() || "—"}
          </p>
        </section>

        {/* Per question */}
        <section className="rounded-3xl bg-white p-6 ring-1 ring-zinc-200 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Оцінки по питаннях</h2>
          <ol className="mt-4 divide-y divide-zinc-100">
            {questions.map((q, i) => {
              const s = scores[q.id];
              const note = notes[q.id]?.trim();
              return (
                <li key={q.id} className="py-4 break-inside-avoid first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-6 shrink-0 text-right text-sm font-semibold text-zinc-400 tabular-nums">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="font-medium text-zinc-900">{q.title || "Без назви"}</h3>
                        {q.level && <span className="text-xs text-zinc-400">{q.level}</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                          {s !== undefined && (
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${s * 10}%`, backgroundColor: scoreColor(s) }}
                            />
                          )}
                        </div>
                        {s !== undefined ? (
                          <span className="w-12 text-right text-sm font-semibold tabular-nums" style={{ color: scoreColor(s) }}>
                            {s}/10
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => dispatch({ type: "resume", index: i })}
                            className="text-xs font-medium text-indigo-600 hover:underline print:hidden"
                          >
                            Оцінити
                          </button>
                        )}
                      </div>
                      {note && <p className="mt-2 text-sm whitespace-pre-line text-zinc-600">{note}</p>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="flex flex-wrap justify-center gap-2 pt-2 print:hidden">
          <button
            type="button"
            onClick={() => dispatch({ type: "editQuestions" })}
            className={`${btn} text-zinc-600 hover:bg-white hover:text-zinc-900`}
          >
            <IconPencil />
            Редагувати питання
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Почати нову співбесіду з тими самими питаннями? Поточні оцінки буде скинуто — збережіть результат, якщо потрібно.")) {
                dispatch({ type: "newInterview" });
              }
            }}
            className={`${btn} text-zinc-600 hover:bg-white hover:text-zinc-900`}
          >
            <IconRotate />
            Нова співбесіда
          </button>
        </div>
      </main>
    </div>
  );
}
