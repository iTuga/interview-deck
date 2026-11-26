"use client";

import type { CSSProperties } from "react";
import { scoreColor } from "@/lib/score";

export default function ScoreSelector({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (score: number | null) => void;
}) {
  return (
    <div>
      <div role="radiogroup" aria-label="Оцінка відповіді" className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = value === n;
          const color = scoreColor(n);
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(active ? null : n)}
              style={
                active
                  ? { backgroundColor: color, boxShadow: `0 8px 20px -6px ${color}` }
                  : ({ "--score": color } as CSSProperties)
              }
              className={`h-12 rounded-xl text-base font-semibold tabular-nums transition duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                active
                  ? "scale-105 text-white"
                  : "bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200 hover:-translate-y-0.5 hover:bg-white hover:text-(color:--score) hover:ring-2 hover:ring-(color:--score)"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-zinc-400">
        <span>1 — слабко</span>
        <span>10 — відмінно</span>
      </div>
    </div>
  );
}
