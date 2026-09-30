import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { StoredMatch } from "@/lib/pwa/live-match-store";
import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import { prepareParticipation } from "@/lib/domain/live-match-participation";
import type { LineupDraft } from "@/lib/domain/live-match-rules";

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

const lineupDraft = (): LineupDraft => ({
  period: 1,
  mode: "correct",
  step: "us",
  baseMutation: record.mutation,
  us: { keeper: record.sheet.players[0].id, field: [] },
  them: { keeper: "1", field: [] },
});

it("abre el acta preparada cuando la red aparenta conexión pero la carga no responde", async () => {
  vi.useFakeTimers();
  mocks.load.mockReturnValue(new Promise(() => {}));
  const hook = renderHook(() => useLiveMatch());
  try {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8001);
    });
    expect(hook.result.current.writable).toBe(true);
    expect(hook.result.current.record?.matchId).toBe(record.matchId);
    await act(async () => {
      expect(
        await hook.result.current.change({ ...record.sheet, events: [goal(crypto.randomUUID())] }),
      ).toBe(true);
    });
    expect(stored.sheet.events).toHaveLength(1);
  } finally {
    hook.unmount();
    vi.useRealTimers();
  }
});

it("recupera una sincronización bloqueada sin perder ni duplicar la mutación pendiente", async () => {
  vi.useFakeTimers();
  mocks.sync.mockReturnValueOnce(new Promise(() => {}));
  const hook = renderHook(() => useLiveMatch());
  try {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await act(async () => {
      await hook.result.current.change({ ...record.sheet, events: [goal(crypto.randomUUID())] });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8001);
    });
    expect(hook.result.current.error).toMatch(/conectar/);
    const mutation = stored.flight?.mutation;
    expect(stored.sheet.events).toHaveLength(1);
    await act(async () => {
      await hook.result.current.retry();
    });
    expect(stored.dirty).toBe(false);
    expect(stored.flight).toBeUndefined();
    expect(mocks.sync.mock.calls[1][0].mutation).toBe(mutation);
    expect(stored.sheet.events).toHaveLength(1);
  } finally {
    hook.unmount();
    vi.useRealTimers();
  }
});

it("una respuesta recibida al salir del acta no sobrescribe la convocatoria editada después", async () => {
  let respond!: (value: unknown) => void;
  mocks.sync.mockReturnValueOnce(
    new Promise((resolve) => {
      respond = resolve;
    }),
  );
  const hook = renderHook(() => useLiveMatch());
  await waitFor(() => expect(hook.result.current.writable).toBe(true));
  await act(async () => {
    await hook.result.current.change({ ...record.sheet, events: [goal(crypto.randomUUID())] });
  });
  await waitFor(() => expect(mocks.sync).toHaveBeenCalledOnce());
  hook.unmount();
  const afterLeaving = {
    ...stored,
    mutation: crypto.randomUUID(),
    rosterEdit: true,
    sheet: {
      ...stored.sheet,
      players: [{ ...stored.sheet.players[0], name: "Jugador corregido" }],
    },
  };
  stored = structuredClone(afterLeaving);
  await act(async () => {
    respond({ ok: true, data: { revision: 2, owner: record.owner, sheet: record.sheet } });
  });
  expect(stored).toEqual(afterLeaving);
});

it("recupera un borrador local también al abrir con conexión sin enviar una alineación incompleta", async () => {
  const first = renderHook(() => useLiveMatch());
  await waitFor(() => expect(first.result.current.writable).toBe(true));
  await act(async () => {
    expect(await first.result.current.saveLineupDraft(lineupDraft())).toBe(true);
  });
  expect(stored.dirty).toBe(false);
  expect(mocks.sync).not.toHaveBeenCalled();
  first.unmount();
  const second = renderHook(() => useLiveMatch());
  await waitFor(() => expect(second.result.current.writable).toBe(true));
  expect(second.result.current.record?.lineupDraft).toEqual(lineupDraft());
  second.unmount();
  mocks.load.mockResolvedValue({
    ok: true,
    data: { ...record, revision: 2, mutation: crypto.randomUUID() },
  });
  const third = renderHook(() => useLiveMatch());
  await waitFor(() => expect(third.result.current.writable).toBe(true));
  expect(third.result.current.record?.lineupDraft).toBeUndefined();
});

