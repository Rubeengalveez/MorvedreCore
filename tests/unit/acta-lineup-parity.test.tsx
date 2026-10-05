import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ActaLineupSheet } from "@/components/matches/acta-lineup-sheet";
import { useLiveMatch } from "@/components/matches/use-live-match";
import { youthRecord, youthSheet } from "../fixtures/youth-acta";
import type { StoredMatch } from "@/lib/pwa/live-match-store";

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), load: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/pwa/live-match-store", () => ({
  readLocalMatch: mocks.read,
  writeLocalMatch: mocks.write,
  liveDevice: () => "00000000-0000-4000-8000-000000000102",
}));
vi.mock("@/server/actions/live-match", () => ({
  loadLiveMatch: mocks.load,
  syncLiveMatch: mocks.sync,
}));
let stored: StoredMatch;
beforeEach(() => {
  vi.clearAllMocks();
  stored = youthRecord(youthSheet("alevin", [1, 2, 3, 4, 5, 6, 7, 8]));
  history.replaceState({}, "", `/acta?match=${stored.matchId}`);
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  mocks.read.mockImplementation(async () => structuredClone(stored));
  mocks.write.mockImplementation(
    async (next: StoredMatch, expected?: { mutation: string; draftRevision: number }) => {
      if (
        expected &&
        (stored.mutation !== expected.mutation ||
          (stored.draftRevision ?? 0) !== expected.draftRevision)
      )
        throw new Error("La selección ha cambiado en otra pestaña.");
      stored = structuredClone(next);
    },
  );
});
afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

function Harness() {
  const { record, change, saveLineupDraft, busy } = useLiveMatch();
  return record ? (
    <ActaLineupSheet
      record={record}
      request={{ period: 1, mode: "start" }}
      change={(next, expectedDraftRevision) => change(next, { expectedDraftRevision })}
      saveDraft={saveLineupDraft}
      busy={busy}
      onClose={() => {}}
      onSaved={() => {}}
    />
  ) : null;
}

it("permite volver tocando Morvedre y conserva las dos selecciones sin falsos conflictos", async () => {
  render(<Harness />);
  await screen.findByRole("button", { name: "2 Jugador 2" });
  for (const cap of [2, 3, 4, 5, 6])
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: `${cap} Jugador ${cap}` }));
    });
  expect(screen.getByRole("button", { name: "2 Jugador 2" })).toBeEnabled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "2. Rival" }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "2" }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "1. Morvedre" }));
  });
  expect(screen.getByRole("button", { name: "2 Jugador 2" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(stored.lineupDraft?.them.field).toEqual(["2"]);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("el paso Rival valida la selección y un borrador externo bloquea el selector obsoleto", async () => {
  render(<Harness />);
  const player = await screen.findByRole("button", { name: "2 Jugador 2" });
  fireEvent.click(screen.getByRole("button", { name: "2. Rival" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Morvedre: faltan 5 jugadores de campo");
  stored = { ...stored, draftRevision: 1 };
  await act(async () => {
    fireEvent.click(player);
  });
  await waitFor(() => expect(player).toBeDisabled());
  expect(stored.lineupDraft).toBeUndefined();
  expect(screen.getByRole("alert")).toHaveTextContent(/otra pestaña|No se ha guardado/);
});
