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

async function ensureRoster(teamId, dorsal) {
  const { data: existing } = await admin
    .from("team_rosters")
    .select("id")
    .eq("team_id", teamId)
    .eq("player_id", RUBEN_ID)
    .is("left_at", null)
    .maybeSingle();
  if (existing) {
    const { error: updErr } = await admin
      .from("team_rosters")
      .update({ squad_number: dorsal })
      .eq("id", existing.id);
    console.log("  roster ya existe, dorsal actualizado:", updErr?.message ?? "ok");
    return;
  }
  const { error } = await admin.from("team_rosters").insert({
    team_id: teamId,
    player_id: RUBEN_ID,
    joined_at: "2026-09-01",
    squad_number: dorsal,
  });
  console.log("  roster insert:", error?.message ?? "ok");
}

async function ensureStaff(teamId, role) {
  const { data: existing } = await admin
    .from("team_staff")
    .select("id")
    .eq("team_id", teamId)
    .eq("profile_id", RUBEN_ID)
    .eq("role", role)
    .maybeSingle();
  if (existing) {
    console.log("  ya staff", role, "de", teamId);
    return;
  }
  const { error } = await admin.from("team_staff").insert({
    team_id: teamId,
    profile_id: RUBEN_ID,
    role,
  });
  console.log("  staff", role, "insert:", error?.message ?? "ok");
}

async function ensureCoachRole(teamId) {
  const { data: existing } = await admin
    .from("user_roles")
    .select("id")
    .eq("profile_id", RUBEN_ID)
    .eq("role", "coach")
    .eq("scope_team_id", teamId)
    .maybeSingle();
  if (existing) {
    console.log("  ya role coach de", teamId);
    return;
  }
  const { error } = await admin.from("user_roles").insert({
    profile_id: RUBEN_ID,
    role: "coach",
    scope_team_id: teamId,
  });
  console.log("  role coach insert:", error?.message ?? "ok");
}

async function ensureMatchAndStats(teamId, opp, daysAgo, status, scoreUs, scoreThem, goals, excl, mvp) {
  const { data: existing } = await admin
    .from("matches")
    .select("id, mvp_player_id")
    .eq("team_id", teamId)
    .eq("opponent", opp)
    .eq("scheduled_at", new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 19))
    .maybeSingle();
  let matchId;
  if (existing) {
    matchId = existing.id;
    console.log("  match ya existe:", opp);
    if (existing.mvp_player_id !== (mvp ? RUBEN_ID : null)) {
      await admin.from("matches").update({ mvp_player_id: mvp ? RUBEN_ID : null }).eq("id", matchId);
    }
  } else {
    const date = new Date(Date.now() - daysAgo * 86400000);
    date.setHours(18, 0, 0, 0);
    const { data: created, error } = await admin.from("matches").insert({
      season_id: SEASON_ID,
      team_id: teamId,
      opponent: opp,
      competition_type: "league",
      is_home: daysAgo % 2 === 0,
      location: "Piscina Municipal de Sagunto",
      pool_name: "Piscina Municipal",
      scheduled_at: date.toISOString(),
      status,
      final_score_us: scoreUs,
      final_score_them: scoreThem,
      mvp_player_id: mvp ? RUBEN_ID : null,
      logistics_enabled: false,
    }).select("id").single();
    if (error) {
      console.log("  match insert err:", error.message);
      return;
    }
    matchId = created.id;
    console.log("  match creado:", opp);
  }
  const { error: cuErr } = await admin.from("match_callups").upsert({
    match_id: matchId,
    player_id: RUBEN_ID,
    cap_number: 9,
    status: "confirmed",
    source_team_id: teamId,
  }, { onConflict: "match_id,player_id" });
  if (cuErr) console.log("  callup err:", cuErr.message);

  const { error: stErr } = await admin.from("match_stats").upsert({
    match_id: matchId,
    player_id: RUBEN_ID,
    goals,
    exclusions: excl,
    mvp,
    entered_by: RUBEN_ID,
    entered_at: new Date().toISOString(),
    validated_by: RUBEN_ID,
    validated_at: new Date().toISOString(),
  }, { onConflict: "match_id,player_id" });
  if (stErr) console.log("  stat err:", stErr.message);
  else console.log("  stats:", goals, "g,", excl, "e, mvp=" + mvp);
}

