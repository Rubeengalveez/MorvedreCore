import { createClient } from "@/lib/supabase/server";

export interface DashboardNextEvent {
  kind: "training" | "match";
  id: string;
  scheduled_at: string;
  title: string;
  subtitle: string;
  team_label: string;
  team_color: string;
  location: string | null;
  hours_until: number;
}

export interface DashboardWeekEvent {
  id: string;
  kind: "training" | "match";
  date: string;
  scheduled_at: string;
  title: string;
  team_label: string;
  team_color: string;
  cancelled: boolean;
  status: string;
  is_today: boolean;
  is_tomorrow: boolean;
}

export interface DashboardTeamInfo {
  id: string;
  label: string;
  category_code: string;
  color: string;
  player_count: number;
  coach_name: string | null;
  next_training: string | null;
  next_match: string | null;
}

export interface DashboardActivity {
  id: string;
  kind: "training" | "match" | "team" | "season";
  title: string;
  subtitle: string;
  result: "win" | "draw" | "loss" | "scheduled" | "training";
  color: string;
  timestamp: string;
}

export interface DashboardSeasonStats {
  goals: number;
  month_attendance_pct: number;
  attendance_streak: number;
}

export interface DashboardData {
  weekEvents: DashboardWeekEvent[];
  teamInfo: DashboardTeamInfo | null;
  recentActivity: DashboardActivity[];
  seasonStats: DashboardSeasonStats | null;
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
  roles: string[];
}

export interface DashboardAttendancePlayer {
  id: string;
  full_name: string;
  photo_url: string | null;
  cap_number: number | null;
  present: boolean;
  reason: string | null;
}

export interface DashboardCoachTask {
  id: string;
  team_id: string;
  team_label: string;
  team_color: string;
  scheduled_at: string;
  end_at: string | null;
  location: string | null;
  is_past: boolean;
  attendance_recorded: boolean;
  present_count: number;
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
    supabase.from("user_roles").select("role").eq("profile_id", profileId),
  ]);

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

  return {
    player_team_ids: Array.from(new Set(playerTeamIds)),
    staff_teams: staffTeams,
    roles: Array.from(new Set((rolesRes.data ?? []).map((row) => row.role))),
  };
}

export async function getUpcomingDashboardEvents(
  teamIds: string[],
  now: Date = new Date(),
  limit = 8,
): Promise<DashboardWeekEvent[]> {
  if (teamIds.length === 0) return [];
  const supabase = await createClient();
  const from = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const [trainingsRes, matchesRes] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("id, scheduled_at, cancelled, teams!training_sessions_team_id_fkey(label, color)")
      .in("team_id", teamIds)
      .eq("cancelled", false)
      .gte("scheduled_at", from)
      .lte("scheduled_at", until)
      .order("scheduled_at", { ascending: true })
      .limit(limit),
    supabase
      .from("matches")
      .select("id, opponent, scheduled_at, status, teams!matches_team_id_fkey(label, color)")
      .in("team_id", teamIds)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_at", from)
      .lte("scheduled_at", until)
      .order("scheduled_at", { ascending: true })
      .limit(limit),
  ]);

  const today = new Intl.DateTimeFormat("en-CA").format(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = new Intl.DateTimeFormat("en-CA").format(tomorrowDate);
  const events: DashboardWeekEvent[] = [];

  for (const row of trainingsRes.data ?? []) {
    const team = joinedOne(row.teams) as { label?: string; color?: string } | null;
    const date = new Intl.DateTimeFormat("en-CA").format(new Date(row.scheduled_at));
    events.push({
      id: row.id,
      kind: "training",
      date,
      scheduled_at: row.scheduled_at,
      title: "Entrenamiento",
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
    const date = new Intl.DateTimeFormat("en-CA").format(new Date(row.scheduled_at));
    events.push({
      id: row.id,
      kind: "match",
      date,
      scheduled_at: row.scheduled_at,
      title: `Partido contra ${row.opponent}`,
      team_label: team?.label ?? "Equipo",
      team_color: team?.color ?? "#1E5AA8",
      cancelled: false,
      status: row.status,
      is_today: date === today,
      is_tomorrow: date === tomorrow,
    });
  }

  return events.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)).slice(0, limit);
}

