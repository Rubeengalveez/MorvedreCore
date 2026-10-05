"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { teamDefaultCapsSchema } from "@/lib/domain/team-default-caps";
import type { Tables } from "@/types/database";
import { canRosterPlayer, defaultTeamColor } from "@/lib/domain/teams";
import {
  calendarSeasonStartYear,
  type CategoryCode,
  type TeamGender,
} from "@/lib/domain/categories";
import {
  createTeamSchema,
  idSchema,
  makeRosterSchema,
  staffSchema,
  unrosterSchema,
  updateTeamSchema,
} from "@/lib/domain/admin-schemas";

import { requireAnyPermission, requirePermission } from "./_helpers";

type TeamRow = Tables<"teams">;
export type Team = Omit<TeamRow, "category_code" | "gender" | "team_type"> & {
  category_code: CategoryCode;
  gender: TeamGender;
  team_type: "competitive" | "school";
};

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) {
    throw new Error(fallback);
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function saveTeamDefaultCaps(input: unknown): Promise<void> {
  await requirePermission("manage_teams");
  const parsed = teamDefaultCapsSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Revisa los gorros.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_team_default_caps", {
    p_team_id: parsed.data.team_id,
    p_players: parsed.data.players,
    p_expected: parsed.data.expected,
  });
  if (error)
    throw new Error(
      error.message.includes("Actualiza") || error.message.includes("14 jugadores")
        ? error.message
        : "No pudimos guardar los gorros. Vuelve a intentarlo.",
    );
  revalidatePath(`/admin/teams/${parsed.data.team_id}`);
  revalidatePath(`/team/${parsed.data.team_id}`);
  revalidatePath("/admin/matches", "layout");
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
  await requirePermission("manage_teams");

  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { data: currentSeason, error: seasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();
  throwIfError(seasonError, "No pudimos comprobar la temporada actual.");
  if (!currentSeason) throw new Error("Activa una temporada antes de crear equipos.");
  const { data, error } = await supabase
    .from("teams")
    .insert({
      season_id: currentSeason.id,
      category_code: parsed.data.category_code,
      label: parsed.data.label,
      gender: parsed.data.gender,
      team_type: parsed.data.category_code === "escuela" ? "school" : "competitive",
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

  revalidatePath("/team");
  revalidatePath("/admin/teams");
  revalidatePath("/admin");

  return data as Team;
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
  await requirePermission("manage_teams");

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

  revalidatePath("/team");
  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${parsedId.data.id}`);
  revalidatePath(`/team/${parsedId.data.id}`);

  return data as Team;
}

export async function assignStaff(input: {
  team_id: string;
  profile_id: string;
  role: "head_coach" | "assistant_coach" | "delegate" | "physical_trainer";
}): Promise<void> {
  const admin = await requirePermission("manage_staff");

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
  revalidatePath("/admin/teams");
  revalidatePath("/team");
  revalidatePath(`/team/${parsed.data.team_id}`);
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
}

export async function unassignStaff(input: {
  team_id: string;
  profile_id: string;
  role: "head_coach" | "assistant_coach" | "delegate" | "physical_trainer";
}): Promise<void> {
  await requirePermission("manage_staff");

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
  revalidatePath("/admin/teams");
  revalidatePath("/team");
  revalidatePath(`/team/${parsed.data.team_id}`);
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
}

export async function rosterPlayer(input: {
  team_id: string;
  player_id: string;
  squad_number?: number;
  joined_at?: string;
}): Promise<void> {
  await requireAnyPermission(["manage_teams", "manage_players"]);

  const rosterSchema = makeRosterSchema;
  const parsed = rosterSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, category_code, season_id, seasons!teams_season_id_fkey(start_date, end_date)")
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

  const seasonRow = (team as { seasons?: { start_date?: string } | null }).seasons;
  const seasonYear = seasonRow?.start_date
    ? new Date(seasonRow.start_date).getFullYear()
    : calendarSeasonStartYear();

  if (!canRosterPlayer(player.birth_year, team.category_code as CategoryCode, seasonYear)) {
    throw new Error(
      "El jugador no encaja en la categoría del equipo (admite su categoría y la inmediatamente inferior).",
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("team_rosters")
    .select("left_at")
    .eq("team_id", parsed.data.team_id)
    .eq("player_id", parsed.data.player_id)
    .maybeSingle();
  throwIfError(existingError, "No pudimos comprobar la plantilla.");
  if (existing && existing.left_at === null) {
    throw new Error("El jugador ya está en este equipo.");
  }
  const { error, count } = existing
    ? await supabase
        .from("team_rosters")
        .update(
          { left_at: null, squad_number: parsed.data.squad_number ?? null },
          { count: "exact" },
        )
        .eq("team_id", parsed.data.team_id)
        .eq("player_id", parsed.data.player_id)
        .eq("left_at", existing.left_at!)
    : await supabase.from("team_rosters").insert({
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
  if (existing && count === 0) {
    throw new Error("La plantilla ha cambiado. Actualiza el equipo y vuelve a intentarlo.");
  }

  revalidatePath(`/admin/teams/${parsed.data.team_id}`);
  revalidatePath("/admin/teams");
  revalidatePath("/team");
  revalidatePath(`/team/${parsed.data.team_id}`);
  revalidatePath("/admin/players");
  revalidatePath(`/profile/${parsed.data.player_id}`);
}

export async function unrosterPlayer(input: { team_id: string; player_id: string }): Promise<void> {
  await requireAnyPermission(["manage_teams", "manage_players"]);

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
  revalidatePath("/admin/teams");
  revalidatePath("/team");
  revalidatePath(`/team/${parsed.data.team_id}`);
  revalidatePath("/admin/players");
  revalidatePath(`/profile/${parsed.data.player_id}`);
}
