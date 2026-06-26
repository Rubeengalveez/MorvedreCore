"use server";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type AdminProfile = Tables<"profiles", "Row">;

export async function requireAdmin(): Promise<AdminProfile> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No has iniciado sesión.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error("No pudimos verificar tu identidad. Inténtalo de nuevo.");
  }

  if (!profile) {
    throw new Error("Tu perfil no está configurado. Contacta con un administrador.");
  }

  const { data: adminRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();

  if (roleError) {
    throw new Error("No pudimos verificar tus permisos. Inténtalo de nuevo.");
  }

  if (!adminRole) {
    throw new Error("No tienes permisos de administrador.");
  }

  return profile;
}

export async function requireCoachOf(teamId: string): Promise<AdminProfile> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No has iniciado sesión.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error("No pudimos verificar tu identidad. Inténtalo de nuevo.");
  }

  if (!profile) {
    throw new Error("Tu perfil no está configurado. Contacta con un administrador.");
  }

  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();

  if (adminRole) {
    return profile;
  }

  const { data: coachRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("role", "coach")
    .eq("scope_team_id", teamId)
    .maybeSingle();

  if (roleError) {
    throw new Error("No pudimos verificar tus permisos. Inténtalo de nuevo.");
  }

  if (!coachRole) {
    throw new Error("No tienes permisos para gestionar este equipo.");
  }

  return profile;
}
