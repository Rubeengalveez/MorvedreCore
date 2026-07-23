import { createClient } from "@/lib/supabase/server";
import { getAttendanceDayKey } from "@/lib/domain/attendance";
import { getMonthRange, monthKeyFromDate } from "@/lib/domain/attendance-history";
import { firstName, type FamilyRelation } from "@/lib/domain/family";
import { getUpcomingDashboardEvents, type DashboardWeekEvent } from "./dashboard";
import type { TeamSummary } from "./teams";

export interface FamilyMemberStats {
  goals: number;
  matches_played: number;
  month_attendance_pct: number | null;
  month_trainings_attended: number;
  month_trainings_total: number;
}

export interface FamilyMemberOverview {
  id: string;
  full_name: string;
  display_name: string;
  photo_url: string | null;
  birth_year: number | null;
  team_color: string | null;
  relation: FamilyRelation;
  teams: TeamSummary[];
  next_event: DashboardWeekEvent | null;
  stats: FamilyMemberStats | null;
  pending_order_count: number;
}

export interface FamilyOverview {
  members: FamilyMemberOverview[];
  pending_approval_count: number;
  next_event: DashboardWeekEvent | null;
  team_ids: string[];
}

type LinkedChild = {
  relation: FamilyRelation;
  child:
    | {
        id: string;
        full_name: string;
        photo_url: string | null;
        birth_year: number | null;
        team_color: string | null;
        is_active: boolean;
      }
    | Array<{
        id: string;
        full_name: string;
        photo_url: string | null;
        birth_year: number | null;
        team_color: string | null;
        is_active: boolean;
      }>
    | null;
};

type FamilySeasonStats = {
  player_id: string;
  goals: number;
  matches_played: number;
};

type FamilyAttendanceRow = {
  player_id: string;
  present: boolean;
  training_sessions:
    | {
        scheduled_at: string;
        cancelled: boolean;
        teams: { season_id: string } | Array<{ season_id: string }> | null;
      }
    | Array<{
        scheduled_at: string;
        cancelled: boolean;
        teams: { season_id: string } | Array<{ season_id: string }> | null;
      }>
    | null;
};