export async function getDashboardCoachTask(
  staffTeams: DashboardStaffTeam[],
  now: Date = new Date(),
): Promise<DashboardCoachTask | null> {
  if (staffTeams.length === 0) return null;
  const supabase = await createClient();
  const teamIds = staffTeams.map((team) => team.id);
  const from = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
  const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("id, team_id, scheduled_at, end_at, location")
    .in("team_id", teamIds)
    .eq("cancelled", false)
    .gte("scheduled_at", from)
    .lte("scheduled_at", until)
    .order("scheduled_at", { ascending: true });
  if (!sessions?.length) return null;

  const sessionIds = sessions.map((session) => session.id);
  const { data: attendanceRows } = await supabase
    .from("training_attendance")
    .select("session_id, player_id, present, reason")
    .in("session_id", sessionIds);
  const attendanceBySession = new Map<string, typeof attendanceRows>();
  for (const row of attendanceRows ?? []) {
    const list = attendanceBySession.get(row.session_id) ?? [];
    list.push(row);
    attendanceBySession.set(row.session_id, list);
  }

  const nowTime = now.getTime();
  const unfinished = sessions
    .filter(
      (session) =>
        new Date(session.scheduled_at).getTime() <= nowTime &&
        (attendanceBySession.get(session.id)?.length ?? 0) === 0,
    )
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  const selected =
    unfinished[0] ??
    sessions.find((session) => new Date(session.scheduled_at).getTime() >= nowTime) ??
    sessions.at(-1);
  if (!selected) return null;

  const [rosterRes, profilesRes] = await Promise.all([
    supabase
      .from("team_rosters")
      .select("player_id, squad_number")
      .eq("team_id", selected.team_id)
      .is("left_at", null),
    supabase.from("profiles").select("id, full_name, photo_url, cap_number"),
  ]);
  const roster = rosterRes.data ?? [];
  const rosterIds = new Set(roster.map((row) => row.player_id));
  const profiles = new Map(
    (profilesRes.data ?? [])
      .filter((profile) => rosterIds.has(profile.id))
      .map((profile) => [profile.id, profile]),
  );
  const savedRows = attendanceBySession.get(selected.id) ?? [];
  const savedByPlayer = new Map(savedRows.map((row) => [row.player_id, row]));
  const players: DashboardAttendancePlayer[] = roster
    .map((row) => {
      const profile = profiles.get(row.player_id);
      if (!profile) return null;
      const saved = savedByPlayer.get(row.player_id);
      return {
        id: profile.id,
        full_name: profile.full_name,
        photo_url: profile.photo_url,
        cap_number: row.squad_number ?? profile.cap_number,
        present: saved?.present ?? true,
        reason: saved?.reason ?? null,
      };
    })
    .filter((player): player is DashboardAttendancePlayer => player !== null)
    .sort((a, b) => (a.cap_number ?? 999) - (b.cap_number ?? 999));
  const staffTeam = staffTeams.find((team) => team.id === selected.team_id);

  return {
    id: selected.id,
    team_id: selected.team_id,
    team_label: staffTeam?.label ?? "Equipo",
    team_color: staffTeam?.color ?? "#1E5AA8",
    scheduled_at: selected.scheduled_at,
    end_at: selected.end_at,
    location: selected.location,
    is_past: new Date(selected.scheduled_at).getTime() < nowTime,
    attendance_recorded: savedRows.length > 0,
    present_count: savedRows.filter((row) => row.present).length,
    roster_count: players.length,
    players,
  };
}