it("no anuncia un borrador guardado cuando falla IndexedDB", async () => {
  const { result } = renderHook(() => useLiveMatch());
  await waitFor(() => expect(result.current.writable).toBe(true));
  mocks.write.mockRejectedValueOnce(new Error("Sin espacio local"));
  await act(async () => {
    expect(await result.current.saveLineupDraft(lineupDraft())).toBe(false);
  });
  expect(result.current.record?.lineupDraft).toBeUndefined();
  expect(result.current.error).toBe("Sin espacio local");
  expect(mocks.sync).not.toHaveBeenCalled();
});

it("una jugada inválida no muestra JSON de Zod ni modifica el documento guardado", async () => {
  const { result } = renderHook(() => useLiveMatch());
  await waitFor(() => expect(result.current.writable).toBe(true));
  await act(async () => {
    expect(await result.current.change({ ...record.sheet, periods: 0 })).toBe(false);
  });
  expect(stored.sheet.periods).toBe(6);
  expect(result.current.error).toBe("El periodo no es válido.");
  expect(mocks.sync).not.toHaveBeenCalled();
});

it("una respuesta atrasada conserva la corrección de participantes y descarta el borrador confirmado", async () => {
  const prepared = prepareParticipation(record.sheet, "infantil");
  stored = { ...record, sheet: prepared };
  mocks.load.mockResolvedValue({ ok: true, data: structuredClone(stored) });
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
    await result.current.saveLineupDraft(lineupDraft());
    await result.current.change(prepared);
  });
  await waitFor(() => expect(mocks.sync).toHaveBeenCalledTimes(1));
  const updated = {
    ...result.current.record!.sheet,
    participation: {
      ...prepared.participation!,
      lineups: [
        {
          period: 1,
          side: "us" as const,
          keeper: record.sheet.players[0].id,
          field: [],
          incident: "Faltan jugadores",
        },
        { period: 1, side: "them" as const, keeper: "1", field: [], incident: "Faltan jugadores" },
      ],
    },
  };
  await act(async () => {
    await result.current.change(updated);
  });
  await act(async () => {
    acknowledge({
      ok: true,
      data: { revision: 2, owner: record.owner, sheet: identifyLiveSheet(prepared) },
    });
  });
  await waitFor(() => expect(result.current.record?.dirty).toBe(false));
  expect(stored.sheet.participation?.lineups).toEqual(updated.participation.lineups);
  expect(stored.lineupDraft).toBeUndefined();
  expect(mocks.sync.mock.calls[1][0].sheet.participation.lineups).toHaveLength(2);
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
    version: 3,
    baseline: [{ cap: 1, goals: 3, exclusions: 2 }],
    baselineThem: 4,
  });
  expect(stored.sheet.events[0]).toMatchObject(historicalShot);
  expect(stored.sheet.events[0].playerId).toBe(record.sheet.players[0].id);
});

it("envía una corrección de convocatoria guardada sin conexión como una sola mutación", async () => {
  stored = {
    ...structuredClone(record),
    sheet: identifyLiveSheet(record.sheet),
    rosterEdit: true,
    dirty: true,
  };
  mocks.load.mockResolvedValue({ ok: true, data: structuredClone(record) });
  const { result } = renderHook(() => useLiveMatch());
  await waitFor(() =>
    expect(mocks.sync).toHaveBeenCalledWith(
      expect.objectContaining({ rosterEdit: true, sheet: expect.objectContaining({ version: 3 }) }),
    ),
  );
  await waitFor(() => expect(result.current.record?.dirty).toBe(false));
  expect(stored.rosterEdit).toBe(false);
});

it("guarda la convocatoria sin red y la sincroniza al recuperarla sin salir del editor", async () => {
  const originallyOnline = navigator.onLine;
  Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  const hook = renderHook(() => useLiveMatch());
  try {
    await waitFor(() => expect(hook.result.current.writable).toBe(true));
    const sheet = {
      ...record.sheet,
      players: [{ ...record.sheet.players[0], name: "Álex corregido" }],
    };
    await act(async () => {
      expect(await hook.result.current.change(sheet, { rosterEdit: true })).toBe(true);
    });
    expect(stored).toMatchObject({ dirty: true, rosterEdit: true });
    expect(mocks.sync).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    await act(async () => window.dispatchEvent(new Event("online")));
    await waitFor(() => expect(hook.result.current.record?.dirty).toBe(false));
    expect(mocks.sync).toHaveBeenCalledWith(
      expect.objectContaining({
        rosterEdit: true,
        sheet: expect.objectContaining({
          players: [expect.objectContaining({ name: "Álex corregido" })],
        }),
      }),
    );
    expect(stored.rosterEdit).toBe(false);
  } finally {
    hook.unmount();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: originallyOnline });
  }
});
