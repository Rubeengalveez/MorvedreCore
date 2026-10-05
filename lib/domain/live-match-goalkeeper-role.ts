import type { LiveSheet, Side } from "./live-match";
import { exclusionLimit } from "./live-match-rules";

export function emergencyKeeperCaps(sheet: LiveSheet, side: Side, period = sheet.period) {
  const roles = new Set([1, 13]);
  const assigned = new Set<number>();
  const capFor = (key: string) =>
    side === "us" ? sheet.players.find((p) => p.id === key)?.cap : Number(key);
  for (let quarter = 1; quarter <= Math.min(period, 4); quarter++) {
    const lineup = sheet.participation?.lineups.find(
      (l) => l.side === side && l.period === quarter,
    );
    let keeper = lineup?.keeper;
    const playing = new Set(lineup ? [lineup.keeper, ...lineup.field] : []);
    for (const change of sheet.participation?.changes ?? []) {
      if (
        change.side !== side ||
        change.period !== quarter ||
        change.reason !== "sanction" ||
        !playing.has(change.outgoing)
      )
        continue;
      const outgoing = capFor(change.outgoing);
      const incoming = capFor(change.incoming);
      const end = sheet.events.findIndex((e) => e.id === change.eventId);
      const event = sheet.events[end];
      if (
        !event ||
        event.deleted ||
        event.side !== side ||
        event.period !== quarter ||
        event.cap !== outgoing ||
        !outgoing ||
        !incoming ||
        !["red", "exclusion", "penalty"].includes(event.kind)
      )
        continue;
      const exclusions =
        (side === "us" ? (sheet.baseline.find((b) => b.cap === outgoing)?.exclusions ?? 0) : 0) +
        sheet.events.filter(
          (e, i) =>
            i <= end &&
            !e.deleted &&
            e.side === side &&
            e.cap === outgoing &&
            ["exclusion", "penalty"].includes(e.kind),
        ).length;
      if (event.kind !== "red" && exclusions < exclusionLimit(sheet)) continue;
      if (
        side === "us"
          ? !sheet.players.some((p) => p.id === change.incoming && !p.retired)
          : !sheet.opponentCaps.includes(incoming)
      )
        continue;
      const incomingEvents = sheet.events.filter(
        (e, i) => i <= end && !e.deleted && e.side === side && e.cap === incoming,
      );
      const incomingExclusions =
        (side === "us" ? (sheet.baseline.find((b) => b.cap === incoming)?.exclusions ?? 0) : 0) +
        incomingEvents.filter((e) => ["exclusion", "penalty"].includes(e.kind)).length;
      if (
        incomingEvents.some((e) => e.kind === "red") ||
        incomingExclusions >= exclusionLimit(sheet)
      )
        continue;
      if (change.outgoing === keeper && roles.has(outgoing)) {
        roles.add(incoming);
        if (![1, 13].includes(incoming)) assigned.add(incoming);
        keeper = change.incoming;
      } else if (playing.has(change.incoming)) continue;
      playing.delete(change.outgoing);
      playing.add(change.incoming);
    }
  }
  return [...assigned];
}
