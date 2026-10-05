import { z } from "zod";
import { emergencyKeeperCaps } from "./live-match-goalkeeper-role";
import {
  exclusionLimit,
  matchCategorySchema,
  participationSchema,
  matchRules,
} from "./live-match-rules";

export const actionLabels = {
  goal: "Gol normal",
  goal_extra: "Gol en superioridad · 1+",
  goal_counter: "Gol de contraataque",
  goal_penalty: "Gol de penalti",
  assist: "Asistencia",
  shot_out: "Tiro fuera / palo",
  shot_saved: "Parada del portero rival",
  shot_blocked: "Parada del portero rival",
  shot_corner: "Parada del portero rival",
  shot_deflected: "Tiro bloqueado",
  defensive_block: "Bloqueo defensivo",
  penalty_missed: "Penalti fallado",
  exclusion: "Expulsión",
  penalty: "Penalti cometido",
  yellow: "Amarilla",
  red: "Roja",
  save: "Parada",
  penalty_save: "Penalti parado",
  keeper_out: "Tiro recibido",
  timeout: "Tiempo muerto pedido",
  coach_yellow: "Amarilla al entrenador",
  coach_red: "Roja al entrenador",
} as const;

export type ActionKind = keyof typeof actionLabels;
export type Side = "us" | "them";
export type EventOrigin = "manual" | "goal_flow" | "penalty_flow";

export const playerSchema = z.object({
  id: z.string().uuid(),
  cap: z.number().int().min(1).max(99),
  name: z.string().min(1).max(150),
  retired: z.boolean().optional(),
});

export const eventSchema = z.object({
  id: z.string().uuid(),
  side: z.enum(["us", "them"]),
  cap: z.number().int().min(1).max(99).nullable(),
  playerId: z.string().uuid().nullable().optional(),
  capAtEvent: z.number().int().min(1).max(99).nullable().optional(),
  kind: z.enum(Object.keys(actionLabels) as [ActionKind, ...ActionKind[]]),
  period: z.number().int().min(1).max(8),
  keeper: z.number().int().min(1).max(99).nullable(),
  keeperId: z.string().uuid().nullable().optional(),
  keeperCapAtEvent: z.number().int().min(1).max(99).nullable().optional(),
  deleted: z.boolean().default(false),
  related_event_id: z.string().uuid().nullable().optional(),
  origin: z.enum(["manual", "goal_flow", "penalty_flow"]).optional(),
  missOutcome: z.enum(["out", "save"]).optional(),
});

const pendingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("assist"), goal_event_id: z.string().uuid() }),
  z.object({
    kind: z.literal("penalty_shot"),
    penalty_event_id: z.string().uuid(),
    shooter_cap: z.number().int().min(1).max(99).nullable(),
  }),
]);

export const shootoutSchema = z.object({
  firstSide: z.enum(["us", "them"]),
  shots: z
    .array(
      z.object({
        id: z.string().uuid(),
        side: z.enum(["us", "them"]),
        cap: z.number().int().min(1).max(99),
        playerId: z.string().uuid().nullable().optional(),
        capAtEvent: z.number().int().min(1).max(99).optional(),
        keeper: z.number().int().min(1).max(99).nullable(),
        keeperId: z.string().uuid().nullable().optional(),
        keeperCapAtEvent: z.number().int().min(1).max(99).nullable().optional(),
        outcome: z.enum(["goal", "save", "out", "post"]),
      }),
    )
    .max(200),
});

export type Shootout = z.infer<typeof shootoutSchema>;

