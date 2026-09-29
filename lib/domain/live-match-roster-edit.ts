import { activeEvents, playerTotals, type LivePlayer, type LiveSheet } from "./live-match";
import { identifyLiveSheet } from "./live-match-identity";
import { reconcileLiveRoster } from "./live-match-roster";

export interface RosterTransfer {
  fromPlayerId: string;
  toPlayerId: string;
}

export function playerActionCount(sheet: LiveSheet, playerId: string): number {
  const player = sheet.players.find((entry) => entry.id === playerId);
  if (!player) return 0;
  return (
    activeEvents(sheet).filter(
      (event) =>
        event.playerId === playerId ||
        event.keeperId === playerId ||
        (!event.playerId && event.side === "us" && event.cap === player.cap) ||
        (!event.keeperId && event.keeper === player.cap),
    ).length +
    (sheet.shootout?.shots.filter(
      (shot) =>
        shot.playerId === playerId ||
        shot.keeperId === playerId ||
        (!shot.playerId && shot.side === "us" && shot.cap === player.cap) ||
        (!shot.keeperId && shot.keeper === player.cap),
    ).length ?? 0)
  );
}

export function playerHasRecordedHistory(sheet: LiveSheet, playerId: string): boolean {
  const player = sheet.players.find((entry) => entry.id === playerId);
  if (!player) return false;
  return (
    sheet.events.some(
      (event) =>
        event.playerId === playerId ||
        event.keeperId === playerId ||
        (!event.playerId && event.side === "us" && event.cap === player.cap) ||
        (!event.keeperId && event.keeper === player.cap),
    ) ||
    Boolean(
      sheet.keeperStints?.some(
        (stint) => stint.playerId === playerId || (!stint.playerId && stint.cap === player.cap),
      ),
    ) ||
    Boolean(
      sheet.shootout?.shots.some(
        (shot) =>
          shot.playerId === playerId ||
          shot.keeperId === playerId ||
          (!shot.playerId && shot.side === "us" && shot.cap === player.cap) ||
          (!shot.keeperId && shot.keeper === player.cap),
      ),
    ) ||
    sheet.baseline.some(
      (entry) =>
        (entry.playerId === playerId || (!entry.playerId && entry.cap === player.cap)) &&
        (entry.goals > 0 || entry.exclusions > 0),
    )
  );
}

export function editLiveRoster(
  source: LiveSheet,
  current: LivePlayer[],
  transfers: RosterTransfer[],
): LiveSheet {
  if (source.phase === "finished") throw new Error("El acta ya está cerrada.");
  if (source.pending)
    throw new Error("Completa la jugada pendiente antes de editar la convocatoria.");
  const sheet = identifyLiveSheet(source);
  if (!current.some((player) => player.cap === 1 || player.cap === 13))
    throw new Error("Asigna el gorro 1 o 13 a un portero antes de guardar.");
  const selected = new Set(current.map((player) => player.id));
  const oldIds = new Set(sheet.players.map((player) => player.id));
  const fromIds = new Set(transfers.map((item) => item.fromPlayerId));
  const toIds = new Set(transfers.map((item) => item.toPlayerId));
  if (fromIds.size !== transfers.length || toIds.size !== transfers.length) {
    throw new Error("Un jugador no puede recibir dos correcciones a la vez.");
  }
  for (const transfer of transfers) {
    if (
      !oldIds.has(transfer.fromPlayerId) ||
      selected.has(transfer.fromPlayerId) ||
      oldIds.has(transfer.toPlayerId) ||
      !selected.has(transfer.toPlayerId)
    ) {
      throw new Error("Revisa a quién corresponde cada jugador reemplazado.");
    }
  }
  for (const old of sheet.players) {
    if (selected.has(old.id) || fromIds.has(old.id)) continue;
    if (playerHasRecordedHistory(sheet, old.id))
      throw new Error(`${old.name} tiene acciones en el acta. Elige quién debe recibirlas.`);
  }
  const recipient = new Map(transfers.map((item) => [item.fromPlayerId, item.toPlayerId]));
  const transferId = (id: string | null | undefined) => (id ? (recipient.get(id) ?? id) : id);
  const prepared: LiveSheet = {
    ...sheet,
    players: sheet.players.map((old) => {
      const nextId = recipient.get(old.id);
      const next = nextId ? current.find((player) => player.id === nextId) : null;
      return next ? { ...old, id: next.id, name: next.name } : old;
    }),
    events: sheet.events.map((event) => ({
      ...event,
      playerId: transferId(event.playerId),
      keeperId: transferId(event.keeperId),
    })),
    baseline: sheet.baseline.map((entry) => ({
      ...entry,
      playerId: entry.playerId ? (recipient.get(entry.playerId) ?? entry.playerId) : undefined,
    })),
    keeperStints: sheet.keeperStints?.map((stint) => ({
      ...stint,
      playerId: stint.playerId ? (recipient.get(stint.playerId) ?? stint.playerId) : undefined,
    })),
    shootout: sheet.shootout
      ? {
          ...sheet.shootout,
          shots: sheet.shootout.shots.map((shot) => ({
            ...shot,
            playerId: transferId(shot.playerId),
            keeperId: transferId(shot.keeperId),
          })),
        }
      : undefined,
  };
  return reconcileLiveRoster(prepared, current);
}

export function transferSummary(sheet: LiveSheet, playerId: string) {
  const player = sheet.players.find((entry) => entry.id === playerId);
  if (!player) return { goals: 0, assists: 0, exclusions: 0, actions: 0 };
  const totals = playerTotals(sheet, "us", player.cap);
  return {
    goals: totals.goals,
    assists: totals.assists,
    exclusions: totals.exclusions,
    actions: playerActionCount(sheet, playerId),
  };
}
