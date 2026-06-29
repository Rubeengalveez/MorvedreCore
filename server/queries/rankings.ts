import { createClient } from "@/lib/supabase/server";
import {
  computeRanking,
  findMyPosition,
  type PlayerStatsInput,
  type RankingMetric,
  type RankingRow,
  type RankingScope,
} from "@/lib/domain/rankings";
import type { CategoryCode } from "@/lib/domain/categories";

export interface RankingQueryInput {
  season_id: string;
  scope: RankingScope;
  metric: RankingMetric;
  min_trainings_total?: number;
  my_player_id?: string;
  streak_type?: "goals_consec" | "excl_consec" | "train_consec" | "mvp_consec";
  streak_order?: "current" | "best";
}

export interface RankingResult {
  rows: RankingRow[];
  my_position: ReturnType<typeof findMyPosition>;
  total_players: number;
}

interface SnapshotRow {
  season_id: string;
  scope: string;
  scope_key: string;
  player_id: string;
  matches_played: number;
  matches_called: number;
  goals: number;
  exclusions: number;
  mvp_count: number;
  trainings_attended: number;
  trainings_total: number;
  attendance_pct: number;
  attendance_streak: number;
}

function scopeKeyOf(scope: RankingScope): string {
  if (scope.kind === "all") return "all";
  if (scope.kind === "category") return scope.category_code;
  return scope.team_id;
}

function scopeKindOf(scope: RankingScope): "season" | "category" | "team" {
  if (scope.kind === "all") return "season";
  if (scope.kind === "category") return "category";
  return "team";
}

export async function getRankings(input: RankingQueryInput): Promise<RankingResult> {
  const supabase = await createClient();
  const scopeKey = scopeKeyOf(input.scope);
  const scopeKind = scopeKindOf(input.scope);

  const { data: snapshots, error } = await supabase
    .from("ranking_snapshots")
    .select(
      "season_id, scope, scope_key, player_id, matches_played, matches_called, goals, exclusions, mvp_count, trainings_attended, trainings_total, attendance_pct, attendance_streak",
    )
    .eq("season_id", input.season_id)
    .eq("scope", scopeKind)
    .eq("scope_key", scopeKey);

  if (error) {
    return { rows: [], my_position: null, total_players: 0 };
  }

  // Si la métrica es racha, cargamos dinámicamente los datos de la tabla 'streaks'
  const streakMap = new Map<string, { current: number; best: number }>();
  if (input.metric === "streak") {
    const { data: streakRows } = await supabase
      .from("streaks")
      .select("subject_id, current_value, best_value")
      .eq("season_id", input.season_id)
      .eq("subject_type", "player")
      .eq("streak_type", input.streak_type ?? "train_consec");
    
    if (streakRows) {
      for (const r of streakRows) {
        streakMap.set(r.subject_id, {
          current: r.current_value,
          best: r.best_value,
        });
      }
    }
  }

  const playerIds = Array.from(new Set(((snapshots ?? []) as SnapshotRow[]).map((s) => s.player_id)));
  const { data: profiles } = playerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, photo_url, cap_number, birth_year")
        .in("id", playerIds)
    : { data: [] };
  const { data: rosters } = playerIds.length
    ? await supabase
        .from("team_rosters")
        .select("player_id, team_id, teams(id, label, color, category_code)")
        .in("player_id", playerIds)
        .is("left_at", null)
    : { data: [] };

  const profileMap = new Map<string, { full_name: string; photo_url: string | null; cap_number: number | null; birth_year: number | null }>();
  for (const p of (profiles ?? []) as Array<{ id: string; full_name: string; photo_url: string | null; cap_number: number | null; birth_year: number | null }>) {
    profileMap.set(p.id, p);
  }

  const teamByPlayer = new Map<string, { id: string; label: string; color: string; category_code: string }>();
  for (const r of (rosters ?? []) as Array<{ player_id: string; teams: unknown }>) {
    const t = Array.isArray(r.teams) ? r.teams[0] : r.teams;
    const team = t as { id: string; label: string; color: string; category_code: string } | null;
    if (team && !teamByPlayer.has(r.player_id)) {
      teamByPlayer.set(r.player_id, team);
    }
  }

  const currentYear = new Date().getFullYear();
  const players: PlayerStatsInput[] = ((snapshots ?? []) as SnapshotRow[]).map((s) => {
    const profile = profileMap.get(s.player_id);
    const team = teamByPlayer.get(s.player_id) ?? null;
    const birthYear = profile?.birth_year ?? null;
    const inferredCategory: CategoryCode =
      birthYear != null
        ? (ageToCategory(currentYear - birthYear) ?? (team?.category_code as CategoryCode) ?? "cadete")
        : (team?.category_code as CategoryCode) ?? "cadete";

    const streakVal = input.metric === "streak"
      ? (input.streak_order === "best"
          ? (streakMap.get(s.player_id)?.best ?? 0)
          : (streakMap.get(s.player_id)?.current ?? 0))
      : s.attendance_streak;

    return {
      player_id: s.player_id,
      full_name: profile?.full_name ?? "Sin nombre",
      photo_url: profile?.photo_url ?? null,
      cap_number: profile?.cap_number ?? null,
      category_code: inferredCategory,
      team_id: team?.id ?? null,
      team_label: team?.label ?? null,
      team_color: team?.color ?? null,
      matches_played: s.matches_played,
      goals: s.goals,
      exclusions: s.exclusions,
      mvp_count: s.mvp_count,
      trainings_attended: s.trainings_attended,
      trainings_total: s.trainings_total,
      attendance_pct: Number(s.attendance_pct ?? 0),
      attendance_streak: streakVal,
    };
  });

  const rows = computeRanking(players, {
    metric: input.metric,
    scope: input.scope,
    min_trainings_total: input.min_trainings_total ?? 0,
  });

  const my_position = input.my_player_id ? findMyPosition(rows, input.my_player_id) : null;

  return {
    rows,
    my_position,
    total_players: rows.length,
  };
}

