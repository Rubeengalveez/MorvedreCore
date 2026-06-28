"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeMvp, type MvpCandidate } from "@/lib/domain/mvp";
import {
  applyStreak,
  emptyStreak,
  exclConsecEvents,
  goalsConsecEvents,
  mvpConsecEvents,
  trainConsecEvents,
  winsConsecEvents,
  type StreakRecord,
  type StreakType,
} from "@/lib/domain/streaks";

type SubjectType = "player" | "team";

interface MatchRowLite {
  id: string;
  season_id: string;
  team_id: string;
  status: string;
  scheduled_at: string;
  final_score_us: number | null;
  final_score_them: number | null;
  mvp_player_id: string | null;
}

interface MatchStatLite {
  match_id: string;
  player_id: string;
  goals: number;
  exclusions: number;
  mvp: boolean;
}

interface TrainingSessionLite {
  id: string;
  team_id: string;
  scheduled_at: string;
  cancelled: boolean;
}

interface TrainingAttendanceLite {
  session_id: string;
  player_id: string;
  present: boolean;
}

interface TeamRosterLite {
  player_id: string;
  team_id: string;
  left_at: string | null;
}

interface SeasonData {
  matches: MatchRowLite[];
  matchStats: MatchStatLite[];
  sessions: TrainingSessionLite[];
  attendance: TrainingAttendanceLite[];
  rosters: TeamRosterLite[];
}

async function loadSeasonData(seasonId: string): Promise<SeasonData> {
  const supabase = await createClient();
  const [matchesRes, statsRes, sessionsRes, attendanceRes, rostersRes] = await Promise.all([
    supabase
      .from("matches")
      .select("id, season_id, team_id, status, scheduled_at, final_score_us, final_score_them, mvp_player_id")
      .eq("season_id", seasonId),
    supabase
      .from("match_stats")
      .select("match_id, player_id, goals, exclusions, mvp, matches!match_stats_match_id_fkey(season_id)")
      .eq("matches.season_id", seasonId),
    supabase
      .from("training_sessions")
      .select("id, team_id, scheduled_at, cancelled, teams!training_sessions_team_id_fkey(season_id)")
      .eq("teams.season_id", seasonId),
    supabase
      .from("training_attendance")
      .select("session_id, player_id, present, training_sessions!training_attendance_session_id_fkey(scheduled_at, cancelled, teams!training_sessions_team_id_fkey(season_id))"),
    supabase
      .from("team_rosters")
      .select("player_id, team_id, left_at, teams!team_rosters_team_id_fkey(season_id)"),
  ]);
  return {
    matches: (matchesRes.data ?? []) as unknown as MatchRowLite[],
    matchStats: (statsRes.data ?? []) as unknown as MatchStatLite[],
    sessions: (sessionsRes.data ?? []) as unknown as TrainingSessionLite[],
    attendance: (attendanceRes.data ?? []) as unknown as TrainingAttendanceLite[],
    rosters: (rostersRes.data ?? []) as unknown as TeamRosterLite[],
  };
}

async function readCurrentRow(
  seasonId: string,
  subjectType: SubjectType,
  subjectId: string,
  streakType: StreakType,
): Promise<StreakRecord> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("streaks")
    .select("current_value, best_value, best_at, last_event_at")
    .eq("season_id", seasonId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .eq("streak_type", streakType)
    .maybeSingle();
  if (!data) return emptyStreak();
  return {
    current_value: Number(data.current_value ?? 0),
    best_value: Number(data.best_value ?? 0),
    best_at: data.best_at ?? null,
    last_event_at: data.last_event_at ?? null,
  };
}

async function upsertStreak(
  seasonId: string,
  subjectType: SubjectType,
  subjectId: string,
  streakType: StreakType,
  record: StreakRecord,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("streaks")
    .upsert(
      {
        season_id: seasonId,
        subject_type: subjectType,
        subject_id: subjectId,
        streak_type: streakType,
        current_value: record.current_value,
        best_value: record.best_value,
        best_at: record.best_at,
        last_event_at: record.last_event_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "season_id,subject_type,subject_id,streak_type" },
    );
  if (error) {
    throw new Error(`No pudimos guardar la racha: ${error.message}`);
  }
}

