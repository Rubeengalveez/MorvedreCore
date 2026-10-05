import { activeEvents, playerTotals, type LiveSheet, type Side } from "./live-match";
import { emergencyKeeperCaps } from "./live-match-goalkeeper-role";
import {
  exclusionLimit,
  matchRules,
  rosterRequirementError,
  type Participation,
  type PeriodLineup,
} from "./live-match-rules";
import {
  correctKeeperReplacement,
  correctStartingKeeper,
  selectMatchKeeper,
} from "./live-match-keepers";

export function prepareParticipation(sheet: LiveSheet, category?: string): LiveSheet {
  if (sheet.phase === "finished" || !matchRules(category).youth) return sheet;
  return {
    ...sheet,
    category: category as LiveSheet["category"],
    version: 4,
    participation: sheet.participation ?? {
      rulesVersion: 1,
      enabled: sheet.periods >= 4,
      opponentConfirmed: false,
      fixedKeepers: { us: null, them: null },
      lineups: [],
      changes: [],
    },
  };
}

export function controlsParticipation(sheet: LiveSheet, period = sheet.period) {
  return Boolean(matchRules(sheet.category).youth && sheet.participation?.enabled && period <= 4);
}

export function participantKey(sheet: LiveSheet, side: Side, cap: number) {
  return side === "us" ? (sheet.players.find((p) => p.cap === cap)?.id ?? "") : String(cap);
}

export function participants(sheet: LiveSheet, side: Side) {
  return side === "us"
    ? sheet.players.filter((p) => !p.retired).map((p) => ({ key: p.id, cap: p.cap, name: p.name }))
    : sheet.opponentCaps.map((cap) => ({ key: String(cap), cap, name: `Gorro ${cap}` }));
}

export function soleKeeper(sheet: LiveSheet, side: Side) {
  const keepers = keeperOptions(sheet, side).filter((p) => {
    const totals = playerTotals(sheet, side, p.cap);
    return !totals.red && totals.exclusions < exclusionLimit(sheet);
  });
  return keepers.length === 1 ? keepers[0].key : null;
}

export function keeperOptions(sheet: LiveSheet, side: Side, period = sheet.period) {
  const emergency = emergencyKeeperCaps(sheet, side, period);
  return participants(sheet, side).filter(
    (p) => [1, 13].includes(p.cap) || emergency.includes(p.cap),
  );
}

export function fieldPlayersNeeded(sheet: LiveSheet, side: Side, period = sheet.period) {
  const keepers = new Set(keeperOptions(sheet, side, period).map((p) => p.key));
  const available = participants(sheet, side).filter(
    (p) => !keepers.has(p.key) && !expelledBeforePeriod(sheet, side, p.cap, period),
  );
  return Math.min(matchRules(sheet.category).fieldPlayers, available.length);
}

export function currentKeeperKey(sheet: LiveSheet, side: Side, period = sheet.period) {
  let key = lineupFor(sheet, side, period)?.keeper;
  for (const change of validChanges(sheet, side, period))
    if (change.outgoing === key) key = change.incoming;
  return key;
}

export function replacementCandidates(
  sheet: LiveSheet,
  side: Side,
  outgoing: string,
  period = sheet.period,
) {
  const current = currentParticipants(sheet, side, period);
  const keeper = currentKeeperKey(sheet, side, period) === outgoing;
  const available = participants(sheet, side).filter((p) => {
    const totals = playerTotals(sheet, side, p.cap);
    return p.key !== outgoing && !totals.red && totals.exclusions < exclusionLimit(sheet);
  });
  if (keeper) {
    const goalkeepers = available.filter((p) =>
      keeperOptions(sheet, side, period).some((k) => k.key === p.key),
    );
    if (goalkeepers.length) return goalkeepers.filter((p) => !current?.has(p.key));
    return available.filter((p) => ![1, 13].includes(p.cap));
  }
  return available.filter(
    (p) => !current?.has(p.key) && !keeperOptions(sheet, side, period).some((k) => k.key === p.key),
  );
}

