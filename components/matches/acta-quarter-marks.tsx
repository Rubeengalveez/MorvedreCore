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
      className={`grid shrink-0 gap-0.5 ${compact ? "w-[2.625rem] grid-cols-2" : "grid-cols-4"}`}
      aria-label={`Cuartos jugados: ${played.join(", ") || "ninguno"}${current ? `. Jugando el ${period}` : ""}`}
    >
      {[1, 2, 3, 4].map((quarter) => {
        const active = quarter === period && current;
        const past = played.includes(quarter);
        return (
          <span
            key={quarter}
            aria-hidden="true"
            className={`grid place-items-center rounded border text-sm leading-none font-extrabold tabular-nums ${compact || small ? "h-5 w-5" : "h-6 w-6"} ${active ? "border-pool-blue bg-pool-blue ring-pool-blue text-white ring-1" : past ? "border-slate-500 bg-slate-200 text-slate-800" : "border-transparent bg-white text-slate-500"}`}
          >
            {quarter <= period ? quarter : "·"}
          </span>
        );
      })}
    </span>
  );
}
