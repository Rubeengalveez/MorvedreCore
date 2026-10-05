"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/domain/permissions";
import { canViewPersonalFinances, requiresGuardianApproval } from "@/lib/domain/family";
import { canRosterPlayer } from "@/lib/domain/teams";
import type { CategoryCode } from "@/lib/domain/categories";
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

async function requirePlayerTarget(id: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("user_roles")
    .select("profile_id")
    .eq("profile_id", id)
    .eq("role", "player")
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error("No pudimos localizar la ficha del jugador.");
}

const personnelProfileSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  directiva: z.boolean(),
});
const personnelAccessSchema = z.object({
  profileId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
});

export async function createPersonnelProfile(input: unknown): Promise<void> {
  await requireAdmin();
  const parsed = personnelProfileSchema.safeParse(input);
  if (!parsed.success) throw new Error("Revisa el nombre y el correo de la persona.");
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .ilike("email_contact", parsed.data.email)
    .limit(1)
    .maybeSingle();
  if (existing)
    throw new Error("Ese correo ya figura en un perfil. Asigna los permisos al perfil existente.");
  const { data: person, error } = await admin
    .from("profiles")
    .insert({
      full_name: parsed.data.full_name,
      email_contact: parsed.data.email,
      must_change_password: false,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !person) throw new Error("No pudimos crear a esta persona.");
  if (parsed.data.directiva) {
    const { error: roleError } = await admin.from("user_roles").insert({
      profile_id: person.id,
      role: "directiva",
      scope_team_id: null,
    });
    if (roleError) {
      await admin.from("profiles").delete().eq("id", person.id);
      throw new Error("No pudimos asignar el rol de directiva.");
    }
  }
  revalidatePath("/admin/staff");
}

export async function provisionPersonnelAccess(
  input: unknown,
): Promise<{ email: string; temporaryPassword: string | null }> {
  await requireAdmin();
  const parsed = personnelAccessSchema.safeParse(input);
  if (!parsed.success) throw new Error("Selecciona una persona y escribe un correo válido.");
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email_contact, auth_user_id, is_active")
    .eq("id", parsed.data.profileId)
    .maybeSingle();
  if (!profile?.is_active || profile.auth_user_id) {
    throw new Error("Esta persona necesita un perfil activo sin acceso previo.");
  }
  const [{ data: role }, { data: assignment }] = await Promise.all([
    admin
      .from("user_roles")
      .select("id")
      .eq("profile_id", profile.id)
      .in("role", ["coach", "delegate", "directiva", "admin"])
      .limit(1),
    admin.from("team_staff").select("team_id").eq("profile_id", profile.id).limit(1),
  ]);
  if (!role?.length && !assignment?.length) {
    throw new Error("Asigna primero su función en un equipo o en la directiva.");
  }
  const { data: existingAuth, error: lookupError } = await admin
    .rpc("get_auth_user_id_by_email", {
      p_email: parsed.data.email,
    })
    .maybeSingle();
  if (lookupError) throw new Error("No pudimos verificar si el correo ya tiene acceso.");
  let authUserId: string;
  let temporaryPassword: string | null = null;
  if (existingAuth) {
    const { data: account, error } = await admin.auth.admin.getUserById(existingAuth);
    if (
      error ||
      !account.user?.email_confirmed_at ||
      !account.user.identities?.some((identity) => identity.provider === "google") ||
      account.user.email?.toLowerCase() !== parsed.data.email
    ) {
      throw new Error("Ese correo ya tiene cuenta. Usa el perfil existente o recupera su acceso.");
    }
    const { data: linkedProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", existingAuth)
      .maybeSingle();
    if (linkedProfile)
      throw new Error("Esa cuenta ya está vinculada a otro perfil. Asigna allí su función.");
    authUserId = existingAuth;
  } else {
    temporaryPassword = `Mc-${randomBytes(12).toString("base64url")}9aA`;
    const { data: account, error: createError } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: temporaryPassword,
      email_confirm: true,
    });
    if (createError || !account.user) throw new Error("No pudimos crear la cuenta.");
    authUserId = account.user.id;
  }
  const { data: linked, error: linkError } = await admin
    .from("profiles")
    .update({
      auth_user_id: authUserId,
      email_contact: parsed.data.email,
      must_change_password: temporaryPassword !== null,
    })
    .eq("id", profile.id)
    .is("auth_user_id", null)
    .select("id")
    .maybeSingle();
  if (linkError || !linked) {
    if (temporaryPassword) await admin.auth.admin.deleteUser(authUserId);
    throw new Error("No pudimos vincular la cuenta con su perfil.");
  }
  revalidatePath("/admin/staff");
  return { email: parsed.data.email, temporaryPassword };
}

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) {
    throw new Error(fallback);
  }
}

