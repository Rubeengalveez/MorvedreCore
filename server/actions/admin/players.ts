"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

import { requireAdmin } from "./_helpers";
import { rosterPlayer, unrosterPlayer } from "./teams";

export type Player = Tables<"profiles", "Row">;

const genderEnum = z.enum(["male", "female", "other", "prefer_not_to_say"]);
const userRoleEnum = z.enum(["admin", "coach", "delegate", "directiva", "parent", "player"]);
const parentRelationEnum = z.enum(["mother", "father", "legal_guardian", "other"]);

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido. Usa el formato #RRGGBB.")
  .optional();

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "Formato E.164: +34612345678")
  .optional();

const createPlayerSchema = z.object({
  full_name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(100, "Máximo 100 caracteres."),
  birth_year: z
    .number()
    .int("Año entero.")
    .min(1900, "Año entre 1900 y 2100.")
    .max(2100, "Año entre 1900 y 2100."),
  gender: genderEnum.optional(),
  cap_number: z.number().int("Dorsal entero.").min(0, "Mínimo 0.").max(99, "Máximo 99.").optional(),
  phone_e164: phoneSchema,
  email_contact: z.string().email("Email inválido.").optional(),
  photo_url: z.string().url("URL inválida.").optional(),
  team_color: hexColor,
  school_enrolled: z.boolean().optional(),
  school_payment_paid: z.boolean().optional(),
  must_change_password: z.boolean().optional(),
});

const updatePlayerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Mínimo 2 caracteres.")
      .max(100, "Máximo 100 caracteres.")
      .optional(),
    birth_year: z
      .number()
      .int("Año entero.")
      .min(1900, "Año entre 1900 y 2100.")
      .max(2100, "Año entre 1900 y 2100.")
      .nullable()
      .optional(),
    gender: genderEnum.optional(),
    cap_number: z
      .number()
      .int("Dorsal entero.")
      .min(0, "Mínimo 0.")
      .max(99, "Máximo 99.")
      .nullable()
      .optional(),
    phone_e164: z.preprocess(
      emptyToNull,
      z
        .string()
        .regex(/^\+[1-9]\d{6,14}$/)
        .nullable(),
    ),
    email_contact: z.preprocess(emptyToNull, z.string().email("Email inválido.").nullable()),
    photo_url: z.preprocess(emptyToNull, z.string().url("URL inválida.").nullable()),
    team_color: z.preprocess(emptyToNull, hexColor.nullable()),
    school_enrolled: z.boolean().optional(),
    school_payment_paid: z.boolean().optional(),
    notes: z.preprocess(emptyToNull, z.string().max(2000, "Máximo 2000 caracteres.").nullable()),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios para guardar.",
  });

const linkSchema = z.object({
  parent_profile_id: z.string().uuid("Tutor inválido."),
  child_profile_id: z.string().uuid("Hijo inválido."),
  relation: parentRelationEnum,
});

const unlinkSchema = z.object({
  parent_profile_id: z.string().uuid("Tutor inválido."),
  child_profile_id: z.string().uuid("Hijo inválido."),
});

const roleAssignmentSchema = z.object({
  profile_id: z.string().uuid("Persona inválida."),
  role: userRoleEnum,
  scope_team_id: z.string().uuid("Equipo inválido.").nullable().optional(),
});

const idSchema = z.object({ id: z.string().uuid("Identificador inválido.") });

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
}): Promise<Player> {
  await requireAdmin();

  const parsed = createPlayerSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
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
      must_change_password: parsed.data.must_change_password ?? true,
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
    notes?: string | null;
  },
): Promise<Player> {
  await requireAdmin();

  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const parsed = updatePlayerSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
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
  await requireAdmin();

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
  await requireAdmin();

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
