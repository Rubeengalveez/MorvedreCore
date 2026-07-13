import { randomUUID } from "node:crypto";

import { admin, loadBatch, mergeBatch, rand, randInt, resetRng, slugify } from "./base.mjs";

const PAST_SEASONS = [
  {
    label: "2023/2024",
    start: "2023-09-01",
    end: "2024-07-31",
    archivedAt: "2024-08-01T08:00:00Z",
    factor: 0.72,
  },
  {
    label: "2024/2025",
    start: "2024-09-01",
    end: "2025-07-31",
    archivedAt: "2025-08-01T08:00:00Z",
    factor: 0.88,
  },
];

const OPPONENTS = [
  "CN Valencia",
  "CN Godella",
  "CN Elche",
  "CW Castellón",
  "CN Petrer",
  "CN Turia",
];

async function main() {
  resetRng();
  console.log("[history] Generando temporadas anteriores, leyendas y enfrentamientos...\n");

  const batch = loadBatch() ?? {};
  const currentTeamIds = Object.values(batch.teamIdByLabel ?? {});
  if (currentTeamIds.length === 0) throw new Error("Faltan equipos actuales.");

  const { data: currentTeams, error: teamError } = await admin
    .from("teams")
    .select("id, label, category_code, gender, team_type, color, home_pool, notes")
    .in("id", currentTeamIds);
  if (teamError) throw teamError;
  const { data: rosters, error: rosterError } = await admin
    .from("team_rosters")
    .select("player_id, team_id")
    .in("team_id", currentTeamIds);
  if (rosterError) throw rosterError;
  const playerIds = [...new Set((rosters ?? []).map((row) => row.player_id))];
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", playerIds);
  if (profileError) throw profileError;

  const teamById = new Map((currentTeams ?? []).map((team) => [team.id, team]));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const primaryTeamByPlayer = new Map();
  for (const roster of rosters ?? []) {
    if (!primaryTeamByPlayer.has(roster.player_id))
      primaryTeamByPlayer.set(roster.player_id, teamById.get(roster.team_id));
  }

  const seasonIds = [];
  let historicalPlayerCount = 0;
  let historicalMatchupCount = 0;
  for (const seasonDef of PAST_SEASONS) {
    const { data: existing, error: existingError } = await admin
      .from("seasons")
      .select("id")
      .eq("label", seasonDef.label)
      .maybeSingle();
    if (existingError) throw existingError;
    let seasonId = existing?.id;
    if (!seasonId) {
      seasonId = randomUUID();
      const { error } = await admin.from("seasons").insert({
        id: seasonId,
        label: seasonDef.label,
        start_date: seasonDef.start,
        end_date: seasonDef.end,
        is_current: false,
        archived_at: seasonDef.archivedAt,
      });
      if (error) throw error;
    }
    seasonIds.push(seasonId);

    const archivedTeamByLabel = new Map();
    for (const currentTeam of currentTeams ?? []) {
      const id = randomUUID();
      const { error } = await admin.from("teams").insert({
        id,
        season_id: seasonId,
        category_code: currentTeam.category_code,
        label: currentTeam.label,
        gender: currentTeam.gender,
        team_type: currentTeam.team_type,
        color: currentTeam.color,
        home_pool: currentTeam.home_pool,
        notes: `Equipo archivado · ${seasonDef.label}`,
      });
      if (error) throw error;
      archivedTeamByLabel.set(currentTeam.label, id);
    }

    const playerRows = [];
    for (const playerId of playerIds) {
      const profile = profileById.get(playerId);
      const team = primaryTeamByPlayer.get(playerId);
      if (!profile || !team) continue;
      if (seasonDef.label === "2023/2024" && team.team_type === "school") continue;
      if (rand() > seasonDef.factor) continue;
      const matchesCalled = randInt(8, 18);
      const matchesPlayed = randInt(Math.max(5, matchesCalled - 5), matchesCalled);
      const trainingsTotal = randInt(55, 105);
      const trainingsAttended = randInt(Math.floor(trainingsTotal * 0.65), trainingsTotal);
      playerRows.push({
        profile_id: playerId,
        season_id: seasonId,
        profile_name: profile.full_name,
        category_code: team.category_code,
        team_label: team.label,
        matches_played: matchesPlayed,
        matches_called: matchesCalled,
        goals: randInt(0, Math.max(2, matchesPlayed * 2)),
        exclusions: randInt(0, Math.max(1, matchesPlayed)),
        trainings_attended: trainingsAttended,
        trainings_total: trainingsTotal,
        attendance_pct: Math.round((trainingsAttended / trainingsTotal) * 10000) / 100,
        mvp_count: randInt(0, Math.min(4, matchesPlayed)),
        archived_at: seasonDef.archivedAt,
      });
    }
    for (let index = 0; index < playerRows.length; index += 250) {
      const { error } = await admin
        .from("historical_player_stats")
        .insert(playerRows.slice(index, index + 250));
      if (error) throw error;
    }
    historicalPlayerCount += playerRows.length;

    const matchupRows = [];
    for (const team of (currentTeams ?? []).filter((row) => row.team_type !== "school")) {
      for (const opponent of OPPONENTS.slice(0, 4)) {
        const matchesPlayed = randInt(1, 3);
        const wins = randInt(0, matchesPlayed);
        const draws = randInt(0, matchesPlayed - wins);
        const losses = matchesPlayed - wins - draws;
        matchupRows.push({
          id: randomUUID(),
          season_id: seasonId,
          team_id: archivedTeamByLabel.get(team.label),
          team_label: team.label,
          category_code: team.category_code,
          opponent,
          opponent_key: slugify(opponent).replaceAll("-", " "),
          matches_played: matchesPlayed,
          wins,
          draws,
          losses,
          goals_for: randInt(matchesPlayed * 4, matchesPlayed * 12),
          goals_against: randInt(matchesPlayed * 4, matchesPlayed * 12),
          last_match_at: `${seasonDef.end}T12:00:00Z`,
          archived_at: seasonDef.archivedAt,
        });
      }
    }
    const { error: matchupError } = await admin
      .from("historical_team_matchups")
      .insert(matchupRows);
    if (matchupError) throw matchupError;
    historicalMatchupCount += matchupRows.length;
  }

  mergeBatch({ historicalSeasonIds: seasonIds, historicalPlayerCount, historicalMatchupCount });
  console.log(
    `[history] OK: ${seasonIds.length} temporadas, ${historicalPlayerCount} fichas y ${historicalMatchupCount} enfrentamientos.`,
  );
}

main().catch((error) => {
  console.error("[history] FATAL:", error);
  process.exit(1);
});
