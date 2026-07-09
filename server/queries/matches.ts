import { createClient } from "@/lib/supabase/server";

export interface CallupDetail {
  match_id: string;
  player_id: string;
  full_name: string;
  cap_number: number | null;
  status: string;
  confirmed_at: string | null;
  source_team_id: string | null;
}

export interface MatchDetail {
  id: string;
  season_id: string;
  team_id: string;
  team_label: string;
  team_color: string;
  opponent: string;
  competition_type: string;
  is_home: boolean;
  status: string;
  scheduled_at: string;
  location: string | null;
  pool_name: string | null;
  notes: string | null;
  final_score_us: number | null;
  final_score_them: number | null;
  logistics_enabled: boolean;
}

export interface MatchScorer {
  player_id: string;
  full_name: string;
  goals: number;
  mvp: boolean;
  cap_number: number | null;
}

function extractJoined<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function getMatchById(matchId: string): Promise<MatchDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, season_id, team_id, opponent, competition_type, is_home, status, scheduled_at, location, pool_name, notes, final_score_us, final_score_them, logistics_enabled, teams!matches_team_id_fkey(label, color)",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (error) {
    throw new Error("No pudimos cargar el partido.");
  }
  if (!data) return null;
  const team = extractJoined((data as { teams: unknown }).teams) as {
    label?: string;
    color?: string;
  } | null;
  return {
    id: (data as { id: string }).id,
    season_id: (data as { season_id: string }).season_id,
    team_id: (data as { team_id: string }).team_id,
    team_label: team?.label ?? "Equipo",
    team_color: team?.color ?? "#1E5AA8",
    opponent: (data as { opponent: string }).opponent,
    competition_type: (data as { competition_type: string }).competition_type,
    is_home: (data as { is_home: boolean }).is_home,
    status: (data as { status: string }).status,
    scheduled_at: (data as { scheduled_at: string }).scheduled_at,
    location: (data as { location: string | null }).location,
    pool_name: (data as { pool_name: string | null }).pool_name,
    notes: (data as { notes: string | null }).notes,
    final_score_us: (data as { final_score_us: number | null }).final_score_us,
    final_score_them: (data as { final_score_them: number | null }).final_score_them,
    logistics_enabled: (data as { logistics_enabled: boolean }).logistics_enabled,
  };
}

export async function getMatchCallups(matchId: string): Promise<CallupDetail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_callups")
    .select(
      "match_id, player_id, cap_number, status, confirmed_at, source_team_id, profiles!match_callups_player_id_fkey(full_name)",
    )
    .eq("match_id", matchId)
    .order("cap_number", { ascending: true });

  if (error) {
    throw new Error("No pudimos cargar la convocatoria.");
  }

  const out: CallupDetail[] = [];
  for (const row of (data ?? []) as Array<{
    match_id: string;
    player_id: string;
    cap_number: number | null;
    status: string;
    confirmed_at: string | null;
    source_team_id: string | null;
    profiles: unknown;
  }>) {
    const profile = extractJoined(row.profiles) as { full_name?: string } | null;
    out.push({
      match_id: row.match_id,
      player_id: row.player_id,
      full_name: profile?.full_name ?? "Sin nombre",
      cap_number: row.cap_number,
      status: row.status,
      confirmed_at: row.confirmed_at,
      source_team_id: row.source_team_id,
    });
  }
  out.sort((a, b) => {
    const ca = a.cap_number ?? 999;
    const cb = b.cap_number ?? 999;
    if (ca !== cb) return ca - cb;
    return a.full_name.localeCompare(b.full_name, "es");
  });
  return out;
}

async function getCapNumbersForMatch(matchId: string): Promise<Map<string, number | null>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_callups")
    .select("player_id, cap_number")
    .eq("match_id", matchId);
  const m = new Map<string, number | null>();
  for (const row of (data ?? []) as Array<{
    player_id: string;
    cap_number: number | null;
  }>) {
    m.set(row.player_id, row.cap_number);
  }
  return m;
}

function toScorer(
  row: { player_id: string; goals: number; mvp: boolean; profiles: unknown },
  capMap: Map<string, number | null>,
): MatchScorer {
  const profile = extractJoined(row.profiles) as { full_name?: string } | null;
  return {
    player_id: row.player_id,
    full_name: profile?.full_name ?? "Sin nombre",
    goals: row.goals,
    mvp: row.mvp,
    cap_number: capMap.get(row.player_id) ?? null,
  };
}

export async function getMatchTopScorers(matchId: string, limit = 3): Promise<MatchScorer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_stats")
    .select("player_id, goals, mvp, profiles!match_stats_player_id_fkey(full_name)")
    .eq("match_id", matchId)
    .order("goals", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("No pudimos cargar los goleadores.");
  }
  const capMap = await getCapNumbersForMatch(matchId);
  return (
    (data ?? []) as Array<{
      player_id: string;
      goals: number;
      mvp: boolean;
      profiles: unknown;
    }>
  ).map((row) => toScorer(row, capMap));
}

export async function getMatchMvp(matchId: string): Promise<MatchScorer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_stats")
    .select("player_id, goals, mvp, profiles!match_stats_player_id_fkey(full_name)")
    .eq("match_id", matchId)
    .eq("mvp", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("No pudimos cargar el MVP.");
  }
  if (!data) return null;
  const capMap = await getCapNumbersForMatch(matchId);
  const row = data as {
    player_id: string;
    goals: number;
    mvp: boolean;
    profiles: unknown;
  };
  return toScorer(row, capMap);
}

export async function isProfileCoachOfMatch(matchId: string, profileId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("team_id")
    .eq("id", matchId)
    .maybeSingle();
  if (matchError || !match) return false;
  const teamId = (match as { team_id: string }).team_id;
  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId)
    .eq("role", "coach")
    .eq("scope_team_id", teamId)
    .maybeSingle();
  if (roleError) return false;
  return role != null;
}
