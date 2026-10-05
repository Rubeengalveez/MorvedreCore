import { act, cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveMatchClient } from "@/components/matches/live-match-client";
import { ActaPlayerBoard } from "@/components/matches/acta-player-board";
import type { LiveRecord, LiveSheet, MatchEvent } from "@/lib/domain/live-match";
import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import { prepareParticipation, saveLineups } from "@/lib/domain/live-match-participation";

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

function youthRecord(period = 1): LiveRecord {
  const current = record();
  current.sheet = prepareParticipation(
    {
      ...current.sheet,
      phase: "ready",
      periods: 6,
      players: Array.from({ length: 14 }, (_, i) => ({
        id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
        cap: i + 1,
        name: `Jugador ${i + 1}`,
      })),
      opponentCaps: Array.from({ length: 14 }, (_, i) => i + 1),
      baseline: [],
    },
    "infantil",
  );
  for (let quarter = 1; quarter <= Math.min(period, 4); quarter++) {
    current.sheet = identifyLiveSheet(
      saveLineups(
        {
          ...current.sheet,
          phase: quarter === 1 ? "ready" : "break",
          period: Math.max(1, quarter - 1),
        },
        ["us", "them"].map((side) => ({
          side: side as "us" | "them",
          period: quarter,
          keeper: side === "us" ? current.sheet.players[0].id : "1",
          field: [2, 3, 4, 5, 6, 7].map((n) =>
            side === "us" ? current.sheet.players[n - 1].id : String(n),
          ),
        })),
        "start",
      ),
    );
  }
  if (period > 4) current.sheet = { ...current.sheet, period, phase: "playing" };
  return current;
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
    saveLineupDraft: vi.fn().mockResolvedValue(true),
    retry: vi.fn(),
    takeover: vi.fn(),
  });
});
afterEach(cleanup);

