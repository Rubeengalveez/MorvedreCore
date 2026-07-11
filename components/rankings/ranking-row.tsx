import { PositionChip } from "@/components/ui/position-chip";
import { cn } from "@/lib/utils/cn";
import { type RankingRow } from "@/lib/domain/rankings";

export interface RankingRowItemProps {
  row: RankingRow;
  metricLabel: string;
  metricSuffix: string;
  isMe: boolean;
  showMedal?: boolean;
}

export function RankingRowItem({
  row,
  metricLabel,
  metricSuffix,
  isMe,
  showMedal = false,
}: RankingRowItemProps) {
  const isTop10 = row.position <= 10;
  const tone = isMe ? "me" : isTop10 ? "top" : "default";

  return (
    <div
      className={cn(
        "border-ink-300 bg-paper-card shadow-elev-1 flex min-h-[66px] items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
        isMe && "border-ball-gold/70 bg-ball-gold/10 ring-ball-gold/35 ring-2",
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
