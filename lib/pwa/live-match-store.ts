import { sheetSchema, type LiveRecord } from "@/lib/domain/live-match";
import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import { generateUuid } from "@/lib/utils/uuid";
import { lineupDraftSchema, type LineupDraft } from "@/lib/domain/live-match-rules";
import { z } from "zod";

export type StoredMatch = LiveRecord & {
  lineupDraft?: LineupDraft;
  draftRevision?: number;
  rosterEdit?: boolean;
  flight?: { sheet: LiveRecord["sheet"]; mutation: string; revision: number; rosterEdit?: boolean };
  takeoverFlight?: { sheet: LiveRecord["sheet"]; mutation: string; revision: number };
};
const pendingFlightSchema = z.object({
  sheet: sheetSchema,
  mutation: z.string().min(1),
  revision: z.number().int().nonnegative(),
  rosterEdit: z.boolean().optional(),
});
const storedMetadataSchema = z
  .object({
    matchId: z.string().uuid(),
    viewer: z.string().min(1),
    owner: z.string(),
    device: z.string(),
    canEdit: z.boolean(),
    revision: z.number().int().nonnegative(),
    mutation: z.string(),
    dirty: z.boolean(),
    team: z.string().min(1),
    opponent: z.string().min(1),
    date: z.string().refine((value) => Number.isFinite(Date.parse(value))),
    homeAway: z.enum(["home", "away", "neutral"]).optional(),
    competition: z.string().optional(),
    venue: z.string().nullable().optional(),
    callupCandidates: z
      .array(
        z.object({
          player_id: z.string().uuid(),
          full_name: z.string(),
          cap_number: z.number().int().min(1).max(14).nullable(),
          has_conflict: z.boolean(),
          is_current_team: z.boolean(),
        }),
      )
      .optional(),
    callupTemplate: z
      .array(
        z.object({
          player_id: z.string().uuid(),
          cap_number: z.number().int().min(1).max(14).nullable(),
        }),
      )
      .optional(),
    draftRevision: z.number().int().nonnegative().optional(),
    rosterEdit: z.boolean().optional(),
    flight: pendingFlightSchema.optional(),
    takeoverFlight: pendingFlightSchema.optional(),
  })
  .passthrough();
export function parseStoredMatch(value: unknown): StoredMatch | undefined {
  const metadata = storedMetadataSchema.safeParse(value);
  if (!metadata.success) return undefined;
  const sheet = sheetSchema.safeParse(metadata.data.sheet);
  if (!sheet.success) return undefined;
  const draft = lineupDraftSchema.safeParse(metadata.data.lineupDraft);
  return {
    ...metadata.data,
    sheet: identifyLiveSheet(sheet.data),
    lineupDraft: draft.success ? draft.data : undefined,
  } as StoredMatch;
}
const DB = "morvedre-live-acta-v1";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("matches", { keyPath: "matchId" });
    request.onerror = () =>
      reject(new Error("No podemos guardar en este móvil. Libera espacio o usa otro navegador."));
    request.onsuccess = () => resolve(request.result);
  });
}
export async function readLocalMatch(id: string): Promise<StoredMatch | undefined> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("matches", "readonly");
      const request = tx.objectStore("matches").get(id);
      request.onsuccess = () => {
        if (!request.result) return resolve(undefined);
        const parsed = parseStoredMatch(request.result);
        if (!parsed || parsed.matchId !== id)
          return reject(
            new Error("El acta local no se puede leer. No borres los datos de este navegador."),
          );
        resolve(parsed);
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export async function writeLocalMatch(
  record: StoredMatch,
  expected?: { mutation: string; draftRevision: number },
) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("matches", "readwrite");
      const store = tx.objectStore("matches");
      let conflict = false;
      if (expected) {
        const request = store.get(record.matchId);
        request.onsuccess = () => {
          const previous = request.result as StoredMatch | undefined;
          if (
            !previous ||
            previous.mutation !== expected.mutation ||
            (previous.draftRevision ?? 0) !== expected.draftRevision
          ) {
            conflict = true;
            tx.abort();
          } else store.put(record);
        };
      } else store.put(record);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () =>
        reject(
          new Error(
            conflict
              ? "La selección ha cambiado en otra pestaña. Cierra la lista y vuelve a abrirla antes de guardar."
              : "No se ha registrado la acción: el móvil no pudo guardarla. Libera espacio y vuelve a intentarlo.",
          ),
        );
    });
  } finally {
    db.close();
  }
}

export async function readPendingLocalMatches(
  viewer: string,
  device: string,
): Promise<StoredMatch[]> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("matches", "readonly").objectStore("matches").getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const records = (request.result as StoredMatch[]).filter(
          (record) =>
            record.viewer === viewer &&
            record.device === device &&
            record.canEdit &&
            (record.dirty || record.flight) &&
            !record.takeoverFlight,
        );
        resolve(
          records.flatMap((record) => {
            const parsed = parseStoredMatch(record);
            return parsed ? [parsed] : [];
          }),
        );
      };
    });
  } finally {
    db.close();
  }
}
export async function clearLocalMatches() {
  if (typeof indexedDB === "undefined") return;
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("matches", "readwrite");
      const store = tx.objectStore("matches");
      const request = store.getAll();
      request.onsuccess = () => {
        if (request.result.some((r: StoredMatch) => r.dirty || r.flight || r.takeoverFlight)) {
          tx.abort();
          return;
        }
        store.clear();
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () =>
        reject(
          new Error(
            "Tienes un acta pendiente de sincronizar. Abre el partido con conexión antes de cerrar sesión.",
          ),
        );
    });
    localStorage.removeItem("morvedre-last-acta");
  } finally {
    db.close();
  }
}

export function liveDevice() {
  let id = localStorage.getItem("morvedre-acta-device");
  if (!id) {
    id = generateUuid();
    localStorage.setItem("morvedre-acta-device", id);
  }
  return id;
}
