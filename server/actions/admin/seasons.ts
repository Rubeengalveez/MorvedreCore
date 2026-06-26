"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import {
  createSeasonSchema,
  idSchema,
  updateSeasonSchema,
} from "@/lib/domain/admin-schemas";

import { requireAdmin } from "./_helpers";

export type Season = Tables<"seasons", "Row">;

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) {
    throw new Error(fallback);
  }
}

export async function createSeason(input: {
  label: string;
  start_date: string;
  end_date: string;
}): Promise<Season> {
  await requireAdmin();

  const parsed = createSeasonSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .insert({
      label: parsed.data.label,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      is_current: false,
    })
    .select("*")
    .single();

  throwIfError(error, "No pudimos crear la temporada. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos crear la temporada. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/seasons");
  revalidatePath("/admin");

  return data;
}

export async function updateSeason(
  id: string,
  input: { label?: string; start_date?: string; end_date?: string },
): Promise<Season> {
  await requireAdmin();

  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const parsed = updateSeasonSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  if (Object.keys(parsed.data).length === 0) {
    throw new Error("No hay cambios para guardar.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .update(parsed.data)
    .eq("id", parsedId.data.id)
    .select("*")
    .single();

  throwIfError(error, "No pudimos actualizar la temporada. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos actualizar la temporada. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/seasons");
  revalidatePath(`/admin/seasons/${parsedId.data.id}`);

  return data;
}

export async function setCurrentSeason(id: string): Promise<void> {
  await requireAdmin();

  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const supabase = await createClient();

  const { data: target, error: targetError } = await supabase
    .from("seasons")
    .select("id")
    .eq("id", parsedId.data.id)
    .maybeSingle();

  throwIfError(targetError, "No pudimos encontrar la temporada.");
  if (!target) {
    throw new Error("La temporada no existe.");
  }

  const { error: swapError } = await supabase.rpc("swap_current_season", {
    target_id: parsedId.data.id,
  });

  if (swapError) {
    throwIfError(swapError, "No pudimos activar la temporada.");
  }

  revalidatePath("/admin/seasons");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function archiveSeason(id: string): Promise<void> {
  await requireAdmin();

  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("seasons")
    .update({ is_current: false, archived_at: new Date().toISOString() })
    .eq("id", parsedId.data.id);

  throwIfError(error, "No pudimos archivar la temporada.");

  revalidatePath("/admin/seasons");
  revalidatePath(`/admin/seasons/${parsedId.data.id}`);
}
