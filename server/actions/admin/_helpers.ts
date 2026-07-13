import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type AdminProfile = Pick<Tables<"profiles">, "id">;

async function requireAuthenticatedProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No has iniciado sesión.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("No pudimos verificar tu identidad. Inténtalo de nuevo.");
  }
  if (!profile) {
    throw new Error("Tu perfil no está configurado. Contacta con un administrador.");
  }

  return { profile, supabase };
}

export async function requireAdmin(): Promise<AdminProfile> {
  const { profile, supabase } = await requireAuthenticatedProfile();
  const { data: role, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();

  if (error) {
    throw new Error("No pudimos verificar tus permisos. Inténtalo de nuevo.");
  }
  if (!role) {
    throw new Error("No tienes permisos de administrador.");
  }

  return profile;
}

export async function requireSessionProfile(): Promise<AdminProfile> {
  const { profile } = await requireAuthenticatedProfile();
  return profile;
}

export async function requireCoachOf(teamId: string): Promise<AdminProfile> {
  const { profile, supabase } = await requireAuthenticatedProfile();
  const [{ data: adminRole }, { data: coachRole, error }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", profile.id)
      .eq("role", "admin")
      .is("scope_team_id", null)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", profile.id)
      .eq("role", "coach")
      .eq("scope_team_id", teamId)
      .maybeSingle(),
  ]);

  if (error) {
    throw new Error("No pudimos verificar tus permisos. Inténtalo de nuevo.");
  }
  if (!adminRole && !coachRole) {
    throw new Error("No tienes permisos para gestionar este equipo.");
  }

  return profile;
}

export async function requireAttendanceManagerOf(teamId: string): Promise<AdminProfile> {
  const { profile, supabase } = await requireAuthenticatedProfile();
  const [targetTeamRes, permissionRes, staffRes, coachRolesRes] = await Promise.all([
    supabase.from("teams").select("season_id").eq("id", teamId).maybeSingle(),
    supabase
      .from("profile_permissions")
      .select("permission")
      .eq("profile_id", profile.id)
      .eq("permission", "manage_attendance")
      .maybeSingle(),
    supabase
      .from("team_staff")
      .select("team_id, teams!team_staff_team_id_fkey(season_id)")
      .eq("profile_id", profile.id)
      .in("role", ["head_coach", "assistant_coach"]),
    supabase
      .from("user_roles")
      .select("scope_team_id")
      .eq("profile_id", profile.id)
      .eq("role", "coach"),
  ]);

  if (targetTeamRes.error || permissionRes.error || staffRes.error || coachRolesRes.error) {
    throw new Error("No pudimos verificar tus permisos. Inténtalo de nuevo.");
  }
  if (!targetTeamRes.data) {
    throw new Error("El equipo no existe.");
  }
  const targetSeasonId = targetTeamRes.data.season_id;

  const coachTeamIds = new Set(
    (coachRolesRes.data ?? []).map((role) => role.scope_team_id).filter(Boolean),
  );
  const isCoachInSeason = (staffRes.data ?? []).some((staff) => {
    const joinedTeam = Array.isArray(staff.teams) ? staff.teams[0] : staff.teams;
    return joinedTeam?.season_id === targetSeasonId && coachTeamIds.has(staff.team_id);
  });

  if (!permissionRes.data || !isCoachInSeason) {
    throw new Error("No tienes permiso para gestionar la asistencia de esta temporada.");
  }

  return profile;
}

export async function hasAdminAccess(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}
