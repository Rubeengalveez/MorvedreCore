import {
  buildAttendanceTeamReports,
  getMonthRange,
  type AttendanceHistoryRecord,
  type AttendanceReportTeam,
  type AttendanceTeamReport,
} from "@/lib/domain/attendance-history";
import { getAttendanceDayKey } from "@/lib/domain/attendance";
import { addDaysIso } from "@/lib/domain/calendar";
import { createClient } from "@/lib/supabase/server";
import { readAllRows } from "@/lib/supabase/read-all-rows";
import { buildAttendanceOccurrences } from "@/lib/domain/attendance-occurrences";

interface SessionRow {
  joint_id?: string | null;
  id: string;
  team_id: string;
  scheduled_at: string;
  player_ids?: string[] | null;
}

interface AttendanceRow {
  session_id: string;
  player_id: string;
  present: boolean;
  reason: string | null;
  marked_at: string;
  updated_at: string;
  unreviewed?: boolean;
  joint_id?: string | null;
}

function rangeIso(date: string, edge: "start" | "end"): string {
  return edge === "start" ? `${date}T00:00:00.000Z` : `${date}T23:59:59.999Z`;
}

function toHistoryRecords(
  rows: AttendanceRow[],
  sessions: SessionRow[],
  teams: AttendanceReportTeam[],
): AttendanceHistoryRecord[] {
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const teamById = new Map(teams.map((team) => [team.id, team]));
  return rows
    .map((row) => {
      const session = sessionById.get(row.session_id);
      const team = session ? teamById.get(session.team_id) : null;
      if (!session || !team) return null;
      return {
        ...row,
        scheduled_at: session.scheduled_at,
        team_id: team.id,
        team_label: team.label,
        team_color: team.color,
      };
    })
    .filter((record): record is AttendanceHistoryRecord => record !== null)
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
}

async function getSeasonTeams(seasonId: string): Promise<AttendanceReportTeam[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, label, color")
    .eq("season_id", seasonId);
  if (error) throw new Error("No pudimos cargar las categorías de la temporada.");
  return data ?? [];
}

async function getSessionsForRange(
  teamIds: string[],
  from: string,
  to: string,
  through: Date = new Date(),
): Promise<SessionRow[]> {
  if (teamIds.length === 0) return [];
  const supabase = await createClient();
  const requestedEnd = rangeIso(to, "end");
  const effectiveEnd =
    new Date(requestedEnd).getTime() < through.getTime() ? requestedEnd : through.toISOString();
  const data = await readAllRows("los entrenamientos de este periodo", (start, end) =>
    supabase
      .from("training_sessions")
      .select("id, team_id, scheduled_at, joint_id, player_ids", { count: "exact" })
      .in("team_id", teamIds)
      .eq("cancelled", false)
      .gte("scheduled_at", rangeIso(addDaysIso(from, -1), "start"))
      .lte("scheduled_at", effectiveEnd)
      .order("scheduled_at", { ascending: true })
      .order("id")
      .range(start, end),
  );
  return ((data ?? []) as SessionRow[]).filter((session) => {
    const day = getAttendanceDayKey(session.scheduled_at);
    return day >= from && day <= to;
  });
}

async function getAttendanceRows(
  sessionIds: string[],
  playerIds?: string[],
): Promise<AttendanceRow[]> {
  if (sessionIds.length === 0 || playerIds?.length === 0) return [];
  const supabase = await createClient();
  const rows: AttendanceRow[] = [];
  for (let offset = 0; offset < sessionIds.length; offset += 100) {
    const batch = await readAllRows("la asistencia registrada", (from, to) => {
      let query = supabase
        .from("training_attendance")
        .select("session_id, player_id, present, reason, marked_at, updated_at", { count: "exact" })
        .in("session_id", sessionIds.slice(offset, offset + 100));
      if (playerIds) query = query.in("player_id", playerIds);
      return query.order("session_id").order("player_id").range(from, to);
    });
    rows.push(...batch);
  }
  return rows;
}

export async function getAttendanceHistory(input: {
  seasonId: string;
  playerIds: string[];
  from: string;
  to: string;
}): Promise<AttendanceHistoryRecord[]> {
  if (input.playerIds.length === 0) return [];
  const teams = await getSeasonTeams(input.seasonId);
  const sessions = await getSessionsForRange(
    teams.map((team) => team.id),
    input.from,
    input.to,
  );
  const rows = await getAttendanceRows(
    sessions.map((session) => session.id),
    input.playerIds,
  );
  const supabase = await createClient();
  const { data: rosters, error } = await supabase
    .from("team_rosters")
    .select("team_id,player_id,joined_at,left_at")
    .in(
      "team_id",
      teams.map((team) => team.id),
    )
    .in("player_id", input.playerIds)
    .lte("joined_at", input.to)
    .or(`left_at.is.null,left_at.gte.${input.from}`);
  if (error) throw new Error("No pudimos comprobar los entrenamientos de este jugador.");
  const occurrences = buildAttendanceOccurrences({
    sessions,
    rosters: rosters ?? [],
    entries: rows,
    playerIds: input.playerIds,
  });
  return toHistoryRecords(
    occurrences.map((record) => ({
      ...record,
      reason: record.reason ?? null,
      marked_at: record.marked_at ?? "",
      updated_at: record.updated_at ?? "",
    })),
    sessions,
    teams,
  );
}

export async function getCoachAttendanceReport(input: {
  teams: AttendanceReportTeam[];
  from: string;
  to: string;
  now?: Date;
}): Promise<AttendanceTeamReport[]> {
  if (input.teams.length === 0) return [];
  const teamIds = input.teams.map((team) => team.id);
  const supabase = await createClient();
  const calendarFrom = getMonthRange(input.from.slice(0, 7)).from;
  const calendarTo = getMonthRange(input.to.slice(0, 7)).to;
  const [sessions, rosterResult] = await Promise.all([
    getSessionsForRange(teamIds, calendarFrom, calendarTo, input.now),
    supabase
      .from("team_rosters")
      .select("team_id, player_id, joined_at, left_at")
      .in("team_id", teamIds)
      .lte("joined_at", calendarTo)
      .or(`left_at.is.null,left_at.gte.${calendarFrom}`),
  ]);
  if (rosterResult.error) throw new Error("No pudimos cargar las plantillas de este periodo.");

  const playerIds = Array.from(
    new Set((rosterResult.data ?? []).map((roster) => roster.player_id)),
  );
  const [rows, profileResult] = await Promise.all([
    getAttendanceRows(sessions.map((session) => session.id)),
    playerIds.length > 0
      ? supabase.from("profiles_public").select("id, full_name, photo_url").in("id", playerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profileResult.error) throw new Error("No pudimos cargar los jugadores de este periodo.");

  const records = toHistoryRecords(rows, sessions, input.teams);
  return buildAttendanceTeamReports({
    teams: input.teams,
    sessions,
    rosters: rosterResult.data ?? [],
    players: (profileResult.data ?? [])
      .filter((p) => p.id != null)
      .map((p) => ({ id: p.id!, full_name: p.full_name ?? "Jugador", photo_url: p.photo_url })),
    records,
    from: input.from,
    to: input.to,
    now: input.now,
  });
}
