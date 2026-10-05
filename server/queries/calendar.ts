import { createClient } from "@/lib/supabase/server";
import { getAttendanceDayKey } from "@/lib/domain/attendance";

export interface CalendarTraining {
  id: string;
  team_id: string;
  team_label: string;
  team_color: string;
  block_label: string | null;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  maps_url: string | null;
  cancelled: boolean;
  cancellation_reason: string | null;
  joint_id?: string | null;
  training_kind?: string;
  upcoming?: boolean;
  team_ids?: string[];
  session_ids?: string[];
  can_manage?: boolean;
  attendance?: Array<{
    player_id: string;
    name: string;
    present: boolean | null;
    reason?: string | null;
  }>;
}

export interface CalendarMatch {
  id: string;
  team_id: string;
  team_label: string;
  team_color: string;
  opponent: string;
  is_home: boolean;
  competition_type: string;
  status: string;
  scheduled_at: string;
  location: string | null;
  maps_url: string | null;
  pool_name: string | null;
  final_score_us: number | null;
  final_score_them: number | null;
  callup_status: string | null;
  cap_number: number | null;
  callups?: Array<{ player_id: string; name: string; status: string; cap_number: number | null }>;
}

export interface CalendarEventDay {
  trainings: CalendarTraining[];
  matches: CalendarMatch[];
}

export type CalendarData = Map<string, CalendarEventDay>;

function extractJoined<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function localDateOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return getAttendanceDayKey(d);
}

export async function getCalendarData(input: {
  teamIds: string[];
  startIso: string;
  endIso: string;
  profileId: string;
  includeCalledMatches?: boolean;
}): Promise<CalendarData> {
  const { teamIds, startIso, endIso, profileId } = input;
  const map: CalendarData = new Map();

  if (teamIds.length === 0) {
    return map;
  }

  const supabase = await createClient();

  const [trainingsRes, matchesRes, staffRes] = await Promise.all([
    supabase
      .from("training_sessions")
      .select(
        "id, team_id, joint_id, player_ids, label, kind, scheduled_at, duration_minutes, location, maps_url, cancelled, cancellation_reason, training_blocks(label), teams!training_sessions_team_id_fkey(label, color)",
      )
      .in("team_id", teamIds)
      .gte("scheduled_at", startIso)
      .lte("scheduled_at", endIso)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("matches")
      .select(
        "id, team_id, opponent, is_home, competition_type, status, scheduled_at, location, maps_url, pool_name, final_score_us, final_score_them, teams!matches_team_id_fkey(label, color)",
      )
      .in("team_id", teamIds)
      .gte("scheduled_at", startIso)
      .lte("scheduled_at", endIso)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("team_staff")
      .select("team_id")
      .eq("profile_id", profileId)
      .in("team_id", teamIds),
  ]);

  if (trainingsRes.error || matchesRes.error || staffRes.error)
    throw new Error("No pudimos cargar las actividades del calendario.");

  const { data: calledRows, error: calledError } = await supabase
    .from("match_callups")
    .select(
      "match_id, status, cap_number, matches!inner(id, team_id, opponent, is_home, competition_type, status, scheduled_at, location, maps_url, pool_name, final_score_us, final_score_them, teams!matches_team_id_fkey(label, color))",
    )
    .eq("player_id", profileId)
    .in("status", ["called", "confirmed"])
    .gte("matches.scheduled_at", startIso)
    .lte("matches.scheduled_at", endIso);
  if (calledError) throw new Error("No pudimos cargar tus convocatorias.");
  const matchRows = new Map((matchesRes.data ?? []).map((row) => [row.id, row]));
  if (input.includeCalledMatches !== false)
    for (const callup of calledRows ?? []) {
      const match = extractJoined(callup.matches);
      if (match) matchRows.set(match.id, match);
    }

  for (const row of trainingsRes.data ?? []) {
    const r = row as {
      id: string;
      team_id: string;
      scheduled_at: string;
      duration_minutes: number;
      location: string | null;
      maps_url: string | null;
      cancelled: boolean;
      cancellation_reason: string | null;
      player_ids: string[] | null;
      joint_id: string | null;
      label: string | null;
      kind: string;
      training_blocks: unknown;
      teams: unknown;
    };
    if (
      r.player_ids &&
      !r.player_ids.includes(profileId) &&
      !staffRes.data?.some((staff) => staff.team_id === r.team_id)
    )
      continue;
    const team = extractJoined(r.teams) as { label?: string; color?: string } | null;
    const block = extractJoined(r.training_blocks) as { label?: string } | null;
    const training: CalendarTraining = {
      id: r.id,
      team_id: r.team_id,
      team_label: team?.label ?? "Equipo",
      team_color: team?.color ?? "#1E5AA8",
      block_label: r.label ?? block?.label ?? null,
      joint_id: r.joint_id,
      training_kind: r.kind,
      upcoming: new Date(r.scheduled_at).getTime() > Date.now(),
      scheduled_at: r.scheduled_at,
      duration_minutes: r.duration_minutes,
      location: r.location,
      maps_url: r.maps_url,
      cancelled: r.cancelled,
      cancellation_reason: r.cancellation_reason,
    };
    const key = localDateOnly(r.scheduled_at);
    const day = map.get(key) ?? { trainings: [], matches: [] };
    day.trainings.push(training);
    map.set(key, day);
  }

  for (const row of matchRows.values()) {
    const r = row as {
      id: string;
      team_id: string;
      opponent: string;
      is_home: boolean;
      competition_type: string;
      status: string;
      scheduled_at: string;
      location: string | null;
      maps_url: string | null;
      pool_name: string | null;
      final_score_us: number | null;
      final_score_them: number | null;
      teams: unknown;
    };
    const team = extractJoined(r.teams) as { label?: string; color?: string } | null;
    const match: CalendarMatch = {
      id: r.id,
      team_id: r.team_id,
      team_label: team?.label ?? "Equipo",
      team_color: team?.color ?? "#1E5AA8",
      opponent: r.opponent,
      is_home: r.is_home,
      competition_type: r.competition_type,
      status: r.status,
      scheduled_at: r.scheduled_at,
      location: r.location,
      maps_url: r.maps_url,
      pool_name: r.pool_name,
      final_score_us: r.final_score_us,
      final_score_them: r.final_score_them,
      callup_status: null,
      cap_number: null,
    };
    const key = localDateOnly(r.scheduled_at);
    const day = map.get(key) ?? { trainings: [], matches: [] };
    day.matches.push(match);
    map.set(key, day);
  }

  for (const c of calledRows ?? []) {
    const row = matchRows.get(c.match_id);
    if (!row) continue;
    const match = map
      .get(localDateOnly(row.scheduled_at))
      ?.matches.find((m) => m.id === c.match_id);
    if (match) {
      match.callup_status = c.status;
      match.cap_number = c.cap_number;
    }
  }

  for (const day of map.values()) {
    day.trainings.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    day.matches.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }

  return map;
}

