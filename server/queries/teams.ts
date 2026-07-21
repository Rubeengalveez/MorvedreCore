import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/types/database";

export type Team = Tables<"teams">;

export interface TeamSummary {
  id: string;
  label: string;
  category_code: string;
  gender: string;
  team_type: string;
  color: string;
  season_id: string;
  home_pool: string | null;
  player_count: number;
}

export interface RosterPlayer {
  player_id: string;
  squad_number: number | null;
  full_name: string;
  photo_url: string | null;
  birth_year: number | null;
  cap_number: number | null;
}

export interface StaffMember {
  profile_id: string;
  full_name: string;
  photo_url: string | null;
  role: string;
}

export interface TeamListItem {
  id: string;
  label: string;
  category_code: string;
  gender: string;
  team_type: string;
  color: string;
  season_id: string;
  home_pool: string | null;
  player_count: number;
  coach_name: string | null;
  featured_player_name: string | null;
  featured_player_cap: number | null;
  featured_player_id: string | null;
}

function extractJoined<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

const TEAM_PUBLIC_SELECT = `
  id,
  label,
  category_code,
  gender,
  team_type,
  color,
  season_id,
  home_pool
`;

export async function getTeamById(
  teamId: string,
  client?: SupabaseClient<Database>,
): Promise<Team | null> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.from("teams").select("*").eq("id", teamId).maybeSingle();

  if (error) {
    throw new Error("No pudimos cargar el equipo.");
  }

  return data;
}

export async function getTeamRoster(
  teamId: string,
  client?: SupabaseClient<Database>,
): Promise<RosterPlayer[]> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("team_rosters")
    .select(
      `
      player_id,
      squad_number,
      profiles!team_rosters_player_id_fkey(
        id,
        full_name,
        photo_url,
        birth_year,
        cap_number,
        is_active
      )
    `,
    )
    .eq("team_id", teamId)
    .is("left_at", null);

  if (error) {
    throw new Error("No pudimos cargar la plantilla del equipo.");
  }

  const result: RosterPlayer[] = [];
  for (const row of data ?? []) {
    const profile = extractJoined(row.profiles);
    if (profile && typeof profile === "object" && "id" in profile) {
      const p = profile as {
        id: string;
        full_name: string;
        photo_url: string | null;
        birth_year: number | null;
        cap_number: number | null;
        is_active: boolean;
      };
      if (!p.is_active) continue;
      result.push({
        player_id: p.id,
        squad_number: row.squad_number,
        full_name: p.full_name,
        photo_url: p.photo_url,
        birth_year: p.birth_year,
        cap_number: p.cap_number,
      });
    }
  }

  result.sort((a, b) => {
    if (a.squad_number != null && b.squad_number != null) {
      return a.squad_number - b.squad_number;
    }
    if (a.squad_number != null) return -1;
    if (b.squad_number != null) return 1;
    return a.full_name.localeCompare(b.full_name, "es");
  });

  return result;
}

export async function getTeamStaff(
  teamId: string,
  client?: SupabaseClient<Database>,
): Promise<StaffMember[]> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("team_staff")
    .select(
      `
      profile_id,
      role,
      profiles!team_staff_profile_id_fkey(
        id,
        full_name,
        photo_url
      )
    `,
    )
    .eq("team_id", teamId);

  if (error) {
    throw new Error("No pudimos cargar el cuerpo técnico del equipo.");
  }

  const result: StaffMember[] = [];
  for (const row of data ?? []) {
    const profile = extractJoined(row.profiles);
    if (profile && typeof profile === "object" && "id" in profile) {
      const p = profile as {
        id: string;
        full_name: string;
        photo_url: string | null;
      };
      result.push({
        profile_id: p.id,
        full_name: p.full_name,
        photo_url: p.photo_url,
        role: row.role,
      });
    }
  }

  const roleOrder: Record<string, number> = {
    head_coach: 0,
    assistant_coach: 1,
    physical_trainer: 2,
    delegate: 3,
  };

  result.sort((a, b) => {
    const aOrder = roleOrder[a.role] ?? 99;
    const bOrder = roleOrder[b.role] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.full_name.localeCompare(b.full_name, "es");
  });

  return result;
}

