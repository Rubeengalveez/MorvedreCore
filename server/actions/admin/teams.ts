"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { canRosterPlayer, defaultTeamColor } from "@/lib/domain/teams";
import type { CategoryCode, TeamGender } from "@/lib/domain/categories";

import { requireAdmin } from "./_helpers";

export type Team = Tables<"teams", "Row">;

const categoryEnum = z.enum([
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "absoluto",
  "escuela",
]);

const teamGenderEnum = z.enum(["male", "female", "mixed"]);
const teamTypeEnum = z.enum(["competitive", "school"]);
const staffRoleEnum = z.enum(["head_coach", "assistant_coach", "delegate", "physical_trainer"]);

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido. Usa el formato #RRGGBB.");

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida. Usa el formato AAAA-MM-DD.")
  .optional();

const createTeamSchema = z.object({
  season_id: z.string().uuid("Temporada inválida."),
  category_code: categoryEnum,
  label: z
    .string()
    .trim()
    .min(1, "El nombre del equipo es obligatorio.")
    .max(50, "Máximo 50 caracteres."),
  gender: teamGenderEnum,
  team_type: teamTypeEnum.optional(),
  color: hexColor.optional(),
  home_pool: z.string().trim().max(100, "Máximo 100 caracteres.").optional(),
  notes: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional(),
});

const updateTeamSchema = z
  .object({
    season_id: z.string().uuid("Temporada inválida.").optional(),
    category_code: categoryEnum.optional(),
    label: z
      .string()
      .trim()
      .min(1, "El nombre del equipo es obligatorio.")
      .max(50, "Máximo 50 caracteres.")
      .optional(),
    gender: teamGenderEnum.optional(),
    team_type: teamTypeEnum.optional(),
    color: hexColor.optional(),
    home_pool: z.string().trim().max(100, "Máximo 100 caracteres.").nullable().optional(),
    notes: z.string().trim().max(1000, "Máximo 1000 caracteres.").nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios para guardar.",
  });

const staffSchema = z.object({
  team_id: z.string().uuid("Equipo inválido."),
  profile_id: z.string().uuid("Persona inválida."),
  role: staffRoleEnum,
});

const rosterSchema = z.object({
  team_id: z.string().uuid("Equipo inválido."),
  player_id: z.string().uuid("Jugador inválido."),
  squad_number: z
    .number()
    .int("Dorsal entero.")
    .min(0, "Mínimo 0.")
    .max(99, "Máximo 99.")
    .optional(),
  joined_at: isoDate,
});

const unrosterSchema = z.object({
  team_id: z.string().uuid("Equipo inválido."),
  player_id: z.string().uuid("Jugador inválido."),
});

