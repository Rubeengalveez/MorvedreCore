import { sheetSchema, type LiveSheet } from "./live-match";

export function identifyLiveSheet(sheet: LiveSheet, previous?: LiveSheet): LiveSheet {
  const byCap = new Map(sheet.players.map((player) => [player.cap, player.id]));
  const oldEvents = new Map(previous?.events.map((event) => [event.id, event]) ?? []);
  const oldShots = new Map(previous?.shootout?.shots.map((shot) => [shot.id, shot]) ?? []);
  return sheetSchema.parse({
    ...sheet,
    version: sheet.version === 4 ? 4 : 3,
    keeper:
      sheet.keeper === 1 || sheet.keeper === 13
        ? sheet.keeper
        : (sheet.players.find(
            (player) => !player.retired && (player.cap === 1 || player.cap === 13),
          )?.cap ?? null),
    events: sheet.events.map((event) => {
      const old = oldEvents.get(event.id);
      const playerChanged = old && old.cap !== event.cap;
      const keeperChanged = old && old.keeper !== event.keeper;
      return {
        ...event,
        playerId:
          event.side === "us" && event.cap !== null
            ? playerChanged || !event.playerId
              ? byCap.get(event.cap)
              : event.playerId
            : null,
        capAtEvent: playerChanged || event.capAtEvent === undefined ? event.cap : event.capAtEvent,
        keeperId:
          event.keeper !== null
            ? keeperChanged || !event.keeperId
              ? byCap.get(event.keeper)
              : event.keeperId
            : null,
        keeperCapAtEvent:
          keeperChanged || event.keeperCapAtEvent === undefined
            ? event.keeper
            : event.keeperCapAtEvent,
      };
    }),
    baseline: sheet.baseline.map((entry) => ({
      ...entry,
      playerId: entry.playerId ?? byCap.get(entry.cap),
    })),
    keeperStints: sheet.keeperStints?.map((stint, index) => {
      const changed =
        previous?.keeperStints?.[index]?.cap !== undefined &&
        previous.keeperStints[index].cap !== stint.cap;
      return {
        ...stint,
        playerId: changed || !stint.playerId ? byCap.get(stint.cap) : stint.playerId,
        capAtEvent: changed || stint.capAtEvent === undefined ? stint.cap : stint.capAtEvent,
      };
    }),
    shootout: sheet.shootout
      ? {
          ...sheet.shootout,
          shots: sheet.shootout.shots.map((shot) => {
            const old = oldShots.get(shot.id);
            const playerChanged = old && old.cap !== shot.cap;
            const keeperChanged = old && old.keeper !== shot.keeper;
            return {
              ...shot,
              playerId:
                shot.side === "us"
                  ? playerChanged || !shot.playerId
                    ? byCap.get(shot.cap)
                    : shot.playerId
                  : null,
              capAtEvent:
                playerChanged || shot.capAtEvent === undefined ? shot.cap : shot.capAtEvent,
              keeperId:
                shot.keeper !== null
                  ? keeperChanged || !shot.keeperId
                    ? byCap.get(shot.keeper)
                    : shot.keeperId
                  : null,
              keeperCapAtEvent:
                keeperChanged || shot.keeperCapAtEvent === undefined
                  ? shot.keeper
                  : shot.keeperCapAtEvent,
            };
          }),
        }
      : undefined,
  });
}