function joinedOne<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getFamilyOverview(
  parentProfileId: string,
  seasonId: string,
): Promise<FamilyOverview> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { members: [], pending_approval_count: 0, next_event: null, team_ids: [] };

  const { data: own } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .eq("id", parentProfileId)
    .maybeSingle();
  if (!own) return { members: [], pending_approval_count: 0, next_event: null, team_ids: [] };

  const { data: rows, error: linksError } = await supabase
    .from("parent_child_links")
    .select(
      "relation, child:profiles!parent_child_links_child_profile_id_fkey(id, full_name, photo_url, birth_year, team_color, is_active)",
    )
    .eq("parent_profile_id", parentProfileId);
  if (linksError) throw new Error("No pudimos cargar tu familia.");

  const children = ((rows ?? []) as unknown as LinkedChild[])
    .map((row) => ({ relation: row.relation, profile: joinedOne(row.child) }))
    .filter(
      (item): item is { relation: FamilyRelation; profile: NonNullable<typeof item.profile> } =>
        Boolean(item.profile?.is_active),
    );
  if (children.length === 0) {
    return { members: [], pending_approval_count: 0, next_event: null, team_ids: [] };
  }

  const childIds = children.map((item) => item.profile.id);
  const currentMonthRange = getMonthRange(monthKeyFromDate());
  const [rostersResult, snapshotsResult, ordersResult, attendanceResult] = await Promise.all([
    supabase
      .from("team_rosters")
      .select(
        "player_id, teams!team_rosters_team_id_fkey(id, label, category_code, gender, team_type, color, season_id, home_pool)",
      )
      .in("player_id", childIds)
      .is("left_at", null),
    supabase
      .from("ranking_snapshots")
      .select("player_id, goals, matches_played")
      .eq("season_id", seasonId)
      .eq("scope", "season")
      .eq("scope_key", "all")
      .in("player_id", childIds),
    supabase
      .from("shop_orders")
      .select("requested_by")
      .in("requested_by", childIds)
      .eq("status", "pending_parent"),
    supabase
      .from("training_attendance")
      .select(
        "player_id, present, training_sessions!inner(scheduled_at, cancelled, teams!inner(season_id))",
      )
      .in("player_id", childIds),
  ]);
  if (rostersResult.error) throw new Error("No pudimos cargar los equipos de tu familia.");
  if (snapshotsResult.error) throw new Error("No pudimos cargar las estadísticas de tu familia.");
  if (ordersResult.error) throw new Error("No pudimos cargar las compras de tu familia.");
  if (attendanceResult.error) throw new Error("No pudimos cargar la asistencia de tu familia.");

  const teamsByProfile = new Map<string, TeamSummary[]>();
  for (const row of rostersResult.data ?? []) {
    const team = joinedOne(row.teams);
    if (!team || team.season_id !== seasonId) continue;
    const teams = teamsByProfile.get(row.player_id) ?? [];
    if (!teams.some((item) => item.id === team.id)) {
      teams.push({ ...team, player_count: 0 });
      teamsByProfile.set(row.player_id, teams);
    }
  }
  for (const teams of teamsByProfile.values()) {
    teams.sort((a, b) => a.label.localeCompare(b.label, "es"));
  }

  const statsByProfile = new Map(
    (snapshotsResult.data ?? []).map((snapshot) => [
      snapshot.player_id,
      snapshot as FamilySeasonStats,
    ]),
  );
  const monthlyAttendanceByProfile = new Map<string, { attended: number; total: number }>();
  for (const row of (attendanceResult.data ?? []) as unknown as FamilyAttendanceRow[]) {
    const session = joinedOne(row.training_sessions);
    const team = session ? joinedOne(session.teams) : null;
    if (!session || session.cancelled || team?.season_id !== seasonId) continue;
    const day = getAttendanceDayKey(session.scheduled_at);
    if (day < currentMonthRange.from || day > currentMonthRange.to) continue;
    const current = monthlyAttendanceByProfile.get(row.player_id) ?? { attended: 0, total: 0 };
    current.total += 1;
    if (row.present) current.attended += 1;
    monthlyAttendanceByProfile.set(row.player_id, current);
  }
  const pendingOrdersByProfile = new Map<string, number>();
  for (const order of ordersResult.data ?? []) {
    pendingOrdersByProfile.set(
      order.requested_by,
      (pendingOrdersByProfile.get(order.requested_by) ?? 0) + 1,
    );
  }

  const allTeamIds = Array.from(
    new Set(Array.from(teamsByProfile.values()).flatMap((teams) => teams.map((team) => team.id))),
  );
  const events = await getUpcomingDashboardEvents(allTeamIds, new Date(), 50);
  const members = children.map(({ relation, profile }) => {
    const teams = teamsByProfile.get(profile.id) ?? [];
    const memberTeamIds = new Set(teams.map((team) => team.id));
    const seasonStats = statsByProfile.get(profile.id);
    const monthAttendance = monthlyAttendanceByProfile.get(profile.id) ?? {
      attended: 0,
      total: 0,
    };
    return {
      id: profile.id,
      full_name: profile.full_name,
      display_name: firstName(profile.full_name),
      photo_url: profile.photo_url,
      birth_year: profile.birth_year,
      team_color: profile.team_color,
      relation,
      teams,
      next_event: events.find((event) => memberTeamIds.has(event.team_id)) ?? null,
      stats: {
        goals: seasonStats?.goals ?? 0,
        matches_played: seasonStats?.matches_played ?? 0,
        month_attendance_pct:
          monthAttendance.total > 0
            ? Math.round((monthAttendance.attended / monthAttendance.total) * 100)
            : null,
        month_trainings_attended: monthAttendance.attended,
        month_trainings_total: monthAttendance.total,
      },
      pending_order_count: pendingOrdersByProfile.get(profile.id) ?? 0,
    } satisfies FamilyMemberOverview;
  });

  members.sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));
  const allEvents = members
    .flatMap((member) => (member.next_event ? [member.next_event] : []))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  return {
    members,
    pending_approval_count: members.reduce((sum, member) => sum + member.pending_order_count, 0),
    next_event: allEvents[0] ?? null,
    team_ids: Array.from(new Set(members.flatMap((member) => member.teams.map((team) => team.id)))),
  };
}
