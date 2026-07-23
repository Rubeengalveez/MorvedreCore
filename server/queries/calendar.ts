import { createClient } from "@/lib/supabase/server";

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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getCalendarData(input: {
  teamIds: string[];
  startIso: string;
  endIso: string;
  profileId: string;
}): Promise<CalendarData> {
  const { teamIds, startIso, endIso, profileId } = input;
  const map: CalendarData = new Map();

  if (teamIds.length === 0) {
    return map;
  }

  const supabase = await createClient();

  const [trainingsRes, matchesRes] = await Promise.all([
    supabase
      .from("training_sessions")
      .select(
        "id, team_id, scheduled_at, duration_minutes, location, maps_url, cancelled, cancellation_reason, training_blocks(label), teams!training_sessions_team_id_fkey(label, color)",
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
  ]);

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
      training_blocks: unknown;
      teams: unknown;
    };
    const team = extractJoined(r.teams) as { label?: string; color?: string } | null;
    const block = extractJoined(r.training_blocks) as { label?: string } | null;
    const training: CalendarTraining = {
      id: r.id,
      team_id: r.team_id,
      team_label: team?.label ?? "Equipo",
      team_color: team?.color ?? "#1E5AA8",
      block_label: block?.label ?? null,
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

  for (const row of matchesRes.data ?? []) {
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

  const matchIds = Array.from(
    new Set(((matchesRes.data ?? []) as Array<{ id: string }>).map((m) => m.id)),
  );
  if (matchIds.length > 0) {
    const { data: callupsData } = await supabase
      .from("match_callups")
      .select("match_id, player_id, status, cap_number")
      .eq("player_id", profileId)
      .in("match_id", matchIds);

    for (const c of (callupsData ?? []) as Array<{
      match_id: string;
      player_id: string;
      status: string;
      cap_number: number | null;
    }>) {
      const key = localDateOnly(
        ((matchesRes.data ?? []) as Array<{ id: string; scheduled_at: string }>).find(
          (m) => m.id === c.match_id,
        )?.scheduled_at ?? "",
      );
      if (!key) continue;
      const day = map.get(key);
      if (!day) continue;
      const match = day.matches.find((m) => m.id === c.match_id);
      if (match) {
        match.callup_status = c.status;
        match.cap_number = c.cap_number;
      }
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

  const [trainingRes, matchRes, callupsRes] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("id, scheduled_at, location, teams!training_sessions_team_id_fkey(label, color)")
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