export function expelledBeforePeriod(sheet: LiveSheet, side: Side, cap: number, period: number) {
  const totals = playerTotals(
    { ...sheet, events: sheet.events.filter((e) => e.period < period) },
    side,
    cap,
  );
  return totals.red || totals.exclusions >= exclusionLimit(sheet);
}

export function lineupEligibilityIssues(sheet: LiveSheet, lineup: PeriodLineup) {
  const selected = new Set([lineup.keeper, ...lineup.field]);
  return participants(sheet, lineup.side)
    .filter(
      (p) => selected.has(p.key) && expelledBeforePeriod(sheet, lineup.side, p.cap, lineup.period),
    )
    .map(
      (p) =>
        `${lineup.side === "us" ? "Morvedre" : "Rival"}: el gorro ${p.cap} está expulsado y no puede empezar este cuarto.`,
    );
}

function validChanges(sheet: LiveSheet, side: Side, period: number) {
  const lineup = lineupFor(sheet, side, period);
  const keys = new Set(lineup ? [lineup.keeper, ...lineup.field] : []);
  let keeper = lineup?.keeper;
  return (sheet.participation?.changes ?? [])
    .filter(
      (change) =>
        change.side === side &&
        change.period === period &&
        (!change.eventId ||
          activeEvents(sheet).some(
            (e) =>
              e.id === change.eventId &&
              e.side === side &&
              ["exclusion", "penalty", "red"].includes(e.kind) &&
              participantKey(sheet, side, e.cap!) === change.outgoing &&
              (e.kind === "red" ||
                exclusionsAt(sheet, side, e.cap!, period, e.id) >= exclusionLimit(sheet)),
          )),
    )
    .filter((change) => {
      if (
        !keys.has(change.outgoing) ||
        (keys.has(change.incoming) && !(change.outgoing === keeper && change.reason === "sanction"))
      )
        return false;
      keys.delete(change.outgoing);
      keys.add(change.incoming);
      if (change.outgoing === keeper) keeper = change.incoming;
      return true;
    });
}

export function exclusionsAt(
  sheet: LiveSheet,
  side: Side,
  cap: number,
  period: number,
  through?: string,
) {
  const end = through ? sheet.events.findIndex((e) => e.id === through) : sheet.events.length;
  const baseline = side === "us" ? (sheet.baseline.find((b) => b.cap === cap)?.exclusions ?? 0) : 0;
  return (
    baseline +
    sheet.events.filter(
      (e, i) =>
        i <= end &&
        !e.deleted &&
        e.side === side &&
        e.cap === cap &&
        e.period <= period &&
        ["exclusion", "penalty"].includes(e.kind),
    ).length
  );
}

export function lineupFor(sheet: LiveSheet, side: Side, period = sheet.period) {
  return sheet.participation?.lineups.find((l) => l.side === side && l.period === period);
}

export function currentParticipants(sheet: LiveSheet, side: Side, period = sheet.period) {
  const lineup = lineupFor(sheet, side, period);
  if (!lineup) return null;
  const keys = new Set([lineup.keeper, ...lineup.field]);
  for (const change of validChanges(sheet, side, period)) {
    keys.delete(change.outgoing);
    keys.add(change.incoming);
  }
  return keys;
}

export function playedPeriods(sheet: LiveSheet, side: Side, key: string, before = 5) {
  return [1, 2, 3, 4].filter((period) => {
    if (period >= before) return false;
    const lineup = lineupFor(sheet, side, period);
    return (
      lineup &&
      ([lineup.keeper, ...lineup.field].includes(key) ||
        validChanges(sheet, side, period).some((c) => c.incoming === key))
    );
  });
}

export function participantIsPlaying(
  sheet: LiveSheet,
  side: Side,
  cap: number,
  period = sheet.period,
) {
  if (!controlsParticipation(sheet, period)) return true;
  return currentParticipants(sheet, side, period)?.has(participantKey(sheet, side, cap)) ?? false;
}

