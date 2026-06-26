import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

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
  emoji: string;
  color: string;
  timestamp: string;
}

export interface DashboardData {
  weekEvents: DashboardWeekEvent[];
  teamInfo: DashboardTeamInfo | null;
  recentActivity: DashboardActivity[];
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
    return { weekEvents: [], teamInfo: null, recentActivity: [] };
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
      const [{ count: playerCount }, { data: coachRow }, { data: nextTrainingRow }, { data: nextMatchRow }] =
        await Promise.all([
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
    .select("id, opponent, scheduled_at, status, final_score_us, final_score_them, teams!matches_team_id_fkey(label, color)")
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
      recentActivity.push({
        id: mr.id,
        kind: "match",
        title: won
          ? `Victoria ${mr.final_score_us}-${mr.final_score_them} contra ${mr.opponent}`
          : mr.final_score_us === mr.final_score_them
            ? `Empate ${mr.final_score_us}-${mr.final_score_them} contra ${mr.opponent}`
            : `Derrota ${mr.final_score_us}-${mr.final_score_them} contra ${mr.opponent}`,
        subtitle: `${teamObj?.label ?? ""} · ${relativeTime(mr.scheduled_at, now)}`,
        emoji: won ? "🏆" : mr.final_score_us === mr.final_score_them ? "🤝" : "💪",
        color: won ? "var(--success)" : "var(--ink-600)",
        timestamp: mr.scheduled_at,
      });
    } else {
      recentActivity.push({
        id: mr.id,
        kind: "match",
        title: `Partido vs ${mr.opponent}`,
        subtitle: `${teamObj?.label ?? ""} · ${relativeTime(mr.scheduled_at, now)}`,
        emoji: "📅",
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
    const sessionMap = new Map<string, { scheduled_at: string; team_label: string; team_color: string }>();
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
        id: `${ar.session_id}-${a}`,
        kind: "training",
        title: `Asististe a un entreno`,
        subtitle: `${session.team_label} · ${relativeTime(session.scheduled_at, now)}`,
        emoji: "✅",
        color: "var(--success)",
        timestamp: session.scheduled_at,
      });
    }
  }

  recentActivity.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return {
    weekEvents: weekEvents.slice(0, 10),
    teamInfo,
    recentActivity: recentActivity.slice(0, 8),
  };
}
