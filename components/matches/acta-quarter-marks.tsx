import { Moon } from "lucide-react";

export function ActaQuarterMarks({
  played,
  period,
  current = false,
  compact = false,
  small = false,
  edge = false,
  known,
}: {
  played: number[];
  period: number;
  current?: boolean;
  compact?: boolean;
  small?: boolean;
  edge?: boolean;
  known?: number[];
}) {
  const quarters = [1, 2, 3, 4].filter((quarter) =>
    edge ? played.includes(quarter) || (quarter === period && current) : quarter <= period,
  );
  if (!quarters.length) return null;
  return (
    <span
      data-acta-quarter-marks
      className={`grid shrink-0 gap-0.5 ${edge ? "grid-cols-1" : compact ? "w-[3.125rem] grid-cols-2" : "grid-cols-4"}`}
      aria-label={`Cuartos jugados: ${played.join(", ") || "ninguno"}${current ? `. Jugando el ${period}` : ""}`}
    >
      {quarters.map((quarter) => {
        const active = quarter === period && current;
        const past = played.includes(quarter);
        const unknown = known && !known.includes(quarter) && quarter < period;
        return (
          <span
            key={quarter}
            aria-hidden="true"
            className={`grid place-items-center rounded border text-sm leading-none font-extrabold tabular-nums ${edge ? "h-[1.0625rem] w-[1.0625rem]" : small ? "h-5 w-5" : "h-6 w-6"} ${active ? "border-pool-blue bg-pool-blue text-white" : past ? "border-slate-500 bg-slate-200 text-slate-800" : "border-slate-400 bg-white text-slate-700"}`}
          >
            {active || past ? quarter : unknown ? "?" : <Moon size={14} />}
          </span>
        );
      })}
    </span>
  );
}