export function eligibleForAction(
  sheet: LiveSheet,
  side: Side,
  cap: number,
  period = sheet.period,
) {
  const totals = playerTotals(sheet, side, cap);
  return (
    !totals.red &&
    totals.exclusions < exclusionLimit(sheet) &&
    participantIsPlaying(sheet, side, cap, period)
  );
}

export function rotationAdvice(
  sheet: LiveSheet,
  side: Side,
  period: number,
  proposed?: PeriodLineup,
) {
  if (!controlsParticipation(sheet, period)) return [];
  const complete = Array.from({ length: period - 1 }, (_, i) =>
    lineupFor(sheet, side, i + 1),
  ).every(Boolean);
  const fixed = soleKeeper(sheet, side);
  const advice: {
    key: string;
    name: string;
    message: string;
    kind: "rest" | "play" | "missing" | "capacity";
  }[] = [];
  for (const p of participants(sheet, side)) {
    const played = playedPeriods(sheet, side, p.key, period).length;
    if (played >= 3 && p.key !== fixed)
      advice.push({ ...p, kind: "rest", message: "Ya jugó 3 cuartos. Debe descansar." });
    else if (period === 4 && complete && played === 0)
      advice.push({ ...p, kind: "play", message: "Todavía no ha jugado. Debe jugar este cuarto." });
  }
  if (!complete)
    advice.push({
      key: "missing",
      name: "Faltan alineaciones anteriores",
      kind: "missing",
      message: "Complétalas en Revisar participación para comprobar el descanso.",
    });
  if (proposed && complete) {
    const selected = new Set([proposed.keeper, ...proposed.field]);
    const unplayed = participants(sheet, side).filter(
      (p) => !selected.has(p.key) && playedPeriods(sheet, side, p.key, period).length === 0,
    );
    const remaining = 4 - period;
    const keepers = unplayed.filter((p) =>
      keeperOptions(sheet, side, period).some((k) => k.key === p.key),
    ).length;
    const field = unplayed.length - keepers;
    const fieldPlaces = remaining * matchRules(sheet.category).fieldPlayers;
    const team = side === "us" ? "Morvedre" : "Rival";
    const capacityReasons: string[] = [];
    if (remaining > 0) {
      for (const goalkeeper of [false, true]) {
        const pool = participants(sheet, side).filter(
          (p) => keeperOptions(sheet, side, period).some((k) => k.key === p.key) === goalkeeper,
        );
        const places = goalkeeper ? 1 : matchRules(sheet.category).fieldPlayers;
        const eligible = pool.filter((p) => !expelledBeforePeriod(sheet, side, p.cap, period + 1));
        const counts = new Map(
          pool.map((p) => [
            p.key,
            playedPeriods(sheet, side, p.key, period).length + Number(selected.has(p.key)),
          ]),
        );
        const available = eligible.filter((p) => p.key === fixed || counts.get(p.key)! < 3);
        const resting = eligible.filter((p) => p.key !== fixed && counts.get(p.key)! >= 3);
        const label = goalkeeper ? "porteros" : "jugadores de campo";
        if (available.length < places) {
          const restingLabel =
            resting.length === 1 ? (goalkeeper ? "portero" : "jugador de campo") : label;
          const availableLabel =
            available.length === 1
              ? goalkeeper
                ? "portero disponible"
                : "jugador de campo disponible"
              : `${label} disponibles`;
          capacityReasons.push(
            `${team}: ${resting.length ? `con esta selección, ${resting.length} ${restingLabel} ${resting.length === 1 ? "habrá jugado 3 cuartos y deberá" : "habrán jugado 3 cuartos y deberán"} descansar. ` : ""}Solo quedarían ${available.length} ${availableLabel} para ${places} ${places === 1 ? "plaza" : "plazas"} en el cuarto ${period + 1}.`,
          );
        } else {
          const capacity = available.reduce(
            (total, p) =>
              total +
              Math.min(
                remaining,
                p.key === fixed ? remaining : Math.max(0, 3 - counts.get(p.key)!),
              ),
            0,
          );
          const possibleFromStart =
            pool.some((p) => p.key === fixed) || pool.length * 3 >= places * 4;
          if (possibleFromStart && capacity < remaining * places)
            capacityReasons.push(
              `${team}: después de esta selección, el descanso obligatorio y las expulsiones dejarían solo ${capacity} participaciones posibles de ${label} para ${remaining * places} plazas entre los cuartos ${period + 1} y 4.`,
            );
        }
        const unableToPlay = pool.filter((p) => counts.get(p.key) === 0 && !eligible.includes(p));
        if (unableToPlay.length)
          capacityReasons.push(
            `${team}: ${unableToPlay.length} ${label} aún no han jugado y están expulsados. No podrán cumplir la participación antes del cuarto 5.`,
          );
      }
    }
    if (keepers > remaining || field > fieldPlaces || capacityReasons.length) {
      const team = side === "us" ? "Morvedre" : "Rival";
      const nextPeriods = remaining === 1 ? "el cuarto 4" : "los cuartos que quedan hasta el 4";
      const reasons: string[] = [...capacityReasons];
      if (field > fieldPlaces)
        reasons.push(
          remaining === 0
            ? `Con esta selección, ${field} ${field === 1 ? "jugador de campo terminaría" : "jugadores de campo terminarían"} los cuatro primeros cuartos sin jugar. ${field === 1 ? "Debe" : "Deben"} jugar en este cuarto.`
            : `Quedarían ${field} jugadores de campo sin haber jugado y solo ${fieldPlaces} plazas en ${nextPeriods}. ${field - fieldPlaces === 1 ? "Al menos 1 jugador no podría" : `Al menos ${field - fieldPlaces} jugadores no podrían`} cumplir la norma de jugar antes del cuarto 5.`,
        );
      if (keepers > remaining)
        reasons.push(
          remaining === 0
            ? `Con esta selección, ${keepers} ${keepers === 1 ? "portero terminaría" : "porteros terminarían"} los cuatro primeros cuartos sin jugar.`
            : `Quedarían ${keepers} ${keepers === 1 ? "portero pendiente" : "porteros pendientes"} de jugar y solo ${remaining} ${remaining === 1 ? "plaza de portería" : "plazas de portería"} en ${nextPeriods}. Las plazas de portería y de campo se cuentan por separado.`,
        );
      if (period === 3) {
        const resting = participants(sheet, side).filter(
          (p) =>
            p.key !== fixed &&
            playedPeriods(sheet, side, p.key, period).length + Number(selected.has(p.key)) >= 3,
        ).length;
        if (resting > 0)
          reasons.push(
            `Además, ${resting} ${resting === 1 ? "jugador habría jugado" : "jugadores habrían jugado"} los cuartos 1, 2 y 3 y ${resting === 1 ? "debería" : "deberían"} descansar en el cuarto 4.`,
          );
      }
      advice.push({
        key: "capacity",
        name: "Revisa las plazas y el descanso",
        kind: "capacity",
        message: reasons
          .map((reason) => (reason.startsWith(`${team}:`) ? reason : `${team}: ${reason}`))
          .join("\n\n"),
      });
    }
  }
  return advice;
}

