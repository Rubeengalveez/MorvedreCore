import { type RankingMetric, type RankingRow } from "@/lib/domain/rankings";

import { RankingRowItem } from "./ranking-row";

export interface PodiumProps {
  items: RankingRow[];
  metricLabel: string;
  valueLabel: string;
  metricSuffix: string;
  metric: RankingMetric;
  myPlayerId: string;
  jumpTargetPlayerId?: string | null;
}

export function Podium({
  items,
  metricLabel,
  valueLabel,
  metricSuffix,
  metric,
  myPlayerId,
  jumpTargetPlayerId = null,
}: PodiumProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="podium-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="podium-heading" className="text-pool-deep font-display text-lg font-extrabold">
          Podio de {metricLabel.toLowerCase()}
        </h2>
        <span className="text-ink-600 text-xs font-extrabold tracking-[0.08em] uppercase">
          Top 3
        </span>
      </div>
      <ol className="flex flex-col gap-2">
        {items.map((row) => (
          <li key={row.player_id} className="min-w-0">
            <RankingRowItem
              variant="podium"
              row={row}
              metricLabel={valueLabel}
              metricSuffix={metricSuffix}
              metric={metric}
              isMe={row.player_id === myPlayerId}
              isJumpTarget={row.player_id === jumpTargetPlayerId}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
