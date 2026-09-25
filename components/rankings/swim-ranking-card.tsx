import type { Route } from "next";

import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/domain/categories";
import {
  formatSwimTime,
  type SwimDistance,
  type SwimRankingMode,
  type SwimRankingRow,
} from "@/lib/domain/swim-times";

import { RankingEntryCard } from "./ranking-entry-card";
import { getRankingPlayerProfileHref } from "@/lib/domain/player-profile-navigation";

export function SwimRankingCard({
  row,
  distance,
  mode,
  myPlayerId,
  jumpTargetPlayerId,
  variant = "list",
  rankingHref,
  teamId,
}: {
  row: SwimRankingRow;
  distance: SwimDistance;
  mode: SwimRankingMode;
  myPlayerId?: string;
  jumpTargetPlayerId?: string | null;
  variant?: "list" | "podium";
  rankingHref?: string;
  teamId?: string;
}) {
  const date = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${row.test_date}T00:00:00Z`));

  return (
    <RankingEntryCard
      variant={variant}
      position={row.position}
      playerId={row.player_id}
      fullName={row.full_name}
      photoUrl={row.photo_url}
      categoryLabel={row.category_code ? CATEGORY_LABELS[row.category_code] : "Sin categoría"}
      categoryColor={
        row.category_code ? CATEGORY_COLORS[row.category_code] : (row.team_color ?? "#1E5AA8")
      }
      value={formatSwimTime(row.time_cs)}
      valueLabel={mode === "latest" ? "Actual" : "Mejor"}
      details={[`${distance} m`, date]}
      isMe={row.player_id === myPlayerId}
      isJumpTarget={row.player_id === jumpTargetPlayerId}
      href={
        rankingHref
          ? getRankingPlayerProfileHref(teamId ?? row.team_id, row.player_id, rankingHref) as Route
          : `/players/${row.player_id}/swim-times?from=rankings&distance=${distance}` as Route
      }
    />
  );
}
