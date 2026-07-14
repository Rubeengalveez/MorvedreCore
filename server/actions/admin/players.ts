"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/domain/permissions";
import {
  createPlayerSchema,
  idSchema,
  linkSchema,
  roleAssignmentSchema,
  unlinkSchema,
  updatePlayerSchema,
} from "@/lib/domain/admin-schemas";

import { requireAdmin, requirePermission } from "./_helpers";
import { rosterPlayer, unrosterPlayer } from "./teams";

export type Player = Tables<"profiles">;

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) {
    throw new Error(fallback);
  }
}

export async function createPlayer(input: {
  full_name: string;
  birth_year: number;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  cap_number?: number;
  phone_e164?: string;
  email_contact?: string;
  photo_url?: string;
  team_color?: string;
  school_enrolled?: boolean;
  school_payment_paid?: boolean;
  must_change_password?: boolean;
  license_active?: boolean;
  notes?: string | null;
}): Promise<Player> {
  await requirePermission("manage_players");

  const parsed = createPlayerSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      auth_user_id: null,
      full_name: parsed.data.full_name,
      birth_year: parsed.data.birth_year,
      gender: parsed.data.gender ?? "prefer_not_to_say",
      cap_number: parsed.data.cap_number ?? null,
      phone_e164: parsed.data.phone_e164 ?? null,
      email_contact: parsed.data.email_contact ?? null,
      photo_url: parsed.data.photo_url ?? null,
      team_color: parsed.data.team_color ?? null,
      school_enrolled: parsed.data.school_enrolled ?? false,
      school_payment_paid: parsed.data.school_payment_paid ?? false,
      must_change_password: parsed.data.must_change_password ?? false,
      license_active: true,
      is_active: true,
      notes: parsed.data.notes ?? null,
    })
    .select("*")
    .single();

  throwIfError(error, "No pudimos crear el jugador. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos crear el jugador. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/players");
  revalidatePath("/admin");

  return data;
}

export async function updatePlayer(
  id: string,
  input: {
    full_name?: string;
    birth_year?: number | null;
    gender?: "male" | "female" | "other" | "prefer_not_to_say";
    cap_number?: number | null;
    phone_e164?: string | null;
    email_contact?: string | null;
    photo_url?: string | null;
    team_color?: string | null;
    school_enrolled?: boolean;
    school_payment_paid?: boolean;
    license_active?: boolean;
    notes?: string | null;
    is_active?: boolean;
  },
): Promise<Player> {
  await requirePermission("manage_players");

  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const parsed = updatePlayerSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      birth_year: parsed.data.birth_year,
      gender: parsed.data.gender as "male" | "female" | "other" | "prefer_not_to_say" | undefined,
      cap_number: parsed.data.cap_number,
      photo_url: parsed.data.photo_url,
      phone_e164: parsed.data.phone_e164,
      email_contact: parsed.data.email_contact,
      notes: parsed.data.notes,
      team_color: parsed.data.team_color,
      school_enrolled: parsed.data.school_enrolled ?? false,
      school_payment_paid: parsed.data.school_payment_paid ?? false,
      is_active: parsed.data.is_active,
    })
    .eq("id", parsedId.data.id)
    .select("*")
    .single();

  throwIfError(error, "No pudimos actualizar el jugador. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos actualizar el jugador. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/players");
  revalidatePath(`/admin/players/${parsedId.data.id}`);
  revalidatePath(`/profile/${parsedId.data.id}`);

  return data;
}

export async function setPlayerActive(input: {
  profile_id: string;
  active: boolean;
}): Promise<void> {
  await requirePermission("manage_players");
  const parsed = z.object({ profile_id: z.string().uuid(), active: z.boolean() }).safeParse(input);
  if (!parsed.success) throw new Error("Jugador inválido.");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: parsed.data.active })
    .eq("id", parsed.data.profile_id);
  throwIfError(error, "No pudimos cambiar el estado del jugador.");

  revalidatePath("/admin/players");
  revalidatePath("/team");
  revalidatePath("/calendar");
  revalidatePath("/attendance");
}

export async function assignToTeam(input: {
  profile_id: string;
  team_id: string;
  squad_number?: number;
}): Promise<void> {
  await rosterPlayer({
    team_id: input.team_id,
    player_id: input.profile_id,
    squad_number: input.squad_number,
  });
}

export async function removeFromTeam(input: {
  profile_id: string;
  team_id: string;
}): Promise<void> {
  await unrosterPlayer({
    team_id: input.team_id,
    player_id: input.profile_id,
  });
}