export function rotationCompletion(sheet: LiveSheet) {
  if (!sheet.participation?.enabled || sheet.period < 4) return [];
  return (["us", "them"] as const).flatMap((side) => {
    if (![1, 2, 3, 4].every((period) => lineupFor(sheet, side, period)))
      return [
        `${side === "us" ? "Morvedre" : "Rival"}: faltan alineaciones. Revisa la participación.`,
      ];
    return participants(sheet, side).flatMap((p) => {
      const count = playedPeriods(sheet, side, p.key).length;
      if (count === 0)
        return [
          `${side === "us" ? "Morvedre" : "Rival"} · ${p.name}: no consta que haya jugado. Avísalo al entrenador o árbitro.`,
        ];
      if (count === 4 && soleKeeper(sheet, side) !== p.key)
        return [
          `${side === "us" ? "Morvedre" : "Rival"} · ${p.name}: ha jugado los cuatro sin descansar. Avísalo al árbitro.`,
        ];
      return [];
    });
  });
}

export function lineupIssues(sheet: LiveSheet, lineup: PeriodLineup) {
  const options = participants(sheet, lineup.side);
  const keys = [lineup.keeper, ...lineup.field];
  const keeper = options.find((p) => p.key === lineup.keeper);
  const issues: string[] = [];
  if (
    !keeper ||
    !keeperOptions(sheet, lineup.side, lineup.period).some((p) => p.key === keeper.key)
  )
    issues.push("Elige un portero con gorro 1 o 13, o el sustituto registrado.");
  const needed = fieldPlayersNeeded(sheet, lineup.side, lineup.period);
  if (lineup.field.length !== needed) issues.push(`Elige ${needed} jugadores de campo.`);
  if (new Set(keys).size !== keys.length || keys.some((key) => !options.some((p) => p.key === key)))
    issues.push("Revisa los jugadores seleccionados.");
  if (lineup.field.some((key) => [1, 13].includes(options.find((p) => p.key === key)?.cap ?? 0)))
    issues.push("Los gorros 1 y 13 son porteros.");
  return issues;
}

