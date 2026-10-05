"use server";

import { getTrainingSessionsInRange } from "@/server/queries/training-sessions";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateSessionsFromBlock } from "@/lib/domain/training";
import {
  trainingPlanSchema,
  trainingChangeSchema,
  trainingDay,
  trainingDateTime,
  trainingKindLabel,
  shiftTrainingDate,
  type TrainingPlanInput,
  type TrainingChangeInput,
} from "@/lib/domain/training-management";
import { requireTrainingManagerOf } from "./_helpers";
import { scheduleNotificationPush } from "@/server/notification-push";
import type { Json } from "@/types/database";

function refresh() {
  for (const path of ["/admin/trainings", "/calendar", "/dashboard", "/attendance", "/team"])
    revalidatePath(path);
  scheduleNotificationPush();
}
export async function saveTrainingPlanAction(input: TrainingPlanInput) {
  const parsed = trainingPlanSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Revisa el horario.");
  const plan = parsed.data;
  for (const teamId of plan.team_ids) await requireTrainingManagerOf(teamId);
  const supabase = await createClient();
  const { data: roster, error: rosterError } = await supabase
    .from("team_rosters")
    .select("team_id, player_id")
    .in("team_id", plan.team_ids)
    .is("left_at", null);
  if (rosterError) throw new Error("No pudimos comprobar las plantillas.");
  if (plan.player_ids?.some((id) => !roster?.some((row) => row.player_id === id)))
    throw new Error("La plantilla ha cambiado. Revisa los jugadores elegidos.");
  const today = trainingDay(new Date());
  if (plan.start_date < today && plan.block_ids.length === 0)
    throw new Error("Elige una fecha de hoy en adelante.");
  const seriesId = plan.series_id ?? randomUUID();
  const jointIds = new Map<string, string>();
  const blocks = [],
    sessions = [];
  const slots = plan.slots.map((slot) => ({ ...slot, slot_id: slot.slot_id ?? randomUUID() }));
  for (const teamId of plan.team_ids) {
    const playerIds =
      plan.player_ids?.filter((id) =>
        roster?.some((row) => row.player_id === id && row.team_id === teamId),
      ) ?? null;
    if (playerIds?.length === 0)
      throw new Error(
        "Elige al menos un jugador de cada equipo, o quita el equipo que no participa.",
      );
    for (const slot of slots) {
      const block = {
        ...slot,
        id: randomUUID(),
        series_id: seriesId,
        schedule_slot_id: slot.slot_id,
        team_id: teamId,
        player_ids: playerIds,
        label: plan.label || trainingKindLabel(plan.kind),
        kind: plan.kind,
        start_date: plan.start_date,
        end_date: plan.end_date,
        location: plan.location || null,
        maps_url: plan.maps_url,
        excluded_dates: plan.excluded_dates,
      };
      if (plan.mode === "weekly") blocks.push(block);
      const generated =
        plan.mode === "single"
          ? [
              {
                start_datetime: trainingDateTime(plan.start_date, slot.start_time),
                duration_minutes:
                  Number(slot.end_time.slice(0, 2)) * 60 +
                  Number(slot.end_time.slice(3)) -
                  (Number(slot.start_time.slice(0, 2)) * 60 + Number(slot.start_time.slice(3))),
              },
            ]
          : generateSessionsFromBlock(block, { skipDates: plan.excluded_dates });
      for (const session of generated) {
        if (
          trainingDay(session.start_datetime) < today ||
          (plan.mode === "weekly" && new Date(session.start_datetime).getTime() < Date.now())
        )
          continue;
        const key = `${session.start_datetime}/${session.duration_minutes}`;
        const jointId = jointIds.get(key) ?? randomUUID();
        jointIds.set(key, jointId);
        sessions.push({
          block_id: plan.mode === "weekly" ? block.id : null,
          team_id: teamId,
          joint_id: jointId,
          label: block.label,
          kind: block.kind,
          scheduled_at: session.start_datetime,
          duration_minutes: session.duration_minutes,
          location: block.location,
          maps_url: block.maps_url,
          player_ids: playerIds,
        });
      }
    }
  }
  if (!sessions.length)
    throw new Error("No hay entrenamientos en las fechas elegidas. Revisa los días y el periodo.");
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: { p_plan: Json },
  ) => Promise<{ data: { created: number } | null; error: { message: string } | null }>;
  const { data, error } = await rpc("manage_training_plan", {
    p_plan: {
      team_ids: plan.team_ids,
      series_id: seriesId,
      block_ids: plan.block_ids,
      blocks,
      sessions,
    },
  });
  if (error) throw new Error(error.message);
  refresh();
  return { created: data?.created ?? 0 };
}

export async function changeTrainingDatesAction(input: TrainingChangeInput) {
  const parsed = trainingChangeSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Revisa los datos.");
  const supabase = await createClient();
  const { data: sessions, error: loadError } = await supabase
    .from("training_sessions")
    .select("id,team_id")
    .in("id", parsed.data.session_ids);
  if (loadError || sessions?.length !== parsed.data.session_ids.length)
    throw new Error("La lista de entrenamientos ha cambiado. Actualiza la página.");
  for (const teamId of new Set(sessions.map((session) => session.team_id)))
    await requireTrainingManagerOf(teamId);
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: { p_change: Json },
  ) => Promise<{ data: number | null; error: { message: string } | null }>;
  const { data, error } = await rpc("change_training_dates", { p_change: parsed.data });
  if (error) throw new Error(error.message);
  refresh();
  return { updated: data ?? 0 };
}

export async function finishTrainingPlanAction(blockIds: string[]) {
  const ids = z.array(z.uuid()).min(1).max(128).parse(blockIds);
  const supabase = await createClient();
  const { data, error } = await supabase.from("training_blocks").select("id,team_id").in("id", ids);
  if (error || data?.length !== ids.length) throw new Error("No pudimos cargar el horario.");
  for (const teamId of new Set(data.map((block) => block.team_id)))
    await requireTrainingManagerOf(teamId);
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: { p_block_ids: string[] },
  ) => Promise<{ error: { message: string } | null }>;
  const result = await rpc("finish_training_plan", { p_block_ids: ids });
  if (result.error) throw new Error(result.error.message);
  refresh();
}

export async function previewTrainingChangeAction(input: {
  team_ids: string[];
  from: string;
  to: string;
}) {
  const parsed = z
    .object({ team_ids: z.array(z.uuid()).min(1).max(16), from: z.iso.date(), to: z.iso.date() })
    .parse(input);
  if (
    parsed.to < parsed.from ||
    new Date(parsed.to).getTime() - new Date(parsed.from).getTime() > 62 * 86400000
  )
    throw new Error("Elige un periodo de hasta dos meses.");
  if (parsed.from < trainingDay(new Date())) throw new Error("Elige fechas de hoy en adelante.");
  for (const id of parsed.team_ids) await requireTrainingManagerOf(id);
  const client = await createClient();
  return getTrainingSessionsInRange(
    client,
    parsed.team_ids,
    trainingDateTime(parsed.from, "00:00"),
    trainingDateTime(shiftTrainingDate(parsed.to, 1), "00:00"),
  );
}
