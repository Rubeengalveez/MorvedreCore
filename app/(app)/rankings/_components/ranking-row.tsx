import { CapTile } from "@/components/ui/cap-tile";
import { cn } from "@/lib/utils/cn";
import type { RankingRow } from "@/lib/domain/rankings";

export interface RankingRowItemProps {
  row: RankingRow;
  metricLabel: string;
  metricSuffix: string;
  isMe: boolean;
}

export function RankingRow({
  row,
  metricLabel,
  metricSuffix,
  isMe,
}: RankingRowItemProps) {
  const isTop10 = row.position <= 10;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-ink-300 bg-paper p-2.5 transition-all",
        isMe && "border-pool-deep bg-pool-foam/60 ring-1 ring-pool-deep/20",
        isTop10 && !isMe && "border-l-4 border-l-[#FF6B35]/80 bg-[#FF6B35]/5",
      )}
    >
      <span
        aria-label={`Posición ${row.position}`}
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-sm font-extrabold",
          isTop10
            ? "bg-pool-deep text-paper"
            : "bg-paper-sunk text-pool-deep",
        )}
      >
        {row.position}
      </span>
      <CapTile
        number={row.cap_number ?? 0}
        teamColor={row.team_color ?? "var(--pool-blue)"}
        size="sm"
        isMe={isMe}
        aria-label={`Dorsal ${row.cap_number ?? 0}`}
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-semibold text-pool-deep">
          {row.full_name}
          {isMe ? <span className="ml-1 text-[10px] uppercase tracking-eyebrow text-pool-deep">· Tú</span> : null}
        </p>
        {row.team_label ? (
          <p className="line-clamp-1 text-[11px] text-ink-600">{row.team_label}</p>
        ) : null}
      </div>
      <div className="text-right">
        <p className="font-mono text-lg font-extrabold tabular-nums text-pool-deep">
          {row.primary_value}
          {metricSuffix}
        </p>
        <p className="text-[10px] uppercase tracking-eyebrow text-ink-600">
          {metricLabel}
        </p>
      </div>
    </div>
  );
}
