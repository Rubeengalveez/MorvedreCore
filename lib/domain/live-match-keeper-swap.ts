import { playerTotals, type LiveSheet } from "./live-match";
import { identifyLiveSheet } from "./live-match-identity";
import { reconcileLiveRoster } from "./live-match-roster";
import { selectMatchKeeper } from "./live-match-keepers";
import {
  controlsParticipation,
  currentParticipants,
  participantIsPlaying,
} from "./live-match-participation";
import { exclusionLimit } from "./live-match-rules";

export function keeperSwapCandidates(sheet: LiveSheet) {
  if (!["benjamin", "alevin", "infantil"].includes(sheet.category ?? "")) return [];
  return sheet.players.filter((player) => {
    const totals = playerTotals(sheet, "us", player.cap);
    return (
      !player.retired &&
      player.cap !== sheet.keeper &&
      !totals.red &&
      totals.exclusions < exclusionLimit(sheet)
    );
  });
}

export function swapKeeperCap(source: LiveSheet, incomingId: string): LiveSheet {
  if (source.phase !== "playing" || source.pending)
    throw new Error(
      "Completa la jugada pendiente y empieza el cuarto antes de cambiar los gorros.",
    );
  const incoming = keeperSwapCandidates(source).find((player) => player.id === incomingId);
  const outgoing = source.players.find((player) => player.cap === source.keeper && !player.retired);
  if (!incoming || !outgoing || ![1, 13].includes(outgoing.cap))
    throw new Error("Elige un jugador disponible de la convocatoria.");
  const oldTotals = playerTotals(source, "us", outgoing.cap);
  if (oldTotals.red || oldTotals.exclusions >= exclusionLimit(source))
    throw new Error("El portero está fuera por sanción. Usa la sustitución por sanción.");
  let sheet = identifyLiveSheet(source);
  if (!sheet.keeperStints?.some((stint) => stint.period === sheet.period))
    sheet = identifyLiveSheet({
      ...sheet,
      keeperStints: [
        ...(sheet.keeperStints ?? []),
        {
          period: sheet.period,
          cap: outgoing.cap,
          afterEventId: null,
        },
      ],
    });
  const players = sheet.players
    .filter((player) => !player.retired)
    .map((player) => ({
      ...player,
      cap:
        player.id === incoming.id
          ? outgoing.cap
          : player.id === outgoing.id
            ? incoming.cap
            : player.cap,
    }));
  const entersFromBench =
    controlsParticipation(source) && !participantIsPlaying(source, "us", incoming.cap);
  if (entersFromBench) {
    if (!currentParticipants(source, "us")?.has(outgoing.id))
      throw new Error("Revisa quién está jugando antes de cambiar los gorros.");
    sheet = {
      ...sheet,
      participation: {
        ...sheet.participation!,
        changes: [
          ...sheet.participation!.changes,
          {
            id: crypto.randomUUID(),
            period: sheet.period,
            side: "us",
            incoming: incoming.id,
            outgoing: outgoing.id,
            reason: "keeper_swap",
            afterEventId: sheet.events.at(-1)?.id ?? null,
          },
        ],
      },
    };
  }
  sheet = reconcileLiveRoster(sheet, players);
  if (sheet.participation?.fixedKeepers.us === outgoing.id)
    sheet = {
      ...sheet,
      participation: {
        ...sheet.participation,
        fixedKeepers: {
          ...sheet.participation.fixedKeepers,
          us: incoming.id,
        },
      },
    };
  return identifyLiveSheet(selectMatchKeeper(sheet, outgoing.cap, "change"));
}
