import { z } from "zod";

export const actionLabels = {
  goal: "Gol normal",
  goal_extra: "Gol en superioridad · 1+",
  goal_penalty: "Gol de penalti",
  shot_out: "Fuera / palo",
  shot_saved: "Parada del rival",
  shot_blocked: "Tiro bloqueado",
  penalty_missed: "Penalti fallado",
  exclusion: "Expulsión",
  penalty: "Penalti cometido",
  yellow: "Amarilla",
  red: "Roja",
  save: "Parada",
  penalty_save: "Penalti parado",
  timeout: "Tiempo muerto",
  coach_yellow: "Amarilla al entrenador",
  coach_red: "Roja al entrenador",
} as const;
export type ActionKind = keyof typeof actionLabels;
export type Side = "us" | "them";
export const playerSchema = z.object({
  id: z.string().uuid(),
  cap: z.number().int().min(1).max(99),
  name: z.string().min(1).max(150),
});
export const eventSchema = z.object({
  id: z.string().uuid(),
  side: z.enum(["us", "them"]),
  cap: z.number().int().min(1).max(99).nullable(),
  kind: z.enum(Object.keys(actionLabels) as [ActionKind, ...ActionKind[]]),
  period: z.number().int().min(1).max(8),
  keeper: z.number().int().min(1).max(99).nullable(),
  deleted: z.boolean().default(false),
});
export const sheetSchema = z
  .object({
    version: z.literal(1),
    players: z.array(playerSchema).min(1).max(30),
    opponentCaps: z.array(z.number().int().min(1).max(99)).min(1).max(30),
    periods: z.number().int().min(1).max(8),
    period: z.number().int().min(1).max(8),
    phase: z.enum(["ready", "playing", "break", "finished"]),
    keeper: z.number().int().min(1).max(99).nullable(),
    events: z.array(eventSchema).max(3000),
    baseline: z
      .array(
        z.object({
          cap: z.number().int().min(1).max(99),
          goals: z.number().int().min(0).max(99),
          exclusions: z.number().int().min(0).max(3),
        }),
      )
      .max(30),
    baselineThem: z.number().int().min(0).max(99),
  })
  .superRefine((s, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (s.period > s.periods) fail("El periodo no es válido.");
    if (
      new Set(s.players.map((p) => p.cap)).size !== s.players.length ||
      new Set(s.players.map((p) => p.id)).size !== s.players.length
    )
      fail("Hay gorros o jugadores repetidos.");
    if (new Set(s.opponentCaps).size !== s.opponentCaps.length)
      fail("Hay gorros rivales repetidos.");
    if (new Set(s.events.map((e) => e.id)).size !== s.events.length) fail("Hay jugadas repetidas.");
    if (
      new Set(s.baseline.map((e) => e.cap)).size !== s.baseline.length ||
      s.baseline.some((e) => !s.players.some((p) => p.cap === e.cap))
    )
      fail("Los totales previos no son válidos.");
    if (s.keeper !== null && !s.players.some((p) => p.cap === s.keeper))
      fail("El portero no está convocado.");
    for (const e of s.events) {
      const bench = e.kind === "timeout" || e.kind.startsWith("coach_");
      if (e.period > s.period || bench !== (e.cap === null))
        fail("Jugada con periodo o jugador incorrecto.");
      if (
        !bench &&
        !(e.side === "us"
          ? s.players.some((p) => p.cap === e.cap)
          : s.opponentCaps.includes(e.cap!))
      )
        fail("El gorro no está en el acta.");
      if (
        e.side === "them" &&
        !["goal", "exclusion", "timeout", "coach_yellow", "coach_red"].includes(e.kind)
      )
        fail("Acción rival no válida.");
      if (
        e.side === "them" &&
        e.kind === "goal" &&
        (e.keeper === null || !s.players.some((p) => p.cap === e.keeper))
      )
        fail("Selecciona el portero en juego.");
    }
    for (const side of ["us", "them"] as const) {
      const caps = side === "us" ? s.players.map((p) => p.cap) : s.opponentCaps;
      for (const cap of caps)
        if (playerTotals(s as LiveSheet, side, cap).exclusions > 3)
          fail("Un jugador no puede tener más de tres expulsiones.");
    }
  });
export type LiveSheet = z.infer<typeof sheetSchema>;
export type MatchEvent = z.infer<typeof eventSchema>;
export type LivePlayer = z.infer<typeof playerSchema>;
export interface LiveRecord {
  matchId: string;
  owner: string;
  viewer: string;
  canEdit: boolean;
  opponent: string;
  team: string;
  date: string;
  revision: number;
  mutation: string;
  device: string;
  sheet: LiveSheet;
  dirty: boolean;
}
export const isGoal = (kind: ActionKind) =>
  kind === "goal" || kind === "goal_extra" || kind === "goal_penalty";
export function playerTotals(s: LiveSheet, side: Side, cap: number) {
  const events = s.events.filter((e) => !e.deleted && e.side === side && e.cap === cap);
  const base = side === "us" ? s.baseline.find((p) => p.cap === cap) : undefined;
  const goals = events.filter((e) => isGoal(e.kind)).length + (base?.goals ?? 0);
  const exclusions =
    events.filter((e) => e.kind === "exclusion" || e.kind === "penalty").length +
    (base?.exclusions ?? 0);
  const saves = events.filter((e) => e.kind === "save" || e.kind === "penalty_save").length;
  const conceded = s.events.filter(
    (e) => !e.deleted && e.side === "them" && isGoal(e.kind) && e.keeper === cap,
  ).length;
  return {
    goals,
    exclusions,
    red: events.some((e) => e.kind === "red"),
    yellow: events.some((e) => e.kind === "yellow"),
    saves,
    conceded,
    received: saves + conceded,
    shots:
      goals +
      events.filter((e) => e.kind.startsWith("shot_") || e.kind === "penalty_missed").length,
  };
}
export function score(s: LiveSheet, side: Side, period?: number) {
  const baseline =
    period !== undefined
      ? 0
      : side === "us"
        ? s.baseline.reduce((n, p) => n + p.goals, 0)
        : s.baselineThem;
  return (
    baseline +
    s.events.filter(
      (e) =>
        !e.deleted &&
        e.side === side &&
        isGoal(e.kind) &&
        (period === undefined || period === e.period),
    ).length
  );
}
export function defaultPeriods(category: string) {
  return ["benjamin", "alevin", "infantil"].includes(category) ? 6 : 4;
}
export function describeEvent(e: MatchEvent, s: LiveSheet) {
  const player = e.side === "us" ? s.players.find((p) => p.cap === e.cap)?.name : "";
  return `${e.side === "us" ? "Morvedre" : "Rival"}${e.cap !== null ? ` · #${e.cap}${player ? ` ${player}` : ""}` : ""} · ${actionLabels[e.kind]}`;
}