export function lineupSelectionMessage(sheet: LiveSheet, lineup: PeriodLineup) {
  const team = lineup.side === "us" ? "Morvedre" : "Rival";
  const keeper = participants(sheet, lineup.side).find((player) => player.key === lineup.keeper);
  const missing = fieldPlayersNeeded(sheet, lineup.side, lineup.period) - lineup.field.length;
  const needsKeeper =
    !keeper || !keeperOptions(sheet, lineup.side, lineup.period).some((p) => p.key === keeper.key);
  if (needsKeeper && missing > 0)
    return `${team}: elige un portero (1 o 13) y ${missing} ${missing === 1 ? "jugador de campo más" : "jugadores de campo más"}.`;
  if (needsKeeper) return `${team}: falta el portero. Elige el gorro 1 o 13.`;
  if (missing > 0)
    return `${team}: ${missing === 1 ? "falta 1 jugador de campo" : `faltan ${missing} jugadores de campo`}. Toca ${missing === 1 ? "un jugador" : `${missing} jugadores`} para completar la selección.`;
  if (missing < 0)
    return `${team}: ${-missing === 1 ? "sobra 1 jugador de campo" : `sobran ${-missing} jugadores de campo`}. Toca ${-missing === 1 ? "uno" : -missing} para quitarlo de la selección.`;
  return `${team}: ${lineupIssues(sheet, lineup)[0] ?? "selección completa."}`;
}

