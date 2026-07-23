"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { insertNotificationsWithPush } from "./notification-dispatch";
import type { Tables } from "@/types/database";
import {
  cancelTrainingSessionSchema,
  createTrainingBlockSchema,
  createTrainingScheduleSchema,
  idSchema,
  markAttendanceSchema,
  updateTrainingBlockSchema,
} from "@/lib/domain/admin-schemas";
import { generateSessionsFromBlock, type TrainingBlock } from "@/lib/domain/training";
import { canEditAttendanceForDay } from "@/lib/domain/attendance";

import { requireAttendanceManagerOf, requireCoachOf } from "./_helpers";

export type TrainingBlockRow = Tables<"training_blocks">;
export type TrainingSessionRow = Tables<"training_sessions">;

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) {
    throw new Error(fallback);
  }
}

async function blockFromRow(row: TrainingBlockRow): Promise<TrainingBlock> {
  return {
    id: row.id,
    team_id: row.team_id,
    label: row.label,
    weekdays: row.weekdays,
    start_date: row.start_date,
    end_date: row.end_date,
    start_time: row.start_time,
    end_time: row.end_time,
    location: row.location,
    maps_url: row.maps_url,
    kind: row.kind as TrainingBlock["kind"],
  };
}

export async function createTrainingBlock(input: {
  team_id: string;
  label: string;
  weekdays: number[];
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  maps_url?: string | null;
  kind?: "water" | "dry" | "physical" | "technical" | "mixed";
}): Promise<TrainingBlockRow> {
  const parsed = createTrainingBlockSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const admin = await requireCoachOf(parsed.data.team_id);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_blocks")
    .insert({
      team_id: parsed.data.team_id,
      label: parsed.data.label,
      weekdays: parsed.data.weekdays,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      location: parsed.data.location ?? null,
      maps_url: parsed.data.maps_url ?? null,
      kind: parsed.data.kind ?? "water",
      created_by: admin.id,
    })
    .select("*")
    .single();

  throwIfError(error, "No pudimos crear el bloque de entrenamientos. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos crear el bloque de entrenamientos. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/trainings");
  revalidatePath("/admin");

  return data;
}

