import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { StoredMatch } from "@/lib/pwa/live-match-store";

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), load: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/pwa/live-match-store", () => ({
  readLocalMatch: mocks.read,
  writeLocalMatch: mocks.write,
  liveDevice: () => "10000000-0000-4000-8000-000000000003",
}));
vi.mock("@/server/actions/live-match", () => ({
  loadLiveMatch: mocks.load,
  syncLiveMatch: mocks.sync,
}));
import { useLiveMatch } from "@/components/matches/use-live-match";

const record: StoredMatch = {
  matchId: "10000000-0000-4000-8000-000000000001",
  owner: "10000000-0000-4000-8000-000000000002",
  viewer: "10000000-0000-4000-8000-000000000002",
  canEdit: true,
  device: "10000000-0000-4000-8000-000000000003",
  revision: 1,
  mutation: "10000000-0000-4000-8000-000000000004",
  dirty: false,
  team: "Infantil",
  opponent: "Rival",
  date: "2026-09-07",
  sheet: {
    version: 1,
    players: [{ id: "10000000-0000-4000-8000-000000000005", cap: 1, name: "Álex" }],
    opponentCaps: [1],
    periods: 6,
    period: 1,
    phase: "playing",
    keeper: 1,
    events: [],
    baseline: [],
    baselineThem: 0,
  },
};
let stored: StoredMatch;
beforeEach(() => {
  vi.clearAllMocks();
  stored = structuredClone(record);
  history.replaceState({}, "", `/acta?match=${record.matchId}`);
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: (_name: string, _options: unknown, callback: (lock: object) => Promise<void>) =>
        callback({}),
    },
  });
  mocks.read.mockImplementation(async () => structuredClone(stored));
  mocks.write.mockImplementation(async (r: StoredMatch) => {
    stored = structuredClone(r);
  });
  mocks.load.mockResolvedValue({ ok: true, data: structuredClone(record) });
  mocks.sync.mockImplementation(async (input: { revision: number }) => ({
    ok: true,
    data: { revision: input.revision + 1, owner: record.owner },
  }));
});
afterEach(() => cleanup());
const goal = (id: string) => ({
  id,
  side: "us" as const,
  cap: 1,
  kind: "goal" as const,
  period: 1,
  keeper: null,
  deleted: false,
});

it("preserves a second jugada while acknowledging the first network request", async () => {
  let acknowledge: (v: unknown) => void = () => {};
  mocks.sync.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        acknowledge = resolve;
      }),
  );
  const { result } = renderHook(() => useLiveMatch());
  await waitFor(() => expect(result.current.writable).toBe(true));
  await act(async () => {
    await result.current.change({
      ...record.sheet,
      events: [goal("20000000-0000-4000-8000-000000000001")],
    });
  });
  await waitFor(() => expect(mocks.sync).toHaveBeenCalledTimes(1));
  await act(async () => {
    await result.current.change({
      ...result.current.record!.sheet,
      events: [
        ...result.current.record!.sheet.events,
        goal("20000000-0000-4000-8000-000000000002"),
      ],
    });
  });
  await act(async () => {
    acknowledge({ ok: true, data: { revision: 2, owner: record.owner } });
  });
  await waitFor(() => expect(result.current.record?.dirty).toBe(false));
  expect(stored.sheet.events).toHaveLength(2);
  expect(stored.revision).toBe(3);
  expect(mocks.sync.mock.calls[1][0].sheet.events).toHaveLength(2);
});

it("replays the same mutation after an uncertain response and reopening", async () => {
  mocks.sync.mockResolvedValueOnce({ ok: false, error: "Conexión interrumpida" });
  const first = renderHook(() => useLiveMatch());
  await waitFor(() => expect(first.result.current.writable).toBe(true));
  await act(async () => {
    await first.result.current.change({
      ...record.sheet,
      events: [goal("20000000-0000-4000-8000-000000000001")],
    });
  });
  await waitFor(() => expect(first.result.current.error).toBe("Conexión interrumpida"));
  const mutation = stored.flight!.mutation;
  first.unmount();
  mocks.load.mockResolvedValue({
    ok: true,
    data: { ...stored, revision: 2, dirty: false, flight: undefined },
  });
  const second = renderHook(() => useLiveMatch());
  await waitFor(() => expect(second.result.current.record?.dirty).toBe(false));
  expect(mocks.sync.mock.calls[1][0].mutation).toBe(mutation);
  expect(stored.sheet.events).toHaveLength(1);
  expect(stored.flight).toBeUndefined();
});

