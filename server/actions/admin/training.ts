"use server";

import { scheduleNotificationPush } from "@/server/notification-push";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { idSchema, markAttendanceSchema } from "@/lib/domain/admin-schemas";
import { canEditAttendanceForDay } from "@/lib/domain/attendance";
import { requireAttendanceManagerOf } from "./_helpers";
export type TrainingBlockRow = Tables<"training_blocks">;
export type TrainingSessionRow = Tables<"training_sessions">;
function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(fallback);
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
    .select("id, team_id, scheduled_at, cancelled, player_ids")
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

  const rosterIds = new Set(
    (roster ?? [])
      .map((row) => row.player_id)
      .filter((id) => !session.player_ids || session.player_ids.includes(id)),
  );
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
  revalidatePath("/attendance");
  revalidatePath("/attendance/summary");
  revalidatePath("/attendance/history");
  revalidatePath("/calendar");
  scheduleNotificationPush();
  revalidatePath("/notifications");
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
    .select("id, team_id, scheduled_at, cancelled, player_ids")
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

  const playerIds = (roster ?? [])
    .map((r) => r.player_id)
    .filter((id) => !session.player_ids || session.player_ids.includes(id));
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
  scheduleNotificationPush();
  revalidatePath("/admin/trainings");
  revalidatePath(`/admin/trainings/${parsedId.data.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/attendance");
  revalidatePath("/attendance/summary");
  revalidatePath("/attendance/history");
  revalidatePath("/calendar");
  scheduleNotificationPush();
  revalidatePath("/notifications");

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
  const [{ recomputeTrainingStreaksForSession }, { recomputeSnapshotsForPlayers }] =
    await Promise.all([import("./streaks"), import("./rankings")]);
  await recomputeTrainingStreaksForSession(sessionId);
  await recomputeSnapshotsForPlayers(playerIds, team.season_id);
  revalidatePath("/rankings");
  revalidatePath("/profile");
  revalidatePath(`/team/${teamId}`);
}