export function saveLineups(
  sheet: LiveSheet,
  lineups: PeriodLineup[],
  mode: "start" | "correct",
  incident?: string,
): LiveSheet {
  const participation = sheet.participation;
  if (!participation) throw new Error("Falta preparar la participación.");
  if (sheet.phase === "finished") throw new Error("El acta está cerrada.");
  const period = lineups[0]?.period;
  if (
    !period ||
    lineups.length !== 2 ||
    new Set(lineups.map((l) => l.side)).size !== 2 ||
    lineups.some((l) => l.period !== period)
  )
    throw new Error("Revisa la alineación de ambos equipos.");
  if (
    mode === "start" &&
    (sheet.pending ||
      !["ready", "break"].includes(sheet.phase) ||
      period !== (sheet.phase === "ready" ? 1 : sheet.period + 1))
  )
    throw new Error("Este cuarto ya ha empezado.");
  if (mode === "correct" && period > sheet.period)
    throw new Error("Ese cuarto todavía no ha empezado.");
  for (const lineup of lineups) {
    const eligibility = lineupEligibilityIssues(sheet, lineup);
    if (eligibility.length) throw new Error(eligibility[0]);
    if (mode === "start") {
      const requirement = rosterRequirementError(
        sheet.category,
        participants(sheet, lineup.side).map((p) => p.cap),
        lineup.side,
      );
      if (requirement) throw new Error(requirement);
    }
    const issues = lineupIssues(sheet, lineup);
    if (issues.length && !incident) throw new Error(issues[0]);
    const keys = [lineup.keeper, ...lineup.field];
    if (
      !lineup.keeper ||
      new Set(keys).size !== keys.length ||
      keys.some((k) => !participants(sheet, lineup.side).some((p) => p.key === k))
    )
      throw new Error("Revisa los jugadores seleccionados.");
  }
  let next: LiveSheet = {
    ...sheet,
    participation: {
      ...participation,
      lineups: [
        ...participation.lineups.filter((l) => l.period !== period),
        ...lineups.map((l) => ({
          ...l,
          incident:
            incident ??
            (l.field.length < matchRules(sheet.category).fieldPlayers
              ? "Equipo con menos jugadores disponibles por expulsión"
              : undefined),
        })),
      ],
    },
  };
  for (const side of ["us", "them"] as const) {
    if (
      validChanges(sheet, side, period).some((c) => !validChanges(next, side, period).includes(c))
    )
      throw new Error(
        "Corrige primero la sustitución registrada en este cuarto desde Revisar participación.",
      );
  }
  const own = lineups.find((l) => l.side === "us")!;
  const keeperCap = sheet.players.find((p) => p.id === own.keeper)!.cap;
  if (mode === "start") next = selectMatchKeeper(next, keeperCap, "start");
  else {
    const previousKeeper = sheet.keeperStints?.find((stint) => stint.period === period)?.cap;
    if (keeperCap !== previousKeeper) next = correctStartingKeeper(next, period, keeperCap);
  }
  return next;
}

export function outstandingReplacement(sheet: LiveSheet) {
  if (!controlsParticipation(sheet) || sheet.phase !== "playing") return null;
  for (const side of ["us", "them"] as const) {
    const keys = currentParticipants(sheet, side);
    for (const event of activeEvents(sheet)) {
      if (
        !matchRules(sheet.category).compulsoryReplacement &&
        participantKey(sheet, side, event.cap ?? 0) !== currentKeeperKey(sheet, side)
      )
        continue;
      if (
        event.side !== side ||
        event.period !== sheet.period ||
        event.cap === null ||
        !["exclusion", "penalty", "red"].includes(event.kind)
      )
        continue;
      const key = participantKey(sheet, side, event.cap);
      if (
        keys?.has(key) &&
        (event.kind === "red" ||
          exclusionsAt(sheet, side, event.cap, sheet.period, event.id) >= exclusionLimit(sheet))
      )
        if (replacementCandidates(sheet, side, key).length)
          return { side, key, eventId: event.id, cap: event.cap };
    }
  }
  return null;
}

export function replaceParticipant(
  sheet: LiveSheet,
  input: Participation["changes"][number],
): LiveSheet {
  if (
    !controlsParticipation(sheet, input.period) ||
    input.period !== sheet.period ||
    sheet.phase !== "playing"
  )
    throw new Error("Revisa el cuarto de la sustitución.");
  const keys = currentParticipants(sheet, input.side);
  if (
    !keys?.has(input.outgoing) ||
    !replacementCandidates(sheet, input.side, input.outgoing).some(
      (p) => p.key === input.incoming,
    ) ||
    !participants(sheet, input.side).some((p) => p.key === input.incoming)
  )
    throw new Error("Elige un sustituto que no esté jugando.");
  let next = {
    ...sheet,
    participation: {
      ...sheet.participation!,
      changes: [
        ...sheet.participation!.changes,
        { ...input, afterEventId: sheet.events.at(-1)?.id ?? null },
      ],
    },
  };
  if (
    (input.reason === "sanction" && !input.eventId) ||
    !validChanges(next, input.side, input.period).some((c) => c.id === input.id)
  )
    throw new Error("Revisa la sanción que obliga a esta sustitución.");
  if (input.side === "us" && participantKey(sheet, "us", sheet.keeper ?? 0) === input.outgoing) {
    const cap = sheet.players.find((p) => p.id === input.incoming)!.cap;
    next = selectMatchKeeper(next, cap, "change") as typeof next;
  }
  return next;
}

