import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const RUBEN_ID = "b998a15b-aa0b-4d37-af7d-bc32aef751a3";
const SEASON_ID = "9e8945bd-fe73-40d8-8ac5-59e39f359843";
const CADETE_B_ID = "be166b79-04d6-4d9f-a78e-6b6114d1941e";
const JUVENIL_ID = "0cedfac9-0b4f-40da-8c41-9c7366bf56e2";
const ABSOLUTO_ID = "60057030-3602-4af5-a000-a98d371f58a6";

console.log("=== Refrescando snapshots de Rubén ===");

const { data: matchStats } = await admin
  .from("match_stats")
  .select("match_id, player_id, goals, exclusions, mvp")
  .eq("player_id", RUBEN_ID);

const matchIds = (matchStats ?? []).map((s) => s.match_id).filter(Boolean);
const { data: matches } = matchIds.length
  ? await admin
      .from("matches")
      .select("id, season_id, status, scheduled_at, team_id")
      .in("id", matchIds)
  : { data: [] };
const matchMap = new Map((matches ?? []).map((m) => [m.id, m]));

const validStats = (matchStats ?? []).filter((s) => {
  const m = matchMap.get(s.match_id);
  return m?.status === "played" && m?.season_id === SEASON_ID;
});

const totalMatches = validStats.length;
const totalGoals = validStats.reduce((sum, s) => sum + (s.goals ?? 0), 0);
const totalExcl = validStats.reduce((sum, s) => sum + (s.exclusions ?? 0), 0);
const totalMvp = validStats.filter((s) => s.mvp).length;
console.log("  matches_played:", totalMatches, "goals:", totalGoals, "excl:", totalExcl, "mvp:", totalMvp);

const { data: att } = await admin
  .from("training_attendance")
  .select("present, session_id")
  .eq("player_id", RUBEN_ID);

const sessionIds = (att ?? []).map((a) => a.session_id).filter(Boolean);
const { data: sessions } = sessionIds.length
  ? await admin
      .from("training_sessions")
      .select("id, scheduled_at, cancelled, team_id")
      .in("id", sessionIds)
  : { data: [] };
const sessionMap = new Map((sessions ?? []).map((s) => [s.id, s]));

const teamSessions = (att ?? [])
  .map((a) => {
    const s = sessionMap.get(a.session_id);
    return { team_id: s?.team_id, cancelled: s?.cancelled, scheduled_at: s?.scheduled_at, present: a.present };
  })
  .filter((s) => s.scheduled_at && !s.cancelled);

const totalTrainings = teamSessions.length;
const attendedTrainings = teamSessions.filter((s) => s.present).length;
const attendancePct = totalTrainings > 0 ? Math.round((attendedTrainings / totalTrainings) * 10000) / 100 : 0;

const orderedForStreak = teamSessions
  .slice()
  .sort((a, b) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? ""));
let streak = 0;
for (const s of orderedForStreak) {
  if (s.present) streak++;
  else break;
}
console.log("  trainings_total:", totalTrainings, "attended:", attendedTrainings, "pct:", attendancePct, "streak:", streak);

const snapshots = [
  { season_id: SEASON_ID, scope: "season", scope_key: "all", player_id: RUBEN_ID, matches_played: totalMatches, matches_called: totalMatches, goals: totalGoals, exclusions: totalExcl, mvp_count: totalMvp, trainings_attended: attendedTrainings, trainings_total: totalTrainings, attendance_pct: attendancePct, attendance_streak: streak },
  { season_id: SEASON_ID, scope: "category", scope_key: "cadete", player_id: RUBEN_ID, matches_played: totalMatches, matches_called: totalMatches, goals: totalGoals, exclusions: totalExcl, mvp_count: totalMvp, trainings_attended: attendedTrainings, trainings_total: totalTrainings, attendance_pct: attendancePct, attendance_streak: streak },
  { season_id: SEASON_ID, scope: "category", scope_key: "juvenil", player_id: RUBEN_ID, matches_played: totalMatches, matches_called: totalMatches, goals: totalGoals, exclusions: totalExcl, mvp_count: totalMvp, trainings_attended: attendedTrainings, trainings_total: totalTrainings, attendance_pct: attendancePct, attendance_streak: streak },
  { season_id: SEASON_ID, scope: "team", scope_key: CADETE_B_ID, player_id: RUBEN_ID, matches_played: totalMatches, matches_called: totalMatches, goals: totalGoals, exclusions: totalExcl, mvp_count: totalMvp, trainings_attended: attendedTrainings, trainings_total: totalTrainings, attendance_pct: attendancePct, attendance_streak: streak },
  { season_id: SEASON_ID, scope: "team", scope_key: JUVENIL_ID, player_id: RUBEN_ID, matches_played: totalMatches, matches_called: totalMatches, goals: totalGoals, exclusions: totalExcl, mvp_count: totalMvp, trainings_attended: attendedTrainings, trainings_total: totalTrainings, attendance_pct: attendancePct, attendance_streak: streak },
  { season_id: SEASON_ID, scope: "team", scope_key: ABSOLUTO_ID, player_id: RUBEN_ID, matches_played: totalMatches, matches_called: totalMatches, goals: totalGoals, exclusions: totalExcl, mvp_count: totalMvp, trainings_attended: attendedTrainings, trainings_total: totalTrainings, attendance_pct: attendancePct, attendance_streak: streak },
];

const { error } = await admin.from("ranking_snapshots").upsert(snapshots, { onConflict: "season_id,scope,scope_key,player_id" });
console.log("  snapshots upsert:", error?.message ?? "ok");

const { data: streakRows } = await admin
  .from("streaks")
  .select("*")
  .eq("season_id", SEASON_ID)
  .eq("subject_type", "player")
  .eq("subject_id", RUBEN_ID);

console.log("  rachas actuales:", streakRows);

console.log("=== DONE ===");
process.exit(0);
