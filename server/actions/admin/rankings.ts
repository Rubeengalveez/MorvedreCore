"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  bulkUnvalidateMatchStatsSchema,
  recomputeRankingSchema,
  unvalidateMatchStatsSchema,
} from "@/lib/domain/admin-schemas";
import { computePlayerStats, type CallupLite, type MatchLite, type MatchStatLite, type TrainingAttendanceLite, type TrainingSessionLite } from "@/lib/domain/stats";
import { type CategoryCode } from "@/lib/domain/categories";
import { safeInferCategory } from "@/lib/domain/categories";

import { requireAdmin } from "./_helpers";

type RankingScopeKind = "season" | "category" | "team";

interface PlayerRow {
  id: string;
  full_name: string;
  photo_url: string | null;
  cap_number: number | null;
  birth_year: number | null;
}

interface TeamRow {
  id: string;
  label: string;
  category_code: string;
  color: string;
  season_id: string;
}

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) {
    throw new Error(fallback);
  }
}

async function loadSeasonData(seasonId: string, client?: Awaited<ReturnType<typeof createClient>>) {
  const supabase = client || (await createClient());
  const [
    { data: players, error: playersError },
    { data: teams, error: teamsError },
    { data: matches, error: matchesError },
    { data: callups, error: callupsError },
    { data: stats, error: statsError },
    { data: sessions, error: sessionsError },
    { data: attendance, error: attendanceError },
    { data: rosters, error: rostersError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, photo_url, cap_number, birth_year"),
    supabase
      .from("teams")
      .select("id, label, category_code, color, season_id")
      .eq("season_id", seasonId),
    supabase
      .from("matches")
      .select("id, team_id, season_id, status, scheduled_at, final_score_us, final_score_them")
      .eq("season_id", seasonId),
    supabase
      .from("match_callups")
      .select("match_id, player_id, status, matches!match_callups_match_id_fkey(season_id)")
      .eq("matches.season_id", seasonId),
    supabase
      .from("match_stats")
      .select("match_id, player_id, goals, exclusions, mvp, matches!match_stats_match_id_fkey(season_id)")
      .eq("matches.season_id", seasonId),
    supabase
      .from("training_sessions")
      .select("id, team_id, cancelled, scheduled_at, teams!training_sessions_team_id_fkey(season_id)")
      .eq("teams.season_id", seasonId),
    supabase
      .from("training_attendance")
      .select("session_id, player_id, present, training_sessions!training_attendance_session_id_fkey(scheduled_at, cancelled, teams!training_sessions_team_id_fkey(season_id))"),
    supabase
      .from("team_rosters")
      .select("player_id, team_id, teams!team_rosters_team_id_fkey(season_id)")
      .is("left_at", null),
  ]);

  throwIfError(playersError, "No pudimos cargar los jugadores.");
  throwIfError(teamsError, "No pudimos cargar los equipos.");
  throwIfError(matchesError, "No pudimos cargar los partidos.");
  throwIfError(callupsError, "No pudimos cargar las convocatorias.");
  throwIfError(statsError, "No pudimos cargar las estadísticas.");
  throwIfError(sessionsError, "No pudimos cargar los entrenamientos.");
  throwIfError(attendanceError, "No pudimos cargar la asistencia.");
  throwIfError(rostersError, "No pudimos cargar las plantillas.");

  return {
    players: (players ?? []) as unknown as PlayerRow[],
    teams: (teams ?? []) as unknown as TeamRow[],
    matches: (matches ?? []) as unknown as Array<{
      id: string;
      team_id: string;
      season_id: string;
      status: "scheduled" | "in_progress" | "played" | "cancelled" | "postponed";
      scheduled_at: string;
      final_score_us: number | null;
      final_score_them: number | null;
    }>,
    callups: (callups ?? []) as unknown as CallupLite[],
    stats: (stats ?? []) as unknown as MatchStatLite[],
    sessions: (sessions ?? []) as unknown as Array<{
      id: string;
      team_id: string;
      cancelled: boolean;
      scheduled_at: string;
    }>,
    attendance: (attendance ?? []) as unknown as Array<{
      session_id: string;
      player_id: string;
      present: boolean;
    }>,
    rosters: (rosters ?? []) as unknown as Array<{
      player_id: string;
      team_id: string;
    }>,
  };
}

