import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readPendingLocalMatches, type StoredMatch } from "@/lib/pwa/live-match-store";

const match = (n: number): StoredMatch => ({
  matchId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  viewer: "viewer",
  owner: "viewer",
  device: "device",
  canEdit: true,
  revision: 1,
  mutation: "mutation",
  dirty: true,
  team: "Equipo",
  opponent: "Rival",
  date: "2026-09-30",
  sheet: {
    version: 1,
    players: [{ id: "00000000-0000-4000-8000-000000000001", cap: 1, name: "Juan" }],
    opponentCaps: [1],
    periods: 4,
    period: 1,
    phase: "playing",
    keeper: 1,
    events: [],
    baseline: [],
    baselineThem: 0,
  },
});
let records: unknown[];
const close = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  records = [];
  vi.stubGlobal("indexedDB", {
    open: () => {
      const request: { result?: unknown; onsuccess?: () => void } = {};
      queueMicrotask(() => {
        request.result = {
          close,
          transaction: () => ({
            objectStore: () => ({
              getAll: () => {
                const read: { result?: unknown; onsuccess?: () => void } = {};
                queueMicrotask(() => {
                  read.result = records;
                  read.onsuccess?.();
                });
                return read;
              },
            }),
          }),
        };
        request.onsuccess?.();
      });
      return request;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

it("lee solo documentos pendientes del delegado y móvil actuales", async () => {
  records = [
    match(1),
    { ...match(2), viewer: "another-viewer" },
    { ...match(3), device: "another-device" },
    { ...match(4), canEdit: false },
    { ...match(5), dirty: false },
  ];
  const result = await readPendingLocalMatches("viewer", "device");
  expect(result.map((record) => record.matchId)).toEqual([match(1).matchId]);
  expect(result[0].sheet.version).toBe(3);
  expect(close).toHaveBeenCalledOnce();
});

it("mantiene una petición incierta pendiente y no envía un relevo sin resolver", async () => {
  const flight = { sheet: match(1).sheet, mutation: "uncertain", revision: 1 };
  records = [
    { ...match(1), dirty: false, flight },
    { ...match(2), takeoverFlight: flight },
  ];
  const result = await readPendingLocalMatches("viewer", "device");
  expect(result).toHaveLength(1);
  expect(result[0].flight).toEqual(flight);
});

it("preserva el documento ilegible sin bloquear los otros ni borrarlo", async () => {
  const corrupt = { ...match(1), sheet: { invalid: true } };
  records = [corrupt, match(2)];
  expect(
    (await readPendingLocalMatches("viewer", "device")).map((record) => record.matchId),
  ).toEqual([match(2).matchId]);
  expect(records[0]).toBe(corrupt);
  expect(close).toHaveBeenCalledOnce();
});
