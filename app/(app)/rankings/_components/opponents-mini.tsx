import { cn } from "@/lib/utils/cn";
import { opponentVerdict } from "@/lib/domain/rankings";
import type { OpponentHistoryRow } from "@/server/queries/rankings";

export interface OpponentsMiniProps {
  opponents: OpponentHistoryRow[];
}

export function OpponentsMini({ opponents }: OpponentsMiniProps) {
  if (opponents.length === 0) return null;
  const visible = opponents.slice(0, 5);
  return (
    <section
      aria-labelledby="opp-heading"
      className="flex flex-col gap-2"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="opp-heading"
          className="text-[10px] font-bold uppercase tracking-wider text-ink-600"
        >
          Rivales recientes
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
          Top {visible.length}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {visible.map((o) => {
          const v = opponentVerdict({
            matches_played: o.matches_played,
            win_pct: o.win_pct,
          });
          return (
            <li
              key={`${o.team_id}-${o.opponent}`}
              className="flex items-center gap-2.5 rounded-md border border-ink-300 bg-paper p-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold text-pool-deep">
                  {o.opponent}
                </p>
                <p className="line-clamp-1 text-[10px] text-ink-600">
                  {o.team_label} · {o.matches_played}P · {o.wins}V {o.draws}E {o.losses}D
                </p>
              </div>
              <VerdictBadge verdict={v} />
              <span
                className={cn(
                  "min-w-[34px] text-right font-mono text-sm font-extrabold tabular-nums",
                  o.goal_diff > 0
                    ? "text-success"
                    : o.goal_diff < 0
                      ? "text-goggle-red"
                      : "text-ink-600",
                )}
                aria-label={`Diferencia de goles ${o.goal_diff}`}
              >
                {o.goal_diff > 0 ? `+${o.goal_diff}` : o.goal_diff}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function VerdictBadge({
  verdict,
}: {
  verdict: ReturnType<typeof opponentVerdict>;
}) {
  const colorClass =
    verdict.tone === "success"
      ? "bg-success/15 text-success"
      : verdict.tone === "danger"
        ? "bg-goggle-red/15 text-goggle-red"
        : "bg-ink-300/40 text-ink-600";
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[9px] font-bold uppercase tracking-wider",
        colorClass,
      )}
    >
      {verdict.label}
    </span>
  );
}