export function reviseReplacement(
  sheet: LiveSheet,
  id: string,
  incoming: string | null,
): LiveSheet {
  if (sheet.phase === "finished") throw new Error("El acta está cerrada.");
  const change = sheet.participation?.changes.find((c) => c.id === id);
  if (!change) throw new Error("No encontramos esta sustitución.");
  const options = participants(sheet, change.side);
  const from = options.find((p) => p.key === change.outgoing)!;
  const old = options.find((p) => p.key === change.incoming)!;
  const to = incoming ? options.find((p) => p.key === incoming) : from;
  if (
    !to ||
    (to.key === change.outgoing && incoming !== null) ||
    (incoming !== null &&
      !replacementCandidates(
        {
          ...sheet,
          participation: {
            ...sheet.participation!,
            changes: sheet.participation!.changes.slice(
              0,
              sheet.participation!.changes.findIndex((c) => c.id === id),
            ),
          },
        },
        change.side,
        change.outgoing,
        change.period,
      ).some((p) => p.key === incoming))
  )
    throw new Error("Revisa las sustituciones y el puesto del jugador elegido.");
  let next: LiveSheet = {
    ...sheet,
    participation: {
      ...sheet.participation!,
      changes: sheet.participation!.changes.flatMap((c) =>
        c.id !== id ? [c] : incoming ? [{ ...c, incoming }] : [],
      ),
    },
  };
  const prior = validChanges(sheet, change.side, change.period);
  const revised = validChanges(next, change.side, change.period);
  if (
    (incoming && !revised.some((c) => c.id === id)) ||
    prior.some((c) => c.id !== id && !revised.some((n) => n.id === c.id))
  )
    throw new Error("Revisa primero las sustituciones posteriores de este cuarto.");
  if (
    change.side === "us" &&
    sheet.keeperStints?.some(
      (stint) =>
        stint.period === change.period &&
        stint.cap === old.cap &&
        stint.afterEventId === (change.afterEventId ?? change.eventId ?? null),
    )
  )
    next = correctKeeperReplacement(
      next,
      change.period,
      old.cap,
      to.cap,
      change.afterEventId ?? change.eventId ?? null,
      incoming === null,
    );
  return next;
}

export function editOpponentCaps(sheet: LiveSheet, caps: number[]): LiveSheet {
  if (sheet.phase === "finished") throw new Error("El acta está cerrada.");
  if (
    !caps.length ||
    caps.length > 14 ||
    new Set(caps).size !== caps.length ||
    caps.some((cap) => cap < 1 || cap > 14 || !Number.isInteger(cap))
  )
    throw new Error("Elige gorros distintos del 1 al 14.");
  if (!caps.some((cap) => cap === 1 || cap === 13))
    throw new Error("Marca el gorro 1 o 13 del portero rival.");
  const requirement = rosterRequirementError(sheet.category, caps, "them");
  if (requirement) throw new Error(requirement);
  const removed = sheet.opponentCaps.find(
    (cap) =>
      !caps.includes(cap) &&
      (sheet.events.some((e) => e.side === "them" && e.cap === cap) ||
        sheet.shootout?.shots.some((shot) => shot.side === "them" && shot.cap === cap) ||
        sheet.participation?.lineups.some(
          (l) => l.side === "them" && [l.keeper, ...l.field].includes(String(cap)),
        ) ||
        sheet.participation?.changes.some(
          (c) => c.side === "them" && [c.incoming, c.outgoing].includes(String(cap)),
        ) ||
        sheet.participation?.fixedKeepers.them === String(cap)),
  );
  if (removed)
    throw new Error(
      `El gorro ${removed} ya tiene jugadas o participación. Corrige sus datos antes de quitarlo.`,
    );
  return {
    ...sheet,
    opponentCaps: [...caps].sort((a, b) => a - b),
    participation: sheet.participation
      ? { ...sheet.participation, opponentConfirmed: true }
      : undefined,
  };
}
