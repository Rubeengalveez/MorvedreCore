import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { StoredMatch } from "@/lib/pwa/live-match-store";

const mocks = vi.hoisted(() => ({
  pending: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  sync: vi.fn(),
  refresh: vi.fn(),
}));
const router = { refresh: mocks.refresh };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/server/actions/live-match", () => ({ syncLiveMatch: mocks.sync }));
vi.mock("@/lib/pwa/live-match-store", () => ({
  readPendingLocalMatches: mocks.pending,
  readLocalMatch: mocks.read,
  writeLocalMatch: mocks.write,
  liveDevice: () => "device",
}));
import { ActaPendingSync } from "@/components/matches/acta-pending-sync";

const record: StoredMatch = {
  matchId: "00000000-0000-4000-8000-000000000800",
  owner: "viewer",
  viewer: "viewer",
  canEdit: true,
  device: "device",
  revision: 1,
  mutation: "mutation",
  dirty: true,
  rosterEdit: true,
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
};
let stored: StoredMatch;
let available: boolean;
beforeEach(() => {
  vi.clearAllMocks();
  stored = structuredClone(record);
  available = true;
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: (_name: string, _options: unknown, run: (lock: object | null) => Promise<void>) =>
        run(available ? {} : null),
    },
  });
  mocks.pending.mockImplementation(async () => [structuredClone(stored)]);
  mocks.read.mockImplementation(async () => structuredClone(stored));
  mocks.write.mockImplementation(async (next: StoredMatch) => {
    stored = structuredClone(next);
  });
  mocks.sync.mockImplementation(async (input: { revision: number }) => ({
    ok: true,
    data: { revision: input.revision + 1, owner: "viewer" },
  }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("envía la convocatoria pendiente fuera del acta y refresca la ficha tras confirmar el servidor", async () => {
  render(<ActaPendingSync viewer="viewer" />);
  await waitFor(() => expect(stored.dirty).toBe(false));
  expect(mocks.sync).toHaveBeenCalledWith(
    expect.objectContaining({
      matchId: record.matchId,
      rosterEdit: true,
      mutation: "mutation",
      device: "device",
    }),
  );
  expect(stored.flight).toBeUndefined();
  expect(stored.rosterEdit).toBe(false);
  expect(stored.revision).toBe(2);
  expect(mocks.refresh).toHaveBeenCalledOnce();
});

it("no envía ni escribe si otra pestaña está editando y reintenta cuando queda libre", async () => {
  available = false;
  render(<ActaPendingSync viewer="viewer" />);
  await waitFor(() => expect(mocks.pending).toHaveBeenCalledOnce());
  await act(async () => {});
  expect(mocks.read).not.toHaveBeenCalled();
  expect(mocks.write).not.toHaveBeenCalled();
  available = true;
  await act(async () => window.dispatchEvent(new Event("online")));
  await waitFor(() => expect(stored.dirty).toBe(false));
});

it("no toca los cambios sin conexión ni los de otra cuenta o móvil", async () => {
  Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  render(<ActaPendingSync viewer="viewer" />);
  expect(mocks.pending).not.toHaveBeenCalled();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  stored.viewer = "another-viewer";
  await act(async () => window.dispatchEvent(new Event("online")));
  expect(mocks.sync).not.toHaveBeenCalled();
  stored.viewer = "viewer";
  stored.device = "another-device";
  await act(async () => window.dispatchEvent(new Event("online")));
  expect(mocks.sync).not.toHaveBeenCalled();
  expect(stored.dirty).toBe(true);
});

it("retiene la misma mutación ante respuesta incierta y reintenta sin duplicar", async () => {
  vi.useFakeTimers();
  mocks.sync.mockReturnValueOnce(new Promise(() => {}));
  render(<ActaPendingSync viewer="viewer" />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(8001);
  });
  expect(stored.dirty).toBe(true);
  expect(stored.flight?.mutation).toBe("mutation");
  expect(mocks.refresh).not.toHaveBeenCalled();
  await act(async () => window.dispatchEvent(new Event("online")));
  expect(mocks.sync).toHaveBeenCalledTimes(2);
  expect(mocks.sync.mock.calls[1][0].mutation).toBe("mutation");
  expect(stored.dirty).toBe(false);
});

it("no aplica respuestas después de salir ni borra el documento pendiente si el servidor rechaza", async () => {
  let respond!: (value: unknown) => void;
  mocks.sync.mockReturnValueOnce(
    new Promise((resolve) => {
      respond = resolve;
    }),
  );
  const view = render(<ActaPendingSync viewer="viewer" />);
  await waitFor(() => expect(mocks.sync).toHaveBeenCalledOnce());
  view.unmount();
  await act(async () => respond({ ok: true, data: { revision: 2, owner: "viewer" } }));
  expect(stored.dirty).toBe(true);
  expect(stored.flight?.mutation).toBe("mutation");
  mocks.sync.mockResolvedValue({ ok: false, error: "Otro delegado controla el acta" });
  render(<ActaPendingSync viewer="viewer" />);
  await waitFor(() => expect(mocks.sync).toHaveBeenCalledTimes(2));
  expect(stored.dirty).toBe(true);
  expect(stored.sheet).toEqual(record.sheet);
  expect(mocks.refresh).not.toHaveBeenCalled();
});