export async function linkParentChild(input: {
  parent_profile_id: string;
  child_profile_id: string;
  relation: "mother" | "father" | "legal_guardian" | "other";
}): Promise<void> {
  await requirePermission("manage_families");

  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  if (parsed.data.parent_profile_id === parsed.data.child_profile_id) {
    throw new Error("El tutor y el hijo deben ser personas distintas.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("parent_child_links").insert({
    parent_profile_id: parsed.data.parent_profile_id,
    child_profile_id: parsed.data.child_profile_id,
    relation: parsed.data.relation,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Este vínculo ya existe.");
    }
    if (error.code === "23503") {
      throw new Error("El tutor o el hijo no existen.");
    }
    throw new Error("No pudimos crear el vínculo familiar. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/families");
}

export async function unlinkParentChild(input: {
  parent_profile_id: string;
  child_profile_id: string;
}): Promise<void> {
  await requirePermission("manage_families");

  const parsed = unlinkSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_child_links")
    .delete()
    .eq("parent_profile_id", parsed.data.parent_profile_id)
    .eq("child_profile_id", parsed.data.child_profile_id);

  throwIfError(error, "No pudimos eliminar el vínculo. Inténtalo de nuevo.");

  revalidatePath("/admin/families");
}

export async function assignRole(input: {
  profile_id: string;
  role: "admin" | "coach" | "delegate" | "directiva" | "parent" | "player";
  scope_team_id?: string | null;
}): Promise<void> {
  const admin = await requireAdmin();

  const parsed = roleAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  if (parsed.data.role === "coach" && parsed.data.scope_team_id == null) {
    throw new Error("El rol de entrenador requiere un equipo asociado.");
  }

  if (parsed.data.scope_team_id) {
    const supabase = await createClient();
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id")
      .eq("id", parsed.data.scope_team_id)
      .maybeSingle();
    throwIfError(teamError, "No pudimos verificar el equipo.");
    if (!team) {
      throw new Error("El equipo seleccionado no existe.");
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_roles").insert({
    profile_id: parsed.data.profile_id,
    role: parsed.data.role,
    scope_team_id: parsed.data.scope_team_id ?? null,
    granted_by: admin.id,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Esa persona ya tiene ese rol.");
    }
    if (error.code === "23503") {
      throw new Error("La persona o el equipo no existen.");
    }
    throw new Error("No pudimos asignar el rol. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/staff");
  revalidatePath("/admin/players");
}

export async function unassignRole(input: {
  profile_id: string;
  role: "admin" | "coach" | "delegate" | "directiva" | "parent" | "player";
  scope_team_id?: string | null;
}): Promise<void> {
  await requireAdmin();

  const parsed = roleAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  let query = supabase
    .from("user_roles")
    .delete()
    .eq("profile_id", parsed.data.profile_id)
    .eq("role", parsed.data.role);

  if (parsed.data.scope_team_id == null) {
    query = query.is("scope_team_id", null);
  } else {
    query = query.eq("scope_team_id", parsed.data.scope_team_id);
  }

  const { error } = await query;

  throwIfError(error, "No pudimos quitar el rol. Inténtalo de nuevo.");

  revalidatePath("/admin/staff");
  revalidatePath("/admin/players");
}

const profilePermissionSchema = z.object({
  profile_id: z.string().uuid(),
  permission: z.enum(ADMIN_PERMISSIONS).refine((value) => value !== "manage_attendance"),
  enabled: z.boolean(),
});

export async function setProfileAdminPermission(input: {
  profile_id: string;
  permission: Exclude<AdminPermission, "manage_attendance">;
  enabled: boolean;
}): Promise<void> {
  const admin = await requireAdmin();
  const parsed = profilePermissionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("El permiso seleccionado no es válido.");
  }

  const supabase = createAdminClient();
  if (parsed.data.enabled) {
    const { error } = await supabase.from("profile_permissions").upsert(
      {
        profile_id: parsed.data.profile_id,
        permission: parsed.data.permission,
        granted_by: admin.id,
      },
      { onConflict: "profile_id,permission" },
    );
    throwIfError(error, "No pudimos conceder el permiso.");
  } else {
    const { error } = await supabase
      .from("profile_permissions")
      .delete()
      .eq("profile_id", parsed.data.profile_id)
      .eq("permission", parsed.data.permission);
    throwIfError(error, "No pudimos retirar el permiso.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/staff");
}
