import { activeEvents, type LiveSheet, type Side } from "./live-match";
import { matchRules } from "./live-match-rules";

export function timeoutStatus(sheet: LiveSheet, side: Side, excludingId?: string) {
  const limit = matchRules(sheet.category).timeoutLimit;
  const used = activeEvents(sheet).filter(
    (event) => event.side === side && event.kind === "timeout" && event.id !== excludingId,
  ).length;
  return { limit, used, remaining: Math.max(0, limit - used), allowed: limit > 0 && used < limit };
}

export function timeoutRegistrationError(sheet: LiveSheet, side: Side, excludingId?: string) {
  if (
    excludingId &&
    sheet.events.some(
      (event) =>
        event.id === excludingId &&
        !event.deleted &&
        event.kind === "timeout" &&
        event.side === side,
    )
  )
    return "";
  const state = timeoutStatus(sheet, side, excludingId);
  if (!state.limit) return "Tiempos muertos no permitidos en esta categoría.";
  if (!state.allowed)
    return `${side === "us" ? "Morvedre" : "Rival"}: ${state.used}/${state.limit} usados. No puedes registrar otro.`;
  if (!excludingId && sheet.phase !== "playing") return "Tiempos muertos solo durante el cuarto.";
  return "";
}

export function validateTimeoutChanges(next: LiveSheet, previous?: LiveSheet) {
  for (const side of ["us", "them"] as const) {
    const before = previous ? timeoutStatus(previous, side).used : 0;
    const after = timeoutStatus(next, side);
    if (after.used > Math.max(after.limit, before))
      throw new Error(timeoutRegistrationError(next, side));
    if (
      after.used > after.limit &&
      activeEvents(next).some(
        (event) =>
          event.side === side &&
          event.kind === "timeout" &&
          !previous?.events.some(
            (old) =>
              !old.deleted && old.id === event.id && old.side === side && old.kind === "timeout",
          ),
      )
    )
      throw new Error(timeoutRegistrationError(next, side));
  }
}