export async function createPlayer(input: {
  full_name: string;
  birth_year: number;
  team_id: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  cap_number?: number;
  phone_e164?: string;
  email_contact?: string;
  photo_url?: string;
  team_color?: string;
  school_enrolled?: boolean;
  school_payment_paid?: boolean;
  license_active?: boolean;
  notes?: string | null;
}): Promise<Player> {
  await requirePermission("manage_players");

  const parsed = createPlayerSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("register_admin_player", { p_input: parsed.data });
  if (error) {
    const safeMessages = [
      "Ya existe un jugador",
      "Ese gorro ya está asignado",
      "La convocatoria por defecto",
      "Selecciona un equipo",
      "El año de nacimiento",
      "Revisa el nombre",
    ];
    throw new Error(
      safeMessages.some((message) => error.message.startsWith(message))
        ? error.message
        : "No pudimos completar el alta. Inténtalo de nuevo.",
    );
  }
  if (!data) throw new Error("No pudimos completar el alta. Inténtalo de nuevo.");
  revalidatePath("/admin/players");
  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${parsed.data.team_id}`);
  revalidatePath("/team", "layout");
  revalidatePath("/admin");
  return data as unknown as Player;
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
  const actor = await requirePermission("manage_players");

  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const parsed = updatePlayerSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  if (parsed.data.is_active === false && actor.id === id)
    throw new Error("No puedes desactivar tu propio perfil desde aquí.");
  await requirePlayerTarget(parsedId.data.id);
  const supabase = createAdminClient();
  if (parsed.data.birth_year != null) {
    if (parsed.data.birth_year > new Date().getFullYear())
      throw new Error("El año de nacimiento no puede ser futuro.");
    const { data: rosters, error: rosterError } = await supabase
      .from("team_rosters")
      .select(
        "team:teams!team_rosters_team_id_fkey(category_code, season:seasons!teams_season_id_fkey(start_date, is_current))",
      )
      .eq("player_id", id)
      .is("left_at", null);
    if (rosterError) throw new Error("No pudimos comprobar sus equipos. Inténtalo de nuevo.");
    for (const roster of rosters ?? []) {
      if (!roster.team?.season?.is_current) continue;
      const year = Number(roster.team.season.start_date.slice(0, 4));
      if (
        parsed.data.birth_year > year ||
        !canRosterPlayer(parsed.data.birth_year, roster.team.category_code as CategoryCode, year)
      )
        throw new Error(
          "Ese año no encaja con sus equipos actuales. Revisa la plantilla en Equipos antes de cambiarlo.",
        );
    }
  }
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) updates[key] = value;
  }
  const { data, error } = await supabase
    .from("profiles")
    .update(updates as never)
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
  revalidatePath("/team", "layout");
  revalidatePath("/admin/teams", "layout");
  revalidatePath("/rankings");

  return data;
}

export async function setPlayerActive(input: {
  profile_id: string;
  active: boolean;
}): Promise<void> {
  const actor = await requirePermission("manage_players");
  const parsed = z.object({ profile_id: z.string().uuid(), active: z.boolean() }).safeParse(input);
  if (!parsed.success) throw new Error("Jugador inválido.");

  if (!parsed.data.active && actor.id === parsed.data.profile_id)
    throw new Error("No puedes desactivar tu propio perfil desde aquí.");
  await requirePlayerTarget(parsed.data.profile_id);
  const supabase = createAdminClient();
  const { error, data } = await supabase
    .from("profiles")
    .update({ is_active: parsed.data.active })
    .eq("id", parsed.data.profile_id)
    .select("id")
    .single();
  throwIfError(error, "No pudimos cambiar el estado del jugador.");
  if (!data) throw new Error("No pudimos localizar la ficha del jugador.");

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

  const admin = createAdminClient();
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, birth_year, is_active")
    .in("id", [parsed.data.parent_profile_id, parsed.data.child_profile_id]);
  if (profilesError || profiles?.length !== 2) {
    throw new Error("El tutor o el hijo no existen.");
  }
  const parent = profiles.find((profile) => profile.id === parsed.data.parent_profile_id);
  const child = profiles.find((profile) => profile.id === parsed.data.child_profile_id);
  if (!parent?.is_active || !child?.is_active) {
    throw new Error("Solo puedes vincular perfiles activos.");
  }
  if (!canViewPersonalFinances(parent.birth_year)) {
    throw new Error("La persona tutora debe ser mayor de edad y tener año de nacimiento.");
  }
  if (!requiresGuardianApproval(child.birth_year)) {
    throw new Error("La gestión familiar está reservada a jugadores menores de edad.");
  }

  const { error } = await admin.from("parent_child_links").insert({
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

  const [parentRoleResult, billingSettingsResult] = await Promise.all([
    admin
      .from("user_roles")
      .select("profile_id")
      .eq("profile_id", parsed.data.parent_profile_id)
      .eq("role", "parent")
      .is("scope_team_id", null)
      .maybeSingle(),
    admin
      .from("treasury_profile_settings")
      .select("profile_id, billing_profile_id")
      .eq("profile_id", parsed.data.child_profile_id)
      .maybeSingle(),
  ]);
  if (parentRoleResult.error || billingSettingsResult.error) {
    await admin
      .from("parent_child_links")
      .delete()
      .eq("parent_profile_id", parsed.data.parent_profile_id)
      .eq("child_profile_id", parsed.data.child_profile_id);
    throw new Error("No pudimos preparar la cuenta familiar.");
  }
  const parentRole = parentRoleResult.data;
  const billingSettings = billingSettingsResult.data;
  let setupError: { message: string } | null = null;
  if (!parentRole) {
    const { error: roleError } = await admin.from("user_roles").insert({
      profile_id: parsed.data.parent_profile_id,
      role: "parent",
      scope_team_id: null,
    });
    setupError = roleError;
  }
  if (!setupError && !billingSettings) {
    const { error: billingError } = await admin.from("treasury_profile_settings").insert({
      profile_id: parsed.data.child_profile_id,
      billing_profile_id: parsed.data.parent_profile_id,
      fee_exempt: false,
    });
    setupError = billingError;
  } else if (!setupError && !billingSettings?.billing_profile_id) {
    const { error: billingError } = await admin
      .from("treasury_profile_settings")
      .update({ billing_profile_id: parsed.data.parent_profile_id })
      .eq("profile_id", parsed.data.child_profile_id);
    setupError = billingError;
  }
  if (setupError) {
    await admin
      .from("parent_child_links")
      .delete()
      .eq("parent_profile_id", parsed.data.parent_profile_id)
      .eq("child_profile_id", parsed.data.child_profile_id);
    throw new Error("No pudimos completar la configuración familiar.");
  }

  revalidatePath("/admin/families");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/calendar");
  revalidatePath("/treasury");
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

  const admin = createAdminClient();
  const [{ count: otherGuardianCount }, { count: pendingOrderCount }] = await Promise.all([
    admin
      .from("parent_child_links")
      .select("parent_profile_id", { count: "exact", head: true })
      .eq("child_profile_id", parsed.data.child_profile_id)
      .neq("parent_profile_id", parsed.data.parent_profile_id),
    admin
      .from("shop_orders")
      .select("id", { count: "exact", head: true })
      .eq("requested_by", parsed.data.child_profile_id)
      .eq("status", "pending_parent"),
  ]);
  if ((otherGuardianCount ?? 0) === 0 && (pendingOrderCount ?? 0) > 0) {
    throw new Error(
      "No puedes dejar a este menor sin tutor mientras tenga compras pendientes de aprobación.",
    );
  }

  const { error } = await admin
    .from("parent_child_links")
    .delete()
    .eq("parent_profile_id", parsed.data.parent_profile_id)
    .eq("child_profile_id", parsed.data.child_profile_id);

  throwIfError(error, "No pudimos eliminar el vínculo. Inténtalo de nuevo.");

  const { data: settings } = await admin
    .from("treasury_profile_settings")
    .select("billing_profile_id")
    .eq("profile_id", parsed.data.child_profile_id)
    .maybeSingle();
  if (settings?.billing_profile_id === parsed.data.parent_profile_id) {
    const { data: replacement } = await admin
      .from("parent_child_links")
      .select("parent_profile_id")
      .eq("child_profile_id", parsed.data.child_profile_id)
      .limit(1)
      .maybeSingle();
    await admin
      .from("treasury_profile_settings")
      .update({ billing_profile_id: replacement?.parent_profile_id ?? null })
      .eq("profile_id", parsed.data.child_profile_id);
  }

  revalidatePath("/admin/families");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/calendar");
  revalidatePath("/treasury");
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
