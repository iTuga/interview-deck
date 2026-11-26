"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch } from "react";
import { downloadFile, questionsFromFile } from "@/lib/export";
import { parseQuestions, questionsToText, uid } from "@/lib/parse";
import { SAMPLE_TEXT } from "@/lib/sample";
import type { Action } from "@/lib/state";
import type { AppState, Question } from "@/lib/types";
import Brand from "./Brand";
import QuestionCard from "./QuestionCard";
import StartButton from "./StartButton";
import { IconDownload, IconPlus, IconRotate, IconSparkles, IconTrash, IconUpload } from "./icons";

type Props = { state: AppState; dispatch: Dispatch<Action> };

type Notice = { kind: "ok" | "error"; text: string } | null;

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export const questionsWord = (n: number) => plural(n, "питання", "питання", "питань");

const btnGhost =
  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900";

function PasteBox({
  onParsed,
  autoFocus,
  compact,
}: {
  onParsed: (qs: Question[]) => void;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = (source = text) => {
    const qs = parseQuestions(source);
    if (qs.length === 0) {
      setNotice({
        kind: "error",
        text: "Не вдалося знайти жодного питання. Перевірте, що кожне починається з номера («1. Назва») і має поля «Питання:», «Рівень:» тощо.",
      });
      return;
    }
    onParsed(qs);
    setText("");
    setNotice({ kind: "ok", text: `Додано ${qs.length} ${questionsWord(qs.length)}.` });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const qs = await questionsFromFile(file);
      if (qs.length === 0) throw new Error("empty");
      onParsed(qs);
      setNotice({ kind: "ok", text: `Із файлу «${file.name}» додано ${qs.length} ${questionsWord(qs.length)}.` });
    } catch {
      setNotice({ kind: "error", text: `Не вдалося прочитати питання з файлу «${file.name}».` });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <textarea
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (notice) setNotice(null);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
        placeholder={`1. Назва питання\n\nРівень: Middle та вище\n\nПитання: Текст питання до кандидата…\n\nУточнення: Додаткове питання…\n\nЩо спостерігаємо: На що звертаємо увагу…`}
        className={`w-full resize-y rounded-2xl border-0 bg-zinc-50 p-4 font-mono text-[13px] leading-relaxed text-zinc-800 ring-1 ring-zinc-200 transition outline-none placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 ${
          compact ? "min-h-40" : "min-h-72"
        }`}
      />
      {notice && (
        <p
          role="status"
          className={`mt-2 text-sm ${notice.kind === "ok" ? "text-emerald-700" : "text-rose-600"}`}
        >
          {notice.text}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => submit()}
          disabled={!text.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconSparkles />
          Розпізнати питання
        </button>
        {!compact && (
          <button type="button" onClick={() => submit(SAMPLE_TEXT)} className={btnGhost}>
            Вставити приклад
          </button>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} className={btnGhost}>
          <IconUpload />
          Відкрити файл
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.json,text/plain,text/markdown,application/json"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <span className="ml-auto hidden text-xs text-zinc-400 sm:inline">⌘/Ctrl + Enter</span>
      </div>
    </div>
  );
}

export default function SetupView({ state, dispatch }: Props) {
  const { questions } = state;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [showPaste, setShowPaste] = useState(false);
  const [undo, setUndo] = useState<{ question: Question; index: number } | null>(null);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(t);
  }, [undo]);

  const levelOptions = useMemo(
    () => [...new Set(questions.map((q) => q.level.trim()).filter(Boolean))],
    [questions],
  );

  const inProgress = state.startedAt !== null && Object.keys(state.scores).length > 0;

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addManual = () => {
    const q: Question = {
      id: uid(),
      title: "",
      level: levelOptions[0] ?? "",
      question: "",
      followUp: "",
      expected: "",
    };
    dispatch({ type: "addQuestions", questions: [q] });
    setExpanded((prev) => new Set(prev).add(q.id));
    requestAnimationFrame(() =>
      document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

  const remove = (q: Question, index: number) => {
    dispatch({ type: "removeQuestion", id: q.id });
    setUndo({ question: q, index });
  };

  const allExpanded = questions.length > 0 && questions.every((q) => expanded.has(q.id));

  if (questions.length === 0) {
    return (
      <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,var(--color-indigo-50),transparent_60%)]">
        <header className="mx-auto flex max-w-6xl items-center px-4 py-5 sm:px-6">
          <Brand />
        </header>
        <main className="animate-fade-up mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6 sm:pt-12">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-4xl">
            Додайте питання для співбесіди
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-zinc-600">
            Вставте текст з питаннями одним шматком — він автоматично розіб’ється на окремі картки, які
            можна відредагувати. Потім проведіть співбесіду у форматі слайдів і оцініть кожну відповідь від
            1 до 10.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
            {["1. Назва", "Рівень:", "Питання:", "Уточнення:", "Що спостерігаємо:"].map((t) => (
              <code key={t} className="rounded-md bg-white px-2 py-1 font-mono text-zinc-600 ring-1 ring-zinc-200">
                {t}
              </code>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-white p-4 shadow-xl ring-1 shadow-zinc-200/50 ring-zinc-200 sm:p-6">
            <PasteBox autoFocus onParsed={(qs) => dispatch({ type: "addQuestions", questions: qs })} />
          </div>

          <p className="mt-4 text-sm text-zinc-500">
            Або{" "}
            <button type="button" onClick={addManual} className="font-medium text-indigo-600 hover:underline">
              додайте питання вручну
            </button>
            .
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-zinc-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Brand />
          <span className="text-sm text-zinc-500 tabular-nums">
            {questions.length} {questionsWord(questions.length)}
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-8">
        {/* Questions list */}
        <section className="order-2 min-w-0 lg:order-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Список питань</h2>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                className={btnGhost}
                onClick={() => setExpanded(allExpanded ? new Set() : new Set(questions.map((q) => q.id)))}
              >
                {allExpanded ? "Згорнути все" : "Розгорнути все"}
              </button>
              <button type="button" className={btnGhost} onClick={addManual}>
                <IconPlus />
                Додати вручну
              </button>
            </div>
          </div>

          <ol className="space-y-2.5">
            {questions.map((q, i) => (
              <li key={q.id} id={`q-${q.id}`} className="scroll-mt-24">
                <QuestionCard
                  question={q}
                  index={i}
                  total={questions.length}
                  expanded={expanded.has(q.id)}
                  levelOptions={levelOptions}
                  onToggle={() => toggle(q.id)}
                  onChange={(patch) => dispatch({ type: "updateQuestion", id: q.id, patch })}
                  onRemove={() => remove(q, i)}
                  onMove={(delta) => dispatch({ type: "moveQuestion", id: q.id, delta })}
                />
              </li>
            ))}
          </ol>

          <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-4">
            {showPaste ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Додати ще питання з тексту</h3>
                  <button
                    type="button"
                    onClick={() => setShowPaste(false)}
                    className="text-sm text-zinc-500 hover:text-zinc-900"
                  >
                    Сховати
                  </button>
                </div>
                <PasteBox
                  autoFocus
                  compact
                  onParsed={(qs) => dispatch({ type: "addQuestions", questions: qs })}
                />
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={() => setShowPaste(true)} className={btnGhost}>
                  <IconSparkles />
                  Вставити ще питання текстом
                </button>
                <button type="button" onClick={addManual} className={btnGhost}>
                  <IconPlus />
                  Додати вручну
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Start panel */}
        <aside className="order-1 lg:order-2">
          <div className="space-y-4 lg:sticky lg:top-20">
            <div className="rounded-3xl bg-white p-5 shadow-xl ring-1 shadow-zinc-200/50 ring-zinc-200">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">Кандидат</span>
                <input
                  value={state.candidate}
                  onChange={(e) => dispatch({ type: "setCandidate", value: e.target.value })}
                  placeholder="Ім’я кандидата (необов’язково)"
                  className="w-full rounded-xl border-0 bg-zinc-50 px-3.5 py-2.5 text-sm ring-1 ring-zinc-200 outline-none placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                  <dt className="text-xs text-zinc-500">Питань</dt>
                  <dd className="text-xl font-semibold tabular-nums">{questions.length}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                  <dt className="text-xs text-zinc-500">Макс. балів</dt>
                  <dd className="text-xl font-semibold tabular-nums">{questions.length * 10}</dd>
                </div>
              </dl>

              {levelOptions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {levelOptions.map((l) => (
                    <span key={l} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                      {l}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5">
                <StartButton onClick={() => dispatch({ type: "start" })}>
                  {inProgress ? "Продовжити співбесіду" : "Розпочати співбесіду"}
                </StartButton>
                {inProgress && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Почати співбесіду заново? Поточні оцінки та нотатки буде скинуто.")) {
                        dispatch({ type: "restart" });
                      }
                    }}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <IconRotate />
                    Почати заново
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1 px-1">
              <button
                type="button"
                className={btnGhost}
                onClick={() => downloadFile("questions.txt", questionsToText(questions), "text/plain")}
              >
                <IconDownload />
                Зберегти питання
              </button>
              <button
                type="button"
                className={`${btnGhost} hover:text-rose-600`}
                onClick={() => {
                  if (confirm("Видалити всі питання та результати?")) dispatch({ type: "clearAll" });
                }}
              >
                <IconTrash />
                Очистити все
              </button>
            </div>
          </div>
        </aside>
      </main>

      {undo && (
        <div className="animate-fade-up fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="flex items-center gap-4 rounded-2xl bg-zinc-900 py-2.5 pr-2.5 pl-4 text-sm text-white shadow-2xl">
            <span className="max-w-60 truncate">
              Видалено «{undo.question.title || "Без назви"}»
            </span>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "restoreQuestion", question: undo.question, index: undo.index });
                setUndo(null);
              }}
              className="rounded-lg bg-white/10 px-3 py-1.5 font-medium transition hover:bg-white/20"
            >
              Повернути
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
