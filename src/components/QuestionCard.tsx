"use client";

import type { ReactNode } from "react";
import type { Question, QuestionField } from "@/lib/types";
import { FIELD_LABELS } from "@/lib/types";
import { IconChevronDown, IconChevronUp, IconPencil, IconTrash, IconCheck } from "./icons";

type Props = {
  question: Question;
  index: number;
  total: number;
  expanded: boolean;
  levelOptions: string[];
  onToggle: () => void;
  onChange: (patch: Partial<Omit<Question, "id">>) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
};

const inputCls =
  "w-full rounded-xl border-0 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 ring-1 ring-zinc-200 transition outline-none placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-indigo-500";

const TEXT_FIELDS: { key: QuestionField; placeholder: string; minH: string }[] = [
  { key: "question", placeholder: "Основне питання до кандидата", minH: "min-h-20" },
  { key: "followUp", placeholder: "Додаткове / уточнююче питання", minH: "min-h-14" },
  { key: "expected", placeholder: "На що звертаємо увагу у відповіді", minH: "min-h-20" },
];

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`grid size-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-30 ${
        danger ? "hover:text-rose-600" : "hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

export default function QuestionCard({
  question: q,
  index,
  total,
  expanded,
  levelOptions,
  onToggle,
  onChange,
  onRemove,
  onMove,
}: Props) {
  const listId = `levels-${q.id}`;

  return (
    <article
      className={`group rounded-2xl bg-white ring-1 transition ${
        expanded ? "shadow-lg shadow-zinc-200/60 ring-indigo-200" : "ring-zinc-200 hover:ring-zinc-300"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex cursor-pointer items-start gap-3 rounded-2xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-600 tabular-nums">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-medium text-zinc-900">
              {q.title || <span className="text-zinc-400 italic">Без назви</span>}
            </h3>
            {q.level && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {q.level}
              </span>
            )}
          </div>
          {!expanded && q.question && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{q.question}</p>
          )}
        </div>
        <div className="-mr-1 flex shrink-0 items-center">
          <IconButton label="Вгору" onClick={() => onMove(-1)} disabled={index === 0}>
            <IconChevronUp />
          </IconButton>
          <IconButton label="Вниз" onClick={() => onMove(1)} disabled={index === total - 1}>
            <IconChevronDown />
          </IconButton>
          <IconButton label={expanded ? "Готово" : "Редагувати"} onClick={onToggle}>
            {expanded ? <IconCheck /> : <IconPencil />}
          </IconButton>
          <IconButton label="Видалити" onClick={onRemove} danger>
            <IconTrash />
          </IconButton>
        </div>
      </div>

      {expanded && (
        <div className="animate-fade-up grid gap-3 border-t border-zinc-100 px-4 pt-4 pb-5 sm:grid-cols-[1fr_200px]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">{FIELD_LABELS.title}</span>
            <input
              autoFocus={!q.title}
              value={q.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Коротка назва теми"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">{FIELD_LABELS.level}</span>
            <input
              value={q.level}
              list={listId}
              onChange={(e) => onChange({ level: e.target.value })}
              placeholder="Junior / Middle / Senior"
              className={inputCls}
            />
            <datalist id={listId}>
              {levelOptions.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </label>
          {TEXT_FIELDS.map(({ key, placeholder, minH }) => (
            <label key={key} className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-zinc-500">{FIELD_LABELS[key]}</span>
              <textarea
                value={q[key]}
                onChange={(e) => onChange({ [key]: e.target.value })}
                placeholder={placeholder}
                rows={2}
                className={`${inputCls} ${minH} field-sizing-content resize-y leading-relaxed`}
              />
            </label>
          ))}
        </div>
      )}
    </article>
  );
}