const idSchema = z.object({ id: z.string().uuid("Identificador inválido.") });

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) {
    throw new Error(fallback);
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createTeam(input: {
  season_id: string;
  category_code: CategoryCode;
  label: string;
  gender: TeamGender;
  team_type?: "competitive" | "school";
  color?: string;
  home_pool?: string;
  notes?: string;
}): Promise<Team> {
  await requireAdmin();

  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .insert({
      season_id: parsed.data.season_id,
      category_code: parsed.data.category_code,
      label: parsed.data.label,
      gender: parsed.data.gender,
      team_type: parsed.data.team_type ?? "competitive",
      color: parsed.data.color ?? defaultTeamColor(parsed.data.category_code),
      home_pool: parsed.data.home_pool ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un equipo con ese nombre en esta temporada.");
    }
    throw new Error("No pudimos crear el equipo. Inténtalo de nuevo.");
  }
  if (!data) {
    throw new Error("No pudimos crear el equipo. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/teams");
  revalidatePath("/admin");

  return data;
}

export async function updateTeam(
  id: string,
  input: {
    season_id?: string;
    category_code?: CategoryCode;
    label?: string;
    gender?: TeamGender;
    team_type?: "competitive" | "school";
    color?: string;
    home_pool?: string | null;
    notes?: string | null;
  },
): Promise<Team> {
  await requireAdmin();

  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const parsed = updateTeamSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .update(parsed.data)
    .eq("id", parsedId.data.id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un equipo con ese nombre en esta temporada.");
    }
    throw new Error("No pudimos actualizar el equipo. Inténtalo de nuevo.");
  }
  if (!data) {
    throw new Error("No pudimos actualizar el equipo. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${parsedId.data.id}`);

  return data;
}

export async function assignStaff(input: {
  team_id: string;
  profile_id: string;
  role: "head_coach" | "assistant_coach" | "delegate" | "physical_trainer";
}): Promise<void> {
  const admin = await requireAdmin();

  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("team_staff").insert({
    team_id: parsed.data.team_id,
    profile_id: parsed.data.profile_id,
    role: parsed.data.role,
    granted_by: admin.id,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Esa persona ya tiene ese rol en este equipo.");
    }
    if (error.code === "23503") {
      throw new Error("El equipo o la persona no existen.");
    }
    throw new Error("No pudimos asignar el rol. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/staff");
  revalidatePath(`/admin/teams/${parsed.data.team_id}`);
}

export async function unassignStaff(input: {
  team_id: string;
  profile_id: string;
  role: "head_coach" | "assistant_coach" | "delegate" | "physical_trainer";
}): Promise<void> {
  await requireAdmin();

  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_staff")
    .delete()
    .eq("team_id", parsed.data.team_id)
    .eq("profile_id", parsed.data.profile_id)
    .eq("role", parsed.data.role);

  throwIfError(error, "No pudimos quitar el rol. Inténtalo de nuevo.");

  revalidatePath("/admin/staff");
  revalidatePath(`/admin/teams/${parsed.data.team_id}`);
}

export async function rosterPlayer(input: {
  team_id: string;
  player_id: string;
  squad_number?: number;
  joined_at?: string;
}): Promise<void> {
  await requireAdmin();

  const parsed = rosterSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, category_code")
    .eq("id", parsed.data.team_id)
    .maybeSingle();

  throwIfError(teamError, "No pudimos verificar el equipo.");
  if (!team) {
    throw new Error("El equipo no existe.");
  }

  const { data: player, error: playerError } = await supabase
    .from("profiles")
    .select("id, birth_year")
    .eq("id", parsed.data.player_id)
    .maybeSingle();

  throwIfError(playerError, "No pudimos verificar al jugador.");
  if (!player) {
    throw new Error("El jugador no existe.");
  }

  if (player.birth_year == null) {
    throw new Error("El jugador no tiene año de nacimiento. Edítalo antes de asignarlo.");
  }

  const currentYear = new Date().getFullYear();
  if (!canRosterPlayer(player.birth_year, team.category_code, currentYear)) {
    throw new Error(
      "El jugador no encaja en la categoría del equipo (admite como máximo un año de diferencia).",
    );
  }

  const { error } = await supabase.from("team_rosters").insert({
    team_id: parsed.data.team_id,
    player_id: parsed.data.player_id,
    squad_number: parsed.data.squad_number ?? null,
    joined_at: parsed.data.joined_at ?? todayIso(),
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("El jugador ya está en este equipo.");
    }
    throw new Error("No pudimos añadir al jugador. Inténtalo de nuevo.");
  }

  revalidatePath(`/admin/teams/${parsed.data.team_id}`);
  revalidatePath("/admin/players");
  revalidatePath(`/profile/${parsed.data.player_id}`);
}

export async function unrosterPlayer(input: { team_id: string; player_id: string }): Promise<void> {
  await requireAdmin();

  const parsed = unrosterSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_rosters")
    .update({ left_at: todayIso() })
    .eq("team_id", parsed.data.team_id)
    .eq("player_id", parsed.data.player_id)
    .is("left_at", null);

  throwIfError(error, "No pudimos sacar al jugador del equipo.");

  revalidatePath(`/admin/teams/${parsed.data.team_id}`);
  revalidatePath("/admin/players");
  revalidatePath(`/profile/${parsed.data.player_id}`);
}
