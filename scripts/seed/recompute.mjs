import { admin, loadBatch, randInt, resetRng } from "./base.mjs";

async function main() {
  resetRng();
  console.log("[recompute] Generando datos materializados desde los datos sembrados...\n");

  // 1. opponent_stats
  console.log("[recompute] Generando opponent_stats...");
  const { data: matches } = await admin
    .from("matches")
    .select("season_id, team_id, opponent, scheduled_at, final_score_us, final_score_them, status")
    .eq("status", "played")
    .not("final_score_us", "is", null);
  const groups = new Map();
  for (const m of matches ?? []) {
    const key = `${m.season_id}|${m.team_id}|${m.opponent}`;
    if (!groups.has(key)) {
      groups.set(key, { season_id: m.season_id, team_id: m.team_id, opponent: m.opponent, matches_played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, last_match_at: null });
    }
    const g = groups.get(key);
    g.matches_played++;
    if (m.final_score_us > m.final_score_them) g.wins++;
    else if (m.final_score_us === m.final_score_them) g.draws++;
    else g.losses++;
    g.goals_for += m.final_score_us;
    g.goals_against += m.final_score_them;
    if (!g.last_match_at || m.scheduled_at > g.last_match_at) g.last_match_at = m.scheduled_at;
  }
  // Get category_code for each team
  const teamIds = [...new Set((matches ?? []).map((m) => m.team_id))];
  const { data: teams } = await admin.from("teams").select("id, category_code").in("id", teamIds);
  const teamCategory = new Map((teams ?? []).map((t) => [t.id, t.category_code]));
  const rows = [...groups.values()].map((g) => ({ ...g, category_code: teamCategory.get(g.team_id) ?? "unknown" }));
  // Borrar existentes y reinsertar
  await admin.from("opponent_stats").delete().neq("team_id", "00000000-0000-0000-0000-000000000000");
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await admin.from("opponent_stats").insert(chunk);
    if (error) console.error(`  ! ${error.message}`);
  }
  console.log(`[recompute] ${rows.length} opponent_stats OK`);

  // 2. ranking_snapshots
  console.log("\n[recompute] Generando ranking_snapshots para 152 jugadores...");
  const { data: players } = await admin.from("profiles").select("id, full_name, photo_url, cap_number, birth_year");
  const { data: rosters } = await admin.from("team_rosters").select("player_id, team_id, teams(id, category_code, color, label)");
  const { data: statsRows } = await admin.from("match_stats").select("player_id, goals, exclusions, mvp");
  const { data: matchesForAttendance } = await admin.from("matches").select("id, team_id");
  const { data: callups } = await admin.from("match_callups").select("player_id, match_id, status");
  const { data: sessions } = await admin.from("training_sessions").select("id, team_id, cancelled, scheduled_at");
  const { data: attendance } = await admin.from("training_attendance").select("player_id, session_id, present");

  const { data: seasons } = await admin.from("seasons").select("id").eq("is_current", true).maybeSingle();
  if (!seasons) {
    console.log("[recompute] No hay season activa.");
    return;
  }
  const seasonId = seasons.id;

  const playerRoster = new Map();
  for (const r of rosters ?? []) {
    if (!playerRoster.has(r.player_id)) playerRoster.set(r.player_id, []);
    playerRoster.get(r.player_id).push(r);
  }

  const goalsByPlayer = new Map();
  const exclByPlayer = new Map();
  const mvpByPlayer = new Map();
  for (const s of statsRows ?? []) {
    goalsByPlayer.set(s.player_id, (goalsByPlayer.get(s.player_id) ?? 0) + s.goals);
    exclByPlayer.set(s.player_id, (exclByPlayer.get(s.player_id) ?? 0) + s.exclusions);
    if (s.mvp) mvpByPlayer.set(s.player_id, (mvpByPlayer.get(s.player_id) ?? 0) + 1);
  }

  const matchTeam = new Map();
  for (const m of matchesForAttendance ?? []) matchTeam.set(m.id, m.team_id);

  const callupByPlayer = new Map();
  for (const c of callups ?? []) {
    if (!callupByPlayer.has(c.player_id)) callupByPlayer.set(c.player_id, []);
    callupByPlayer.get(c.player_id).push(c);
  }

  const sessionById = new Map();
  for (const s of sessions ?? []) sessionById.set(s.id, s);

  const attByPlayer = new Map();
  for (const a of attendance ?? []) {
    if (!attByPlayer.has(a.player_id)) attByPlayer.set(a.player_id, []);
    attByPlayer.get(a.player_id).push(a);
  }

  const snapshots = [];
  for (const p of players ?? []) {
    const myRosters = playerRoster.get(p.id) ?? [];
    if (myRosters.length === 0) continue;
    const myCallups = callupByPlayer.get(p.id) ?? [];
    const myAttendance = attByPlayer.get(p.id) ?? [];

    let matchesPlayed = 0, matchesCalled = 0;
    for (const c of myCallups) {
      matchesCalled++;
      const isPlayed = (c.status === "confirmed" || c.status === "no_show");
      if (isPlayed) matchesPlayed++;
    }

    let trainingsAttended = 0, trainingsTotal = 0;
    const mySessionIds = new Set(myCallups.map((c) => c.match_id).filter((id) => sessionById.has(id)));
    // Asistencias registradas
    for (const a of myAttendance) {
      trainingsTotal++;
      if (a.present) trainingsAttended++;
    }
    // Si no hay asistencia registrada, contamos las sesiones de los equipos del jugador
    if (trainingsTotal === 0) {
      for (const r of myRosters) {
        for (const s of sessions ?? []) {
          if (s.team_id === r.team_id && !s.cancelled) trainingsTotal++;
        }
      }
    }
    const attendancePct = trainingsTotal > 0 ? Math.round((trainingsAttended / trainingsTotal) * 10000) / 100 : 0;

    // Streak de asistencia: sesiones en orden inverso
    const sortedSessions = (sessions ?? []).filter((s) => myRosters.some((r) => r.team_id === s.team_id) && !s.cancelled).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
    const presentMap = new Map(myAttendance.map((a) => [a.session_id, a.present]));
    let attendanceStreak = 0;
    for (const s of sortedSessions) {
      if (presentMap.get(s.id) === true) attendanceStreak++;
      else break;
    }

    const baseSnapshot = {
      season_id: seasonId,
      matches_played: matchesPlayed,
      matches_called: matchesCalled,
      goals: goalsByPlayer.get(p.id) ?? 0,
      exclusions: exclByPlayer.get(p.id) ?? 0,
      mvp_count: mvpByPlayer.get(p.id) ?? 0,
      trainings_attended: trainingsAttended,
      trainings_total: trainingsTotal,
      attendance_pct: attendancePct,
      attendance_streak: attendanceStreak,
      updated_at: new Date().toISOString(),
    };

    // Season scope
    snapshots.push({
      ...baseSnapshot,
      scope: "season",
      scope_key: "all",
      player_id: p.id,
    });
    // Category scope
    const categories = new Set(myRosters.map((r) => r.teams?.category_code).filter(Boolean));
    for (const cat of categories) {
      snapshots.push({
        ...baseSnapshot,
        scope: "category",
        scope_key: cat,
        player_id: p.id,
      });
    }
    // Team scope
    for (const r of myRosters) {
      snapshots.push({
        ...baseSnapshot,
        scope: "team",
        scope_key: r.team_id,
        player_id: p.id,
      });
    }
  }

  console.log(`[recompute] ${snapshots.length} snapshots a insertar...`);
  await admin.from("ranking_snapshots").delete().neq("player_id", "00000000-0000-0000-0000-000000000000");
  for (let i = 0; i < snapshots.length; i += 200) {
    const chunk = snapshots.slice(i, i + 200);
    const { error } = await admin.from("ranking_snapshots").upsert(chunk, { onConflict: "season_id,scope,scope_key,player_id" });
    if (error) console.error(`  ! ${i / 200 + 1}: ${error.message}`);
  }
  console.log(`[recompute] ${snapshots.length} ranking_snapshots OK`);

  console.log("\n[recompute] OK! /rankings ya muestra datos reales.");
}

main().catch((err) => {
  console.error("[recompute] FATAL:", err);
  process.exit(1);
});
