import { createClient } from "@/lib/supabase/server";
import { getTrainingSessionsInRange } from "./training-sessions";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import { getTeamScope } from "@/lib/domain/permissions";
import {
  trainingDay,
  trainingDateTime,
  shiftTrainingDate,
  type TrainingPlayer,
  type TrainingTeam,
  type ManagedTrainingBlock,
} from "@/lib/domain/training-management";

export async function getAdminTrainings(query: { from?: string; team?: string }) {
  const access = await getRenderAdminAccess();
  const scope = getTeamScope(access, "trainings");
  const client = await createClient();
  const { data: season, error: seasonError } = await client
    .from("seasons")
    .select("id,start_date,end_date")
    .eq("is_current", true)
    .maybeSingle();
  if (seasonError) throw new Error("No pudimos cargar la temporada.");
  if (!season) return null;
  const { data: teamRows, error: teamsError } = await client
    .from("teams")
    .select("id,label,color,home_pool,category_code")
    .eq("season_id", season.id)
    .order("category_code");
  if (teamsError) throw new Error("No pudimos cargar los equipos.");
  const categoryOrder = [
    "benjamin",
    "alevin",
    "infantil",
    "cadete",
    "juvenil",
    "absoluto",
    "escuela",
  ];
  const teams = [...(teamRows ?? [])].sort(
    (a, b) =>
      categoryOrder.indexOf(a.category_code) - categoryOrder.indexOf(b.category_code) ||
      a.label.localeCompare(b.label, "es"),
  ) as TrainingTeam[];
  const canManageAttendance = teams.some((team) => access.coachTeamIds.has(team.id));
  const managedTeamIds = teams
    .filter((team) => scope === null || scope.includes(team.id))
    .map((team) => team.id);
  const today = trainingDay(new Date());
  const from =
    query.from &&
    /^\d{4}-\d{2}-\d{2}$/.test(query.from) &&
    !Number.isNaN(Date.parse(query.from)) &&
    new Date(query.from).toISOString().slice(0, 10) === query.from
      ? query.from
      : today;
  const to = shiftTrainingDate(from, 27);
  if (!managedTeamIds.length)
    return {
      teams,
      managedTeamIds,
      canManageAttendance,
      players: [],
      blocks: [],
      sessions: [],
      from,
      to,
      seasonEnd: season.end_date,
    };
  const [blocksResult, sessionsResult, rosterResult] = await Promise.all([
    client
      .from("training_blocks")
      .select("*")
      .in(
        "team_id",
        teams.map((team) => team.id),
      )
      .eq("is_active", true)
      .order("created_at"),
    getTrainingSessionsInRange(
      client,
      managedTeamIds,
      trainingDateTime(from, "00:00"),
      trainingDateTime(shiftTrainingDate(to, 1), "00:00"),
    ),
    client
      .from("team_rosters")
      .select("team_id,player_id,profiles!team_rosters_player_id_fkey(id,full_name,is_active)")
      .in("team_id", managedTeamIds)
      .is("left_at", null),
  ]);
  if (blocksResult.error || rosterResult.error)
    throw new Error("No pudimos cargar los entrenamientos. Vuelve a intentarlo.");
  const players = new Map<string, TrainingPlayer>();
  for (const row of rosterResult.data ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile?.is_active) continue;
    const player: TrainingPlayer = players.get(profile.id) ?? {
      id: profile.id,
      full_name: profile.full_name,
      team_ids: [],
    };
    player.team_ids.push(row.team_id);
    players.set(profile.id, player);
  }
  const rows = blocksResult.data as ManagedTrainingBlock[];
  const visibleSeries = new Set(
    rows
      .filter((row) => managedTeamIds.includes(row.team_id))
      .map((row) => row.series_id ?? row.id),
  );
  return {
    teams,
    managedTeamIds,
    canManageAttendance,
    players: [...players.values()].sort((a, b) => a.full_name.localeCompare(b.full_name, "es")),
    blocks: rows.filter((row) => visibleSeries.has(row.series_id ?? row.id)),
    sessions: sessionsResult,
    from,
    to,
    seasonEnd: season.end_date,
  };
}
