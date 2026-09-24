import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/domain/categories";
import { type RankingMetric, type RankingRow } from "@/lib/domain/rankings";

import { RankingEntryCard } from "./ranking-entry-card";

export interface RankingRowItemProps {
  row: RankingRow;
  metricLabel: string;
  metricSuffix: string;
  metric: RankingMetric;
  isMe: boolean;
  isJumpTarget?: boolean;
  variant?: "list" | "podium";
}

function detailsFor(row: RankingRow, metric: RankingMetric): string[] {
  const matches = `${row.matches_played} ${row.matches_played === 1 ? "partido" : "partidos"}`;
  if (metric === "attendance") {
    return [`${row.trainings_attended}/${row.trainings_total} entrenamientos`];
  }
  if (metric === "mvp") {
    const percent =
      row.matches_played > 0 ? Math.round((row.mvp_count / row.matches_played) * 100) : 0;
    return [matches, `${percent}% con MVP`];
  }
  if (metric === "goal_contributions") {
    return [
      `${row.goals} ${row.goals === 1 ? "gol" : "goles"}`,
      `${row.assists} ${row.assists === 1 ? "asistencia" : "asistencias"}`,
    ];
  }
  if (metric === "goals" || metric === "assists" || metric === "exclusions") {
    const total =
      metric === "goals" ? row.goals : metric === "assists" ? row.assists : row.exclusions;
    const average = row.matches_played > 0 ? total / row.matches_played : 0;
    return [
      matches,
      `${average.toLocaleString("es-ES", { maximumFractionDigits: 1 })} por partido`,
    ];
  }
  return [];
}

export function RankingRowItem({
  row,
  metricLabel,
  metricSuffix,
  metric,
  isMe,
  isJumpTarget = false,
  variant = "list",
}: RankingRowItemProps) {
  return (
    <RankingEntryCard
      variant={variant}
      position={row.position}
      playerId={row.player_id}
      fullName={row.full_name}
      photoUrl={row.photo_url}
      categoryLabel={CATEGORY_LABELS[row.category_code]}
      categoryColor={CATEGORY_COLORS[row.category_code] ?? row.team_color ?? "#1E5AA8"}
      value={`${row.primary_value}${metricSuffix}`}
      valueLabel={metricLabel}
      details={detailsFor(row, metric)}
      isMe={isMe}
      isJumpTarget={isJumpTarget}
    />
  );
}
