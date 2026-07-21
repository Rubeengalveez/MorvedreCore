import { PositionChip } from "@/components/ui/position-chip";
import { cn } from "@/lib/utils/cn";
import { type RankingMetric, type RankingRow } from "@/lib/domain/rankings";

export interface RankingRowItemProps {
  row: RankingRow;
  metricLabel: string;
  metricSuffix: string;
  metric: RankingMetric;
  isMe: boolean;
  isJumpTarget?: boolean;
  showMedal?: boolean;
}

export function RankingRowItem({
  row,
  metricLabel,
  metricSuffix,
  metric,
  isMe,
  isJumpTarget = false,
  showMedal = false,
}: RankingRowItemProps) {
  const isTop10 = row.position <= 10;
  const tone = isMe ? "me" : isTop10 ? "top" : "default";

  return (
    <div
      id={`ranking-player-${row.player_id}`}
      className={cn(
        "border-ink-300 bg-paper-card shadow-elev-1 flex min-h-[66px] scroll-mt-[calc(var(--top-bar-height)+1rem)] items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
        isTop10 && !isMe && "border-pool-blue/25 bg-pool-foam/20",
        isMe && "border-ball-gold/70 bg-ball-gold/10 ring-ball-gold/35 ring-2",
        isJumpTarget && "border-action bg-action/5 ring-action ring-2 ring-offset-2",
      )}
      style={{ borderLeftWidth: "4px", borderLeftColor: row.team_color ?? "var(--pool-blue)" }}
    >
      <PositionChip position={row.position} tone={tone} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-pool-deep line-clamp-2 text-base leading-tight font-extrabold">
          {row.full_name}
          {isMe ? (
            <span className="text-action ml-1 text-xs font-extrabold uppercase">Tu</span>
          ) : null}
        </p>
        {row.team_label ? (
          <p className="text-ink-600 mt-1 line-clamp-1 text-sm leading-none font-semibold">
            {row.team_label}
          </p>
        ) : null}
        {metric !== "streak" ? <RankingMetricContext row={row} metric={metric} /> : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-pool-deep font-mono text-2xl leading-none font-extrabold tabular-nums">
          {row.primary_value}
          {metricSuffix}
        </p>
        <p className="text-ink-500 mt-1 text-xs leading-none font-extrabold tracking-[0.08em] uppercase">
          {metricLabel}
        </p>
      </div>
      {showMedal && row.medal ? <span className="sr-only">{row.medal}</span> : null}
    </div>
  );
}

type MetricContextPart = {
  label: string;
  value: string;
  valueFirst: boolean;
};

function metricContextParts(row: RankingRow, metric: RankingMetric): MetricContextPart[] {
  if (metric === "attendance") {
    return [
      {
        value: `${row.trainings_attended}/${row.trainings_total}`,
        label: "entrenos",
        valueFirst: true,
      },
    ];
  }
  if (metric === "mvp") {
    const pct = row.matches_played > 0 ? Math.round((row.mvp_count / row.matches_played) * 100) : 0;
    return [
      { value: String(row.matches_played), label: "partidos", valueFirst: true },
      { value: `${pct}%`, label: "MVP", valueFirst: false },
    ];
  }
  if (metric === "goals" || metric === "exclusions") {
    const total = metric === "goals" ? row.goals : row.exclusions;
    const average = row.matches_played > 0 ? total / row.matches_played : 0;
    return [
      { value: String(row.matches_played), label: "partidos", valueFirst: true },
      {
        value: average.toLocaleString("es-ES", { maximumFractionDigits: 1 }),
        label: "Media",
        valueFirst: false,
      },
    ];
  }
  return [];
}

export function RankingMetricContext({
  row,
  metric,
  inverted = false,
  className,
}: {
  row: RankingRow;
  metric: RankingMetric;
  inverted?: boolean;
  className?: string;
}) {
  const parts = metricContextParts(row, metric);
  if (parts.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden text-xs leading-tight",
        inverted ? "text-paper/70" : "text-ink-500",
        className,
      )}
    >
      {parts.map((part, index) => (
        <span key={`${part.label}-${part.value}`} className="inline-flex items-center gap-1.5">
          {index > 0 ? (
            <span
              aria-hidden="true"
              className={cn("h-3 w-px shrink-0", inverted ? "bg-paper/25" : "bg-ink-300")}
            />
          ) : null}
          <span className="whitespace-nowrap">
            {part.valueFirst ? (
              <>
                <strong className={cn("font-extrabold", inverted && "text-paper/90")}>
                  {part.value}
                </strong>{" "}
                {part.label}
              </>
            ) : (
              <>
                {part.label}{" "}
                <strong className={cn("font-extrabold", inverted && "text-paper/90")}>
                  {part.value}
                </strong>
              </>
            )}
          </span>
        </span>
      ))}
    </div>
  );
}
