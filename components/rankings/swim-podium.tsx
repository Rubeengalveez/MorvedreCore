import type { SwimDistance, SwimRankingMode, SwimRankingRow } from "@/lib/domain/swim-times";

import { SwimRankingCard } from "./swim-ranking-card";

export interface SwimPodiumProps {
  items: SwimRankingRow[];
  distance: SwimDistance;
  mode: SwimRankingMode;
  myPlayerId?: string;
  jumpTargetPlayerId?: string | null;
}

export function SwimPodium({
  items,
  distance,
  mode,
  myPlayerId,
  jumpTargetPlayerId = null,
}: SwimPodiumProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="swim-podium-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="swim-podium-heading" className="text-pool-deep font-display text-lg font-extrabold">
          Podio de nado
        </h2>
        <span className="text-ink-600 text-xs font-extrabold tracking-[0.08em] uppercase">
          Top 3
        </span>
      </div>
      <ol className="grid grid-cols-1 gap-2">
        {items.map((row) => (
          <li key={row.player_id} className="min-w-0">
            <SwimRankingCard
              variant="podium"
              row={row}
              distance={distance}
              mode={mode}
              myPlayerId={myPlayerId}
              jumpTargetPlayerId={jumpTargetPlayerId}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