export async function recomputeStreaksForMatch(matchId: string): Promise<void> {
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("id, season_id, team_id, status, scheduled_at, final_score_us, final_score_them, mvp_player_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return;
  const m = match as MatchRowLite;
  if (m.status !== "played") return;

  await recomputeStreaksForMatchInternal(m);
}

async function recomputeStreaksForMatchInternal(match: MatchRowLite): Promise<void> {
  const seasonId = match.season_id;
  const data = await loadSeasonData(seasonId);

  // MVP automático: calcular y persistir en la base de datos
  const statsForMatch = data.matchStats.filter((s) => s.match_id === match.id);
  const candidates: MvpCandidate[] = statsForMatch.map((s) => ({
    player_id: s.player_id,
    goals: s.goals,
    exclusions: s.exclusions,
  }));
  const mvpResult = computeMvp(candidates);
  const mvpPlayerIds = mvpResult.player_ids;

  const admin = createAdminClient();

  // 1. Poner mvp = false para todos los jugadores del partido primero
  const { error: resetErr } = await admin
    .from("match_stats")
    .update({ mvp: false })
    .eq("match_id", match.id);
  if (resetErr) {
    throw new Error(`No pudimos reiniciar los MVPs del partido: ${resetErr.message}`);
  }

  // 2. Si hay ganadores de MVP, ponerles mvp = true
  if (mvpPlayerIds.length > 0) {
    const { error: mvpErr } = await admin
      .from("match_stats")
      .update({ mvp: true })
      .eq("match_id", match.id)
      .in("player_id", mvpPlayerIds);
    if (mvpErr) {
      throw new Error(`No pudimos actualizar los MVPs del acta: ${mvpErr.message}`);
    }
  }

  // 3. Registrar el mvp_player_id en matches (solo si hay un único ganador)
  const newMvp = mvpPlayerIds.length === 1 ? mvpPlayerIds[0]! : null;
  if (match.mvp_player_id !== newMvp) {
    const { error: matchMvpErr } = await admin
      .from("matches")
      .update({ mvp_player_id: newMvp })
      .eq("id", match.id);
    if (matchMvpErr) {
      throw new Error(`No pudimos actualizar el MVP del partido: ${matchMvpErr.message}`);
    }
  }

  // 1) goals_consec y excl_consec y mvp_consec para todos los jugadores del partido
  const allPlayerIds = Array.from(new Set(statsForMatch.map((s) => s.player_id)));
  const nowIso = new Date().toISOString();
  for (const pid of allPlayerIds) {
    const playerStats = data.matchStats
      .filter((s) => s.player_id === pid)
      .map((s) => {
        const m = data.matches.find((mm) => mm.id === s.match_id);
        return { match_id: s.match_id, scheduled_at: m?.scheduled_at ?? "", goals: s.goals, exclusions: s.exclusions };
      })
      .filter((s) => s.scheduled_at);

    const playerMatches = data.matches.filter(
      (mm) => statsForMatch.some((s) => s.match_id === mm.id && s.player_id === pid) || data.matchStats.some((s) => s.match_id === mm.id && s.player_id === pid),
    );
    const mvpMatches = playerMatches.map((mm) => ({ id: mm.id, scheduled_at: mm.scheduled_at, mvp_player_id: mm.mvp_player_id }));

    await upsertStreakFromEvents(seasonId, "player", pid, "goals_consec", goalsConsecEvents(playerStats), nowIso);
    await upsertStreakFromEvents(seasonId, "player", pid, "excl_consec", exclConsecEvents(playerStats), nowIso);
    await upsertStreakFromEvents(seasonId, "player", pid, "mvp_consec", mvpConsecEvents(mvpMatches, pid), nowIso);
  }

  // 2) train_consec para todos los jugadores del roster del equipo del partido
  const teamId = match.team_id;
  const teamPlayerIds = Array.from(new Set(data.rosters.filter((r) => r.team_id === teamId && r.left_at == null).map((r) => r.player_id)));
  const teamSessions = data.sessions.filter((s) => s.team_id === teamId);
  for (const pid of teamPlayerIds) {
    const playerAtt = data.attendance.filter((a) => a.player_id === pid);
    await upsertStreakFromEvents(seasonId, "player", pid, "train_consec", trainConsecEvents(teamSessions, playerAtt), nowIso);
  }

  // 3) wins_consec para el equipo del partido
  await upsertStreakFromEvents(
    seasonId,
    "team",
    teamId,
    "wins_consec",
    winsConsecEvents(data.matches.filter((m) => m.team_id === teamId)),
    nowIso,
  );

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/team");
  revalidatePath("/rankings");
}

async function upsertStreakFromEvents(
  seasonId: string,
  subjectType: SubjectType,
  subjectId: string,
  streakType: StreakType,
  events: { occurred_at: string; pass: boolean }[],
  nowIso: string,
): Promise<void> {
  const prev = await readCurrentRow(seasonId, subjectType, subjectId, streakType);
  const next = applyStreak(prev, events, nowIso);
  await upsertStreak(seasonId, subjectType, subjectId, streakType, next);
}

export async function recomputeAllStreaks(seasonId: string): Promise<void> {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("id")
    .eq("season_id", seasonId)
    .eq("status", "played");
  for (const m of (matches ?? []) as Array<{ id: string }>) {
    await recomputeStreaksForMatch(m.id).catch(() => undefined);
  }
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/team");
  revalidatePath("/rankings");
}
