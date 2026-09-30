export function ActaQuarterMarks({
  played,
  period,
  current = false,
  compact = false,
  small = false,
}: {
  played: number[];
  period: number;
  current?: boolean;
  compact?: boolean;
  small?: boolean;
}) {
  return (
    <span
      className={`grid shrink-0 gap-0.5 ${compact ? "w-8 grid-cols-2" : "grid-cols-4"}`}
      aria-label={`Cuartos jugados: ${played.join(", ") || "ninguno"}${current ? `. Jugando el ${period}` : ""}`}
    >
      {[1, 2, 3, 4].map((quarter) => {
        const active = quarter === period && current;
        const past = played.includes(quarter);
        return (
          <span
            key={quarter}
            aria-hidden="true"
            className={`grid place-items-center rounded-sm text-[10px] leading-none font-extrabold tabular-nums ${compact ? "h-3.5 w-3.5" : small ? "h-4 w-4" : "h-5 w-5"} ${active ? "bg-pool-deep text-white ring-1 ring-white" : past ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-600"}`}
          >
            {quarter <= period ? quarter : "·"}
          </span>
        );
      })}
    </span>
  );
}