it("does not acknowledge a jugada if durable local storage fails", async () => {
  const { result } = renderHook(() => useLiveMatch());
  await waitFor(() => expect(result.current.writable).toBe(true));
  mocks.write.mockRejectedValueOnce(new Error("No hay espacio en el móvil"));
  let saved = true;
  await act(async () => {
    saved = await result.current.change({
      ...record.sheet,
      events: [goal("20000000-0000-4000-8000-000000000001")],
    });
  });
  expect(saved).toBe(false);
  expect(result.current.record?.sheet.events).toHaveLength(0);
  expect(mocks.sync).not.toHaveBeenCalled();
});

it("takes over when crypto.randomUUID is unavailable", async () => {
  const originalRandomUuid = crypto.randomUUID;
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: undefined });
  stored = { ...structuredClone(record), device: "10000000-0000-4000-8000-000000000099" };
  mocks.load.mockResolvedValue({ ok: true, data: structuredClone(stored) });
  const { result } = renderHook(() => useLiveMatch());
  await waitFor(() => expect(result.current.record).toBeDefined());
  await act(async () => {
    await result.current.takeover();
  });
  expect(mocks.sync).toHaveBeenCalledWith(
    expect.objectContaining({ takeover: true, mutation: expect.stringMatching(/^[0-9a-f-]{36}$/) }),
  );
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: originalRandomUuid });
});

it("recovers an accepted takeover with the same mutation after losing the response", async () => {
  stored = { ...structuredClone(record), device: "10000000-0000-4000-8000-000000000099" };
  mocks.load.mockResolvedValue({ ok: true, data: structuredClone(stored) });
  mocks.sync.mockResolvedValueOnce({ ok: false, error: "Se perdió la respuesta" });
  const { result } = renderHook(() => useLiveMatch());
  await waitFor(() => expect(result.current.record).toBeDefined());
  await act(async () => {
    await result.current.takeover();
  });
  expect(stored.takeoverFlight).toBeDefined();
  const attempt = structuredClone(stored.takeoverFlight!);
  mocks.load.mockResolvedValue({
    ok: true,
    data: {
      ...structuredClone(record),
      revision: attempt.revision + 1,
      mutation: attempt.mutation,
      device: "10000000-0000-4000-8000-000000000003",
    },
  });
  await act(async () => {
    await result.current.takeover();
  });
  expect(mocks.sync).toHaveBeenCalledTimes(1);
  expect(stored.takeoverFlight).toBeUndefined();
  expect(stored.mutation).toBe(attempt.mutation);
});

it("persists a pending continuation before attempting network sync", async () => {
  const { result } = renderHook(() => useLiveMatch());
  await waitFor(() => expect(result.current.writable).toBe(true));
  const scored = goal("20000000-0000-4000-8000-000000000090");
  await act(async () => {
    await result.current.change({
      ...record.sheet,
      events: [scored],
      pending: { kind: "assist", goal_event_id: scored.id },
    });
  });
  expect(stored.sheet.pending).toEqual({ kind: "assist", goal_event_id: scored.id });
  expect(mocks.write.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.sync.mock.invocationCallOrder[0],
  );
});

it("upgrades a version 1 draft without losing historical outcomes or baselines", async () => {
  const { result } = renderHook(() => useLiveMatch());
  await waitFor(() => expect(result.current.writable).toBe(true));
  const historicalShot = {
    ...goal("20000000-0000-4000-8000-000000000091"),
    kind: "shot_saved" as const,
  };
  await act(async () => {
    await result.current.change({
      ...record.sheet,
      version: 1,
      events: [historicalShot],
      baseline: [{ cap: 1, goals: 3, exclusions: 2 }],
      baselineThem: 4,
    });
  });
  expect(stored.sheet).toMatchObject({
    version: 2,
    baseline: [{ cap: 1, goals: 3, exclusions: 2 }],
    baselineThem: 4,
  });
  expect(stored.sheet.events).toContainEqual(historicalShot);
});
