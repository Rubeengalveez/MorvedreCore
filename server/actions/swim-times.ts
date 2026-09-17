"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { clampDateToSeason, madridToday } from "@/lib/domain/swim-times";
import { requireSessionProfile } from "@/server/actions/admin/_helpers";
import { getSwimCoachTeamIds } from "@/server/queries/swim-times";

const timeValue = z.number().int().min(1).max(359_999).nullable();
const baseSchema = z
  .object({
    testDate: z.iso.date({ error: "Elige una fecha válida." }).optional(),
    time50Cs: timeValue,
    time100Cs: timeValue,
  })
  .refine((value) => value.time50Cs != null || value.time100Cs != null, {
    message: "Escribe al menos un tiempo de 50 o 100 metros.",
  });

const createSchema = baseSchema.extend({
  teamId: z.uuid(),
  playerId: z.uuid(),
  operationId: z.uuid(),
});

const updateSchema = baseSchema.extend({
  entryId: z.uuid(),
  revision: z.number().int().positive(),
});

const entryMutationSchema = z.object({
  entryId: z.uuid(),
  revision: z.number().int().positive(),
});

export type SwimTimeActionResult =
  { ok: true; entryId: string; revision: number } | { ok: false; error: string };

async function requireSwimCoach(profileId: string, teamId: string): Promise<void> {
  const coachTeamIds = await getSwimCoachTeamIds(profileId);
  if (!coachTeamIds.includes(teamId)) {
    throw new Error("Solo los entrenadores de este equipo pueden gestionar tiempos de nado.");
  }
}

async function resolveEntryContext(teamId: string, playerId: string, testDate: string) {
  const supabase = await createClient();
  const [{ data: team, error: teamError }, { data: roster, error: rosterError }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("season_id, seasons!teams_season_id_fkey(start_date, end_date)")
        .eq("id", teamId)
        .maybeSingle(),
      supabase
        .from("team_rosters")
        .select("joined_at, left_at")
        .eq("team_id", teamId)
        .eq("player_id", playerId)
        .maybeSingle(),
    ]);
  if (teamError || rosterError) throw new Error("No pudimos comprobar el equipo y el jugador.");
  if (!team || !roster) throw new Error("El jugador no pertenece a este equipo.");
  const season = Array.isArray(team.seasons) ? team.seasons[0] : team.seasons;
  if (!season) {
    throw new Error("No pudimos comprobar la temporada del equipo.");
  }
  const effectiveDate = clampDateToSeason(testDate, season);
  if (effectiveDate < roster.joined_at || (roster.left_at && effectiveDate > roster.left_at)) {
    throw new Error("El jugador no pertenecía a este equipo en esa fecha.");
  }
  return { seasonId: team.season_id, testDate: effectiveDate };
}

function revalidateSwimTimePaths(teamId: string, playerId: string): void {
  revalidatePath(`/team/${teamId}/swim-times`);
  revalidatePath(`/team/${teamId}/players/${playerId}`);
  revalidatePath(`/players/${playerId}/swim-times`);
  revalidatePath("/rankings");
  revalidatePath("/legends");
  revalidatePath("/profile");
}

