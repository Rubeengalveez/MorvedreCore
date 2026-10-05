import { createClient } from "@/lib/supabase/server";

export interface DashboardWeekEvent {
  maps_url?: string | null;
  opponent?: string;
  is_home?: boolean;
  player_ids?: string[] | null;
  team_player_ids?: Record<string, string[] | null>;
  training_kind?: string;
  location?: string | null;
  team_ids?: string[];
  joint_id?: string | null;
  id: string;
  team_id: string;
  kind: "training" | "match";
  date: string;
  scheduled_at: string;
  duration_minutes?: number;
  title: string;
  team_label: string;
  team_color: string;
  cancelled: boolean;
  status: string;
  is_today: boolean;
  is_tomorrow: boolean;
}

export interface DashboardStaffTeam {
  id: string;
  label: string;
  color: string;
  staff_role: string;
}

export interface DashboardAudience {
  player_team_ids: string[];
  staff_teams: DashboardStaffTeam[];
  coach_team_ids: string[];
  can_manage_attendance: boolean;
  roles: string[];
}

export interface DashboardAttendancePlayer {
  id: string;
  full_name: string;
  attendance: boolean | null;
  reason: string | null;
}

export interface DashboardCoachSession {
  id: string;
  team_id: string;
  team_label: string;
  team_color: string;
  scheduled_at: string;
  end_at: string | null;
  location: string | null;
  kind?: string;
  is_past: boolean;
  present_count: number;
  absent_count: number;
  unmarked_count: number;
  roster_count: number;
  players: DashboardAttendancePlayer[];
}

function joinedOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getDashboardAudience(
  profileId: string,
  seasonId: string,
): Promise<DashboardAudience> {
  const supabase = await createClient();
  const [rosterRes, staffRes, rolesRes] = await Promise.all([
    supabase
      .from("team_rosters")
      .select("team_id, teams!team_rosters_team_id_fkey(season_id)")
      .eq("player_id", profileId)
      .is("left_at", null),
    supabase
      .from("team_staff")
      .select("role, teams!team_staff_team_id_fkey(id, label, color, season_id)")
      .eq("profile_id", profileId),
    supabase.from("user_roles").select("role, scope_team_id").eq("profile_id", profileId),
  ]);
  if (rosterRes.error || staffRes.error || rolesRes.error)
    throw new Error("No pudimos cargar tu actividad del club.");

  const playerTeamIds: string[] = [];
  for (const row of rosterRes.data ?? []) {
    const team = joinedOne(row.teams) as { season_id?: string } | null;
    if (team?.season_id === seasonId) playerTeamIds.push(row.team_id);
  }

  const staffTeams: DashboardStaffTeam[] = [];
  for (const row of staffRes.data ?? []) {
    const team = joinedOne(row.teams) as {
      id?: string;
      label?: string;
      color?: string;
      season_id?: string;
    } | null;
    if (!team?.id || team.season_id !== seasonId) continue;
    staffTeams.push({
      id: team.id,
      label: team.label ?? "Equipo",
      color: team.color ?? "#1E5AA8",
      staff_role: row.role,
    });
  }

  const coachTeamIds = Array.from(
    new Set(
      (rolesRes.data ?? [])
        .filter((row) => row.role === "coach" && row.scope_team_id != null)
        .map((row) => row.scope_team_id as string),
    ),
  );
  const currentCoachTeamIds = new Set(
    staffTeams
      .filter((team) => team.staff_role === "head_coach" || team.staff_role === "assistant_coach")
      .map((team) => team.id),
  );

  return {
    player_team_ids: Array.from(new Set(playerTeamIds)),
    staff_teams: staffTeams,
    coach_team_ids: coachTeamIds,
    can_manage_attendance: coachTeamIds.some((teamId) => currentCoachTeamIds.has(teamId)),
    roles: Array.from(new Set((rolesRes.data ?? []).map((row) => row.role))),
  };
}

