export type LegendMetric = "goals" | "matches_played" | "mvp_count" | "attendance_pct";

export type LegendStatInput = {
  profile_id: string;
  profile_name: string;
  photo_url?: string | null;
  season_id: string;
  matches_played: number;
  matches_called: number;
  goals: number;
  exclusions: number;
  trainings_attended: number;
  trainings_total: number;
  mvp_count: number;
};

export type LegendRow = {
  rank: number;
  profile_id: string;
  profile_name: string;
  photo_url: string | null;
  seasons: number;
  matches_played: number;
  matches_called: number;
  goals: number;
  exclusions: number;
  trainings_attended: number;
  trainings_total: number;
  attendance_pct: number;
  mvp_count: number;
};

export function computeLegends(
  rows: LegendStatInput[],
  metric: LegendMetric,
  limit = 10,
): LegendRow[] {
  const players = new Map<
    string,
    Omit<LegendRow, "rank" | "seasons" | "attendance_pct"> & { seasonIds: Set<string> }
  >();

  for (const row of rows) {
    const current = players.get(row.profile_id) ?? {
      profile_id: row.profile_id,
      profile_name: row.profile_name,
      photo_url: row.photo_url ?? null,
      matches_played: 0,
      matches_called: 0,
      goals: 0,
      exclusions: 0,
      trainings_attended: 0,
      trainings_total: 0,
      mvp_count: 0,
      seasonIds: new Set<string>(),
    };
    current.profile_name = row.profile_name;
    current.photo_url = row.photo_url ?? current.photo_url;
    current.matches_played += row.matches_played;
    current.matches_called += row.matches_called;
    current.goals += row.goals;
    current.exclusions += row.exclusions;
    current.trainings_attended += row.trainings_attended;
    current.trainings_total += row.trainings_total;
    current.mvp_count += row.mvp_count;
    current.seasonIds.add(row.season_id);
    players.set(row.profile_id, current);
  }

  const valueOf = (row: Omit<LegendRow, "rank">): number => row[metric];
  const sorted = [...players.values()]
    .map(({ seasonIds, ...row }) => ({
      ...row,
      seasons: seasonIds.size,
      attendance_pct:
        row.trainings_total > 0
          ? Math.round((row.trainings_attended * 10000) / row.trainings_total) / 100
          : 0,
    }))
    .filter((row) => (metric === "attendance_pct" ? row.trainings_total > 0 : valueOf(row) > 0))
    .sort((a, b) => {
      const metricDiff = valueOf(b) - valueOf(a);
      if (metricDiff !== 0) return metricDiff;
      if (metric === "attendance_pct" && a.trainings_total !== b.trainings_total) {
        return b.trainings_total - a.trainings_total;
      }
      if (a.matches_played !== b.matches_played) return b.matches_played - a.matches_played;
      return a.profile_name.localeCompare(b.profile_name, "es");
    })
    .slice(0, Math.max(0, limit));

  let previousValue: number | null = null;
  let previousRank = 0;
  return sorted.map((row, index) => {
    const value = valueOf(row);
    const rank = previousValue === value ? previousRank : index + 1;
    previousValue = value;
    previousRank = rank;
    return { ...row, rank };
  });
}
