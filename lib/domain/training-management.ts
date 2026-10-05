import { z } from "zod";
import type { Tables } from "@/types/database";
import { combineDateAndTime, durationMinutes, generateSessionsFromBlock } from "./training";

export const TRAINING_TYPES = [
  { value: "water", label: "Agua" },
  { value: "dry", label: "Físico/seco" },
  { value: "meeting", label: "Reunión" },
] as const;
export const TRAINING_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export type ManagedTrainingBlock = Tables<"training_blocks">;
export type ManagedTrainingSession = Tables<"training_sessions">;
export type TrainingTeam = { id: string; label: string; color: string; home_pool: string | null };
export type TrainingPlayer = { id: string; full_name: string; team_ids: string[] };
export function trainingKind(value: string): "water" | "dry" | "meeting" {
  return value === "meeting"
    ? "meeting"
    : value === "dry" || value === "physical"
      ? "dry"
      : "water";
}
export function trainingKindLabel(value: string) {
  return TRAINING_TYPES.find((type) => type.value === trainingKind(value))!.label;
}
export function trainingTitle(label: string | null, kind: string) {
  if (!label || /^Temporada \d{4}\/\d{4}/.test(label)) return trainingKindLabel(kind);
  return label;
}
export function trainingDay(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function trainingTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export function trainingDate(value: string, includeYear = false) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: includeYear ? undefined : "short",
    day: "numeric",
    month: "short",
    year: includeYear ? "numeric" : undefined,
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}
export function trainingDateTime(date: string, time: string) {
  return combineDateAndTime(new Date(`${date}T00:00:00Z`), time).toISOString();
}
export function shiftTrainingDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function trainingBreakRanges(dates: string[]) {
  const ranges: { from: string; to: string }[] = [];
  for (const day of [...new Set(dates)].sort()) {
    const last = ranges.at(-1);
    if (last && shiftTrainingDate(last.to, 1) === day) last.to = day;
    else ranges.push({ from: day, to: day });
  }
  return ranges;
}
const date = z.iso.date();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Indica una hora válida.");
const slot = z
  .object({
    slot_id: z.uuid().optional(),
    weekdays: z.array(z.number().int().min(1).max(7)),
    start_time: time,
    end_time: time,
  })
  .refine(
    (v) =>
      durationMinutes(v.start_time, v.end_time) >= 15 &&
      durationMinutes(v.start_time, v.end_time) <= 480 &&
      v.end_time > v.start_time,
    "La hora de fin debe ser posterior y la duración de 15 minutos a 8 horas.",
  );
export const trainingPlanSchema = z
  .object({
    mode: z.enum(["weekly", "single"]),
    series_id: z.uuid().nullable().optional(),
    block_ids: z.array(z.uuid()).max(128).default([]),
    team_ids: z
      .array(z.uuid())
      .min(1, "Elige al menos un equipo.")
      .max(16)
      .refine((v) => new Set(v).size === v.length),
    player_ids: z.array(z.uuid()).min(1).max(300).nullable().default(null),
    kind: z.enum(["water", "dry", "meeting"]),
    label: z.string().trim().max(100).default(""),
    location: z.string().trim().max(200).default(""),
    maps_url: z.url().max(1000).nullable().default(null),
    start_date: date,
    end_date: date,
    slots: z.array(slot).min(1).max(8),
    excluded_dates: z.array(date).max(370).default([]),
  })
  .superRefine((v, ctx) => {
    if (
      v.end_date < v.start_date ||
      new Date(v.end_date).getTime() - new Date(v.start_date).getTime() > 366 * 86400000
    )
      ctx.addIssue({
        code: "custom",
        message: "Elige un periodo de hasta un año con el fin después del inicio.",
      });
    if (v.mode === "single" && (v.end_date !== v.start_date || v.slots.length !== 1))
      ctx.addIssue({ code: "custom", message: "Un día suelto debe tener una fecha y un horario." });
    if (v.mode === "weekly" && v.slots.some((slot) => !slot.weekdays.length))
      ctx.addIssue({ code: "custom", message: "Elige al menos un día por horario." });
    for (let i = 0; i < v.slots.length; i++)
      for (let j = i + 1; j < v.slots.length; j++) {
        const a = v.slots[i],
          b = v.slots[j];
        if (
          a.weekdays.some((day) => b.weekdays.includes(day)) &&
          a.start_time < b.end_time &&
          b.start_time < a.end_time
        )
          ctx.addIssue({
            code: "custom",
            message: "Hay horarios que se solapan. Revisa los días y las horas.",
          });
      }
  });
export type TrainingPlanInput = z.input<typeof trainingPlanSchema>;
export type TrainingPlan = z.output<typeof trainingPlanSchema>;
export const trainingChangeSchema = z
  .object({
    player_ids: z.array(z.uuid()).min(1).max(300).nullable().optional(),
    session_ids: z.array(z.uuid()).min(1).max(1000),
    operation: z.enum(["edit", "cancel", "restore"]),
    date: date.optional(),
    start_time: time.optional(),
    end_time: time.optional(),
    location: z.string().trim().max(200).optional(),
    kind: z.enum(["water", "dry", "meeting"]).optional(),
    reason: z.string().trim().min(2, "Indica el motivo.").max(300).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.operation === "cancel" && !v.reason)
      ctx.addIssue({ code: "custom", message: "Indica el motivo de la cancelación." });
    if (
      v.operation === "edit" &&
      (!v.start_time ||
        !v.end_time ||
        v.end_time <= v.start_time ||
        durationMinutes(v.start_time, v.end_time) < 15 ||
        durationMinutes(v.start_time, v.end_time) > 480)
    )
      ctx.addIssue({
        code: "custom",
        message: "Revisa las horas de inicio y fin (15 minutos a 8 horas).",
      });
  });
export type TrainingChangeInput = z.input<typeof trainingChangeSchema>;
export function previewTrainingDates(plan: TrainingPlan) {
  if (plan.mode === "single")
    return [
      {
        start_datetime: trainingDateTime(plan.start_date, plan.slots[0].start_time),
        duration_minutes: durationMinutes(plan.slots[0].start_time, plan.slots[0].end_time),
      },
    ];
  return plan.slots
    .flatMap((slot, index) =>
      generateSessionsFromBlock(
        {
          ...slot,
          id: String(index),
          team_id: plan.team_ids[0],
          label: plan.label,
          start_date: plan.start_date,
          end_date: plan.end_date,
          kind: plan.kind,
          location: plan.location,
        },
        { skipDates: plan.excluded_dates },
      ),
    )
    .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
}
export function groupTrainings<
  T extends { id: string; series_id?: string | null; joint_id?: string | null },
>(items: T[], field: "series_id" | "joint_id") {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item[field] ?? item.id;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()];
}