export interface NextEvent {
  kind: "training" | "match";
  id: string;
  scheduled_at: string;
  team_label: string;
  team_color: string;
  location: string | null;
}

export async function getNextEventForProfile(input: {
  teamIds: string[];
  profileId: string;
  now?: Date;
}): Promise<NextEvent | null> {
  const { teamIds, profileId } = input;
  if (teamIds.length === 0) return null;
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("team_staff")
    .select("team_id")
    .eq("profile_id", profileId)
    .in("team_id", teamIds);
  const staffIds = (staff ?? []).map((s) => s.team_id);
  const audience = `player_ids.is.null,player_ids.cs.{${profileId}}${staffIds.length ? `,team_id.in.(${staffIds.join(",")})` : ""}`;
  const [trainingRes, matchRes, callupsRes] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("id, scheduled_at, location, teams!training_sessions_team_id_fkey(label, color)")
      .or(audience)
      .in("team_id", teamIds)
      .eq("cancelled", false)
      .gte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(1),
    supabase
      .from("matches")
      .select("id, scheduled_at, status, location, teams!matches_team_id_fkey(label, color)")
      .in("team_id", teamIds)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(5),
    supabase.from("match_callups").select("match_id, status").eq("player_id", profileId),
  ]);

  const calledMatchIds = new Set(
    ((callupsRes.data ?? []) as Array<{ match_id: string; status: string }>)
      .filter((c) => c.status === "called" || c.status === "confirmed")
      .map((c) => c.match_id),
  );

  const userMatch = (
    (matchRes.data ?? []) as Array<{
      id: string;
      scheduled_at: string;
      location: string | null;
      teams: unknown;
    }>
  ).find((m) => calledMatchIds.has(m.id));

  const nextTraining = (trainingRes.data ?? [])[0] as
    { id: string; scheduled_at: string; location: string | null; teams: unknown } | undefined;
  const nextUserMatch = userMatch ?? null;

  const trainingTime = nextTraining?.scheduled_at ?? null;
  const matchTime = nextUserMatch?.scheduled_at ?? null;

  if (!trainingTime && !matchTime) return null;
  if (trainingTime && (!matchTime || trainingTime < matchTime)) {
    const team = Array.isArray(nextTraining?.teams) ? nextTraining?.teams[0] : nextTraining?.teams;
    const teamObj = team as { label?: string; color?: string } | null;
    return {
      kind: "training",
      id: nextTraining!.id,
      scheduled_at: trainingTime,
      team_label: teamObj?.label ?? "",
      team_color: teamObj?.color ?? "#1E5AA8",
      location: nextTraining!.location,
    };
  }
  if (matchTime) {
    const team = Array.isArray(nextUserMatch?.teams)
      ? nextUserMatch?.teams[0]
      : nextUserMatch?.teams;
    const teamObj = team as { label?: string; color?: string } | null;
    return {
      kind: "match",
      id: nextUserMatch!.id,
      scheduled_at: matchTime,
      team_label: teamObj?.label ?? "",
      team_color: teamObj?.color ?? "#F4C430",
      location: nextUserMatch!.location,
    };
  }
  return null;
}