export async function hasCurrentAttendancePermission(
  profileId: string,
  seasonId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const [{ data }, { data: coachRoles }] = await Promise.all([
    supabase
      .from("team_staff")
      .select("team_id, role, teams!team_staff_team_id_fkey(season_id)")
      .eq("profile_id", profileId)
      .in("role", ["head_coach", "assistant_coach"]),
    supabase
      .from("user_roles")
      .select("scope_team_id")
      .eq("profile_id", profileId)
      .eq("role", "coach"),
  ]);

  const coachTeamIds = new Set((coachRoles ?? []).map((role) => role.scope_team_id));
  return (data ?? []).some((row) => {
    const team = joinedOne(row.teams) as { season_id?: string } | null;
    return team?.season_id === seasonId && coachTeamIds.has(row.team_id);
  });
}

export async function getAttendanceTeams(seasonId: string): Promise<DashboardStaffTeam[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, label, color")
    .eq("season_id", seasonId)
    .order("label", { ascending: true });
  if (error) throw new Error("No pudimos cargar los equipos. Inténtalo de nuevo.");

  return (data ?? []).map((team) => ({
    id: team.id,
    label: team.label,
    color: team.color,
    staff_role: "attendance_manager",
  }));
}

export async function getUpcomingDashboardEvents(
  teamIds: string[],
  now: Date = new Date(),
  limit = 8,
  viewer?: { profileIds: string[]; staffTeamIds: string[] },
): Promise<DashboardWeekEvent[]> {
  if (teamIds.length === 0) return [];
  const supabase = await createClient();
  const from = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString();
  const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  let trainingQuery = supabase
    .from("training_sessions")
    .select(
      "id, team_id, joint_id, player_ids, kind, label, location, maps_url, scheduled_at, duration_minutes, cancelled, teams!training_sessions_team_id_fkey(label, color)",
    )
    .in("team_id", teamIds)
    .eq("cancelled", false)
    .gt("end_at", now.toISOString())
    .gte("scheduled_at", from)
    .lte("scheduled_at", until)
    .order("scheduled_at", { ascending: true })
    .limit(Math.min(1000, limit * teamIds.length));

  if (viewer) {
    const audience = [
      "player_ids.is.null",
      ...(viewer.profileIds.length ? [`player_ids.ov.{${viewer.profileIds.join(",")}}`] : []),
      ...(viewer.staffTeamIds.length ? [`team_id.in.(${viewer.staffTeamIds.join(",")})`] : []),
    ];
    trainingQuery = trainingQuery.or(audience.join(","));
  }
  const [trainingsRes, matchesRes] = await Promise.all([
    trainingQuery,
    supabase
      .from("matches")
      .select(
        "id, team_id, opponent, is_home, pool_name, location, maps_url, scheduled_at, status, teams!matches_team_id_fkey(label, color)",
      )
      .in("team_id", teamIds)
      .in("status", ["scheduled", "in_progress"])
      .or(`status.eq.in_progress,and(scheduled_at.gte.${from},scheduled_at.lte.${until})`)
      .order("scheduled_at", { ascending: true })
      .limit(limit),
  ]);
  if (trainingsRes.error || matchesRes.error) throw new Error("No pudimos cargar la agenda.");

  const today = getClubDayKey(now);
  const tomorrowDate = new Date(`${today}T12:00:00Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = getClubDayKey(tomorrowDate);
  const events: DashboardWeekEvent[] = [];

  for (const row of trainingsRes.data ?? []) {
    if (new Date(row.scheduled_at).getTime() + row.duration_minutes * 60000 <= now.getTime())
      continue;
    if (
      row.player_ids &&
      viewer &&
      !viewer.staffTeamIds.includes(row.team_id) &&
      !viewer.profileIds.some((id) => row.player_ids?.includes(id))
    )
      continue;
    const joint = row.joint_id
      ? events.find(
          (e) =>
            e.joint_id === row.joint_id &&
            e.scheduled_at === row.scheduled_at &&
            e.duration_minutes === row.duration_minutes &&
            e.training_kind === row.kind &&
            e.location === row.location,
        )
      : null;
    if (joint) {
      joint.team_ids?.push(row.team_id);
      if (joint.team_player_ids) joint.team_player_ids[row.team_id] = row.player_ids;
      joint.team_label += ` · ${joinedOne(row.teams)?.label ?? "Equipo"}`;
      joint.player_ids =
        joint.player_ids === null || row.player_ids === null
          ? null
          : [...new Set([...(joint.player_ids ?? []), ...row.player_ids])];
      continue;
    }
    const team = joinedOne(row.teams) as { label?: string; color?: string } | null;
    const date = getClubDayKey(new Date(row.scheduled_at));
    events.push({
      id: row.id,
      team_id: row.team_id,
      team_ids: [row.team_id],
      player_ids: row.player_ids,
      team_player_ids: { [row.team_id]: row.player_ids },
      training_kind: row.kind,
      location: row.location,
      maps_url: row.maps_url,
      joint_id: row.joint_id,
      kind: "training",
      date,
      scheduled_at: row.scheduled_at,
      duration_minutes: row.duration_minutes,
      title:
        row.label ||
        (
          { meeting: "Reunión", dry: "Físico/seco", physical: "Físico/seco" } as Record<
            string,
            string
          >
        )[row.kind] ||
        "Agua",
      team_label: team?.label ?? "Equipo",
      team_color: team?.color ?? "#1E5AA8",
      cancelled: false,
      status: "scheduled",
      is_today: date === today,
      is_tomorrow: date === tomorrow,
    });
  }

  for (const row of matchesRes.data ?? []) {
    const team = joinedOne(row.teams) as { label?: string; color?: string } | null;
    const date = getClubDayKey(new Date(row.scheduled_at));
    if (
      row.status !== "in_progress" &&
      new Date(row.scheduled_at).getTime() + 120 * 60000 <= now.getTime()
    )
      continue;
    events.push({
      id: row.id,
      team_id: row.team_id,
      kind: "match",
      date,
      scheduled_at: row.scheduled_at,
      title: `Partido contra ${row.opponent}`,
      opponent: row.opponent,
      is_home: row.is_home,
      location: row.pool_name || row.location,
      maps_url: row.maps_url,
      team_label: team?.label ?? "Equipo",
      team_color: team?.color ?? "#1E5AA8",
      cancelled: false,
      status: row.status,
      is_today: date === today,
      is_tomorrow: date === tomorrow,
    });
  }

  return events
    .sort(
      (a, b) =>
        Number(b.status === "in_progress") - Number(a.status === "in_progress") ||
        a.scheduled_at.localeCompare(b.scheduled_at),
    )
    .slice(0, limit);
}

const clubDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getClubDayKey(value: Date): string {
  const parts = clubDayFormatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

interface CoachSessionRow {
  player_ids: string[] | null;
  id: string;
  team_id: string;
  scheduled_at: string;
  end_at: string | null;
  location: string | null;
  kind?: string;
}

async function hydrateCoachSessions(
  staffTeams: DashboardStaffTeam[],
  sessions: CoachSessionRow[],
  rosterDay: string,
  now: Date = new Date(),
): Promise<DashboardCoachSession[]> {
  if (staffTeams.length === 0 || sessions.length === 0) return [];
  const supabase = await createClient();
  const teamIds = Array.from(new Set(staffTeams.map((team) => team.id)));
  const sessionIds = sessions.map((session) => session.id);
  const [attendanceRes, rosterRes] = await Promise.all([
    supabase
      .from("training_attendance")
      .select("session_id, player_id, present, reason")
      .in("session_id", sessionIds),
    supabase
      .from("team_rosters")
      .select("team_id, player_id")
      .in("team_id", teamIds)
      .lte("joined_at", rosterDay)
      .or(`left_at.is.null,left_at.gte.${rosterDay}`),
  ]);
  if (attendanceRes.error || rosterRes.error)
    throw new Error("No pudimos cargar las listas de asistencia. Inténtalo de nuevo.");
  const attendanceRows = attendanceRes.data ?? [];
  const attendanceBySession = new Map<string, typeof attendanceRows>();
  for (const row of attendanceRows) {
    const list = attendanceBySession.get(row.session_id) ?? [];
    list.push(row);
    attendanceBySession.set(row.session_id, list);
  }

  const roster = rosterRes.data ?? [];
  const rosterIds = Array.from(new Set(roster.map((row) => row.player_id)));
  const profilesRes =
    rosterIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", rosterIds)
      : { data: [], error: null };
  if (profilesRes.error)
    throw new Error("No pudimos cargar los nombres de la plantilla. Inténtalo de nuevo.");
  const profiles = new Map((profilesRes.data ?? []).map((profile) => [profile.id, profile]));
  const rosterByTeam = new Map<string, typeof roster>();
  for (const row of roster) {
    const list = rosterByTeam.get(row.team_id) ?? [];
    list.push(row);
    rosterByTeam.set(row.team_id, list);
  }

  const nowTime = now.getTime();
  return sessions.map((session) => {
    const savedRows = attendanceBySession.get(session.id) ?? [];
    const savedByPlayer = new Map(savedRows.map((row) => [row.player_id, row]));
    const players: DashboardAttendancePlayer[] = (rosterByTeam.get(session.team_id) ?? [])
      .filter((row) => !session.player_ids || session.player_ids.includes(row.player_id))
      .map((row) => {
        const profile = profiles.get(row.player_id);
        if (!profile) return null;
        const saved = savedByPlayer.get(row.player_id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          attendance: saved?.present ?? null,
          reason: saved?.reason ?? null,
        };
      })
      .filter((player): player is DashboardAttendancePlayer => player !== null)
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));
    const staffTeam = staffTeams.find((team) => team.id === session.team_id);
    const presentCount = players.filter((player) => player.attendance === true).length;
    const absentCount = players.filter((player) => player.attendance === false).length;

    return {
      id: session.id,
      team_id: session.team_id,
      team_label: staffTeam?.label ?? "Equipo",
      team_color: staffTeam?.color ?? "#1E5AA8",
      scheduled_at: session.scheduled_at,
      end_at: session.end_at,
      location: session.location,
      kind: session.kind,
      is_past: new Date(session.scheduled_at).getTime() <= nowTime,
      present_count: presentCount,
      absent_count: absentCount,
      unmarked_count: Math.max(0, players.length - presentCount - absentCount),
      roster_count: players.length,
      players,
    };
  });
}

export async function getCoachAttendanceSessions(
  staffTeams: DashboardStaffTeam[],
  day: string,
  now: Date = new Date(),
): Promise<DashboardCoachSession[]> {
  if (staffTeams.length === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];
  const supabase = await createClient();
  const teamIds = Array.from(new Set(staffTeams.map((team) => team.id)));
  const center = new Date(`${day}T12:00:00.000Z`).getTime();
  const from = new Date(center - 36 * 60 * 60 * 1000).toISOString();
  const until = new Date(center + 36 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("training_sessions")
    .select("id, team_id, scheduled_at, end_at, location, player_ids, kind")
    .in("team_id", teamIds)
    .eq("cancelled", false)
    .gte("scheduled_at", from)
    .lte("scheduled_at", until)
    .order("scheduled_at", { ascending: true });
  if (error) throw new Error("No pudimos cargar los entrenamientos. Inténtalo de nuevo.");
  const sessions = ((data ?? []) as CoachSessionRow[]).filter(
    (session) => getClubDayKey(new Date(session.scheduled_at)) === day,
  );
  return hydrateCoachSessions(staffTeams, sessions, day, now);
}

export async function getCoachAttendanceSession(
  staffTeams: DashboardStaffTeam[],
  sessionId: string,
  now: Date = new Date(),
): Promise<DashboardCoachSession | null> {
  if (staffTeams.length === 0) return null;
  const supabase = await createClient();
  const teamIds = Array.from(new Set(staffTeams.map((team) => team.id)));
  const { data, error } = await supabase
    .from("training_sessions")
    .select("id, team_id, scheduled_at, end_at, location, player_ids, kind")
    .eq("id", sessionId)
    .in("team_id", teamIds)
    .eq("cancelled", false)
    .maybeSingle();
  if (error) throw new Error("No pudimos cargar el entrenamiento. Inténtalo de nuevo.");
  if (!data) return null;
  const session = data as CoachSessionRow;
  const sessions = await hydrateCoachSessions(
    staffTeams,
    [session],
    getClubDayKey(new Date(session.scheduled_at)),
    now,
  );
  return sessions[0] ?? null;
}