function currentYear(): number {
  return new Date().getFullYear();
}

function inferPlayerCategory(birthYear: number | null): CategoryCode {
  if (birthYear == null) return "cadete";
  return safeInferCategory(birthYear, currentYear()) ?? "cadete";
}

interface ComputedSnapshot {
  season_id: string;
  scope: RankingScopeKind;
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

function buildSnapshotsForPlayer(
  seasonId: string,
  player: PlayerRow,
  primaryTeam: { id: string; label: string; color: string; category_code: string } | null,
  matchLites: MatchLite[],
  callupLites: CallupLite[],
  statLites: MatchStatLite[],
  sessionLites: TrainingSessionLite[],
  attendanceLites: TrainingAttendanceLite[],
): ComputedSnapshot[] {
  const stats = computePlayerStats(
    player.id,
    seasonId,
    sessionLites,
    attendanceLites,
    matchLites,
    callupLites,
    statLites,
  );

  const seasonLabel = "all";
  const categoryLabel = inferPlayerCategory(player.birth_year);
  const teamLabel = primaryTeam ? primaryTeam.id : "none";

  const base: Omit<ComputedSnapshot, "scope" | "scope_key"> = {
    season_id: seasonId,
    player_id: player.id,
    matches_played: stats.matches_played,
    matches_called: stats.matches_called,
    goals: stats.goals,
    exclusions: stats.exclusions,
    mvp_count: stats.mvp_count,
    trainings_attended: stats.trainings_attended,
    trainings_total: stats.trainings_total,
    attendance_pct: stats.attendance_pct,
    attendance_streak: stats.attendance_streak,
  };

  return [
    { ...base, scope: "season", scope_key: seasonLabel },
    { ...base, scope: "category", scope_key: categoryLabel },
    { ...base, scope: "team", scope_key: teamLabel },
  ];
}

export async function recomputePlayerRanking(
  playerId: string,
  seasonId: string,
): Promise<void> {
  const parsed = recomputeRankingSchema.safeParse({ season_id: seasonId, player_id: playerId });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  await requireAdmin();
  await recomputeSnapshotForPlayer(playerId, seasonId);

  revalidatePath("/rankings");
  revalidatePath("/profile");
  revalidatePath(`/team`);
}

export async function recomputeSeasonRanking(seasonId: string): Promise<void> {
  const parsed = recomputeRankingSchema.shape.season_id.safeParse(seasonId);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  await requireAdmin();
  const { players } = await loadSeasonData(seasonId);

  for (const player of players) {
    await recomputeSnapshotForPlayer(player.id, seasonId);
  }

  revalidatePath("/rankings");
  revalidatePath("/profile");
  revalidatePath(`/team`);
}

export async function unvalidateMatchStats(
  matchId: string,
  reason: string,
): Promise<void> {
  const parsed = unvalidateMatchStatsSchema.safeParse({
    match_id: matchId,
    reason,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, season_id, team_id")
    .eq("id", parsed.data.match_id)
    .maybeSingle();

  throwIfError(matchError, "No pudimos cargar el partido.");
  if (!match) {
    throw new Error("El partido no existe.");
  }

  const { error } = await supabase
    .from("match_stats")
    .update({
      validated_by: null,
      validated_at: null,
    })
    .eq("match_id", parsed.data.match_id)
    .not("validated_at", "is", null);

  throwIfError(error, "No pudimos invalidar las estadísticas.");

  const { data: callupRows } = await supabase
    .from("match_callups")
    .select("player_id")
    .eq("match_id", parsed.data.match_id);

  const playerIds = Array.from(
    new Set((callupRows ?? []).map((r) => (r as { player_id: string }).player_id)),
  );

  for (const playerId of playerIds) {
    await recomputeSnapshotForPlayer(playerId, match.season_id);
  }

  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${parsed.data.match_id}`);
  revalidatePath("/rankings");
  revalidatePath("/profile");
  void admin;
}

export async function recomputeSnapshotForPlayer(
  playerId: string,
  seasonId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { players, teams, matches, callups, stats, sessions, attendance, rosters } =
    await loadSeasonData(seasonId, admin);

  const player = players.find((p) => p.id === playerId);
  if (!player) {
    return;
  }

  const seasonTeams = teams;
  const playerRosterEntries = rosters.filter((r) => r.player_id === playerId);
  const primaryTeamEntry = playerRosterEntries
    .map((r) => seasonTeams.find((t) => t.id === r.team_id))
    .find((t): t is TeamRow => Boolean(t)) ?? null;
  const primaryTeam = primaryTeamEntry
    ? {
        id: primaryTeamEntry.id,
        label: primaryTeamEntry.label,
        color: primaryTeamEntry.color,
        category_code: primaryTeamEntry.category_code,
      }
    : null;

  const matchLites: MatchLite[] = matches.map((m) => ({
    id: m.id,
    season_id: m.season_id,
    team_id: m.team_id,
    status: m.status,
  }));
  const callupLites: CallupLite[] = callups.map((c) => ({
    match_id: c.match_id,
    player_id: c.player_id,
    status: c.status as CallupLite["status"],
  }));
  const statLites: MatchStatLite[] = stats.map((s) => ({
    match_id: s.match_id,
    player_id: s.player_id,
    goals: s.goals,
    exclusions: s.exclusions,
    mvp: s.mvp,
  }));
  const sessionLites: TrainingSessionLite[] = sessions.map((s) => ({
    id: s.id,
    team_id: s.team_id,
    cancelled: s.cancelled,
    scheduled_at: s.scheduled_at,
  }));
  const attendanceLites: TrainingAttendanceLite[] = attendance
    .filter((a) => a.player_id === playerId)
    .map((a) => ({
      session_id: a.session_id,
      player_id: a.player_id,
      present: a.present,
    }));

  const snapshots = buildSnapshotsForPlayer(
    seasonId,
    player,
    primaryTeam,
    matchLites,
    callupLites,
    statLites,
    sessionLites,
    attendanceLites,
  );

  await admin
    .from("ranking_snapshots")
    .delete()
    .eq("player_id", playerId)
    .eq("season_id", seasonId);

  if (snapshots.length > 0) {
    const { error: upsertError } = await admin
      .from("ranking_snapshots")
      .upsert(
        snapshots.map((s) => ({
          season_id: s.season_id,
          scope: s.scope,
          scope_key: s.scope_key,
          player_id: s.player_id,
          matches_played: s.matches_played,
          matches_called: s.matches_called,
          goals: s.goals,
          exclusions: s.exclusions,
          mvp_count: s.mvp_count,
          trainings_attended: s.trainings_attended,
          trainings_total: s.trainings_total,
          attendance_pct: s.attendance_pct,
          attendance_streak: s.attendance_streak,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "season_id,scope,scope_key,player_id" },
      );
    throwIfError(upsertError, "No pudimos actualizar los rankings.");
  }
}

export async function bulkUnvalidateMatchStats(
  matchIds: string[],
  reason: string,
): Promise<void> {
  const parsed = bulkUnvalidateMatchStatsSchema.safeParse({
    match_ids: matchIds,
    reason,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  await requireAdmin();

  for (const matchId of parsed.data.match_ids) {
    await unvalidateMatchStats(matchId, parsed.data.reason);
  }
}
