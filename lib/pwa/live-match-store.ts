import { sheetSchema, type LiveRecord } from "@/lib/domain/live-match";
import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import { generateUuid } from "@/lib/utils/uuid";
import { lineupDraftSchema, type LineupDraft } from "@/lib/domain/live-match-rules";

export type StoredMatch = LiveRecord & {
  lineupDraft?: LineupDraft;
  rosterEdit?: boolean;
  flight?: { sheet: LiveRecord["sheet"]; mutation: string; revision: number; rosterEdit?: boolean };
  takeoverFlight?: { sheet: LiveRecord["sheet"]; mutation: string; revision: number };
};
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
        const parsed = sheetSchema.safeParse(request.result.sheet);
        if (!parsed.success)
          return reject(
            new Error("El acta local no se puede leer. No borres los datos de este navegador."),
          );
        const draft = lineupDraftSchema.safeParse(request.result.lineupDraft);
        resolve({
          ...request.result,
          sheet: identifyLiveSheet(parsed.data),
          lineupDraft: draft.success ? draft.data : undefined,
        });
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export async function writeLocalMatch(record: StoredMatch) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("matches", "readwrite");
      tx.objectStore("matches").put(record);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () =>
        reject(
          new Error(
            "No se ha registrado la acción: el móvil no pudo guardarla. Libera espacio y vuelve a intentarlo.",
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
            const parsed = sheetSchema.safeParse(record.sheet);
            return parsed.success ? [{ ...record, sheet: identifyLiveSheet(parsed.data) }] : [];
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
