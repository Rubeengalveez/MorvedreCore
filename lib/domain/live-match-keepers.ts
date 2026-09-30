import { activeEvents, isGoal, type LiveSheet } from "./live-match";

export function keeperQuarters(sheet: LiveSheet, cap: number): number[] {
  const periods = new Set(
    (sheet.keeperStints ?? []).filter((s) => s.cap === cap).map((s) => s.period),
  );
  for (const event of activeEvents(sheet)) {
    if (
      (event.side === "them" && isGoal(event.kind) && event.keeper === cap) ||
      (event.side === "us" &&
        event.cap === cap &&
        ["save", "penalty_save", "keeper_out"].includes(event.kind))
    )
      periods.add(event.period);
  }
  return [...periods].sort((a, b) => a - b);
}

export function correctStartingKeeper(sheet: LiveSheet, period: number, cap: number): LiveSheet {
  if (![1, 13].includes(cap) || !sheet.players.some((p) => !p.retired && p.cap === cap))
    throw new Error("Elige un portero con gorro 1 o 13.");
  if (period > sheet.period || period < 1) throw new Error("Revisa el cuarto del portero.");
  const stints = [...(sheet.keeperStints ?? [])];
  const index = stints.findIndex((stint) => stint.period === period);
  const first = stints[index];
  const next = stints.slice(index + 1).find((stint) => stint.period === period);
  const oldCap = first?.cap ?? (period === sheet.period ? sheet.keeper : null);
  const end = next
    ? next.afterEventId
      ? sheet.events.findIndex((event) => event.id === next.afterEventId)
      : -1
    : sheet.events.length;
  const events = sheet.events.map((event, position) => {
    if (event.period !== period || position > end || oldCap === null) return event;
    if (event.side === "them" && isGoal(event.kind) && event.keeper === oldCap)
      return { ...event, keeper: cap };
    if (
      event.side === "us" &&
      event.cap === oldCap &&
      ["save", "penalty_save", "keeper_out"].includes(event.kind)
    )
      return { ...event, cap, keeper: event.keeper === oldCap ? cap : event.keeper };
    return event;
  });
  if (first) stints[index] = { ...first, cap };
  else stints.push({ period, cap, afterEventId: null });
  return {
    ...sheet,
    events,
    keeperStints: stints,
    keeper: period === sheet.period && !next ? cap : sheet.keeper,
  };
}

export function correctKeeperReplacement(
  sheet: LiveSheet,
  period: number,
  oldCap: number,
  cap: number,
  anchor: string | null,
  remove = false,
): LiveSheet {
  const index = (sheet.keeperStints ?? []).findIndex(
    (stint) => stint.period === period && stint.cap === oldCap && stint.afterEventId === anchor,
  );
  return reviseKeeperStint(sheet, index, cap, remove);
}

export function correctKeeperStint(sheet: LiveSheet, index: number, cap: number): LiveSheet {
  return reviseKeeperStint(sheet, index, cap, false);
}

function reviseKeeperStint(
  sheet: LiveSheet,
  index: number,
  cap: number,
  remove: boolean,
): LiveSheet {
  const stints = [...(sheet.keeperStints ?? [])];
  const stint = stints[index];
  if (
    !stint ||
    ![1, 13].includes(cap) ||
    !sheet.players.some((player) => !player.retired && player.cap === cap)
  )
    throw new Error("Revisa el historial del portero antes de corregir la sustitución.");
  const { period, cap: oldCap, afterEventId: anchor } = stint;
  const next = stints.slice(index + 1).find((stint) => stint.period === period);
  const start = anchor ? sheet.events.findIndex((e) => e.id === anchor) : -1;
  const end = next
    ? next.afterEventId
      ? sheet.events.findIndex((e) => e.id === next.afterEventId)
      : -1
    : sheet.events.length;
  const events = sheet.events.map((event, position) => {
    if (event.period !== period || position <= start || position > end) return event;
    if (event.side === "them" && isGoal(event.kind) && event.keeper === oldCap)
      return { ...event, keeper: cap };
    if (
      event.side === "us" &&
      event.cap === oldCap &&
      ["save", "penalty_save", "keeper_out"].includes(event.kind)
    )
      return { ...event, cap, keeper: event.keeper === oldCap ? cap : event.keeper };
    return event;
  });
  if (remove) stints.splice(index, 1);
  else stints[index] = { ...stints[index], cap };
  return {
    ...sheet,
    keeperStints: stints,
    events,
    keeper: period === sheet.period && !next ? cap : sheet.keeper,
  };
}

export function selectMatchKeeper(
  sheet: LiveSheet,
  cap: number,
  mode: "start" | "change" | "correct",
): LiveSheet {
  if (cap !== 1 && cap !== 13) throw new Error("Solo los gorros 1 y 13 pueden ser porteros.");
  if (sheet.phase === "ready" && mode !== "start") return { ...sheet, keeper: cap };
  const period = mode === "start" && sheet.phase === "break" ? sheet.period + 1 : sheet.period;
  const stints = [...(sheet.keeperStints ?? [])];
  const lastIndex = stints.findLastIndex((stint) => stint.period === period);
  const last = stints[lastIndex];
  let events = sheet.events;
  if (mode === "correct") {
    const oldCap = last?.cap ?? sheet.keeper;
    const anchor = last?.afterEventId ? events.findIndex((e) => e.id === last.afterEventId) : -1;
    events = events.map((event, index) => {
      if (index <= anchor || event.period !== period) return event;
      if (event.side === "them" && isGoal(event.kind) && event.keeper === oldCap)
        return { ...event, keeper: cap };
      if (
        event.side === "us" &&
        event.cap === oldCap &&
        ["save", "penalty_save", "keeper_out"].includes(event.kind)
      )
        return { ...event, cap, keeper: event.keeper === oldCap ? cap : event.keeper };
      return event;
    });
    if (last) stints[lastIndex] = { ...last, cap };
    else stints.push({ period, cap, afterEventId: null });
  } else if (mode === "start" || !last || last.cap !== cap) {
    if (mode === "change" && !last && sheet.keeper !== null)
      stints.push({ period, cap: sheet.keeper, afterEventId: null });
    stints.push({ period, cap, afterEventId: events.at(-1)?.id ?? null });
  }
  return {
    ...sheet,
    keeper: cap,
    keeperStints: stints,
    events,
    period,
    phase: mode === "start" ? "playing" : sheet.phase,
  };
}
