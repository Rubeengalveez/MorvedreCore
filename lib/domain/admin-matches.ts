import { z } from "zod";

import { mapsUrlInputSchema } from "./maps";
import { parseDateTimeLocal } from "../utils/format";

export const matchCompetitionLabels = {
  league: "Liga",
  cup: "Copa",
  tournament: "Torneo",
  friendly: "Amistoso",
} as const;

export const matchStatusLabels = {
  scheduled: "Programado",
  in_progress: "En juego",
  played: "Terminado",
  cancelled: "Cancelado",
  postponed: "Aplazado",
} as const;

export const matchEditorSchema = z.object({
  team_id: z.string(),
  opponent: z
    .string()
    .trim()
    .min(2, "Escribe el nombre del rival (al menos 2 letras).")
    .max(100, "El nombre del rival no puede superar 100 caracteres."),
  competition_type: z.enum(["league", "cup", "tournament", "friendly"]),
  status: z.enum(["scheduled", "in_progress", "played", "cancelled", "postponed"]),
  is_home: z.boolean(),
  location: z.string().trim().max(200, "Acorta el lugar a 200 caracteres."),
  maps_url: mapsUrlInputSchema,
  scheduled_at_local: z
    .string()
    .refine((value) => !!parseDateTimeLocal(value), "Elige la fecha y la hora del partido."),
  notes: z.string().trim().max(2000, "Acorta las notas a 2000 caracteres."),
});

export type MatchEditorValues = z.infer<typeof matchEditorSchema>;
export type MatchListTab = "upcoming" | "played" | "cancelled";

export function matchListTab(status: string): MatchListTab {
  return status === "played" ? "played" : status === "cancelled" ? "cancelled" : "upcoming";
}

export function normalizeMatchSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function matchFormPayload(values: MatchEditorValues) {
  const date = parseDateTimeLocal(values.scheduled_at_local);
  if (!date) throw new Error("Elige la fecha y la hora del partido.");
  return {
    opponent: values.opponent,
    competition_type: values.competition_type,
    is_home: values.is_home,
    location: values.location.trim() || null,
    maps_url: values.maps_url.trim() || null,
    scheduled_at: date.toISOString(),
    notes: values.notes.trim() || null,
  };
}

export function adminMatchesReturnPath(value?: string) {
  if (!value) return "/admin/matches";
  let url: URL;
  try {
    url = new URL(value, "https://morvedre.local");
  } catch {
    return "/admin/matches";
  }
  if (url.origin !== "https://morvedre.local" || url.pathname !== "/admin/matches")
    return "/admin/matches";
  const allowed = new URLSearchParams();
  for (const key of ["tab", "team", "competition", "q"]) {
    const selected = url.searchParams.get(key);
    if (selected) allowed.set(key, selected);
  }
  return `/admin/matches${allowed.size ? `?${allowed}` : ""}`;
}
