import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Team = Tables<"teams", "Row">;

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

export async function getTeamById(teamId: string): Promise<Team | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  if (error) {
    throw new Error("No pudimos cargar el equipo.");
  }

  return data;
}

export async function getTeamRoster(teamId: string): Promise<RosterPlayer[]> {
  const supabase = await createClient();
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
        cap_number
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
      };
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

export async function getTeamStaff(teamId: string): Promise<StaffMember[]> {
  const supabase = await createClient();
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
): Promise<TeamSummary[]> {
  const supabase = await createClient();

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
    const { data: countRows } = await supabase
      .from("team_rosters")
      .select("team_id")
      .in("team_id", teamIds)
      .is("left_at", null);

    const counts = new Map<string, number>();
    for (const row of countRows ?? []) {
      counts.set(row.team_id, (counts.get(row.team_id) ?? 0) + 1);
    }
    for (const team of teamMap.values()) {
      team.player_count = counts.get(team.id) ?? 0;
    }
  }

  return Array.from(teamMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "es"),
  );
}

export async function isProfileStaffInSeason(
  profileId: string,
  seasonId: string,
): Promise<boolean> {
  const supabase = await createClient();
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

export async function isProfilePlayerInSeason(
  profileId: string,
  seasonId: string,
): Promise<boolean> {
  const supabase = await createClient();
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