function ageToCategory(age: number): CategoryCode | null {
  if (age <= 11) return "benjamin";
  if (age <= 13) return "alevin";
  if (age <= 15) return "infantil";
  if (age <= 17) return "cadete";
  if (age <= 19) return "juvenil";
  return "absoluto";
}

export interface RankingsPageMeta {
  season: { id: string; label: string };
  categories: Array<{ code: CategoryCode; label: string; player_count: number }>;
  teams: Array<{ id: string; label: string; category_code: CategoryCode; color: string; player_count: number }>;
  available_seasons: Array<{ id: string; label: string; is_current: boolean }>;
}

export async function getRankingsMeta(activeSeasonId?: string): Promise<RankingsPageMeta> {
  const supabase = await createClient();

  const [{ data: seasons }, { data: teamsData }, { data: rosters }] = await Promise.all([
    supabase.from("seasons").select("id, label, is_current, start_date").order("start_date", { ascending: false }),
    supabase
      .from("teams")
      .select("id, label, category_code, color, season_id")
      .order("start_date", { ascending: false }),
    supabase
      .from("team_rosters")
      .select("team_id, left_at"),
  ]);

  const seasonList = ((seasons ?? []) as Array<{ id: string; label: string; is_current: boolean }>);
  const teamsAll = (teamsData ?? []) as Array<{ id: string; label: string; category_code: string; color: string; season_id: string }>;

  let season: { id: string; label: string; is_current: boolean } | null = null;
  if (activeSeasonId) {
    season = seasonList.find((s) => s.id === activeSeasonId) ?? null;
  } else {
    const current = seasonList.find((s) => s.is_current);
    if (current) {
      const hasTeams = teamsAll.some((t) => t.season_id === current.id);
      if (hasTeams) {
        season = current;
      }
    }
    if (!season) {
      const seasonWithTeams = teamsAll.find((t) => t.season_id)?.season_id;
      if (seasonWithTeams) {
        season = seasonList.find((s) => s.id === seasonWithTeams) ?? null;
      }
    }
    if (!season) {
      season = seasonList[0] ?? null;
    }
  }
  if (!season) {
    return {
      season: { id: "", label: "" },
      categories: [],
      teams: [],
      available_seasons: [],
    };
  }

  const seasonTeams = teamsAll.filter(
    (t) => t.season_id === season.id,
  );

  const countsByTeam = new Map<string, number>();
  for (const r of (rosters ?? []) as Array<{ team_id: string; left_at: string | null }>) {
    if (r.left_at != null) continue;
    countsByTeam.set(r.team_id, (countsByTeam.get(r.team_id) ?? 0) + 1);
  }

  const categoryLabels: Record<string, string> = {
    benjamin: "Benjamín",
    alevin: "Alevín",
    infantil: "Infantil",
    cadete: "Cadete",
    juvenil: "Juvenil",
    absoluto: "Absoluto",
    escuela: "Escuela",
  };
  const countsByCategory = new Map<string, number>();
  const teamList = seasonTeams.map((t) => {
    const count = countsByTeam.get(t.id) ?? 0;
    countsByCategory.set(t.category_code, (countsByCategory.get(t.category_code) ?? 0) + count);
    return {
      id: t.id,
      label: t.label,
      category_code: t.category_code as CategoryCode,
      color: t.color,
      player_count: count,
    };
  });

  const categories: Array<{ code: CategoryCode; label: string; player_count: number }> = Array.from(
    countsByCategory.entries(),
  )
    .map(([code, count]) => ({
      code: code as CategoryCode,
      label: categoryLabels[code] ?? code,
      player_count: count,
    }))
    .sort((a, b) => b.player_count - a.player_count);

  return {
    season: { id: season.id, label: season.label },
    categories,
    teams: teamList,
    available_seasons: seasonList,
  };
}

export interface OpponentHistoryRow {
  opponent: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  last_match_at: string | null;
  team_label: string;
  team_id: string;
  win_pct: number;
  goal_diff: number;
}

export async function getOpponentHistory(input: {
  season_id: string;
  team_id?: string;
  limit?: number;
}): Promise<OpponentHistoryRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("opponent_stats")
    .select("opponent, matches_played, wins, draws, losses, goals_for, goals_against, last_match_at, team_id, teams!opponent_stats_team_id_fkey(label, color)")
    .eq("season_id", input.season_id)
    .order("last_match_at", { ascending: false });
  if (input.team_id) {
    query = query.eq("team_id", input.team_id);
  }
  const { data, error } = await query;
  if (error) return [];

  const rows = ((data ?? []) as Array<{
    opponent: string;
    matches_played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    last_match_at: string | null;
    team_id: string;
    teams: unknown;
  }>).map((r) => {
    const t = Array.isArray(r.teams) ? r.teams[0] : r.teams;
    const team = t as { label?: string } | null;
    return {
      opponent: r.opponent,
      matches_played: r.matches_played,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      goals_for: r.goals_for,
      goals_against: r.goals_against,
      last_match_at: r.last_match_at,
      team_id: r.team_id,
      team_label: team?.label ?? "",
    };
  });

  const enriched = rows.map((r) => {
    const winPct = r.matches_played > 0 ? Math.round((r.wins / r.matches_played) * 10000) / 100 : 0;
    return {
      ...r,
      win_pct: winPct,
      goal_diff: r.goals_for - r.goals_against,
    };
  });

  const limit = input.limit ?? 5;
  return enriched.slice(0, limit);
}