async function ensureTraining(teamId, daysAgo) {
  const date = new Date(Date.now() - daysAgo * 86400000);
  date.setHours(18, 30, 0, 0);
  if (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }
  const dateIso = date.toISOString();
  const { data: existing } = await admin
    .from("training_sessions")
    .select("id, end_at")
    .eq("team_id", teamId)
    .eq("scheduled_at", dateIso)
    .maybeSingle();
  let sessionId;
  if (existing) {
    sessionId = existing.id;
  } else {
    const { data: created, error } = await admin.from("training_sessions").insert({
      team_id: teamId,
      scheduled_at: dateIso,
      end_at: new Date(date.getTime() + 90 * 60000).toISOString(),
      duration_minutes: 90,
      location: "Piscina Municipal de Sagunto",
    }).select("id").single();
    if (error) {
      console.log("  training err:", error.message);
      return;
    }
    sessionId = created.id;
  }
  const { error: aErr } = await admin.from("training_attendance").upsert({
    session_id: sessionId,
    player_id: RUBEN_ID,
    present: true,
    marked_at: new Date().toISOString(),
    marked_by: RUBEN_ID,
  }, { onConflict: "session_id,player_id" });
  if (aErr) console.log("  attendance err:", aErr.message);
  else console.log("  training OK en", teamId);
}

console.log("=== 1. Roster Cadete B + Juvenil ===");
await ensureRoster(CADETE_B_ID, 9);
await ensureRoster(JUVENIL_ID, 7);

console.log("=== 2. Staff Cadete B + Juvenil ===");
await ensureStaff(CADETE_B_ID, "head_coach");
await ensureStaff(JUVENIL_ID, "head_coach");

console.log("=== 3. Roles de coach ===");
await ensureCoachRole(CADETE_B_ID);
await ensureCoachRole(JUVENIL_ID);

console.log("=== 4. Partidos Cadete B con stats de Rubén ===");
await ensureMatchAndStats(CADETE_B_ID, "CE Mediterrani B", 7, "played", 12, 8, 3, 0, true);
await ensureMatchAndStats(CADETE_B_ID, "CN Valencia", 14, "played", 10, 9, 2, 1, false);
await ensureMatchAndStats(CADETE_B_ID, "CN Godella", 21, "played", 8, 11, 1, 0, false);
await ensureMatchAndStats(CADETE_B_ID, "CW Castellon", 3, "scheduled", null, null, 0, 0, false);

console.log("=== 5. Partidos Juvenil con stats de Rubén ===");
await ensureMatchAndStats(JUVENIL_ID, "CN Sabadell", 5, "played", 11, 7, 2, 1, true);
await ensureMatchAndStats(JUVENIL_ID, "CN Barcelona", 12, "played", 9, 8, 1, 0, false);
await ensureMatchAndStats(JUVENIL_ID, "CN Sant Andreu", 19, "played", 14, 6, 4, 0, true);

console.log("=== 6. Entrenamientos Cadete B (últimos 6) ===");
for (const d of [1, 3, 5, 7, 9, 11]) {
  await ensureTraining(CADETE_B_ID, d);
}

console.log("=== 7. Entrenamientos Juvenil (últimos 5) ===");
for (const d of [2, 4, 6, 8, 10]) {
  await ensureTraining(JUVENIL_ID, d);
}

console.log("=== 8. Refrescar snapshots y rachas ===");
const { data: matchRows } = await admin
  .from("matches")
  .select("id, status, final_score_us, final_score_them, mvp_player_id, scheduled_at, team_id, season_id")
  .eq("season_id", SEASON_ID)
  .eq("status", "played");

const { data: matchStats } = await admin
  .from("match_stats")
  .select("match_id, player_id, goals, exclusions, mvp, matches!match_stats_match_id_fkey(season_id, status, scheduled_at, team_id)")
  .eq("matches.season_id", SEASON_ID)
  .eq("matches.status", "played");

const { data: teamSnapshots } = await admin
  .from("ranking_snapshots")
  .select("player_id, goals, exclusions, mvp_count, matches_played, trainings_attended, trainings_total, attendance_pct, attendance_streak")
  .eq("season_id", SEASON_ID)
  .in("player_id", [RUBEN_ID]);

console.log("  snapshots de Rubén:", teamSnapshots);

console.log("=== DONE ===");
process.exit(0);