function relativeTime(iso: string, now: Date): string {
  const then = new Date(iso);
  const diffMs = then.getTime() - now.getTime();
  const diffH = Math.round(diffMs / (1000 * 60 * 60));
  if (diffH < 0) return "hace " + Math.abs(diffH) + "h";
  if (diffH < 24) return "en " + diffH + "h";
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return "en " + diffD + "d";
  return "en " + Math.round(diffD / 7) + "sem";
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7);
}

export async function getDashboardData(input: {
  teamIds: string[];
  profileId: string;
  now?: Date;
}): Promise<DashboardData> {
  const { teamIds, profileId } = input;
  const now = input.now ?? new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const admin = await createClient();

  if (teamIds.length === 0) {
    return { weekEvents: [], teamInfo: null, recentActivity: [], seasonStats: null };
  }

  const [{ data: trainings }, { data: matches }] = await Promise.all([
    admin
      .from("training_sessions")
      .select(
        "id, team_id, scheduled_at, location, cancelled, teams!training_sessions_team_id_fkey(label, color)",
      )
      .in("team_id", teamIds)
      .gte("scheduled_at", weekStart.toISOString())
      .lt("scheduled_at", weekEnd.toISOString())
      .eq("cancelled", false)
      .order("scheduled_at", { ascending: true })
      .limit(10),
    admin
      .from("matches")
      .select(
        "id, team_id, opponent, status, scheduled_at, location, pool_name, teams!matches_team_id_fkey(label, color)",
      )
      .in("team_id", teamIds)
      .gte("scheduled_at", weekStart.toISOString())
      .lt("scheduled_at", weekEnd.toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(10),
  ]);

  const weekEvents: DashboardWeekEvent[] = [];
  const todayIso = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  for (const t of trainings ?? []) {
    const tr = t as {
      id: string;
      team_id: string;
      scheduled_at: string;
      location: string | null;
      cancelled: boolean;
      teams: unknown;
    };
    const team = Array.isArray(tr.teams) ? tr.teams[0] : tr.teams;
    const teamObj = team as { label?: string; color?: string } | null;
    const date = tr.scheduled_at.slice(0, 10);
    weekEvents.push({
      id: tr.id,
      kind: "training",
      date,
      scheduled_at: tr.scheduled_at,
      title: `Entreno ${teamObj?.label ?? ""}`,
      team_label: teamObj?.label ?? "",
      team_color: teamObj?.color ?? "#1E5AA8",
      cancelled: tr.cancelled,
      status: "scheduled",
      is_today: date === todayIso,
      is_tomorrow: date === tomorrowIso,
    });
  }
  for (const m of matches ?? []) {
    const mr = m as {
      id: string;
      team_id: string;
      opponent: string;
      status: string;
      scheduled_at: string;
      location: string | null;
      pool_name: string | null;
      teams: unknown;
    };
    const team = Array.isArray(mr.teams) ? mr.teams[0] : mr.teams;
    const teamObj = team as { label?: string; color?: string } | null;
    const date = mr.scheduled_at.slice(0, 10);
    weekEvents.push({
      id: mr.id,
      kind: "match",
      date,
      scheduled_at: mr.scheduled_at,
      title: `${teamObj?.label ?? ""} vs ${mr.opponent}`,
      team_label: teamObj?.label ?? "",
      team_color: teamObj?.color ?? "#F4C430",
      cancelled: mr.status === "cancelled",
      status: mr.status,
      is_today: date === todayIso,
      is_tomorrow: date === tomorrowIso,
    });
  }
  weekEvents.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  let teamInfo: DashboardTeamInfo | null = null;
  if (teamIds.length > 0) {
    const firstTeamId = teamIds[0]!;
    const { data: teamRow } = await admin
      .from("teams")
      .select("id, label, category_code, color")
      .eq("id", firstTeamId)
      .maybeSingle();
    if (teamRow) {
      const t = teamRow as {
        id: string;
        label: string;
        category_code: string;
        color: string;
      };
      const [
        { count: playerCount },
        { data: coachRow },
        { data: nextTrainingRow },
        { data: nextMatchRow },
      ] = await Promise.all([
        admin
          .from("team_rosters")
          .select("id", { count: "exact", head: true })
          .eq("team_id", firstTeamId)
          .is("left_at", null),
        admin
          .from("team_staff")
          .select("profiles!team_staff_profile_id_fkey(full_name)")
          .eq("team_id", firstTeamId)
          .eq("role", "head_coach")
          .maybeSingle(),
        admin
          .from("training_sessions")
          .select("scheduled_at")
          .eq("team_id", firstTeamId)
          .eq("cancelled", false)
          .gte("scheduled_at", now.toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        admin
          .from("matches")
          .select("scheduled_at")
          .eq("team_id", firstTeamId)
          .in("status", ["scheduled", "in_progress"])
          .gte("scheduled_at", now.toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      const coachProfile = Array.isArray(coachRow?.profiles)
        ? coachRow.profiles[0]
        : coachRow?.profiles;
      teamInfo = {
        id: t.id,
        label: t.label,
        category_code: t.category_code,
        color: t.color,
        player_count: playerCount ?? 0,
        coach_name: coachProfile?.full_name ?? null,
        next_training: nextTrainingRow?.scheduled_at ?? null,
        next_match: nextMatchRow?.scheduled_at ?? null,
      };
    }
  }

  const recentActivity: DashboardActivity[] = [];
  const { data: recentMatches } = await admin
    .from("matches")
    .select(
      "id, opponent, scheduled_at, status, final_score_us, final_score_them, teams!matches_team_id_fkey(label, color)",
    )
    .in("team_id", teamIds)
    .order("scheduled_at", { ascending: false })
    .limit(5);
  for (const m of recentMatches ?? []) {
    const mr = m as {
      id: string;
      opponent: string;
      scheduled_at: string;
      status: string;
      final_score_us: number | null;
      final_score_them: number | null;
      teams: unknown;
    };
    const team = Array.isArray(mr.teams) ? mr.teams[0] : mr.teams;
    const teamObj = team as { label?: string; color?: string } | null;
    if (mr.status === "played" && mr.final_score_us !== null && mr.final_score_them !== null) {
      const won = mr.final_score_us > mr.final_score_them;
      const draw = mr.final_score_us === mr.final_score_them;
      recentActivity.push({
        id: mr.id,
        kind: "match",
        title: won
          ? `Victoria ${mr.final_score_us}-${mr.final_score_them} contra ${mr.opponent}`
          : draw
            ? `Empate ${mr.final_score_us}-${mr.final_score_them} contra ${mr.opponent}`
            : `Derrota ${mr.final_score_us}-${mr.final_score_them} contra ${mr.opponent}`,
        subtitle: `${teamObj?.label ?? ""} · ${relativeTime(mr.scheduled_at, now)}`,
        result: won ? "win" : draw ? "draw" : "loss",
        color: won ? "var(--success)" : draw ? "var(--ink-600)" : "var(--danger)",
        timestamp: mr.scheduled_at,
      });
    } else {
      recentActivity.push({
        id: mr.id,
        kind: "match",
        title: `Partido vs ${mr.opponent}`,
        subtitle: `${teamObj?.label ?? ""} · ${relativeTime(mr.scheduled_at, now)}`,
        result: "scheduled",
        color: "var(--brand-action)",
        timestamp: mr.scheduled_at,
      });
    }
  }

  const { data: recentAttendances } = await admin
    .from("training_attendance")
    .select("session_id, present")
    .eq("player_id", profileId)
    .eq("present", true)
    .order("marked_at", { ascending: false })
    .limit(5);
  const sessionIds = (recentAttendances ?? [])
    .map((a) => (a as { session_id: string }).session_id)
    .filter(Boolean);
  if (sessionIds.length > 0) {
    const { data: sessions } = await admin
      .from("training_sessions")
      .select("id, scheduled_at, team_id, teams!training_sessions_team_id_fkey(label, color)")
      .in("id", sessionIds);
    const sessionMap = new Map<
      string,
      { scheduled_at: string; team_label: string; team_color: string }
    >();
    for (const s of sessions ?? []) {
      const sr = s as { id: string; scheduled_at: string; teams: unknown };
      const team = Array.isArray(sr.teams) ? sr.teams[0] : sr.teams;
      const teamObj = team as { label?: string; color?: string } | null;
      sessionMap.set(sr.id, {
        scheduled_at: sr.scheduled_at,
        team_label: teamObj?.label ?? "",
        team_color: teamObj?.color ?? "#1E5AA8",
      });
    }
    for (const a of recentAttendances ?? []) {
      const ar = a as { session_id: string };
      const session = sessionMap.get(ar.session_id);
      if (!session) continue;
      recentActivity.push({
        id: `att-${ar.session_id}`,
        kind: "training",
        title: `Asististe a un entreno`,
        subtitle: `${session.team_label} · ${relativeTime(session.scheduled_at, now)}`,
        result: "training",
        color: "var(--success)",
        timestamp: session.scheduled_at,
      });
    }
  }

  recentActivity.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);

  const [matchStatsRes, monthSessionsRes, monthAttendanceRes, allAttendanceRes] = await Promise.all(
    [
      admin.from("match_stats").select("goals").eq("player_id", profileId),
      admin
        .from("training_sessions")
        .select("id, scheduled_at, cancelled")
        .in("team_id", teamIds)
        .gte("scheduled_at", monthStart.toISOString())
        .lt("scheduled_at", monthEnd.toISOString()),
      admin.from("training_attendance").select("session_id, present").eq("player_id", profileId),
      admin
        .from("training_attendance")
        .select(
          "session_id, present, training_sessions!training_attendance_session_id_fkey(scheduled_at, cancelled)",
        )
        .eq("player_id", profileId)
        .order("marked_at", { ascending: false })
        .limit(50),
    ],
  );

  const goals = (matchStatsRes.data ?? []).reduce(
    (acc, row) => acc + ((row as { goals: number }).goals ?? 0),
    0,
  );

  const monthSessionIds = new Set(
    ((monthSessionsRes.data ?? []) as Array<{ id: string; cancelled: boolean }>)
      .filter((s) => !s.cancelled)
      .map((s) => s.id),
  );
  const monthAttendanceRows = (monthAttendanceRes.data ?? []) as Array<{
    session_id: string;
    present: boolean;
  }>;
  const monthAttended = monthAttendanceRows.filter(
    (r) => r.present && monthSessionIds.has(r.session_id),
  ).length;
  const monthAttendancePct =
    monthSessionIds.size > 0 ? Math.round((monthAttended / monthSessionIds.size) * 100) : 0;

  let attendanceStreak = 0;
  const attendanceBySession = new Map<string, boolean>();
  for (const r of (allAttendanceRes.data ?? []) as Array<{
    session_id: string;
    present: boolean;
  }>) {
    attendanceBySession.set(r.session_id, r.present);
  }
  const sessionsOrdered = (
    (allAttendanceRes.data ?? []) as Array<{
      session_id: string;
      present: boolean;
      training_sessions: unknown;
    }>
  )
    .map((s) => {
      const ts = Array.isArray(s.training_sessions) ? s.training_sessions[0] : s.training_sessions;
      const session = ts as { scheduled_at?: string; cancelled?: boolean } | null;
      return {
        session_id: s.session_id,
        present: s.present,
        scheduled_at: session?.scheduled_at ?? null,
        cancelled: session?.cancelled ?? false,
      };
    })
    .filter((s) => s.scheduled_at != null && !s.cancelled)
    .sort((a, b) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? ""));
  for (const s of sessionsOrdered) {
    if (!s.present) break;
    attendanceStreak += 1;
  }

  return {
    weekEvents: weekEvents.slice(0, 10),
    teamInfo,
    recentActivity: recentActivity.slice(0, 8),
    seasonStats: {
      goals,
      month_attendance_pct: monthAttendancePct,
      attendance_streak: attendanceStreak,
    },
  };
}