export async function createTrainingSchedule(input: {
  team_id: string;
  label: string;
  start_date: string;
  end_date: string;
  location?: string | null;
  maps_url?: string | null;
  kind?: "water" | "dry" | "physical" | "technical" | "mixed";
  replace_existing?: boolean;
  groups: Array<{ weekdays: number[]; start_time: string; end_time: string }>;
}): Promise<{ blocks: number; sessions: number; replaced: number }> {
  const parsed = createTrainingScheduleSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const admin = await requireCoachOf(parsed.data.team_id);
  const supabase = await createClient();
  const blockRows = parsed.data.groups.map((group) => ({
    team_id: parsed.data.team_id,
    label: parsed.data.label,
    weekdays: group.weekdays,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    start_time: group.start_time,
    end_time: group.end_time,
    location: parsed.data.location ?? null,
    maps_url: parsed.data.maps_url ?? null,
    kind: parsed.data.kind ?? "water",
    created_by: admin.id,
  }));

  const { data: blocks, error: blockError } = await supabase
    .from("training_blocks")
    .insert(blockRows)
    .select("*");
  throwIfError(blockError, "No pudimos crear el horario semanal.");
  if (!blocks || blocks.length === 0) {
    throw new Error("No pudimos crear el horario semanal.");
  }

  let replaced = 0;
  try {
    if (parsed.data.replace_existing) {
      const rangeStart = new Date(`${parsed.data.start_date}T00:00:00+02:00`).toISOString();
      const rangeEnd = new Date(`${parsed.data.end_date}T23:59:59+02:00`).toISOString();
      const selectedWeekdays = new Set(parsed.data.groups.flatMap((group) => group.weekdays));
      const { data: existingSessions, error: existingError } = await supabase
        .from("training_sessions")
        .select("id, scheduled_at")
        .eq("team_id", parsed.data.team_id)
        .gte("scheduled_at", rangeStart)
        .lte("scheduled_at", rangeEnd);
      throwIfError(existingError, "No pudimos comprobar el horario anterior.");

      const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: "Europe/Madrid",
      });
      const weekdayMap: Record<string, number> = {
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
        Sun: 7,
      };
      const candidates = (existingSessions ?? [])
        .filter((session) =>
          selectedWeekdays.has(weekdayMap[weekdayFormatter.format(new Date(session.scheduled_at))]),
        )
        .map((session) => session.id);
      if (candidates.length > 0) {
        const { data: attendance, error: attendanceError } = await supabase
          .from("training_attendance")
          .select("session_id")
          .in("session_id", candidates);
        throwIfError(attendanceError, "No pudimos comprobar las listas ya guardadas.");
        const protectedIds = new Set((attendance ?? []).map((entry) => entry.session_id));
        const removableIds = candidates.filter((id) => !protectedIds.has(id));
        if (removableIds.length > 0) {
          const { error: removeError } = await supabase
            .from("training_sessions")
            .delete()
            .in("id", removableIds);
          throwIfError(removeError, "No pudimos sustituir el horario anterior.");
          replaced = removableIds.length;
        }
      }
    }

    const sessions = blocks.flatMap((block) => generateSessionsFromBlock(blockFromRowSync(block)));
    const uniqueSessions = Array.from(
      new Map(
        sessions.map((session) => [`${session.team_id}:${session.start_datetime}`, session]),
      ).values(),
    );
    const { data: existing, error: existingError } = await supabase
      .from("training_sessions")
      .select("scheduled_at")
      .eq("team_id", parsed.data.team_id)
      .gte("scheduled_at", new Date(`${parsed.data.start_date}T00:00:00+02:00`).toISOString())
      .lte("scheduled_at", new Date(`${parsed.data.end_date}T23:59:59+02:00`).toISOString());
    throwIfError(existingError, "No pudimos comprobar las sesiones existentes.");
    const existingSet = new Set((existing ?? []).map((session) => session.scheduled_at));
    const toInsert = uniqueSessions
      .filter((session) => !existingSet.has(session.start_datetime))
      .map((session) => ({
        block_id: session.block_id,
        team_id: session.team_id,
        scheduled_at: session.start_datetime,
        duration_minutes: session.duration_minutes,
        location: session.location,
        maps_url: session.maps_url,
      }));
    if (toInsert.length > 0) {
      const { error: sessionError } = await supabase.from("training_sessions").insert(toInsert);
      throwIfError(sessionError, "No pudimos generar las sesiones del horario.");
    }

    revalidatePath("/admin/trainings");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { blocks: blocks.length, sessions: toInsert.length, replaced };
  } catch (error) {
    await supabase
      .from("training_blocks")
      .delete()
      .in(
        "id",
        blocks.map((block) => block.id),
      );
    throw error;
  }
}

function blockFromRowSync(row: TrainingBlockRow): TrainingBlock {
  return {
    id: row.id,
    team_id: row.team_id,
    label: row.label,
    weekdays: row.weekdays,
    start_date: row.start_date,
    end_date: row.end_date,
    start_time: row.start_time,
    end_time: row.end_time,
    location: row.location,
    maps_url: row.maps_url,
    kind: row.kind as TrainingBlock["kind"],
  };
}

