"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

import { requireAdmin } from "./_helpers";

export type Season = Tables<"seasons", "Row">;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida. Usa el formato AAAA-MM-DD.");

const createSeasonSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(3, "La etiqueta debe tener al menos 3 caracteres.")
      .max(50, "Máximo 50 caracteres."),
    start_date: isoDate,
    end_date: isoDate,
  })
  .refine((data) => data.start_date < data.end_date, {
    message: "La fecha de fin debe ser posterior a la fecha de inicio.",
    path: ["end_date"],
  });

const updateSeasonSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(3, "La etiqueta debe tener al menos 3 caracteres.")
      .max(50, "Máximo 50 caracteres.")
      .optional(),
    start_date: isoDate.optional(),
    end_date: isoDate.optional(),
  })
  .refine(
    (data) => data.start_date == null || data.end_date == null || data.start_date < data.end_date,
    {
      message: "La fecha de fin debe ser posterior a la fecha de inicio.",
      path: ["end_date"],
    },
  );

const idSchema = z.object({ id: z.string().uuid("Identificador inválido.") });

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

  const { error: clearError } = await supabase
    .from("seasons")
    .update({ is_current: false })
    .neq("id", parsedId.data.id)
    .eq("is_current", true);

  throwIfError(clearError, "No pudimos actualizar las temporadas anteriores.");

  const { error: setError } = await supabase
    .from("seasons")
    .update({ is_current: true })
    .eq("id", parsedId.data.id);

  throwIfError(setError, "No pudimos activar la temporada.");

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