export async function createSwimTime(
  input: z.input<typeof createSchema>,
): Promise<SwimTimeActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los tiempos." };
  }
  try {
    const rawTestDate = parsed.data.testDate ?? madridToday();
    if (rawTestDate > madridToday()) {
      throw new Error("La fecha no puede estar en el futuro.");
    }
    const profile = await requireSessionProfile();
    await requireSwimCoach(profile.id, parsed.data.teamId);
    const context = await resolveEntryContext(
      parsed.data.teamId,
      parsed.data.playerId,
      rawTestDate,
    );
    const testDate = context.testDate;
    const supabase = await createClient();
    const existing = await supabase
      .from("swim_time_entries")
      .select("id, revision, player_id, team_id, test_date, time_50_cs, time_100_cs")
      .eq("created_by", profile.id)
      .eq("operation_id", parsed.data.operationId)
      .maybeSingle();
    if (existing.error) {
      if (existing.error.message?.includes("public.swim_time_entries")) {
        throw new Error("Falta aplicar la migración de tiempos de nado en la base de datos de Supabase.");
      }
      throw new Error("No pudimos comprobar el guardado anterior.");
    }
    if (existing.data) {
      const same =
        existing.data.player_id === parsed.data.playerId &&
        existing.data.team_id === parsed.data.teamId &&
        existing.data.test_date === testDate &&
        existing.data.time_50_cs === parsed.data.time50Cs &&
        existing.data.time_100_cs === parsed.data.time100Cs;
      return same
        ? { ok: true, entryId: existing.data.id, revision: existing.data.revision }
        : { ok: false, error: "Este guardado ya se utilizó con otros datos. Recarga la pantalla." };
    }
    const { data, error } = await supabase
      .from("swim_time_entries")
      .insert({
        player_id: parsed.data.playerId,
        team_id: parsed.data.teamId,
        season_id: context.seasonId,
        test_date: testDate,
        time_50_cs: parsed.data.time50Cs,
        time_100_cs: parsed.data.time100Cs,
        operation_id: parsed.data.operationId,
        created_by: profile.id,
        updated_by: profile.id,
      })
      .select("id, revision")
      .single();
    if (error || !data) {
      if (error?.message?.includes("public.swim_time_entries")) {
        throw new Error("Falta aplicar la migración de tiempos de nado en la base de datos de Supabase.");
      }
      throw new Error("No pudimos guardar los tiempos. Inténtalo de nuevo.");
    }
    revalidateSwimTimePaths(parsed.data.teamId, parsed.data.playerId);
    return { ok: true, entryId: data.id, revision: data.revision };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No pudimos guardar los tiempos.",
    };
  }
}

export async function updateSwimTime(
  input: z.input<typeof updateSchema>,
): Promise<SwimTimeActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los tiempos." };
  try {
    const testDate = parsed.data.testDate ?? madridToday();
    if (testDate > madridToday()) {
      throw new Error("La fecha no puede estar en el futuro.");
    }
    const profile = await requireSessionProfile();
    const supabase = await createClient();
    const { data: current, error: readError } = await supabase
      .from("swim_time_entries")
      .select("id, team_id, player_id, revision, voided_at")
      .eq("id", parsed.data.entryId)
      .maybeSingle();
    if (readError || !current) throw new Error("La anotación ya no está disponible.");
    if (current.voided_at) throw new Error("Esta anotación está anulada.");
    await requireSwimCoach(profile.id, current.team_id);
    const context = await resolveEntryContext(current.team_id, current.player_id, testDate);
    const { data, error } = await supabase
      .from("swim_time_entries")
      .update({
        test_date: context.testDate,
        time_50_cs: parsed.data.time50Cs,
        time_100_cs: parsed.data.time100Cs,
        updated_by: profile.id,
        revision: parsed.data.revision + 1,
      })
      .eq("id", parsed.data.entryId)
      .eq("revision", parsed.data.revision)
      .select("id, revision")
      .maybeSingle();
    if (error) throw new Error("No pudimos corregir los tiempos.");
    if (!data) throw new Error("Este tiempo ha cambiado. Recarga y revisa la última versión.");
    revalidateSwimTimePaths(current.team_id, current.player_id);
    return { ok: true, entryId: data.id, revision: data.revision };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No pudimos corregir los tiempos.",
    };
  }
}

export async function voidSwimTime(
  input: z.input<typeof entryMutationSchema>,
): Promise<SwimTimeActionResult> {
  const parsed = entryMutationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "La anotación no es válida." };
  try {
    const profile = await requireSessionProfile();
    const supabase = await createClient();
    const { data: current, error: readError } = await supabase
      .from("swim_time_entries")
      .select("team_id, player_id")
      .eq("id", parsed.data.entryId)
      .maybeSingle();
    if (readError || !current) throw new Error("La anotación ya no está disponible.");
    await requireSwimCoach(profile.id, current.team_id);
    const { data, error } = await supabase
      .from("swim_time_entries")
      .update({
        voided_at: new Date().toISOString(),
        voided_by: profile.id,
        void_reason: "Anulada por el entrenador desde el historial.",
        updated_by: profile.id,
        revision: parsed.data.revision + 1,
      })
      .eq("id", parsed.data.entryId)
      .eq("revision", parsed.data.revision)
      .is("voided_at", null)
      .select("id, revision")
      .maybeSingle();
    if (error) throw new Error("No pudimos anular la anotación.");
    if (!data) throw new Error("Este tiempo ha cambiado. Recarga antes de anularlo.");
    revalidateSwimTimePaths(current.team_id, current.player_id);
    return { ok: true, entryId: data.id, revision: data.revision };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No pudimos anular la anotación.",
    };
  }
}