export async function getTeamsForProfileInSeason(
  profileId: string,
  seasonId: string,
  client?: SupabaseClient<Database>,
): Promise<TeamSummary[]> {
  const supabase = client ?? (await createClient());

  const { data: rosterRows, error: rosterError } = await supabase
    .from("team_rosters")
    .select(
      `
      team_id,
      teams!team_rosters_team_id_fkey(${TEAM_PUBLIC_SELECT})
    `,
    )
    .eq("player_id", profileId)
    .is("left_at", null);

  if (rosterError) {
    throw new Error("No pudimos cargar tus equipos.");
  }

  const { data: staffRows, error: staffError } = await supabase
    .from("team_staff")
    .select(
      `
      team_id,
      teams!team_staff_team_id_fkey(${TEAM_PUBLIC_SELECT})
    `,
    )
    .eq("profile_id", profileId);

  if (staffError) {
    throw new Error("No pudimos cargar tus equipos.");
  }

  const teamMap = new Map<string, TeamSummary>();

  for (const row of rosterRows ?? []) {
    const team = extractJoined(row.teams);
    if (team && team.season_id === seasonId) {
      teamMap.set(team.id, {
        id: team.id,
        label: team.label,
        category_code: team.category_code,
        gender: team.gender,
        team_type: team.team_type,
        color: team.color,
        season_id: team.season_id,
        home_pool: team.home_pool,
        player_count: 0,
      });
    }
  }

  for (const row of staffRows ?? []) {
    const team = extractJoined(row.teams);
    if (!team || team.season_id !== seasonId) continue;
    if (teamMap.has(team.id)) continue;
    teamMap.set(team.id, {
      id: team.id,
      label: team.label,
      category_code: team.category_code,
      gender: team.gender,
      team_type: team.team_type,
      color: team.color,
      season_id: team.season_id,
      home_pool: team.home_pool,
      player_count: 0,
    });
  }

  const teamIds = Array.from(teamMap.keys());
  if (teamIds.length > 0) {
    const { data: countRows, error: countError } = await supabase
      .from("team_rosters")
      .select("team_id")
      .in("team_id", teamIds)
      .is("left_at", null);

    if (countError) {
      throw new Error("No pudimos calcular los jugadores de tus equipos.");
    }

    const counts = new Map<string, number>();
    for (const row of countRows ?? []) {
      counts.set(row.team_id, (counts.get(row.team_id) ?? 0) + 1);
    }
    for (const team of teamMap.values()) {
      team.player_count = counts.get(team.id) ?? 0;
    }
  }

  return Array.from(teamMap.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export async function isProfileStaffInSeason(
  profileId: string,
  seasonId: string,
  client?: SupabaseClient<Database>,
): Promise<boolean> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("team_staff")
    .select("team_id, teams!team_staff_team_id_fkey(season_id)")
    .eq("profile_id", profileId);

  if (error) {
    return false;
  }

  for (const row of data ?? []) {
    const team = extractJoined(row.teams);
    if (team && team.season_id === seasonId) return true;
  }
  return false;
}

export async function getAllTeamsInSeason(seasonId: string): Promise<TeamListItem[]> {
  const supabase = await createClient();

  const { data: teamRows, error: teamError } = await supabase
    .from("teams")
    .select(TEAM_PUBLIC_SELECT)
    .eq("season_id", seasonId)
    .order("category_code", { ascending: true })
    .order("label", { ascending: true });

  if (teamError || !teamRows) {
    return [];
  }

  const teamIds = (teamRows as Array<{ id: string }>).map((t) => t.id);
  const result: TeamListItem[] = (
    teamRows as Array<{
      id: string;
      label: string;
      category_code: string;
      gender: string;
      team_type: string;
      color: string;
      season_id: string;
      home_pool: string | null;
    }>
  ).map((t) => ({
    id: t.id,
    label: t.label,
    category_code: t.category_code,
    gender: t.gender,
    team_type: t.team_type,
    color: t.color,
    season_id: t.season_id,
    home_pool: t.home_pool,
    player_count: 0,
    coach_name: null,
    featured_player_name: null,
    featured_player_cap: null,
    featured_player_id: null,
  }));

  if (teamIds.length === 0) return result;

  const [rosterRes, staffRes, topScorersRes] = await Promise.all([
    supabase
      .from("team_rosters")
      .select(
        "team_id, squad_number, profiles!team_rosters_player_id_fkey(id, full_name, cap_number, is_active)",
      )
      .in("team_id", teamIds)
      .is("left_at", null),
    supabase
      .from("team_staff")
      .select("team_id, role, profiles!team_staff_profile_id_fkey(full_name)")
      .in("team_id", teamIds)
      .eq("role", "head_coach"),
    supabase
      .from("ranking_snapshots")
      .select("player_id, scope_key, goals")
      .eq("season_id", seasonId)
      .eq("scope", "team")
      .in("scope_key", teamIds)
      .gt("goals", 0)
      .order("goals", { ascending: false })
      .limit(teamIds.length * 5),
  ]);

  if (rosterRes.error) {
    throw new Error("No pudimos calcular las plantillas de los equipos.");
  }

  if (staffRes.error) {
    throw new Error("No pudimos cargar los entrenadores de los equipos.");
  }

  const counts = new Map<string, number>();
  const featuredByTeam = new Map<
    string,
    { player_id: string; full_name: string; cap: number | null }
  >();
  for (const row of (rosterRes.data ?? []) as Array<{
    team_id: string;
    squad_number: number | null;
    profiles: unknown;
  }>) {
    const profile = extractJoined(row.profiles) as {
      id?: string;
      full_name?: string;
      cap_number?: number | null;
      is_active?: boolean;
    } | null;
    if (!profile?.id || profile.is_active === false) continue;
    counts.set(row.team_id, (counts.get(row.team_id) ?? 0) + 1);
    const cap = row.squad_number ?? profile.cap_number ?? null;
    if (cap == null) continue;
    const current = featuredByTeam.get(row.team_id);
    if (!current || cap < (current.cap ?? 99)) {
      featuredByTeam.set(row.team_id, {
        player_id: profile.id,
        full_name: profile.full_name ?? "Sin nombre",
        cap,
      });
    }
  }
  for (const row of (staffRes.data ?? []) as Array<{
    team_id: string;
    profiles: unknown;
  }>) {
    const team = result.find((t) => t.id === row.team_id);
    if (!team) continue;
    const profile = extractJoined(row.profiles) as { full_name?: string } | null;
    team.coach_name = profile?.full_name ?? null;
  }

  const topScorerPlayerIds = Array.from(
    new Set((topScorersRes.data ?? []).map((r) => (r as { player_id: string }).player_id)),
  );
  if (topScorerPlayerIds.length > 0) {
    const { data: topProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, cap_number")
      .eq("is_active", true)
      .in("id", topScorerPlayerIds);
    const profileMap = new Map<string, { full_name: string; cap_number: number | null }>();
    for (const p of (topProfiles ?? []) as Array<{
      id: string;
      full_name: string;
      cap_number: number | null;
    }>) {
      profileMap.set(p.id, p);
    }
    for (const row of (topScorersRes.data ?? []) as Array<{
      player_id: string;
      scope_key: string;
    }>) {
      const teamId = row.scope_key;
      if (featuredByTeam.has(teamId)) continue;
      const profile = profileMap.get(row.player_id);
      if (!profile) continue;
      featuredByTeam.set(teamId, {
        player_id: row.player_id,
        full_name: profile.full_name,
        cap: profile.cap_number ?? null,
      });
    }
  }

  for (const team of result) {
    team.player_count = counts.get(team.id) ?? 0;
    const featured = featuredByTeam.get(team.id);
    if (featured) {
      team.featured_player_id = featured.player_id;
      team.featured_player_name = featured.full_name;
      team.featured_player_cap = featured.cap;
    }
  }

  return result;
}

export async function getTeamMatches(
  teamId: string,
  limit = 20,
): Promise<
  Array<{
    id: string;
    opponent: string;
    scheduled_at: string;
    status: string;
    is_home: boolean;
    competition_type: string;
    location: string | null;
    maps_url: string | null;
    pool_name: string | null;
    final_score_us: number | null;
    final_score_them: number | null;
  }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, opponent, scheduled_at, status, is_home, competition_type, location, maps_url, pool_name, final_score_us, final_score_them",
    )
    .eq("team_id", teamId)
    .order("scheduled_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as Array<{
    id: string;
    opponent: string;
    scheduled_at: string;
    status: string;
    is_home: boolean;
    competition_type: string;
    location: string | null;
    maps_url: string | null;
    pool_name: string | null;
    final_score_us: number | null;
    final_score_them: number | null;
  }>;
}

export async function isProfilePlayerInSeason(
  profileId: string,
  seasonId: string,
  client?: SupabaseClient<Database>,
): Promise<boolean> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("team_rosters")
    .select("team_id, teams!team_rosters_team_id_fkey(season_id)")
    .eq("player_id", profileId)
    .is("left_at", null);

  if (error) {
    return false;
  }

  for (const row of data ?? []) {
    const team = extractJoined(row.teams);
    if (team && team.season_id === seasonId) return true;
  }
  return false;
}
