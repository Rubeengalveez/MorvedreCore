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

export type MatchupInput = {
  opponent: string;
  opponent_key?: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  last_match_at: string | null;
};

export type RivalryRow = {
  opponent: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  win_pct: number;
  last_match_at: string | null;
};

export function normalizeOpponent(opponent: string): string {
  return opponent.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-ES");
}

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

export function computeRivalries(rows: MatchupInput[]): RivalryRow[] {
  const rivals = new Map<string, Omit<RivalryRow, "goal_diff" | "win_pct">>();

  for (const row of rows) {
    const key = row.opponent_key || normalizeOpponent(row.opponent);
    const current = rivals.get(key) ?? {
      opponent: row.opponent.trim(),
      matches_played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      last_match_at: null,
    };
    current.matches_played += row.matches_played;
    current.wins += row.wins;
    current.draws += row.draws;
    current.losses += row.losses;
    current.goals_for += row.goals_for;
    current.goals_against += row.goals_against;
    if (
      !current.last_match_at ||
      (row.last_match_at && row.last_match_at > current.last_match_at)
    ) {
      current.last_match_at = row.last_match_at;
      current.opponent = row.opponent.trim();
    }
    rivals.set(key, current);
  }

  return [...rivals.values()].map((row) => ({
    ...row,
    goal_diff: row.goals_for - row.goals_against,
    win_pct: row.matches_played > 0 ? Math.round((row.wins * 10000) / row.matches_played) / 100 : 0,
  }));
}

export function bestRivals(rows: RivalryRow[], limit = 5): RivalryRow[] {
  return rows
    .filter((row) => row.matches_played >= 2)
    .toSorted(
      (a, b) =>
        b.win_pct - a.win_pct ||
        b.goal_diff - a.goal_diff ||
        b.matches_played - a.matches_played ||
        a.opponent.localeCompare(b.opponent, "es"),
    )
    .slice(0, limit);
}

export function toughestRivals(rows: RivalryRow[], limit = 5): RivalryRow[] {
  return rows
    .filter((row) => row.matches_played >= 2)
    .toSorted(
      (a, b) =>
        a.win_pct - b.win_pct ||
        a.goal_diff - b.goal_diff ||
        b.matches_played - a.matches_played ||
        a.opponent.localeCompare(b.opponent, "es"),
    )
    .slice(0, limit);
}
