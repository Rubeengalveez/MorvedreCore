import { z } from "zod";

export const matchCategorySchema = z.enum([
  "benjamin",
  "alevin",
  "infantil",
  "escuela",
  "cadete",
  "juvenil",
  "absoluto",
]);

export function matchRules(category?: string) {
  const youth = ["benjamin", "alevin", "infantil", "escuela"].includes(category ?? "");
  return {
    youth,
    fieldPlayers: category === "infantil" ? 6 : 5,
    exclusionLimit: category === "benjamin" || category === "escuela" ? 4 : 3,
    singleKeeper: category === "alevin" || category === "infantil",
    compulsoryReplacement: youth,
    timeoutLimit: ["benjamin", "alevin", "escuela"].includes(category ?? "") ? 0 : 2,
    periods: youth ? 6 : 4,
    minimumPlayers:
      category === "infantil" ? 9 : ["benjamin", "alevin"].includes(category ?? "") ? 8 : 1,
  };
}

export function rosterRequirementError(
  category: string | undefined,
  caps: (number | null)[],
  side: "us" | "them" = "us",
) {
  const team = side === "us" ? "Morvedre" : "Rival";
  const minimum = matchRules(category).minimumPlayers;
  const label =
    category === "benjamin" ? "Benjamín" : category === "alevin" ? "Alevín" : "Infantil";
  if (caps.length < minimum)
    return minimum > 1
      ? `${team}: mínimo ${minimum} jugadores convocados en ${label}.`
      : `${team}: añade al menos un jugador.`;
  if (!caps.some((cap) => cap === 1 || cap === 13))
    return `${team}: necesitas un portero con gorro 1 o 13.`;
  return "";
}

export function exclusionLimit(sheet: { category?: string }) {
  return matchRules(sheet.category).exclusionLimit;
}

const participant = z.string().min(1).max(40);
export const participationSchema = z.object({
  rulesVersion: z.literal(1),
  enabled: z.boolean(),
  opponentConfirmed: z.boolean(),
  fixedKeepers: z.object({ us: participant.nullable(), them: participant.nullable() }),
  lineups: z
    .array(
      z.object({
        period: z.number().int().min(1).max(4),
        side: z.enum(["us", "them"]),
        keeper: participant,
        field: z.array(participant).max(6),
        incident: z.string().max(200).optional(),
      }),
    )
    .max(8),
  changes: z
    .array(
      z.object({
        id: z.string().uuid(),
        period: z.number().int().min(1).max(4),
        side: z.enum(["us", "them"]),
        incoming: participant,
        outgoing: participant,
        reason: z.enum(["sanction", "injury"]),
        eventId: z.string().uuid().optional(),
        afterEventId: z.string().uuid().nullable().optional(),
      }),
    )
    .max(100),
});

export type Participation = z.infer<typeof participationSchema>;
export type PeriodLineup = Participation["lineups"][number];

export const lineupDraftSchema = z.object({
  period: z.number().int().min(1).max(4),
  mode: z.enum(["start", "correct"]),
  step: z.enum(["us", "them"]),
  baseMutation: z.string(),
  baseDraftRevision: z.number().int().nonnegative().optional(),
  fixedKeepers: z.object({ us: participant.nullable(), them: participant.nullable() }).optional(),
  incident: z.boolean().optional(),
  us: z.object({ keeper: participant.nullable(), field: z.array(participant).max(6) }),
  them: z.object({ keeper: participant.nullable(), field: z.array(participant).max(6) }),
});
export type LineupDraft = z.infer<typeof lineupDraftSchema>;
