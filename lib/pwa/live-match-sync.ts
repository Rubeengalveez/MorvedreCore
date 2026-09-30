import { reconcileLiveRoster } from "@/lib/domain/live-match-roster";
import type { LiveSheet } from "@/lib/domain/live-match";
import type { StoredMatch } from "./live-match-store";

export async function requestWithActaDeadline<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "No pudimos conectar. Tus cambios siguen en este móvil; volveremos a enviarlos.",
              ),
            ),
          8000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function prepareLiveFlight(record: StoredMatch): StoredMatch {
  return {
    ...record,
    flight: record.flight ?? {
      sheet: record.sheet,
      mutation: record.mutation,
      revision: record.revision,
      rosterEdit: record.rosterEdit,
    },
  };
}

export function acknowledgeLiveFlight(
  latest: StoredMatch,
  flight: NonNullable<StoredMatch["flight"]>,
  saved: { revision: number; owner: string; sheet?: LiveSheet },
  device: string,
): StoredMatch {
  return {
    ...latest,
    sheet: saved.sheet
      ? latest.mutation === flight.mutation
        ? saved.sheet
        : latest.rosterEdit
          ? latest.sheet
          : reconcileLiveRoster(
              latest.sheet,
              saved.sheet.players.filter((player) => !player.retired),
            )
      : latest.sheet,
    revision: saved.revision,
    owner: saved.owner,
    device,
    dirty: latest.mutation !== flight.mutation,
    rosterEdit: latest.mutation === flight.mutation ? false : latest.rosterEdit,
    flight: undefined,
  };
}
