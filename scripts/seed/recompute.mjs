import { admin, fetchAll, loadBatch, resetRng } from "./base.mjs";

function computeStreak(events) {
  let current = 0;
  let best = 0;
  let bestAt = null;
  let lastEventAt = null;
  for (const event of [...events].sort((a, b) => a.at.localeCompare(b.at))) {
    current = event.pass ? current + 1 : 0;
    lastEventAt = event.at;
    if (current > best) {
      best = current;
      bestAt = event.at;
    }
  }
  return { current_value: current, best_value: best, best_at: bestAt, last_event_at: lastEventAt };
}

async function insertChunks(table, rows, size = 250) {
  for (let index = 0; index < rows.length; index += size) {
    const { error } = await admin.from(table).insert(rows.slice(index, index + size));
    if (error) throw error;
  }
}

async function main() {
  resetRng();
  console.log("[recompute] Reconstruyendo estadísticas, rankings, MVP y rachas...\n");

  const batch = loadBatch() ?? {};
  const teamIds = Object.values(batch.teamIdByLabel ?? {});
  const { data: season, error: seasonError } = await admin
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();
  if (seasonError) throw seasonError;

  const [profiles, rosters, stats, matches, callups, sessions, attendance, teams] =
    await Promise.all([
      fetchAll(() =>
        admin.from("profiles").select("id, full_name, photo_url, cap_number, birth_year"),
      ),
      fetchAll(() =>
        admin.from("team_rosters").select("player_id, team_id, left_at").in("team_id", teamIds),
      ),
      fetchAll(() =>
        admin.from("match_stats").select("match_id, player_id, goals, exclusions, mvp"),
      ),
      fetchAll(() =>
        admin
          .from("matches")
          .select(
            "id, season_id, team_id, opponent, scheduled_at, status, final_score_us, final_score_them, mvp_player_id",
          )
          .eq("season_id", season.id),
      ),
      fetchAll(() => admin.from("match_callups").select("player_id, match_id, status")),
      fetchAll(() =>
        admin
          .from("training_sessions")
          .select("id, team_id, cancelled, scheduled_at")
          .in("team_id", teamIds),
      ),
      fetchAll(() => admin.from("training_attendance").select("player_id, session_id, present")),
      fetchAll(() => admin.from("teams").select("id, category_code, label").in("id", teamIds)),
    ]);

  const matchById = new Map(matches.map((match) => [match.id, match]));
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const statsByPlayer = new Map();
  const statsByMatch = new Map();
  for (const stat of stats) {
    if (!matchById.has(stat.match_id)) continue;
    if (!statsByPlayer.has(stat.player_id)) statsByPlayer.set(stat.player_id, []);
    if (!statsByMatch.has(stat.match_id)) statsByMatch.set(stat.match_id, []);
    statsByPlayer.get(stat.player_id).push(stat);
    statsByMatch.get(stat.match_id).push(stat);
  }

  for (const match of matches.filter((row) => row.status === "played")) {
    const mvp = (statsByMatch.get(match.id) ?? []).find((stat) => stat.mvp)?.player_id ?? null;
    if (match.mvp_player_id !== mvp) {
      const { error } = await admin
        .from("matches")
        .update({ mvp_player_id: mvp })
        .eq("id", match.id);
      if (error) throw error;
      match.mvp_player_id = mvp;
    }
  }

  const opponentGroups = new Map();
  for (const match of matches.filter(
    (row) => row.status === "played" && row.final_score_us != null && row.final_score_them != null,
  )) {
    const key = `${match.team_id}|${match.opponent.trim().toLowerCase()}`;
    const group = opponentGroups.get(key) ?? {
      season_id: season.id,
      team_id: match.team_id,
      opponent: match.opponent.trim(),
      category_code: teamById.get(match.team_id)?.category_code ?? "absoluto",
      matches_played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      last_match_at: null,
    };
    group.matches_played++;
    if (match.final_score_us > match.final_score_them) group.wins++;
    else if (match.final_score_us === match.final_score_them) group.draws++;
    else group.losses++;
    group.goals_for += match.final_score_us;
    group.goals_against += match.final_score_them;
    if (!group.last_match_at || match.scheduled_at > group.last_match_at)
      group.last_match_at = match.scheduled_at;
    opponentGroups.set(key, group);
  }
  const { error: opponentDeleteError } = await admin
    .from("opponent_stats")
    .delete()
    .neq("team_id", "00000000-0000-0000-0000-000000000000");
  if (opponentDeleteError) throw opponentDeleteError;
  await insertChunks("opponent_stats", [...opponentGroups.values()]);

  const rostersByPlayer = new Map();
  for (const roster of rosters) {
    if (!rostersByPlayer.has(roster.player_id)) rostersByPlayer.set(roster.player_id, []);
    rostersByPlayer.get(roster.player_id).push(roster);
  }
  const callupsByPlayer = new Map();
  for (const callup of callups) {
    if (!matchById.has(callup.match_id)) continue;
    if (!callupsByPlayer.has(callup.player_id)) callupsByPlayer.set(callup.player_id, []);
    callupsByPlayer.get(callup.player_id).push(callup);
  }
  const attendanceByPlayer = new Map();
  for (const row of attendance) {
    if (!attendanceByPlayer.has(row.player_id)) attendanceByPlayer.set(row.player_id, []);
    attendanceByPlayer.get(row.player_id).push(row);
  }
  const snapshots = [];
  for (const profile of profiles) {
    const playerRosters = rostersByPlayer.get(profile.id) ?? [];
    if (playerRosters.length === 0) continue;
    const playerStats = statsByPlayer.get(profile.id) ?? [];
    const playerCallups = callupsByPlayer.get(profile.id) ?? [];
    const teamIdSet = new Set(playerRosters.map((roster) => roster.team_id));
    const eligibleSessions = sessions
      .filter(
        (session) =>
          teamIdSet.has(session.team_id) &&
          !session.cancelled &&
          session.scheduled_at <= new Date().toISOString(),
      )
      .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
    const eligibleSessionIds = new Set(eligibleSessions.map((session) => session.id));
    const playerAttendance = (attendanceByPlayer.get(profile.id) ?? []).filter((row) =>
      eligibleSessionIds.has(row.session_id),
    );
    const trainingsAttended = playerAttendance.filter((row) => row.present).length;
    const trainingsTotal = eligibleSessions.length;
    const attendancePct = trainingsTotal
      ? Math.round((trainingsAttended / trainingsTotal) * 10000) / 100
      : 0;
    const presentBySession = new Map(playerAttendance.map((row) => [row.session_id, row.present]));
    let attendanceStreak = 0;
    for (const session of eligibleSessions) {
      if (presentBySession.get(session.id) !== true) break;
      attendanceStreak++;
    }
    const base = {
      season_id: season.id,
      matches_played: playerStats.length,
      matches_called: playerCallups.length,
      goals: playerStats.reduce((sum, stat) => sum + stat.goals, 0),
      exclusions: playerStats.reduce((sum, stat) => sum + stat.exclusions, 0),
      mvp_count: playerStats.filter((stat) => stat.mvp).length,
      trainings_attended: trainingsAttended,
      trainings_total: trainingsTotal,
      attendance_pct: attendancePct,
      attendance_streak: attendanceStreak,
      updated_at: new Date().toISOString(),
    };
    snapshots.push({ ...base, scope: "season", scope_key: "all", player_id: profile.id });
    for (const category of new Set(
      playerRosters.map((roster) => teamById.get(roster.team_id)?.category_code).filter(Boolean),
    )) {
      snapshots.push({ ...base, scope: "category", scope_key: category, player_id: profile.id });
    }
    for (const roster of playerRosters) {
      snapshots.push({ ...base, scope: "team", scope_key: roster.team_id, player_id: profile.id });
    }
  }
  const { error: rankingDeleteError } = await admin
    .from("ranking_snapshots")
    .delete()
    .neq("player_id", "00000000-0000-0000-0000-000000000000");
  if (rankingDeleteError) throw rankingDeleteError;
  await insertChunks("ranking_snapshots", snapshots);

  const nowIso = new Date().toISOString();
  const streakRows = [];
  for (const [playerId, playerRosters] of rostersByPlayer) {
    const playerStats = statsByPlayer.get(playerId) ?? [];
    const matchEvents = playerStats
      .map((stat) => ({ ...stat, match: matchById.get(stat.match_id) }))
      .filter((row) => row.match?.status === "played");
    const attendanceMap = new Map(
      (attendanceByPlayer.get(playerId) ?? []).map((row) => [row.session_id, row.present]),
    );
    const playerTeamIds = new Set(playerRosters.map((roster) => roster.team_id));
    const trainingEvents = sessions
      .filter(
        (session) =>
          playerTeamIds.has(session.team_id) &&
          !session.cancelled &&
          session.scheduled_at <= nowIso,
      )
      .map((session) => ({
        at: session.scheduled_at,
        pass: attendanceMap.get(session.id) === true,
      }));
    const definitions = [
      [
        "goals_consec",
        matchEvents.map((row) => ({ at: row.match.scheduled_at, pass: row.goals > 0 })),
      ],
      [
        "excl_consec",
        matchEvents.map((row) => ({ at: row.match.scheduled_at, pass: row.exclusions > 0 })),
      ],
      ["mvp_consec", matchEvents.map((row) => ({ at: row.match.scheduled_at, pass: row.mvp }))],
      ["train_consec", trainingEvents],
    ];
    for (const [streakType, events] of definitions) {
      streakRows.push({
        season_id: season.id,
        subject_type: "player",
        subject_id: playerId,
        streak_type: streakType,
        ...computeStreak(events),
        updated_at: nowIso,
      });
    }
  }
  for (const teamId of teamIds) {
    const events = matches
      .filter(
        (match) =>
          match.team_id === teamId &&
          match.status === "played" &&
          match.final_score_us != null &&
          match.final_score_them != null,
      )
      .map((match) => ({
        at: match.scheduled_at,
        pass: match.final_score_us > match.final_score_them,
      }));
    streakRows.push({
      season_id: season.id,
      subject_type: "team",
      subject_id: teamId,
      streak_type: "wins_consec",
      ...computeStreak(events),
      updated_at: nowIso,
    });
  }
  const { error: streakDeleteError } = await admin
    .from("streaks")
    .delete()
    .neq("subject_id", "00000000-0000-0000-0000-000000000000");
  if (streakDeleteError) throw streakDeleteError;
  await insertChunks("streaks", streakRows);

  console.log(
    `[recompute] OK: ${opponentGroups.size} rivales, ${snapshots.length} rankings y ${streakRows.length} rachas.`,
  );
}

main().catch((error) => {
  console.error("[recompute] FATAL:", error);
  process.exit(1);
});