export function shootoutState(tanda: Shootout) {
  const us = tanda.shots.filter((shot) => shot.side === "us");
  const them = tanda.shots.filter((shot) => shot.side === "them");
  const goalsUs = us.filter((shot) => shot.outcome === "goal").length;
  const goalsThem = them.filter((shot) => shot.outcome === "goal").length;
  const decided =
    us.length <= 5 && them.length <= 5
      ? goalsUs > goalsThem + Math.max(0, 5 - them.length) ||
        goalsThem > goalsUs + Math.max(0, 5 - us.length)
      : us.length === them.length && goalsUs !== goalsThem;
  return {
    goalsUs,
    goalsThem,
    winner: decided ? ((goalsUs > goalsThem ? "us" : "them") as Side) : null,
    nextSide:
      tanda.shots.length % 2 === 0
        ? tanda.firstSide
        : tanda.firstSide === "us"
          ? ("them" as const)
          : ("us" as const),
  };
}

export const shootoutOutcomeLabels = {
  goal: "Gol",
  save: "Parado",
  out: "Fuera",
  post: "Al palo",
} as const;

export const sheetSchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    category: matchCategorySchema.optional(),
    participation: participationSchema.optional(),
    players: z.array(playerSchema).min(1).max(30),
    opponentCaps: z.array(z.number().int().min(1).max(99)).min(1).max(30),
    periods: z.number().int().min(1).max(8),
    period: z.number().int().min(1).max(8),
    phase: z.enum(["ready", "playing", "break", "shootout", "finished"]),
    shootout: shootoutSchema.optional(),
    keeper: z.number().int().min(1).max(99).nullable(),
    keeperStints: z
      .array(
        z.object({
          period: z.number().int().min(1).max(8),
          cap: z.number().int().min(1).max(99),
          playerId: z.string().uuid().optional(),
          capAtEvent: z.number().int().min(1).max(99).optional(),
          afterEventId: z.string().max(100).nullable(),
        }),
      )
      .max(512)
      .optional(),
    events: z.array(eventSchema).max(3000),
    pending: pendingSchema.nullable().optional(),
    baseline: z
      .array(
        z.object({
          cap: z.number().int().min(1).max(99),
          playerId: z.string().uuid().optional(),
          goals: z.number().int().min(0).max(99),
          exclusions: z.number().int().min(0).max(4),
        }),
      )
      .max(30),
    baselineThem: z.number().int().min(0).max(99),
  })
  .superRefine((s, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (s.participation) {
      const p = s.participation;
      if (s.version !== 4 || !matchRules(s.category).youth || (p.enabled && s.periods < 4))
        fail("La participación no corresponde a este formato de partido.");
      const exists = (side: Side, key: string) =>
        side === "us"
          ? s.players.some((player) => player.id === key)
          : s.opponentCaps.some((cap) => String(cap) === key);
      if (
        new Set(p.lineups.map((l) => `${l.side}:${l.period}`)).size !== p.lineups.length ||
        p.lineups.some(
          (l) =>
            l.period > s.period ||
            new Set([l.keeper, ...l.field]).size !== l.field.length + 1 ||
            [l.keeper, ...l.field].some((key) => !exists(l.side, key)),
        )
      )
        fail("Revisa las alineaciones registradas.");
      if (
        new Set(p.changes.map((c) => c.id)).size !== p.changes.length ||
        p.changes.some(
          (c) =>
            c.period > s.period ||
            c.incoming === c.outgoing ||
            !exists(c.side, c.incoming) ||
            !exists(c.side, c.outgoing) ||
            !p.lineups.some((l) => l.side === c.side && l.period === c.period) ||
            (c.eventId && !s.events.some((e) => e.id === c.eventId)),
        )
      )
        fail("Revisa las sustituciones registradas.");
      for (const side of ["us", "them"] as const) {
        if (
          p.fixedKeepers[side] &&
          (!matchRules(s.category).singleKeeper || !exists(side, p.fixedKeepers[side]!))
        )
          fail("Revisa la elección de portero único.");
      }
    }
    if (s.pending && s.phase !== "playing")
      fail("Completa la jugada pendiente antes de cambiar de fase.");
    if (
      s.version >= 3 &&
      s.keeper !== null &&
      s.keeper !== 1 &&
      s.keeper !== 13 &&
      !emergencyKeeperCaps(s as LiveSheet, "us").includes(s.keeper)
    )
      fail("El portero en juego debe llevar el gorro 1 o 13.");
    if (s.phase === "shootout" && !s.shootout) fail("Falta preparar la tanda.");
    if (s.shootout) {
      if (
        s.period !== s.periods ||
        !["shootout", "finished"].includes(s.phase) ||
        s.pending ||
        score(s as LiveSheet, "us") !== score(s as LiveSheet, "them")
      ) {
        fail(
          "La tanda solo puede empezar al terminar el último cuarto con empate y sin jugadas pendientes.",
        );
      }
      const previous: Shootout = { firstSide: s.shootout.firstSide, shots: [] };
      const ids = new Set<string>();
      for (const shot of s.shootout.shots) {
        const state = shootoutState(previous);
        if (state.winner || shot.side !== state.nextSide || ids.has(shot.id))
          fail("Revisa el orden de los penaltis de la tanda.");
        if (
          !(shot.side === "us"
            ? s.players.some((p) => p.cap === shot.cap)
            : s.opponentCaps.includes(shot.cap))
        )
          fail("El lanzador no está en el acta.");
        if (shot.side === "them" && !s.players.some((p) => p.cap === shot.keeper))
          fail("Selecciona el portero de la tanda.");
        if (
          s.version >= 3 &&
          shot.side === "us" &&
          shot.playerId !== s.players.find((player) => player.cap === shot.cap)?.id
        )
          fail("El lanzador de la tanda no corresponde a su gorro.");
        if (
          s.version >= 3 &&
          shot.keeper !== null &&
          shot.keeperId !== s.players.find((player) => player.cap === shot.keeper)?.id
        )
          fail("El portero de la tanda no corresponde a su gorro.");
        ids.add(shot.id);
        previous.shots.push(shot);
      }
      if (s.phase === "finished" && !shootoutState(s.shootout).winner)
        fail("La tanda todavía no tiene ganador.");
    }
    if (s.period > s.periods) fail("El periodo no es válido.");
    if (
      new Set(s.players.map((player) => player.cap)).size !== s.players.length ||
      new Set(s.players.map((player) => player.id)).size !== s.players.length
    ) {
      fail("Hay gorros o jugadores repetidos.");
    }
    if (new Set(s.opponentCaps).size !== s.opponentCaps.length) {
      fail("Hay gorros rivales repetidos.");
    }
    const eventIds = new Set(s.events.map((event) => event.id));
    if (eventIds.size !== s.events.length) fail("Hay jugadas repetidas.");
    if (
      new Set(s.baseline.map((entry) => entry.cap)).size !== s.baseline.length ||
      s.baseline.some((entry) => !s.players.some((player) => player.cap === entry.cap))
    ) {
      fail("Los totales previos no son válidos.");
    }
    if (
      s.version >= 3 &&
      s.baseline.some(
        (entry) => entry.playerId !== s.players.find((player) => player.cap === entry.cap)?.id,
      )
    )
      fail("Los totales previos no corresponden al jugador.");
    if (s.keeper !== null && !s.players.some((player) => player.cap === s.keeper)) {
      fail("El portero no está convocado.");
    }
    if (
      s.keeperStints?.some(
        (stint) =>
          stint.period > s.period ||
          !s.players.some((player) => player.cap === stint.cap) ||
          (stint.afterEventId !== null &&
            !s.events.some((event) => event.id === stint.afterEventId)),
      )
    ) {
      fail("Revisa los cuartos registrados de portería.");
    }
    if (
      s.version >= 3 &&
      s.keeperStints?.some(
        (stint) => stint.playerId !== s.players.find((player) => player.cap === stint.cap)?.id,
      )
    )
      fail("El historial de portería no corresponde al jugador.");

    for (const event of s.events) {
      const bench = event.kind === "timeout" || event.kind.startsWith("coach_");
      if (event.period > s.period || bench !== (event.cap === null)) {
        fail("Jugada con periodo o jugador incorrecto.");
      }
      if (
        !bench &&
        !(event.side === "us"
          ? s.players.some((player) => player.cap === event.cap)
          : s.opponentCaps.includes(event.cap!))
      ) {
        fail("El gorro no está en el acta.");
      }
      if (
        s.version >= 3 &&
        event.side === "us" &&
        !bench &&
        event.playerId !== s.players.find((player) => player.cap === event.cap)?.id
      ) {
        fail("La jugada no corresponde al jugador de ese gorro.");
      }
      if (
        s.version >= 3 &&
        event.keeper !== null &&
        event.keeperId !== s.players.find((player) => player.cap === event.keeper)?.id
      ) {
        fail("El portero de la jugada no corresponde a su gorro.");
      }
      if (
        event.side === "them" &&
        ![
          "goal",
          "goal_extra",
          "exclusion",
          "penalty",
          "red",
          "timeout",
          "coach_yellow",
          "coach_red",
        ].includes(event.kind)
      ) {
        fail("Acción rival no válida.");
      }
      if (
        event.side === "them" &&
        event.kind === "goal" &&
        (event.keeper === null || !s.players.some((player) => player.cap === event.keeper))
      ) {
        fail("Selecciona el portero en juego.");
      }
      if (event.related_event_id) {
        const related = s.events.find((candidate) => candidate.id === event.related_event_id);
        if (!related || related.deleted) {
          fail("Hay una jugada vinculada que ya no existe.");
        } else if (event.kind === "assist") {
          if (
            !["goal", "goal_extra", "goal_counter"].includes(related.kind) ||
            related.side !== "us" ||
            related.cap === event.cap ||
            related.period !== event.period
          ) {
            fail("La asistencia no corresponde a ese gol.");
          }
        } else if (
          event.origin === "penalty_flow" &&
          !(
            related.kind === "penalty" &&
            related.period === event.period &&
            (related.side === "them"
              ? event.side === "us" &&
                (event.kind === "goal_penalty" || event.kind === "penalty_missed")
              : (event.side === "them" && event.kind === "goal") ||
                (event.side === "us" && ["penalty_save", "keeper_out"].includes(event.kind)))
          )
        ) {
          fail("El lanzamiento no corresponde a ese penalti.");
        }
      }
    }

    const assistsByGoal = new Map<string, number>();
    const shotsByPenalty = new Map<string, number>();
    for (const event of s.events.filter((entry) => !entry.deleted && entry.related_event_id)) {
      const map =
        event.kind === "assist"
          ? assistsByGoal
          : event.origin === "penalty_flow"
            ? shotsByPenalty
            : null;
      if (!map) continue;
      map.set(event.related_event_id!, (map.get(event.related_event_id!) ?? 0) + 1);
    }
    if ([...assistsByGoal.values()].some((count) => count > 1)) {
      fail("Un gol no puede tener más de una asistencia.");
    }
    if ([...shotsByPenalty.values()].some((count) => count > 1)) {
      fail("Un penalti no puede tener más de un lanzamiento.");
    }

    if (s.pending?.kind === "assist") {
      const pending = s.pending;
      const goal = s.events.find((event) => event.id === pending.goal_event_id && !event.deleted);
      if (!goal || !isGoal(goal.kind) || goal.side !== "us") fail("El gol pendiente ya no existe.");
    }
    if (s.pending?.kind === "penalty_shot") {
      const pending = s.pending;
      const penalty = s.events.find(
        (event) => event.id === pending.penalty_event_id && !event.deleted,
      );
      if (!penalty || penalty.kind !== "penalty") {
        fail("El penalti pendiente ya no existe.");
      }
      if (
        pending.shooter_cap !== null &&
        !(penalty?.side === "us"
          ? s.opponentCaps.includes(pending.shooter_cap)
          : s.players.some((player) => player.cap === pending.shooter_cap))
      ) {
        fail("El lanzador pendiente no está convocado.");
      }
    }

    for (const side of ["us", "them"] as const) {
      const caps = side === "us" ? s.players.map((player) => player.cap) : s.opponentCaps;
      for (const cap of caps) {
        if (playerTotals(s as LiveSheet, side, cap).exclusions > exclusionLimit(s)) {
          fail(`Un jugador no puede tener más de ${exclusionLimit(s)} expulsiones.`);
        }
      }
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
  competition?: string;
  venue?: string | null;
  homeAway?: "home" | "away" | "neutral";
  revision: number;
  mutation: string;
  device: string;
  sheet: LiveSheet;
  dirty: boolean;
  callupCandidates?: Array<{
    player_id: string;
    full_name: string;
    cap_number: number | null;
    has_conflict: boolean;
    is_current_team: boolean;
  }>;
  callupTemplate?: Array<{ player_id: string; cap_number: number | null }>;
}

export const isGoal = (kind: ActionKind) =>
  kind === "goal" || kind === "goal_extra" || kind === "goal_penalty" || kind === "goal_counter";

export const isMissedShot = (kind: ActionKind) =>
  kind === "shot_out" ||
  kind === "shot_saved" ||
  kind === "shot_blocked" ||
  kind === "shot_corner" ||
  kind === "shot_deflected" ||
  kind === "penalty_missed";

export function activeEvents(sheet: LiveSheet): MatchEvent[] {
  return sheet.events.filter((event) => !event.deleted);
}

export function playerTotals(sheet: LiveSheet, side: Side, cap: number) {
  const playerId =
    side === "us" ? sheet.players.find((player) => player.cap === cap)?.id : undefined;
  const events = activeEvents(sheet).filter(
    (event) =>
      event.side === side &&
      (side === "us" && event.playerId ? event.playerId === playerId : event.cap === cap),
  );
  const base =
    side === "us"
      ? sheet.baseline.find((entry) =>
          entry.playerId ? entry.playerId === playerId : entry.cap === cap,
        )
      : undefined;
  const goals = events.filter((event) => isGoal(event.kind)).length + (base?.goals ?? 0);
  const exclusions =
    events.filter((event) => event.kind === "exclusion" || event.kind === "penalty").length +
    (base?.exclusions ?? 0);
  const saves = events.filter(
    (event) => event.kind === "save" || event.kind === "penalty_save",
  ).length;
  const conceded = activeEvents(sheet).filter(
    (event) =>
      event.side === "them" &&
      isGoal(event.kind) &&
      (event.keeperId ? event.keeperId === playerId : event.keeper === cap),
  ).length;
  const typedGoals = events.filter((event) => isGoal(event.kind));
  const missedShots = events.filter((event) => isMissedShot(event.kind));

  return {
    goals,
    goalsNormal: typedGoals.filter((event) => event.kind === "goal").length,
    goalsExtra: typedGoals.filter((event) => event.kind === "goal_extra").length,
    goalsCounter: typedGoals.filter((event) => event.kind === "goal_counter").length,
    defensiveBlocks: events.filter((event) => event.kind === "defensive_block").length,
    goalsPenalty: typedGoals.filter((event) => event.kind === "goal_penalty").length,
    assists: events.filter((event) => event.kind === "assist").length,
    exclusions,
    penaltiesCommitted: events.filter((event) => event.kind === "penalty").length,
    red: events.some((event) => event.kind === "red"),
    yellow: events.some((event) => event.kind === "yellow"),
    saves,
    penaltySaves: events.filter((event) => event.kind === "penalty_save").length,
    conceded,
    received: saves + conceded + events.filter((event) => event.kind === "keeper_out").length,
    receivedOut: events.filter((event) => event.kind === "keeper_out").length,
    shots: goals + missedShots.length,
    missedShots: missedShots.length,
    shotsOut: events.filter(
      (event) =>
        event.kind === "shot_out" ||
        (event.kind === "penalty_missed" && event.missOutcome === "out"),
    ).length,
    shotsBlocked: events.filter((event) => event.kind === "shot_deflected").length,
    shotsSaved: events.filter(
      (event) =>
        event.kind === "shot_blocked" ||
        event.kind === "shot_saved" ||
        event.kind === "shot_corner" ||
        (event.kind === "penalty_missed" && event.missOutcome === "save"),
    ).length,
    shotsCorner: events.filter((event) => event.kind === "shot_corner").length,
    penaltiesMissed: events.filter((event) => event.kind === "penalty_missed").length,
  };
}

export function score(sheet: LiveSheet, side: Side, period?: number) {
  const baseline =
    period !== undefined
      ? 0
      : side === "us"
        ? sheet.baseline.reduce((total, entry) => total + entry.goals, 0)
        : sheet.baselineThem;
  return (
    baseline +
    activeEvents(sheet).filter(
      (event) =>
        event.side === side &&
        isGoal(event.kind) &&
        (period === undefined || period === event.period),
    ).length
  );
}

export function defaultPeriods(category: string) {
  return matchRules(category).periods;
}

export function finalScore(sheet: LiveSheet, side: Side) {
  return (
    score(sheet, side) +
    (sheet.shootout?.shots.filter((shot) => shot.side === side && shot.outcome === "goal").length ??
      0)
  );
}

export function timeoutCount(sheet: LiveSheet, side: Side) {
  return activeEvents(sheet).filter((event) => event.side === side && event.kind === "timeout")
    .length;
}

export function percentage(numerator: number, denominator: number): number | null {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}

export function describeEvent(event: MatchEvent, sheet: LiveSheet) {
  const player =
    event.side === "us"
      ? sheet.players.find((entry) =>
          event.playerId ? entry.id === event.playerId : entry.cap === event.cap,
        )?.name
      : "";
  const label =
    event.kind === "goal" && event.origin === "penalty_flow"
      ? "Gol de penalti"
      : actionLabels[event.kind];
  return `${event.side === "us" ? "Morvedre" : "Rival"}${event.cap !== null ? ` · #${event.cap}${player ? ` ${player}` : ""}` : ""} · ${label}`;
}

export function lastSportEvent(sheet: LiveSheet, excludingId?: string): MatchEvent | null {
  const events = activeEvents(sheet).filter(
    (event) => event.id !== excludingId && event.kind !== "assist",
  );
  return events.at(-1) ?? null;
}

export function findPenaltyGoalCandidate(
  sheet: LiveSheet,
  direction: "manual_then_penalty" | "penalty_then_manual",
  shooterCap: number,
  penaltyEventId?: string,
): MatchEvent | null {
  const active = activeEvents(sheet);
  if (direction === "manual_then_penalty") {
    const penaltyIndex = active.findIndex((event) => event.id === penaltyEventId);
    const penalty = penaltyIndex >= 0 ? active[penaltyIndex] : null;
    const previous = penaltyIndex > 0 ? active[penaltyIndex - 1] : null;
    if (
      previous?.side === "us" &&
      previous.kind === "goal_penalty" &&
      previous.cap === shooterCap &&
      previous.period === penalty?.period &&
      previous.origin !== "penalty_flow" &&
      !previous.related_event_id
    ) {
      return previous;
    }
    return null;
  }

  const previous = lastSportEvent(sheet);
  if (
    previous?.side === "us" &&
    previous.kind === "goal_penalty" &&
    previous.cap === shooterCap &&
    previous.period === sheet.period &&
    previous.origin === "penalty_flow"
  ) {
    return previous;
  }
  return null;
}