describe("interfaz del acta", () => {
  it("al salir de un acta cerrada ofrece consulta y no corregir convocatoria", () => {
    const current = record();
    current.sheet.phase = "finished";
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Volver al partido" }));
    expect(screen.getByRole("button", { name: "Seguir viendo el acta" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Corregir convocatoria" })).toBeNull();
    expect(
      screen.getByText("Puedes volver a consultar las jugadas y estadísticas."),
    ).toBeInTheDocument();
  });

  it.each([false, true])(
    "bloquea el cambio de portero durante el descanso, categoría joven: %s",
    (youth) => {
      const current = youth ? youthRecord(2) : record();
      current.sheet.phase = "break";
      mock.hook.mockReturnValue({ ...mock.hook(), record: current });
      render(<LiveMatchClient />);
      const keeper = screen.getByRole("button", { name: /Portero en juego/ });
      expect(keeper).toBeDisabled();
      fireEvent.click(keeper);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(mock.change).not.toHaveBeenCalled();
    },
  );
  it("elimina el aviso de cierre de rotación antes del quinto cuarto", () => {
    const current = youthRecord(4);
    current.sheet.phase = "break";
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    expect(screen.queryByText("Revisa los cuatro primeros cuartos")).toBeNull();
    expect(screen.queryByText("Ver avisos de rotación")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Toca aquí para empezar el cuarto 5" }),
    ).toBeEnabled();
  });

  it("muestra el relevo con acciones claras y permite cancelar", () => {
    const takeover = vi.fn();
    mock.hook.mockReturnValue({ ...mock.hook(), writable: false, takeover });
    render(<LiveMatchClient />);

    fireEvent.click(screen.getByRole("button", { name: "Tomar el relevo en este móvil" }));
    const dialog = screen.getByRole("dialog", { name: "¿Tomar el relevo?" });
    expect(within(dialog).getByText("Comprueba el otro móvil")).toBeInTheDocument();
    expect(within(dialog).getByText(/Debe mostrar «Guardado»/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "¿Tomar el relevo?" })).toBeNull();
    expect(takeover).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Tomar el relevo en este móvil" }));
    fireEvent.click(screen.getByRole("button", { name: "Tomar el relevo" }));
    expect(takeover).toHaveBeenCalledOnce();
  });

  it("Atrás cierra el panel antes de ofrecer salir del acta", async () => {
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    expect(screen.getByRole("heading", { name: "Corregir una jugada" })).toBeInTheDocument();
    fireEvent.popState(window);
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Corregir una jugada" })).toBeNull(),
    );
    fireEvent.popState(window);
    expect(screen.getByRole("heading", { name: "¿Salir del acta?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salir" })).toHaveClass("bg-red-800");
    fireEvent.click(screen.getByRole("button", { name: "Seguir anotando" }));
    expect(screen.queryByRole("heading", { name: "¿Salir del acta?" })).toBeNull();
    expect(mock.change).not.toHaveBeenCalled();
  });

  it("Atrás no descarta un penalti pendiente", async () => {
    const penalty = event("penalty", { side: "them", cap: 4 });
    const current = record([penalty]);
    current.sheet.pending = { kind: "penalty_shot", penalty_event_id: penalty.id, shooter_cap: 2 };
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Resultado del penalti" })).toBeInTheDocument(),
    );
    fireEvent.popState(window);
    expect(screen.getByRole("heading", { name: "Resultado del penalti" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "¿Salir del acta?" })).toBeNull();
    expect(mock.change).not.toHaveBeenCalled();
  });

  it("permite clasificar un penalti fallado antiguo desde Corregir", async () => {
    const missed = event("penalty_missed");
    mock.hook.mockReturnValue({ ...mock.hook(), record: record([missed]) });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.click(screen.getByRole("button", { name: "Corregir" }));
    expect(screen.getByText(/Corregir penalti fallado/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fuera / palo" }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledTimes(1));
    expect(mock.change.mock.calls[0][0].events).toEqual([
      expect.objectContaining({ id: missed.id, kind: "penalty_missed", missOutcome: "out" }),
    ]);
  });
  it.each([null, 2])("impide cerrar un penalti pendiente con lanzador %s", async (shooter) => {
    const penalty = event("penalty", { side: "them", cap: 4 });
    const current = record([penalty]);
    current.sheet.pending = {
      kind: "penalty_shot",
      penalty_event_id: penalty.id,
      shooter_cap: shooter,
    };
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(mock.change).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Termina el lanzamiento antes de seguir.",
    );
    expect(
      document.getElementById(dialog.getAttribute("aria-describedby") ?? ""),
    ).toBeInTheDocument();
    expect(current.sheet.pending).toMatchObject({
      penalty_event_id: penalty.id,
      shooter_cap: shooter,
    });
  });
  it.each([
    ["Parada por el portero", "save"],
    ["Sin gol: fuera, palo o sin tiro válido", "out"],
  ] as const)("guarda el destino %s de un penalti en un solo tiro", async (label, outcome) => {
    const penalty = event("penalty", { side: "them", cap: 4 });
    const current = record([penalty]);
    current.sheet.pending = { kind: "penalty_shot", penalty_event_id: penalty.id, shooter_cap: 2 };
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Resultado del penalti" })).toBeInTheDocument(),
    );
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: label }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledTimes(1));
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.events).toHaveLength(2);
    expect(saved.events[1]).toMatchObject({
      kind: "penalty_missed",
      missOutcome: outcome,
      related_event_id: penalty.id,
    });
    expect(saved.pending).toBeNull();
  });
  it("elegir portero inicia el siguiente cuarto con un solo toque en su nombre", async () => {
    const paused = record();
    paused.sheet.phase = "break";
    mock.hook.mockReturnValue({ ...mock.hook(), record: paused });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Toca aquí para empezar el cuarto 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Elegir portero y empezar el cuarto 2" }));
    expect(mock.change).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Iván Ortiz/ }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledTimes(1));
    expect(mock.change.mock.calls[0][0]).toMatchObject({
      phase: "playing",
      period: 2,
      keeper: 13,
      keeperStints: [{ period: 2, cap: 13 }],
    });
  });
  it("permite corregir una selección sin contar dos porteros", async () => {
    const current = record();
    current.sheet.keeperStints = [{ cap: 1, period: 1, afterEventId: null }];
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Corregir portero" }),
    );
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Iván Ortiz/ }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledTimes(1));
    expect(mock.change.mock.calls[0][0].keeperStints).toEqual([
      { cap: 13, period: 1, afterEventId: null },
    ]);
  });
  it("corrige el portero de un cuarto anterior sin cambiar el que está jugando ahora", async () => {
    const received = event("goal", { side: "them", cap: 3, keeper: 1, period: 1 });
    const current = record([received]);
    current.sheet.period = 2;
    current.sheet.keeper = 1;
    current.sheet.keeperStints = [
      { cap: 1, period: 1, afterEventId: null },
      { cap: 1, period: 2, afterEventId: received.id },
    ];
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Cuarto de las jugadas" }), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Jugadas de Morvedre/ }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Corregir portero" }),
    );
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Iván Ortiz/ }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledOnce());
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.keeper).toBe(1);
    expect(saved.events[0].keeper).toBe(13);
    expect(saved.keeperStints).toEqual([
      { cap: 13, period: 1, afterEventId: null },
      { cap: 1, period: 2, afterEventId: received.id },
    ]);
  });
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
    fireEvent.click(screen.getByRole("button", { name: "Penalti" }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledTimes(1));
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.events.at(-1)).toMatchObject({ side: "them", cap: 4, kind: "penalty" });
    expect(saved.pending).toMatchObject({
      kind: "penalty_shot",
      penalty_event_id: saved.events.at(-1)?.id,
      shooter_cap: null,
    });
  });

  it("permite completar desde Corregir un penalti antiguo sin lanzamiento", async () => {
    const penalty = event("penalty", { side: "them", cap: 4 });
    mock.hook.mockReturnValue({ ...mock.hook(), record: record([penalty]) });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /Jugadas de Rival/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Completar lanzamiento pendiente" }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledTimes(1));
    expect(mock.change.mock.calls[0][0].pending).toMatchObject({
      kind: "penalty_shot",
      penalty_event_id: penalty.id,
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

  it("ordena las cuatro acciones rivales y separa la roja sin pedir asistencia", async () => {
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: /Rival, gorro 4,/ }));
    const actions = screen.getByRole("dialog");
    const grid = within(actions).getByRole("button", { name: "Gol" }).parentElement!;
    expect(
      within(grid)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Gol", "Gol 1+", "Penalti", "Expulsión"]);
    expect(within(grid).queryByRole("button", { name: "Tarjeta roja" })).toBeNull();
    expect(within(actions).getByRole("button", { name: "Tarjeta roja" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gol de contraataque" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Gol en superioridad · 1+" }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledOnce());
    expect(mock.change.mock.calls[0][0]).toMatchObject({
      events: [expect.objectContaining({ side: "them", cap: 4, kind: "goal_extra", keeper: 1 })],
      pending: null,
    });
    expect(screen.queryByRole("heading", { name: /asistencia/i })).toBeNull();
  });

  it("registra el bloqueo directamente y no ofrece asistencias independientes", async () => {
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: /Morvedre, gorro 2,/ }));
    expect(screen.queryByRole("button", { name: /Otras acciones|Asistencia/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Bloqueo defensivo" }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledOnce());
    expect(mock.change.mock.calls[0][0].events.at(-1)).toMatchObject({
      kind: "defensive_block",
      cap: 2,
    });
  });

  it.each(["benjamin", "alevin"] as const)(
    "explica una sola vez que %s no permite tiempos y conserva tarjetas",
    (category) => {
      const current = record();
      current.sheet.category = category;
      mock.hook.mockReturnValue({ ...mock.hook(), record: current });
      render(<LiveMatchClient />);
      fireEvent.click(screen.getByRole("button", { name: /^Entrenador:/ }));
      expect(screen.queryByRole("button", { name: "Tiempo muerto" })).toBeNull();
      expect(screen.getByRole("note")).toHaveTextContent(
        "En esta categoría ningún equipo puede pedirlos.",
      );
      fireEvent.click(screen.getByRole("button", { name: "Tarjeta al entrenador" }));
      expect(
        screen.getByRole("heading", { name: "¿Qué entrenador recibe la tarjeta?" }),
      ).toBeInTheDocument();
    },
  );

  it.each([1, 5, 6])("ofrece el intercambio desde Portero en juego en el cuarto %s", (period) => {
    mock.hook.mockReturnValue({ ...mock.hook(), record: youthRecord(period) });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: /Portero en juego,/ }));
    if (period === 1)
      expect(screen.getByRole("heading", { name: "Revisar portero" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar gorro con un jugador" }));
    expect(screen.getByRole("button", { name: "Gorro 2 · Jugador 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gorro 8 · Jugador 8" }) !== null).toBe(period > 4);
    expect(mock.change).not.toHaveBeenCalled();
  });

  it("muestra entrenador, tiempos y tarjetas en pasos claros", () => {
    render(<LiveMatchClient />);
    expect(
      screen.getByRole("button", { name: /Entrenador: tiempos muertos Morvedre/ }),
    ).toHaveTextContent("QuedanM2·R2");
    expect(screen.getByRole("button", { name: "Corregir jugadas" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Entrenador: tiempos muertos Morvedre/ }));
    expect(screen.getByRole("button", { name: "Tiempo muerto" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tarjeta al entrenador" }));
    expect(
      screen.getByRole("heading", { name: "¿Qué entrenador recibe la tarjeta?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rival" }));
    expect(screen.getByRole("button", { name: "Roja al entrenador" })).toBeInTheDocument();
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
    expect(
      screen.getByRole("group", { name: "Jugada seleccionada para anular" }),
    ).toHaveTextContent("Cuarto 1");
    expect(screen.getByRole("button", { name: "Sí, anular esta jugada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atrás" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });

  it("permite vincular una asistencia manual desde Corregir", async () => {
    const goal = event("goal", { cap: 2 });
    const assist = event("assist", { cap: 3 });
    mock.hook.mockReturnValue({ ...mock.hook(), record: record([goal, assist]) });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Corregir" })[0]);
    expect(screen.getByRole("heading", { name: "Corregir asistencia" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Vincular a un gol"));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Gol de #2/ })));
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.events.find((item) => item.id === assist.id)).toMatchObject({
      related_event_id: goal.id,
      cap: 3,
    });
  });

  it("obliga a resolver una autoasistencia al cambiar el goleador", async () => {
    const goal = event("goal", { cap: 2 });
    const assist = event("assist", { cap: 3, related_event_id: goal.id });
    mock.hook.mockReturnValue({ ...mock.hook(), record: record([goal, assist]) });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Corregir" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar jugador" }));
    fireEvent.click(screen.getByRole("button", { name: /Morvedre, gorro 3, Pablo Torres/ }));
    fireEvent.click(screen.getByRole("button", { name: "Gol" }));
    fireEvent.click(screen.getByRole("button", { name: "Gol normal" }));
    expect(screen.getByRole("heading", { name: "Resolver la asistencia" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Elegir otro asistente"));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Álex García/ })));
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

  it("resuelve una corrección que rompe el vínculo de un penalti", async () => {
    const penalty = event("penalty", { side: "them", cap: 4 });
    const result = event("goal_penalty", {
      cap: 2,
      related_event_id: penalty.id,
      origin: "penalty_flow",
    });
    mock.hook.mockReturnValue({ ...mock.hook(), record: record([penalty, result]) });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /Jugadas de Rival/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Corregir" }));
    fireEvent.click(screen.getByRole("button", { name: "Expulsión" }));
    expect(
      screen.getByRole("heading", { name: "Resolver el penalti vinculado" }),
    ).toBeInTheDocument();
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Guardar y dejar el lanzamiento independiente" }),
      ),
    );
    const saved = mock.change.mock.calls[0][0] as LiveSheet;
    expect(saved.events.find((item) => item.id === penalty.id)?.kind).toBe("exclusion");
    expect(saved.events.find((item) => item.id === result.id)).toMatchObject({
      related_event_id: null,
      origin: "manual",
      deleted: false,
    });
  });

  it("permite anular solo la sanción de un penalti vinculado", async () => {
    const penalty = event("penalty", { side: "them", cap: 4 });
    const result = event("penalty_missed", {
      cap: 2,
      related_event_id: penalty.id,
      origin: "penalty_flow",
    });
    mock.hook.mockReturnValue({ ...mock.hook(), record: record([penalty, result]) });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /Jugadas de Rival/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Anular" }));
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Anular solo la sanción" })),
    );
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
    expect(screen.getByRole("button", { name: /Morvedre, gorro 2,/ })).toHaveStyle({
      backgroundColor: "#fff0bd",
    });
    expect(screen.getByRole("button", { name: /Morvedre, gorro 3,/ })).toHaveStyle({
      backgroundColor: "#ffedd5",
    });
    expect(screen.getByRole("button", { name: /Portero de Morvedre, gorro 13,/ })).toHaveStyle({
      backgroundColor: "#fee2e2",
    });
    expect(screen.getAllByText(/Fuera/i).length).toBeGreaterThan(0);
  });

  it("mantiene los porteros dentro del orden numérico", () => {
    const unordered = sheet();
    unordered.players = [
      unordered.players[2],
      unordered.players[0],
      unordered.players[3],
      unordered.players[1],
    ];
    render(<ActaPlayerBoard sheet={unordered} playing onPlayer={vi.fn()} />);
    const ownRows = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-label")?.includes("Morvedre, gorro"));
    expect(ownRows.map((row) => row.getAttribute("aria-label")?.match(/gorro (\d+)/)?.[1])).toEqual(
      ["1", "2", "3", "13"],
    );
  });

  it("mantiene la asistencia pendiente hasta elegir una salida explícita", async () => {
    const goal = event("goal", { cap: 2 });
    const pendingRecord = record([goal]);
    pendingRecord.sheet = {
      ...pendingRecord.sheet,
      pending: { kind: "assist", goal_event_id: goal.id },
    };
    mock.hook.mockReturnValue({ ...mock.hook(), record: pendingRecord });
    render(<LiveMatchClient />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "¿Quién dio la asistencia?" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(mock.change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Gol sin asistencia" }));
    await waitFor(() =>
      expect(mock.change).toHaveBeenCalledWith(expect.objectContaining({ pending: null })),
    );
  });
});

describe("alineaciones del acta infantil", () => {
  it("distingue las cuatro expulsiones de Benjamín en filas y selectores de ambos equipos", () => {
    const current = youthRecord();
    current.sheet.participation!.enabled = false;
    current.sheet.category = "benjamin";
    current.sheet.events = (["us", "them"] as const).flatMap((side) =>
      [1, 2, 3, 4].flatMap((count) =>
        Array.from({ length: count }, () => event("exclusion", { side, cap: count + 1 })),
      ),
    );
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    const colors = ["#fff0bd", "#fde68a", "#ffedd5", "#fee2e2"];
    for (const side of ["Morvedre", "Rival"])
      for (const count of [1, 2, 3, 4])
        expect(
          screen.getByRole("button", { name: new RegExp(`${side}, gorro ${count + 1},`) }),
        ).toHaveStyle({ backgroundColor: colors[count - 1] });
    fireEvent.click(screen.getByRole("button", { name: "Morvedre" }));
    expect(within(screen.getByRole("dialog")).getByText("2/4 exp.")).toHaveStyle({
      backgroundColor: colors[1],
    });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Rival" }));
    expect(within(screen.getByRole("dialog")).getByText("3/4 exp.")).toHaveStyle({
      backgroundColor: colors[2],
    });
  });
  it("recupera todos los jugadores en ambos selectores desde el quinto", () => {
    mock.hook.mockReturnValue({ ...mock.hook(), record: youthRecord(5) });
    render(<LiveMatchClient />);
    for (const team of ["Morvedre", "Rival"]) {
      fireEvent.click(screen.getByRole("button", { name: team }));
      expect(
        within(screen.getByRole("dialog")).getAllByRole("button", {
          name: new RegExp(`${team}, gorro`),
        }),
      ).toHaveLength(14);
      fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    }
  });
  it("permite elegir y corregir un penalti fallado de un cuarto anterior", async () => {
    const current = youthRecord(3);
    const missed = event("penalty_missed", { cap: 2, period: 1 });
    current.sheet.events = [missed, event("goal", { cap: 3, period: 3 })];
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Cuarto de las jugadas" }), {
      target: { value: "1" },
    });
    expect(
      within(screen.getByRole("dialog")).getAllByRole("button", { name: "Corregir" }),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Corregir" }));
    fireEvent.click(screen.getByRole("button", { name: "Fuera / palo" }));
    await waitFor(() => expect(mock.change).toHaveBeenCalledOnce());
    expect(mock.change.mock.calls[0][0]).toMatchObject({
      period: 3,
      events: [
        expect.objectContaining({
          id: missed.id,
          period: 1,
          kind: "penalty_missed",
          missOutcome: "out",
        }),
        expect.objectContaining({ period: 3, kind: "goal" }),
      ],
    });
  });
  it("retira las marcas generales de las fichas desde el quinto conservando los datos", () => {
    const current = youthRecord(5);
    const view = render(<ActaPlayerBoard sheet={current.sheet} playing onPlayer={vi.fn()} />);
    expect(screen.queryAllByLabelText(/Cuartos jugados:/)).toHaveLength(0);
    view.unmount();
    render(<ActaPlayerBoard sheet={{ ...current.sheet, period: 4 }} playing onPlayer={vi.fn()} />);
    expect(screen.queryAllByLabelText(/Cuartos jugados:/).length).toBeGreaterThan(0);
  });
  it("pregunta si juega alguien no seleccionado, también del rival", () => {
    mock.hook.mockReturnValue({ ...mock.hook(), record: youthRecord() });
    const view = render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: /Morvedre, gorro 9, Jugador 9/ }));
    expect(screen.getByRole("heading", { name: "¿Está jugando este cuarto?" })).toBeInTheDocument();
    expect(mock.change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Elegir otro jugador" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    fireEvent.click(screen.getByRole("button", { name: /Rival, gorro 9,/ }));
    expect(screen.getByRole("heading", { name: "¿Está jugando este cuarto?" })).toBeInTheDocument();
    view.unmount();
  });
  it("solo ofrece asistentes que juegan y recupera la lista normal desde el quinto", async () => {
    let current = youthRecord();
    const goal = event("goal", { cap: 2 });
    current.sheet.events = [goal];
    current.sheet.pending = { kind: "assist", goal_event_id: goal.id };
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    const view = render(<LiveMatchClient />);
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByText("Jugador 9")).toBeNull();
    expect(within(dialog).getAllByText("Jugador 3").length).toBeGreaterThan(0);
    view.unmount();
    current = youthRecord(5);
    const fifthGoal = event("goal", { cap: 2, period: 5 });
    current.sheet.events = [fifthGoal];
    current.sheet.pending = { kind: "assist", goal_event_id: fifthGoal.id };
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getAllByText("Jugador 9").length).toBeGreaterThan(0);
  });
  it("solo ofrece lanzadores rivales alineados en los primeros cuatro cuartos", async () => {
    const current = youthRecord();
    const penalty = event("penalty", { cap: 2 });
    current.sheet.events = [penalty];
    current.sheet.pending = {
      kind: "penalty_shot",
      penalty_event_id: penalty.id,
      shooter_cap: null,
    };
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: /Rival, gorro 9/ })).toBeNull();
    expect(
      within(dialog)
        .getAllByRole("button")
        .filter((b) => b.textContent === "9"),
    ).toHaveLength(0);
  });
  it("avisa al terminar el tercero sobre ambos equipos", () => {
    const current = youthRecord(3);
    current.sheet.phase = "break";
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    expect(screen.getByText("Antes del cuarto 4")).toBeInTheDocument();
    const notice = screen.getByRole("region", { name: "Avisos antes del cuarto 4" });
    expect(within(notice).getAllByText("Deben descansar")).toHaveLength(2);
    expect(within(notice).getAllByText("Deben jugar")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Elegir jugadores del cuarto 4" })).toBeNull();
    expect(screen.getByRole("button", { name: "Revisar participación" })).toBeInTheDocument();
  });
  it("muestra solo quienes juegan en el selector y renderiza el límite de expulsiones", () => {
    mock.hook.mockReturnValue({ ...mock.hook(), record: youthRecord() });
    render(<LiveMatchClient />);
    expect(screen.getByRole("button", { name: "Revisar participación" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Morvedre" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: /Morvedre, gorro 9/ })).toBeNull();
    expect(within(dialog).getByRole("button", { name: /Morvedre, gorro 2/ })).toHaveTextContent(
      "0/3 exp.",
    );
    expect(dialog).not.toHaveTextContent("exclusionLimit");
  });
  it("abre una tabla de participación ordenada desde Corregir y permite cambiar de equipo", () => {
    const current = youthRecord();
    current.sheet.players.reverse();
    mock.hook.mockReturnValue({ ...mock.hook(), record: current });
    render(<LiveMatchClient />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir jugadas" }));
    fireEvent.click(screen.getByRole("button", { name: "Revisar participación" }));
    const table = screen.getByRole("table", { name: "Participación de Morvedre" });
    expect(
      within(table)
        .getAllByRole("rowheader")
        .map((el) => el.textContent),
    ).toEqual(Array.from({ length: 14 }, (_, i) => String(i + 1)));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Rival" }));
    expect(screen.getByRole("table", { name: "Participación de Rival" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /lesión/ })).toBeNull();
  });
});
