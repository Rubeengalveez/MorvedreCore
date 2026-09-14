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

export function selectMatchKeeper(
  sheet: LiveSheet,
  cap: number,
  mode: "start" | "change" | "correct",
): LiveSheet {
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
