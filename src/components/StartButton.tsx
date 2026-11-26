import type { ReactNode } from "react";
import { IconPlay } from "./icons";

export default function StartButton({
  onClick,
  children,
  icon = <IconPlay className="size-4" />,
}: {
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/30 ring-1 ring-white/20 transition ring-inset hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/40 focus-visible:ring-4 focus-visible:ring-violet-300 focus-visible:outline-none active:translate-y-0"
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-linear-to-r from-transparent via-white/25 to-transparent" />
      <span className="relative grid size-7 place-items-center rounded-full bg-white/20 transition group-hover:scale-110">
        {icon}
      </span>
      <span className="relative">{children}</span>
    </button>
  );
}
