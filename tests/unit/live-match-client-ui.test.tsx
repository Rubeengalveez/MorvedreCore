import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveMatchClient } from "@/components/matches/live-match-client";
import { ActaPlayerBoard } from "@/components/matches/acta-player-board";
import type { LiveRecord, LiveSheet, MatchEvent } from "@/lib/domain/live-match";

const mock = vi.hoisted(() => ({ hook: vi.fn(), change: vi.fn() }));
vi.mock("@/components/matches/use-live-match", () => ({ useLiveMatch: () => mock.hook() }));

const players = [
  { id: "10000000-0000-4000-8000-000000000001", cap: 1, name: "Álex García" },
  { id: "10000000-0000-4000-8000-000000000002", cap: 2, name: "Marcos Ruiz" },
  { id: "10000000-0000-4000-8000-000000000003", cap: 3, name: "Pablo Torres" },
  { id: "10000000-0000-4000-8000-000000000004", cap: 13, name: "Iván Ortiz" },
];
let sequence = 0;
function event(kind: MatchEvent["kind"], values: Partial<MatchEvent> = {}): MatchEvent {
  sequence += 1;
  return {
    id: `20000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    side: "us",
    cap: 2,
    kind,
    period: 1,
    keeper: null,
    deleted: false,
    ...values,
  };
}
function sheet(events: MatchEvent[] = []): LiveSheet {
  return {
    version: 2,
    players,
    opponentCaps: [1, 2, 3, 4],
    periods: 4,
    period: 1,
    phase: "playing",
    keeper: 1,
    events,
    baseline: players.map((player) => ({ cap: player.cap, goals: 0, exclusions: 0 })),
    baselineThem: 0,
    pending: null,
  };
}
function record(events: MatchEvent[] = []): LiveRecord {
  return {
    matchId: "30000000-0000-4000-8000-000000000001",
    owner: players[0].id,
    viewer: players[0].id,
    canEdit: true,
    opponent: "Rival",
    team: "Infantil",
    date: "2026-09-09T12:00:00Z",
    revision: 1,
    mutation: "40000000-0000-4000-8000-000000000001",
    device: "50000000-0000-4000-8000-000000000001",
    sheet: sheet(events),
    dirty: false,
  };
}

beforeEach(() => {
  mock.change.mockReset();
  mock.change.mockResolvedValue(true);
  mock.hook.mockReturnValue({
    record: record(),
    error: "",
    preparation: undefined,
    busy: false,
    writable: true,
    online: true,
    change: mock.change,
    retry: vi.fn(),
    takeover: vi.fn(),
  });
});
afterEach(cleanup);

describe("interfaz del acta", () => {
  it("guarda el gol antes de preguntar por la asistencia", async () => {
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: /Morvedre, gorro 2,/ }));
    fireEvent.click(screen.getByRole("button", { name: "Gol" }));
    fireEvent.click(screen.getByRole("button", { name: "Gol normal" }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledTimes(1));
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.events.at(-1)).toMatchObject({ side: "us", cap: 2, kind: "goal" });
    expect(saved.pending).toMatchObject({ kind: "assist", goal_event_id: saved.events.at(-1)?.id });
  });

  it("guarda el penalti rival una sola vez antes de elegir lanzador", async () => {
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: /Rival, gorro 4,/ }));
    fireEvent.click(screen.getByRole("button", { name: "Penalti · +1 expulsión" }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledTimes(1));
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.events.at(-1)).toMatchObject({ side: "them", cap: 4, kind: "penalty" });
    expect(saved.pending).toMatchObject({
      kind: "penalty_shot",
      penalty_event_id: saved.events.at(-1)?.id,
      shooter_cap: null,
    });
  });

  it("conserva el cuarto del penalti al retomar su lanzamiento", async () => {
    const penalty = event("penalty", { side: "them", cap: 4, period: 1 });
    const resumed = record([penalty]);
    resumed.sheet = {
      ...resumed.sheet,
      period: 2,
      pending: {
        kind: "penalty_shot",
        penalty_event_id: penalty.id,
        shooter_cap: 2,
      },
    };
    mock.hook.mockReturnValue({ ...mock.hook(), record: resumed });
    render(<LiveMatchClient />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Resultado del penalti" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Gol" }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledTimes(1));
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.events.at(-1)).toMatchObject({ kind: "goal_penalty", period: 1 });
  });

  it("obliga a elegir portero antes de atribuir un gol rival", () => {
    const withoutKeeper = record();
    withoutKeeper.sheet = { ...withoutKeeper.sheet, keeper: null };
    mock.hook.mockReturnValue({ ...mock.hook(), record: withoutKeeper });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: /Rival, gorro 4,/ }));
    fireEvent.click(screen.getByRole("button", { name: "Gol" }));
    expect(screen.getByRole("heading", { name: "Portero en juego" })).toBeInTheDocument();
    expect(screen.getByText(/Elige quién está de portero/)).toBeInTheDocument();
    expect(mock.change).not.toHaveBeenCalled();
  });

  it("explica los tiempos pedidos y muestra el acceso visible para corregir", () => {
    render(<LiveMatchClient />);
    expect(screen.getByRole("button", { name: /Tiempo muerto/ })).toHaveTextContent(
      "Pedidos: M 0 · R 0",
    );
    expect(screen.getByRole("button", { name: "Corregir jugadas" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Tiempo muerto/ }));
    expect(screen.getByRole("button", { name: "Morvedre · 0 pedidos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rival · 0 pedidos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tarjeta al entrenador" })).toBeInTheDocument();
  });

  it("pide confirmación amplia antes de anular", () => {
    mock.hook.mockReturnValue({
      ...mock.hook(),
      record: record([event("goal")]),
    });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getAllByRole("button", { name: "Corregir jugadas" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Anular" }));
    expect(screen.getByRole("heading", { name: "Anular jugada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sí, anular esta jugada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atrás" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });

  it("permite vincular una asistencia manual desde Corregir", () => {
    const goal = event("goal", { cap: 2 });
    const assist = event("assist", { cap: 3 });
    mock.hook.mockReturnValue({ ...mock.hook(), record: record([goal, assist]) });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Corregir" })[0]);
    expect(screen.getByRole("heading", { name: "Corregir asistencia" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Vincular al gol de #2/ }));
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.events.find((item) => item.id === assist.id)).toMatchObject({
      related_event_id: goal.id,
      cap: 3,
    });
  });

  it("obliga a resolver una autoasistencia al cambiar el goleador", () => {
    const goal = event("goal", { cap: 2 });
    const assist = event("assist", { cap: 3, related_event_id: goal.id });
    mock.hook.mockReturnValue({ ...mock.hook(), record: record([goal, assist]) });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Corregir" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar jugador" }));
    fireEvent.click(screen.getByRole("button", { name: /3Pablo Torres/ }));
    fireEvent.click(screen.getByRole("button", { name: "Gol" }));
    fireEvent.click(screen.getByRole("button", { name: "Gol normal" }));
    expect(screen.getByRole("heading", { name: "Resolver la asistencia" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /1Álex GarcíaNueva asistencia/ }));
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.events.find((item) => item.id === goal.id)?.cap).toBe(3);
    expect(saved.events.find((item) => item.id === assist.id)?.cap).toBe(1);
  });

  it("pregunta antes de registrar una parada con un portero distinto", () => {
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: /Portero de Morvedre, gorro 13,/ }));
    fireEvent.click(screen.getByRole("button", { name: "Parada" }));
    expect(screen.getByRole("heading", { name: "¿Quién estaba en portería?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Está jugando el #13" }));
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.keeper).toBe(13);
    expect(saved.events.at(-1)).toMatchObject({ kind: "save", cap: 13 });
  });

  it("resuelve una corrección que rompe el vínculo de un penalti", () => {
    const penalty = event("penalty", { side: "them", cap: 4 });
    const result = event("goal_penalty", {
      cap: 2,
      related_event_id: penalty.id,
      origin: "penalty_flow",
    });
    mock.hook.mockReturnValue({ ...mock.hook(), record: record([penalty, result]) });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Rival" }));
    fireEvent.click(screen.getByRole("button", { name: "Corregir" }));
    fireEvent.click(screen.getByRole("button", { name: "Expulsión" }));
    expect(
      screen.getByRole("heading", { name: "Resolver el penalti vinculado" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar y dejar el lanzamiento independiente" }),
    );
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.events.find((item) => item.id === penalty.id)?.kind).toBe("exclusion");
    expect(saved.events.find((item) => item.id === result.id)).toMatchObject({
      related_event_id: null,
      origin: "manual",
      deleted: false,
    });
  });

  it("permite anular solo la sanción de un penalti vinculado", () => {
    const penalty = event("penalty", { side: "them", cap: 4 });
    const result = event("penalty_missed", {
      cap: 2,
      related_event_id: penalty.id,
      origin: "penalty_flow",
    });
    mock.hook.mockReturnValue({ ...mock.hook(), record: record([penalty, result]) });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Rival" }));
    fireEvent.click(screen.getByRole("button", { name: "Anular" }));
    fireEvent.click(screen.getByRole("button", { name: "Anular solo la sanción" }));
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.events.find((item) => item.id === penalty.id)?.deleted).toBe(true);
    expect(saved.events.find((item) => item.id === result.id)).toMatchObject({
      related_event_id: null,
      origin: "manual",
      deleted: false,
    });
  });

  it("muestra portería y colorea la fila completa con texto además del color", () => {
    const events = [
      event("save", { cap: 1 }),
      event("goal", { side: "them", cap: 3, keeper: 1 }),
      event("exclusion", { cap: 2 }),
      event("exclusion", { cap: 3 }),
      event("penalty", { cap: 3 }),
      event("red", { cap: 13 }),
    ];
    render(<ActaPlayerBoard sheet={sheet(events)} playing onPlayer={vi.fn()} />);
    const keeper = screen.getByRole("button", { name: /Portero de Morvedre, gorro 1,/ });
    expect(keeper).toHaveAccessibleName(/1 paradas, 1 goles encajados/);
    expect(screen.getByText(/En juego/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Morvedre, gorro 2,/ })).toHaveClass("bg-amber-50");
    expect(screen.getByRole("button", { name: /Morvedre, gorro 3,/ })).toHaveClass("bg-orange-100");
    expect(screen.getByRole("button", { name: /Portero de Morvedre, gorro 13,/ })).toHaveClass("bg-red-100");
    expect(screen.getAllByText(/Fuera/i).length).toBeGreaterThan(0);
  });

  it("mantiene los porteros dentro del orden numérico", () => {
    const unordered = sheet();
    unordered.players = [unordered.players[2], unordered.players[0], unordered.players[3], unordered.players[1]];
    render(<ActaPlayerBoard sheet={unordered} playing onPlayer={vi.fn()} />);
    const ownRows = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-label")?.includes("Morvedre, gorro"));
    expect(ownRows.map((row) => row.getAttribute("aria-label")?.match(/gorro (\d+)/)?.[1])).toEqual([
      "1",
      "2",
      "3",
      "13",
    ]);
  });

  it("permite cerrar una continuación guardada sin volver a abrirla", async () => {
    const goal = event("goal", { cap: 2 });
    const pendingRecord = record([goal]);
    pendingRecord.sheet = {
      ...pendingRecord.sheet,
      pending: { kind: "assist", goal_event_id: goal.id },
    };
    mock.hook.mockReturnValue({ ...mock.hook(), record: pendingRecord });
    render(<LiveMatchClient />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "¿Quién dio la asistencia?" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledWith(expect.objectContaining({ pending: null })));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "¿Quién dio la asistencia?" })).not.toBeInTheDocument(),
    );
  });
});

