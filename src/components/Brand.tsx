export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-sm shadow-violet-500/30">
        ID
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-zinc-900">Interview Deck</div>
          <div className="text-xs text-zinc-500">питання для співбесіди</div>
        </div>
      )}
    </div>
  );
}