export async function updateTrainingBlock(
  id: string,
  input: Partial<{
    team_id: string;
    label: string;
    weekdays: number[];
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    location: string | null;
    maps_url: string | null;
    kind: "water" | "dry" | "physical" | "technical" | "mixed";
  }>,
): Promise<TrainingBlockRow> {
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const parsed = updateTrainingBlockSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  if (Object.keys(parsed.data).length === 0) {
    throw new Error("No hay cambios para guardar.");
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("training_blocks")
    .select("team_id")
    .eq("id", parsedId.data.id)
    .maybeSingle();

  throwIfError(existingError, "No pudimos cargar el bloque.");
  if (!existing) {
    throw new Error("El bloque no existe.");
  }

  await requireCoachOf(parsed.data.team_id ?? existing.team_id);

  const { data, error } = await supabase
    .from("training_blocks")
    .update({
      team_id: parsed.data.team_id,
      label: parsed.data.label,
      weekdays: parsed.data.weekdays,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      location: parsed.data.location ?? null,
      maps_url: parsed.data.maps_url,
      kind: parsed.data.kind,
    })
    .eq("id", parsedId.data.id)
    .select("*")
    .single();

  throwIfError(error, "No pudimos actualizar el bloque. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos actualizar el bloque. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/trainings");
  revalidatePath(`/admin/trainings/${parsedId.data.id}`);

  return data;
}

export async function deleteTrainingBlock(id: string): Promise<void> {
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("training_blocks")
    .select("team_id")
    .eq("id", parsedId.data.id)
    .maybeSingle();

  throwIfError(existingError, "No pudimos cargar el bloque.");
  if (!existing) {
    throw new Error("El bloque no existe.");
  }

  await requireCoachOf(existing.team_id);

  const { error } = await supabase.from("training_blocks").delete().eq("id", parsedId.data.id);

  throwIfError(error, "No pudimos eliminar el bloque. Inténtalo de nuevo.");

  revalidatePath("/admin/trainings");
}

export async function generateSessionsFromBlockAction(
  blockId: string,
): Promise<{ created: number }> {
  const parsedId = idSchema.safeParse({ id: blockId });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("training_blocks")
    .select("*")
    .eq("id", parsedId.data.id)
    .maybeSingle();

  throwIfError(error, "No pudimos cargar el bloque.");
  if (!row) {
    throw new Error("El bloque no existe.");
  }

  await requireCoachOf(row.team_id);

  const block = await blockFromRow(row);
  const generated = generateSessionsFromBlock(block);
  if (generated.length === 0) {
    return { created: 0 };
  }

  const { data: existing, error: existingError } = await supabase
    .from("training_sessions")
    .select("scheduled_at")
    .eq("team_id", block.team_id);

  throwIfError(existingError, "No pudimos comprobar las sesiones existentes.");

  const existingSet = new Set((existing ?? []).map((s) => s.scheduled_at));
  const toInsert = generated
    .filter((s) => !existingSet.has(s.start_datetime))
    .map((s) => ({
      block_id: s.block_id,
      team_id: s.team_id,
      scheduled_at: s.start_datetime,
      duration_minutes: s.duration_minutes,
      location: s.location,
      maps_url: s.maps_url,
    }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("training_sessions").insert(toInsert);

    throwIfError(insertError, "No pudimos generar las sesiones. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/trainings");
  revalidatePath(`/admin/trainings/${parsedId.data.id}`);

  return { created: toInsert.length };
}

export async function resyncFutureTrainingSessionsAction(
  blockId: string,
): Promise<{ created: number; removed: number }> {
  const parsedId = idSchema.safeParse({ id: blockId });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("training_blocks")
    .select("*")
    .eq("id", parsedId.data.id)
    .maybeSingle();

  throwIfError(error, "No pudimos cargar el bloque.");
  if (!row) {
    throw new Error("El bloque no existe.");
  }

  await requireCoachOf(row.team_id);

  const now = new Date().toISOString();
  const { data: futureSessions, error: futureError } = await supabase
    .from("training_sessions")
    .select("id")
    .eq("block_id", parsedId.data.id)
    .gte("scheduled_at", now);

  throwIfError(futureError, "No pudimos comprobar las sesiones futuras.");

  const futureIds = (futureSessions ?? []).map((session) => session.id);
  let protectedIds = new Set<string>();
  if (futureIds.length > 0) {
    const { data: attendance, error: attendanceError } = await supabase
      .from("training_attendance")
      .select("session_id")
      .in("session_id", futureIds);
    throwIfError(attendanceError, "No pudimos comprobar la asistencia existente.");
    protectedIds = new Set((attendance ?? []).map((entry) => entry.session_id));
  }

  const removableIds = futureIds.filter((id) => !protectedIds.has(id));
  if (removableIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("training_sessions")
      .delete()
      .in("id", removableIds);
    throwIfError(deleteError, "No pudimos actualizar las sesiones futuras.");
  }

  const block = await blockFromRow(row);
  const generated = generateSessionsFromBlock(block).filter(
    (session) => session.start_datetime >= now,
  );
  const { data: existing, error: existingError } = await supabase
    .from("training_sessions")
    .select("scheduled_at")
    .eq("team_id", block.team_id)
    .gte("scheduled_at", now);
  throwIfError(existingError, "No pudimos comprobar las sesiones existentes.");

  const existingSet = new Set((existing ?? []).map((session) => session.scheduled_at));
  const toInsert = generated
    .filter((session) => !existingSet.has(session.start_datetime))
    .map((session) => ({
      block_id: session.block_id,
      team_id: session.team_id,
      scheduled_at: session.start_datetime,
      duration_minutes: session.duration_minutes,
      location: session.location,
      maps_url: session.maps_url,
    }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("training_sessions").insert(toInsert);
    throwIfError(insertError, "No pudimos regenerar las sesiones futuras.");
  }

  revalidatePath("/admin/trainings");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");

  return { created: toInsert.length, removed: removableIds.length };
}

export async function cancelTrainingSession(sessionId: string, reason: string): Promise<void> {
  const parsed = cancelTrainingSessionSchema.safeParse({
    session_id: sessionId,
    reason,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .select("id, team_id, scheduled_at, location, training_blocks(label), teams(label)")
    .eq("id", parsed.data.session_id)
    .maybeSingle();

  throwIfError(sessionError, "No pudimos cargar la sesión.");
  if (!session) {
    throw new Error("La sesión no existe.");
  }

  const admin = await requireCoachOf(session.team_id);

  const cancelledAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("training_sessions")
    .update({
      cancelled: true,
      cancellation_reason: parsed.data.reason,
      cancelled_by: admin.id,
      cancelled_at: cancelledAt,
    })
    .eq("id", parsed.data.session_id);

  throwIfError(updateError, "No pudimos cancelar la sesión. Inténtalo de nuevo.");

  const { data: roster, error: rosterError } = await supabase
    .from("team_rosters")
    .select("player_id")
    .eq("team_id", session.team_id)
    .is("left_at", null);

  throwIfError(rosterError, "No pudimos cargar la plantilla del equipo.");

  const playerIds = (roster ?? []).map((r) => r.player_id);
  if (playerIds.length > 0) {
    const sessionDate = new Date(session.scheduled_at);
    const dateLabel = sessionDate.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const teamLabel =
      (session as { teams?: { label?: string } | null }).teams?.label ?? "el equipo";
    const blockLabel =
      (session as { training_blocks?: { label?: string } | null }).training_blocks?.label ?? "";
    const title = `Entrenamiento cancelado (${teamLabel})`;
    const bodyParts = [
      `${dateLabel}${blockLabel ? ` · ${blockLabel}` : ""}`,
      `Motivo: ${parsed.data.reason}`,
    ];
    const rows = playerIds.map((playerId) => ({
      recipient_id: playerId,
      kind: "training_cancelled",
      title,
      body: bodyParts.join("\n"),
      href: `/calendar`,
      related_training_session_id: parsed.data.session_id,
    }));
    const { error: notifyError } = await insertNotificationsWithPush(rows);
    if (notifyError) {
      throw new Error("La sesión se canceló, pero no pudimos enviar los avisos.");
    }
  }

  revalidatePath("/admin/trainings");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function uncancelTrainingSession(sessionId: string): Promise<void> {
  const parsedId = idSchema.safeParse({ id: sessionId });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .select("team_id")
    .eq("id", parsedId.data.id)
    .maybeSingle();

  throwIfError(sessionError, "No pudimos cargar la sesión.");
  if (!session) {
    throw new Error("La sesión no existe.");
  }

  await requireCoachOf(session.team_id);

  const { error } = await supabase
    .from("training_sessions")
    .update({
      cancelled: false,
      cancellation_reason: null,
      cancelled_by: null,
      cancelled_at: null,
    })
    .eq("id", parsedId.data.id);

  throwIfError(error, "No pudimos reactivar la sesión. Inténtalo de nuevo.");

  revalidatePath("/admin/trainings");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function markAttendance(input: {
  session_id: string;
  entries: Array<{ player_id: string; present: boolean; reason?: string | null }>;
}): Promise<{ updated: number }> {
  const parsed = markAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .select("id, team_id, scheduled_at, cancelled")
    .eq("id", parsed.data.session_id)
    .maybeSingle();

  throwIfError(sessionError, "No pudimos cargar la sesión.");
  if (!session) {
    throw new Error("La sesión no existe.");
  }

  const admin = await requireAttendanceManagerOf(session.team_id);

  if (session.cancelled) {
    throw new Error("No puedes pasar lista en un entrenamiento cancelado.");
  }

  if (!canEditAttendanceForDay(session.scheduled_at)) {
    throw new Error("La asistencia se habilita el día del entrenamiento.");
  }

  const sessionDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(session.scheduled_at));
  const { data: roster, error: rosterError } = await supabase
    .from("team_rosters")
    .select("player_id")
    .eq("team_id", session.team_id)
    .lte("joined_at", sessionDate)
    .or(`left_at.is.null,left_at.gte.${sessionDate}`);

  throwIfError(rosterError, "No pudimos comprobar la plantilla.");

  const rosterIds = new Set((roster ?? []).map((row) => row.player_id));
  const entryIds = new Set(parsed.data.entries.map((entry) => entry.player_id));
  const containsOutsider = parsed.data.entries.some((entry) => !rosterIds.has(entry.player_id));
  if (containsOutsider) {
    throw new Error("La lista contiene un jugador que no pertenece a este equipo.");
  }
  if (entryIds.size !== rosterIds.size || [...rosterIds].some((id) => !entryIds.has(id))) {
    throw new Error("La plantilla ha cambiado. Actualiza la página antes de guardar la lista.");
  }

  if (parsed.data.entries.length === 0) {
    return { updated: 0 };
  }

  const upsertRows = parsed.data.entries.map((r) => ({
    session_id: parsed.data.session_id,
    player_id: r.player_id,
    present: r.present,
    reason: r.present ? null : (r.reason ?? null),
    marked_by: admin.id,
  }));

  const { error } = await supabase
    .from("training_attendance")
    .upsert(upsertRows, { onConflict: "session_id,player_id" });

  throwIfError(error, "No pudimos guardar la asistencia. Inténtalo de nuevo.");

  await refreshAttendanceDerivedData(parsed.data.session_id, session.team_id, [...rosterIds]);
  return { updated: upsertRows.length };
}

export async function markAllPresent(sessionId: string): Promise<{ updated: number }> {
  const parsedId = idSchema.safeParse({ id: sessionId });
  if (!parsedId.success) {
    throw new Error("Identificador inválido.");
  }

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .select("id, team_id, scheduled_at, cancelled")
    .eq("id", parsedId.data.id)
    .maybeSingle();

  throwIfError(sessionError, "No pudimos cargar la sesión.");
  if (!session) {
    throw new Error("La sesión no existe.");
  }

  const admin = await requireAttendanceManagerOf(session.team_id);

  if (session.cancelled) {
    throw new Error("No puedes pasar lista en un entrenamiento cancelado.");
  }

  if (!canEditAttendanceForDay(session.scheduled_at)) {
    throw new Error("La asistencia se habilita el día del entrenamiento.");
  }

  const sessionDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(session.scheduled_at));

  const { data: roster, error: rosterError } = await supabase
    .from("team_rosters")
    .select("player_id")
    .eq("team_id", session.team_id)
    .lte("joined_at", sessionDate)
    .or(`left_at.is.null,left_at.gte.${sessionDate}`);

  throwIfError(rosterError, "No pudimos cargar la plantilla.");

  const playerIds = (roster ?? []).map((r) => r.player_id);
  if (playerIds.length === 0) {
    return { updated: 0 };
  }

  const { data: existing, error: existingError } = await supabase
    .from("training_attendance")
    .select("player_id, present, reason")
    .eq("session_id", parsedId.data.id)
    .in("player_id", playerIds);

  throwIfError(existingError, "No pudimos comprobar la asistencia existente.");

  const existingByPlayer = new Map((existing ?? []).map((row) => [row.player_id, row]));

  const upsertRows = playerIds.map((playerId) => {
    const row = existingByPlayer.get(playerId);
    if (row?.present) {
      return {
        session_id: parsedId.data.id,
        player_id: playerId,
        present: true,
        reason: row.reason,
        marked_by: admin.id,
      };
    }
    return {
      session_id: parsedId.data.id,
      player_id: playerId,
      present: true,
      reason: null,
      marked_by: admin.id,
    };
  });

  const { error } = await supabase
    .from("training_attendance")
    .upsert(upsertRows, { onConflict: "session_id,player_id" });

  throwIfError(error, "No pudimos marcar la asistencia. Inténtalo de nuevo.");

  await refreshAttendanceDerivedData(parsedId.data.id, session.team_id, playerIds);
  revalidatePath("/admin/trainings");
  revalidatePath(`/admin/trainings/${parsedId.data.id}`);
  revalidatePath("/dashboard");

  return { updated: upsertRows.length };
}

async function refreshAttendanceDerivedData(
  sessionId: string,
  teamId: string,
  playerIds: string[],
): Promise<void> {
  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("season_id")
    .eq("id", teamId)
    .maybeSingle();
  if (!team) return;
  const [{ recomputeTrainingStreaksForSession }, { recomputeSnapshotForPlayer }] =
    await Promise.all([import("./streaks"), import("./rankings")]);
  await recomputeTrainingStreaksForSession(sessionId);
  await Promise.all(
    playerIds.map((playerId) => recomputeSnapshotForPlayer(playerId, team.season_id)),
  );
  revalidatePath("/rankings");
  revalidatePath("/profile");
  revalidatePath(`/team/${teamId}`);
}
