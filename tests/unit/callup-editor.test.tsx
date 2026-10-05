import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Route } from "next";
import { describe, expect, it, vi } from "vitest";
import type { LiveSheet } from "@/lib/domain/live-match";

import {
  CallupEditor,
  type CallupCandidate,
  type CallupPick,
} from "@/app/(app)/admin/matches/[id]/_components/callup-editor";

const mockPush = vi.fn();
const mockReplaceMatchCallupResult = vi.hoisted(() => vi.fn());
vi.mock("@/server/actions/admin/matches", () => ({
  replaceMatchCallupResult: mockReplaceMatchCallupResult,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

const CANDIDATES: CallupCandidate[] = [
  {
    player_id: "p1",
    full_name: "Rubén Galvillo",
    cap_number: 7,
    has_conflict: false,
    is_current_team: true,
  },
  {
    player_id: "p2",
    full_name: "Pau Martínez",
    cap_number: 3,
    has_conflict: false,
    is_current_team: true,
  },
  {
    player_id: "p3",
    full_name: "Lucas Gómez",
    cap_number: 1,
    has_conflict: false,
    is_current_team: false,
  },
  {
    player_id: "p4",
    full_name: "Marc Sanción",
    cap_number: 4,
    has_conflict: true,
    is_current_team: true,
  },
];

const INITIAL_PICKS: CallupPick[] = [
  { player_id: "p1", cap_number: 7 },
  { player_id: "p3", cap_number: 1 },
];

function openNormalSave(backHref: "/admin/matches" | "/matches/match-1" = "/admin/matches") {
  mockPush.mockClear();
  mockReplaceMatchCallupResult.mockReset();
  render(
    <CallupEditor
      matchId="match-1"
      teamLabel="Cadete B"
      opponent="Rival de prueba"
      scheduledAt="2026-09-29T16:00:00.000Z"
      initial={INITIAL_PICKS}
      candidates={CANDIDATES}
      template={INITIAL_PICKS}
      editable
      backHref={backHref as Route}
      backLabel="Volver"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Añadir jugador" }));
  fireEvent.click(screen.getByRole("button", { name: "Añadir a Pau Martínez" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar convocatoria" }));
}

describe("CallupEditor", () => {
  it.each([
    ["benjamin", 8],
    ["alevin", 8],
    ["infantil", 9],
  ] as const)("impide reducir %s por debajo de %i convocados", (category, minimum) => {
    const candidates = Array.from({ length: minimum }, (_, index) => ({
      player_id: `min-${index + 1}`,
      full_name: `Jugador ${index + 1}`,
      cap_number: index + 1,
      has_conflict: false,
      is_current_team: true,
    }));
    render(
      <CallupEditor
        matchId="minimum-test"
        teamLabel="Equipo"
        category={category}
        opponent="Rival"
        scheduledAt="2026-09-30T18:00:00.000Z"
        initial={candidates.map((p) => ({ player_id: p.player_id, cap_number: p.cap_number }))}
        candidates={candidates}
        template={[]}
        editable
        backHref="/admin/matches"
        backLabel="Volver"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Quitar a Jugador 2" }));
    expect(screen.getByRole("alert")).toHaveTextContent(`mínimo ${minimum}`);
    expect(screen.getByLabelText(`${minimum} de 14 jugadores convocados`)).toBeVisible();
  });
  it("impide quitar al último portero aunque sobren jugadores", () => {
    const candidates = Array.from({ length: 9 }, (_, index) => ({
      player_id: `keeper-${index + 1}`,
      full_name: `Jugador ${index + 1}`,
      cap_number: index + 1,
      has_conflict: false,
      is_current_team: true,
    }));
    render(
      <CallupEditor
        matchId="keeper-test"
        teamLabel="Alevín"
        category="alevin"
        opponent="Rival"
        scheduledAt="2026-09-30T18:00:00.000Z"
        initial={candidates.map((p) => ({ player_id: p.player_id, cap_number: p.cap_number }))}
        candidates={candidates}
        template={[]}
        editable
        backHref="/admin/matches"
        backLabel="Volver"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Quitar a Jugador 1" }));
    expect(screen.getByRole("alert")).toHaveTextContent("portero con gorro 1 o 13");
    expect(screen.getByLabelText("9 de 14 jugadores convocados")).toBeVisible();
  });
  it.each(["/admin/matches", "/matches/match-1"] as const)(
    "guardar solo este partido vuelve al origen %s después de persistir",
    async (backHref) => {
      openNormalSave(backHref);
      let resolveSave!: (value: { ok: true }) => void;
      mockReplaceMatchCallupResult.mockReturnValue(
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
      );
      fireEvent.click(screen.getByRole("button", { name: /Solo este partido/ }));
      expect(mockReplaceMatchCallupResult).toHaveBeenCalledWith({
        match_id: "match-1",
        players: [...INITIAL_PICKS, { player_id: "p2", cap_number: 3 }],
        save_template: false,
      });
      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /Solo este partido/ })).toBeDisabled();
      resolveSave({ ok: true });
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith(backHref));
    },
  );

  it("permite volver de la confirmación de predeterminada sin guardar ni salir", () => {
    openNormalSave();
    fireEvent.click(screen.getByRole("button", { name: /Este y los próximos/ }));
    expect(
      screen.getByRole("dialog", { name: "¿Usar esta lista en los próximos partidos?" }),
    ).toBeVisible();
    expect(screen.getByText(/Los partidos ya creados no cambian/)).toBeVisible();
    expect(mockReplaceMatchCallupResult).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Volver a las opciones" }));
    expect(screen.getByRole("dialog", { name: "Guardar convocatoria" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mockReplaceMatchCallupResult).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Guardar convocatoria" }));
    expect(screen.getByRole("dialog", { name: "Guardar convocatoria" })).toBeVisible();
  });

  it("confirma antes de guardar la predeterminada, conserva el error y sale solo al guardar", async () => {
    openNormalSave("/matches/match-1");
    mockReplaceMatchCallupResult.mockResolvedValueOnce({ ok: false, error: "No pudimos guardar." });
    fireEvent.click(screen.getByRole("button", { name: /Este y los próximos/ }));
    expect(mockReplaceMatchCallupResult).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sí, guardar como predeterminada" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sí, guardar como predeterminada" })).toBeEnabled(),
    );
    expect(
      screen.getByRole("dialog", { name: "¿Usar esta lista en los próximos partidos?" }),
    ).toHaveTextContent("No pudimos guardar.");
    expect(mockPush).not.toHaveBeenCalled();
    mockReplaceMatchCallupResult.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "Sí, guardar como predeterminada" }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/matches/match-1"));
    expect(mockReplaceMatchCallupResult).toHaveBeenLastCalledWith(
      expect.objectContaining({ save_template: true }),
    );
  });

  it("no sale si falla el guardado de este partido", async () => {
    openNormalSave();
    mockReplaceMatchCallupResult.mockRejectedValue(new Error("Error de conexión"));
    fireEvent.click(screen.getByRole("button", { name: /Solo este partido/ }));
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("Error de conexión"));
    expect(mockPush).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Solo este partido/ })).toBeEnabled(),
    );
  });

  it("obliga a elegir sustituto y enseña las jugadas antes de guardar un acta abierta", () => {
    const oldId = "10000000-0000-4000-8000-000000000001";
    const newId = "10000000-0000-4000-8000-000000000002";
    const goalkeeperId = "10000000-0000-4000-8000-000000000003";
    const liveSheet: LiveSheet = {
      version: 2,
      players: [
        { id: goalkeeperId, cap: 1, name: "Portero" },
        { id: oldId, cap: 5, name: "Juan" },
      ],
      opponentCaps: [1],
      periods: 4,
      period: 1,
      phase: "playing",
      keeper: 1,
      baseline: [],
      baselineThem: 0,
      events: [
        {
          id: "20000000-0000-4000-8000-000000000001",
          side: "us",
          cap: 5,
          kind: "goal",
          period: 1,
          keeper: null,
          deleted: false,
        },
      ],
    };
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Cadete B"
        opponent="Rival"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={[
          { player_id: goalkeeperId, cap_number: 1 },
          { player_id: oldId, cap_number: 5 },
        ]}
        candidates={[
          {
            player_id: goalkeeperId,
            full_name: "Portero",
            cap_number: 1,
            has_conflict: false,
            is_current_team: true,
          },
          {
            player_id: oldId,
            full_name: "Juan",
            cap_number: 5,
            has_conflict: false,
            is_current_team: true,
          },
          {
            player_id: newId,
            full_name: "Pepe",
            cap_number: 5,
            has_conflict: false,
            is_current_team: true,
          },
        ]}
        template={[]}
        editable
        backHref="/acta"
        backLabel="Volver al acta"
        liveSheet={liveSheet}
        onSaveLive={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Reemplazar a Juan y conservar sus jugadas" }),
    );
    expect(screen.getByRole("dialog", { name: "¿Quién lleva ese gorro?" })).toBeVisible();
    expect(screen.getByText(/Las jugadas de Juan pasarán a quien selecciones/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Elegir a Pepe para recibir las jugadas" }));
    expect(screen.queryByRole("dialog", { name: "¿Quién lleva ese gorro?" })).toBeNull();
    const transferDialog = screen.getByRole("dialog", { name: "¿Pasar sus jugadas?" });
    expect(transferDialog).toBeVisible();
    expect(within(transferDialog).getByText("Juan")).toBeVisible();
    expect(within(transferDialog).getByText("Pepe")).toBeVisible();
    expect(within(transferDialog).getByText("1 gol")).toBeVisible();
    expect(
      within(transferDialog).getByText("Las jugadas y estadísticas pasarán al jugador elegido."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /Gorro de Juan: 5/, hidden: true })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Elegir otro jugador" }));
    expect(screen.getByRole("dialog", { name: "¿Quién lleva ese gorro?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Elegir a Pepe para recibir las jugadas" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, pasar jugadas" }));
    expect(screen.getByRole("button", { name: /Gorro de Pepe: 5/ })).toBeVisible();
    expect(screen.queryByText(/Juan → Pepe/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Guardar convocatoria" }));
    expect(screen.getByText("Cambios solo para este partido")).toBeVisible();
    expect(
      screen.getByText("Los jugadores y gorros se actualizarán para los demás."),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /Este y los próximos/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Reemplazar a Pepe y conservar sus jugadas" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Elegir a Juan para recibir las jugadas" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, pasar jugadas" }));
    expect(screen.getByRole("button", { name: /Gorro de Juan: 5/, hidden: true })).toBeVisible();
    expect(screen.queryByText(/Juan → Pepe/)).toBeNull();
  });
  it("explica el guardado local cuando se edita el acta sin conexión", () => {
    const liveSheet: LiveSheet = {
      version: 2,
      players: [
        { id: "p1", cap: 1, name: "Portero" },
        { id: "p2", cap: 5, name: "Juan" },
      ],
      opponentCaps: [1],
      periods: 4,
      period: 1,
      phase: "playing",
      keeper: 1,
      baseline: [],
      baselineThem: 0,
      events: [],
    };
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Cadete B"
        opponent="Rival"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={[
          { player_id: "p1", cap_number: 1 },
          { player_id: "p2", cap_number: 5 },
        ]}
        candidates={[
          {
            player_id: "p1",
            full_name: "Portero",
            cap_number: 1,
            has_conflict: false,
            is_current_team: true,
          },
          {
            player_id: "p2",
            full_name: "Juan",
            cap_number: 5,
            has_conflict: false,
            is_current_team: true,
          },
        ]}
        template={[]}
        editable
        backHref="/acta"
        backLabel="Volver al acta"
        liveSheet={liveSheet}
        online={false}
        onSaveLive={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Gorro de Juan: 5/ }));
    fireEvent.click(screen.getByRole("button", { name: "Asignar gorro 6" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar convocatoria" }));
    expect(screen.getByText("Puedes guardar sin conexión")).toBeVisible();
    expect(
      screen.getByText("Los cambios quedan en este móvil y se envían cuando vuelve la conexión."),
    ).toBeVisible();
  });
  it("intercambia dos gorros ocupados con un toque durante un acta", () => {
    const goalieId = "10000000-0000-4000-8000-000000000011";
    const playerId = "10000000-0000-4000-8000-000000000012";
    const liveSheet: LiveSheet = {
      version: 2,
      players: [
        { id: goalieId, cap: 1, name: "Portero" },
        { id: playerId, cap: 5, name: "Juan" },
      ],
      opponentCaps: [1],
      periods: 4,
      period: 1,
      phase: "playing",
      keeper: 1,
      baseline: [],
      baselineThem: 0,
      events: [],
    };
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Absoluto"
        opponent="Rival"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={[
          { player_id: goalieId, cap_number: 1 },
          { player_id: playerId, cap_number: 5 },
        ]}
        candidates={[
          {
            player_id: goalieId,
            full_name: "Portero",
            cap_number: 1,
            has_conflict: false,
            is_current_team: true,
          },
          {
            player_id: playerId,
            full_name: "Juan",
            cap_number: 5,
            has_conflict: false,
            is_current_team: true,
          },
        ]}
        template={[]}
        editable
        backHref="/acta"
        backLabel="Volver al acta"
        liveSheet={liveSheet}
        onSaveLive={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Gorro de Juan: 5/ }));
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar con el gorro 1" }));
    expect(screen.getByRole("dialog", { name: "¿Intercambiar estos gorros?" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Gorro de Juan: 5/, hidden: true })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Volver a elegir" }));
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar con el gorro 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar gorros" }));
    expect(screen.getByRole("button", { name: /Gorro de Juan: 1/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Gorro de Portero: 5/ })).toBeVisible();
  });
  it("permite intercambiar gorros también antes de empezar el partido", () => {
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Absoluto"
        opponent="Rival"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={[
          { player_id: "p1", cap_number: 7 },
          { player_id: "p2", cap_number: 3 },
        ]}
        candidates={CANDIDATES}
        template={[]}
        editable
        backHref="/acta"
        backLabel="Volver al partido"
      />,
    );

    const nameButton = screen.getByRole("button", { name: "Elegir gorro de Rubén Galvillo" });
    fireEvent.click(nameButton);
    expect(nameButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Intercambiar con el gorro 3" })).toHaveClass(
      "bg-pool-blue",
    );
    expect(screen.getByRole("button", { name: "Asignar gorro 4" })).toHaveClass("bg-paper-card");
    expect(screen.queryByText(/Azul: en uso/)).toBeNull();
    expect(screen.getByRole("button", { name: "Dejar sin gorro" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar con el gorro 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar gorros" }));
    expect(screen.getByRole("button", { name: /Gorro de Rubén Galvillo: 3/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Gorro de Pau Martínez: 7/ })).toBeVisible();
  });
  it("permite dejar a un jugador sin gorro mientras se edita, pero impide guardar", () => {
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Absoluto"
        opponent="Rival"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={[
          { player_id: "p1", cap_number: 7 },
          { player_id: "p2", cap_number: 3 },
          { player_id: "p3", cap_number: 1 },
        ]}
        candidates={CANDIDATES}
        template={[]}
        editable
        backHref="/admin/matches"
        backLabel="Volver a partidos"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Elegir gorro de Rubén Galvillo" }));
    fireEvent.click(screen.getByRole("button", { name: "Dejar sin gorro" }));
    expect(
      screen.getByRole("button", { name: /Gorro de Rubén Galvillo: sin asignar/ }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /Gorro de Pau Martínez: 3/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar convocatoria" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Elegir gorro de Rubén Galvillo" }));
    fireEvent.click(screen.getByRole("button", { name: "Asignar gorro 4" }));
    expect(screen.getByRole("button", { name: "Guardar convocatoria" })).toBeEnabled();
  });
  it("da un gorro ocupado a quien no tiene y deja al anterior sin gorro", () => {
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Absoluto"
        opponent="Rival"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={[
          { player_id: "p1", cap_number: null },
          { player_id: "p2", cap_number: 3 },
          { player_id: "p3", cap_number: 1 },
        ]}
        candidates={CANDIDATES}
        template={[]}
        editable
        backHref="/acta"
        backLabel="Volver al partido"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Gorro de Rubén Galvillo: sin asignar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar con el gorro 3" }));
    expect(screen.getByText(/Pau Martínez quedará sin gorro/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar gorros" }));
    expect(screen.getByRole("button", { name: /Gorro de Rubén Galvillo: 3/ })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Gorro de Pau Martínez: sin asignar/ }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar convocatoria" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Quitar a Pau Martínez" }));
    expect(screen.getByRole("button", { name: "Guardar convocatoria" })).toBeEnabled();
  });
  it("impide guardar si quien pierde el gorro ya tiene jugadas", () => {
    const keeperId = "10000000-0000-4000-8000-000000000031";
    const juanId = "10000000-0000-4000-8000-000000000032";
    const pepeId = "10000000-0000-4000-8000-000000000033";
    const liveSheet: LiveSheet = {
      version: 2,
      players: [
        { id: keeperId, cap: 1, name: "Portero" },
        { id: juanId, cap: 5, name: "Juan" },
      ],
      opponentCaps: [1],
      periods: 4,
      period: 1,
      phase: "playing",
      keeper: 1,
      baseline: [],
      baselineThem: 0,
      events: [
        {
          id: "20000000-0000-4000-8000-000000000031",
          side: "us",
          cap: 5,
          kind: "goal",
          period: 1,
          keeper: null,
          deleted: false,
        },
      ],
    };
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Absoluto"
        opponent="Rival"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={[
          { player_id: keeperId, cap_number: 1 },
          { player_id: juanId, cap_number: 5 },
          { player_id: pepeId, cap_number: null },
        ]}
        candidates={[
          {
            player_id: keeperId,
            full_name: "Portero",
            cap_number: 1,
            has_conflict: false,
            is_current_team: true,
          },
          {
            player_id: juanId,
            full_name: "Juan",
            cap_number: 5,
            has_conflict: false,
            is_current_team: true,
          },
          {
            player_id: pepeId,
            full_name: "Pepe",
            cap_number: null,
            has_conflict: false,
            is_current_team: true,
          },
        ]}
        template={[]}
        editable
        backHref="/acta"
        backLabel="Volver al acta"
        liveSheet={liveSheet}
        onSaveLive={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Gorro de Pepe: sin asignar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar con el gorro 5" }));
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar gorros" }));
    expect(screen.getByRole("button", { name: /Gorro de Juan: sin asignar/ })).toBeVisible();
    expect(screen.getByText(/Juan tiene jugadas/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar convocatoria" })).toBeDisabled();
  });
  it("protege también las jugadas recibidas al reemplazar un jugador", () => {
    const keeperId = "10000000-0000-4000-8000-000000000041";
    const juanId = "10000000-0000-4000-8000-000000000042";
    const pepeId = "10000000-0000-4000-8000-000000000043";
    const nuevoId = "10000000-0000-4000-8000-000000000044";
    const liveSheet: LiveSheet = {
      version: 2,
      players: [
        { id: keeperId, cap: 1, name: "Portero" },
        { id: juanId, cap: 5, name: "Juan" },
      ],
      opponentCaps: [1],
      periods: 4,
      period: 1,
      phase: "playing",
      keeper: 1,
      baseline: [],
      baselineThem: 0,
      events: [
        {
          id: "20000000-0000-4000-8000-000000000041",
          side: "us",
          cap: 5,
          kind: "goal",
          period: 1,
          keeper: null,
          deleted: false,
        },
      ],
    };
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Absoluto"
        opponent="Rival"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={[
          { player_id: keeperId, cap_number: 1 },
          { player_id: juanId, cap_number: 5 },
          { player_id: nuevoId, cap_number: null },
        ]}
        candidates={[
          {
            player_id: keeperId,
            full_name: "Portero",
            cap_number: 1,
            has_conflict: false,
            is_current_team: true,
          },
          {
            player_id: juanId,
            full_name: "Juan",
            cap_number: 5,
            has_conflict: false,
            is_current_team: true,
          },
          {
            player_id: pepeId,
            full_name: "Pepe",
            cap_number: 5,
            has_conflict: false,
            is_current_team: true,
          },
          {
            player_id: nuevoId,
            full_name: "Nuevo",
            cap_number: null,
            has_conflict: false,
            is_current_team: true,
          },
        ]}
        template={[]}
        editable
        backHref="/acta"
        backLabel="Volver al acta"
        liveSheet={liveSheet}
        onSaveLive={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Reemplazar a Juan y conservar sus jugadas" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Elegir a Pepe para recibir las jugadas" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, pasar jugadas" }));
    fireEvent.click(screen.getByRole("button", { name: /Gorro de Nuevo: sin asignar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar con el gorro 5" }));
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar gorros" }));
    expect(screen.getByRole("button", { name: /Gorro de Pepe: sin asignar/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar convocatoria" })).toBeDisabled();
  });
  it("avisa si un acta antigua conserva un gorro superior al 14", () => {
    const keeperId = "10000000-0000-4000-8000-000000000021";
    const playerId = "10000000-0000-4000-8000-000000000022";
    const liveSheet: LiveSheet = {
      version: 2,
      players: [
        { id: keeperId, cap: 1, name: "Portero" },
        { id: playerId, cap: 16, name: "Juan" },
      ],
      opponentCaps: [1],
      periods: 4,
      period: 1,
      phase: "playing",
      keeper: 1,
      baseline: [],
      baselineThem: 0,
      events: [],
    };
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Absoluto"
        opponent="Rival"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={[
          { player_id: keeperId, cap_number: 1 },
          { player_id: playerId, cap_number: 16 },
        ]}
        candidates={[
          {
            player_id: keeperId,
            full_name: "Portero",
            cap_number: 1,
            has_conflict: false,
            is_current_team: true,
          },
          {
            player_id: playerId,
            full_name: "Juan",
            cap_number: 16,
            has_conflict: false,
            is_current_team: true,
          },
        ]}
        template={[]}
        editable
        backHref="/acta"
        backLabel="Volver al acta"
        liveSheet={liveSheet}
        onSaveLive={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Reasigna los gorros 16");
    fireEvent.click(screen.getByRole("button", { name: /Gorro de Juan: 16/ }));
    fireEvent.click(screen.getByRole("button", { name: "Asignar gorro 5" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Guardar convocatoria" })).toBeEnabled();
  });
  it("muestra convocados arriba y disponibles abajo con conteos correctos", () => {
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Cadete B"
        opponent="Rival de prueba"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={INITIAL_PICKS}
        candidates={CANDIDATES}
        template={[]}
        editable={true}
        backHref="/admin/matches"
        backLabel="Volver a partidos"
      />,
    );

    expect(screen.getByLabelText("2 de 14 jugadores convocados")).toBeInTheDocument();
    expect(screen.getAllByText("Rubén Galvillo")[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gorro de Rubén Galvillo: 7/ })).toBeVisible();
    expect(screen.queryByText("Pau Martínez")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Añadir jugador" }));
    expect(screen.getByRole("dialog", { name: "Añadir jugador" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Añadir a Pau Martínez" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Añadir a Lucas Gómez" })).toBeNull();
    expect(screen.getByText("No disponible")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar selección de jugador" }));
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("añade un jugador disponible con un toque y le asigna gorro libre", () => {
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Cadete B"
        opponent="Rival de prueba"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={INITIAL_PICKS}
        candidates={CANDIDATES}
        template={[]}
        editable={true}
        backHref="/admin/matches"
        backLabel="Volver a partidos"
      />,
    );

    expect(screen.queryByRole("button", { name: "Guardar convocatoria" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Añadir jugador" }));
    const addPauButton = screen.getByRole("button", { name: "Añadir a Pau Martínez" });
    fireEvent.click(addPauButton);

    expect(screen.getByLabelText("3 de 14 jugadores convocados")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Añadir jugador" })).toBeNull();
    expect(screen.queryByText("Pau Martínez añadido con el gorro 3.")).toBeNull();
    expect(screen.getByRole("button", { name: /Gorro de Pau Martínez: 3/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar convocatoria" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Guardar convocatoria" }));
    expect(screen.getByRole("heading", { name: "Guardar convocatoria" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Solo este partido/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Este y los próximos/ })).toBeVisible();
  });

  it("quita un jugador convocado con un toque y lo devuelve a disponibles", () => {
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Cadete B"
        opponent="Rival de prueba"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={INITIAL_PICKS}
        candidates={CANDIDATES}
        template={[]}
        editable={true}
        backHref="/admin/matches"
        backLabel="Volver a partidos"
      />,
    );

    const removeButton = screen.getByRole("button", {
      name: "Quitar a Rubén Galvillo",
    });
    fireEvent.click(removeButton);

    expect(screen.getByLabelText("1 de 14 jugadores convocados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Añadir jugador" }));
    expect(screen.getByRole("button", { name: "Añadir a Rubén Galvillo" })).toBeVisible();
  });

  it("filtra jugadores en tiempo real con el buscador", () => {
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Cadete B"
        opponent="Rival de prueba"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={INITIAL_PICKS}
        candidates={CANDIDATES}
        template={[]}
        editable={true}
        backHref="/admin/matches"
        backLabel="Volver a partidos"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Añadir jugador" }));
    const searchInput = screen.getByRole("searchbox", { name: "Buscar jugador" });
    fireEvent.change(searchInput, { target: { value: "Lucas" } });

    expect(screen.getAllByText("Lucas Gómez")[0]).toBeInTheDocument();
    expect(screen.queryByText("Pau Martínez")).toBeNull();
  });

  it("permite quitar todos los gorros con confirmación", () => {
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Cadete B"
        opponent="Rival de prueba"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={INITIAL_PICKS}
        candidates={CANDIDATES}
        template={[]}
        editable={true}
        backHref="/admin/matches"
        backLabel="Volver a partidos"
      />,
    );

    const clearButton = screen.getByRole("button", { name: /Quitar gorros/i });
    fireEvent.click(clearButton);

    expect(screen.getByText("Quitar todos los gorros")).toBeInTheDocument();

    const confirmClear = screen.getByRole("button", { name: "Quitar gorros" });
    fireEvent.click(confirmClear);

    expect(screen.getAllByText("Sin nº")).toHaveLength(2);
    expect(screen.getByText(/Faltan 2 gorros por asignar/i)).toBeInTheDocument();
  });

  it("pide confirmación al pulsar volver si hay cambios sin guardar", () => {
    mockPush.mockClear();
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Cadete B"
        opponent="Rival de prueba"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={INITIAL_PICKS}
        candidates={CANDIDATES}
        template={[]}
        editable={true}
        backHref="/admin/matches"
        backLabel="Volver a partidos"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Añadir jugador" }));
    const addPauButton = screen.getByRole("button", { name: "Añadir a Pau Martínez" });
    fireEvent.click(addPauButton);

    const backButton = screen.getByRole("button", { name: /Volver a partidos/i });
    fireEvent.click(backButton);

    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar y volver" })).toBeVisible();
    expect(mockPush).not.toHaveBeenCalled();

    const confirmExit = screen.getByRole("button", { name: "Salir sin guardar" });
    fireEvent.click(confirmExit);

    expect(mockPush).toHaveBeenCalledWith("/admin/matches");
  });

  it("guarda el partido antes de volver desde el aviso de salida", async () => {
    mockPush.mockClear();
    mockReplaceMatchCallupResult.mockReset().mockResolvedValue({ ok: true });
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Cadete B"
        opponent="Rival de prueba"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={INITIAL_PICKS}
        candidates={CANDIDATES}
        template={[]}
        editable
        backHref="/admin/matches"
        backLabel="Volver a partidos"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Añadir jugador" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir a Pau Martínez" }));
    fireEvent.click(screen.getByRole("button", { name: "Volver a partidos" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar y volver" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/admin/matches"));
    expect(mockReplaceMatchCallupResult).toHaveBeenCalledWith(
      expect.objectContaining({ match_id: "match-1", save_template: false }),
    );
  });

  it("permite volver a la convocatoria por defecto cuando la lista del partido es distinta", () => {
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Cadete B"
        opponent="Rival de prueba"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={INITIAL_PICKS}
        candidates={CANDIDATES}
        template={[{ player_id: "p2", cap_number: 3 }]}
        editable={true}
        backHref="/admin/matches"
        backLabel="Volver a partidos"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Volver a la convocatoria por defecto" }));
    expect(
      screen.getByRole("heading", { name: "Volver a la convocatoria por defecto" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Usar lista por defecto" }));
    expect(screen.getByRole("button", { name: /Gorro de Pau Martínez: 3/ })).toBeVisible();
  });

  it("muestra la lista por defecto durante el acta sin perder jugadas al restaurarla", () => {
    const liveSheet: LiveSheet = {
      version: 2,
      players: [
        { id: "p3", cap: 1, name: "Lucas Gómez" },
        { id: "p1", cap: 7, name: "Rubén Galvillo" },
      ],
      opponentCaps: [1],
      periods: 4,
      period: 1,
      phase: "playing",
      keeper: 1,
      baseline: [],
      baselineThem: 0,
      events: [
        {
          id: "goal-1",
          side: "us",
          cap: 7,
          kind: "goal",
          period: 1,
          keeper: null,
          deleted: false,
        },
      ],
    };
    render(
      <CallupEditor
        matchId="match-1"
        teamLabel="Cadete B"
        opponent="Rival"
        scheduledAt="2026-09-29T16:00:00.000Z"
        initial={[
          { player_id: "p3", cap_number: 1 },
          { player_id: "p1", cap_number: 7 },
        ]}
        candidates={CANDIDATES}
        template={[
          { player_id: "p3", cap_number: 1 },
          { player_id: "p2", cap_number: 3 },
        ]}
        editable
        backHref="/acta"
        backLabel="Volver al acta"
        liveSheet={liveSheet}
        onSaveLive={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Volver a la convocatoria por defecto" }));
    fireEvent.click(screen.getByRole("button", { name: "Usar lista por defecto" }));
    expect(screen.getByText(/Rubén Galvillo tiene jugadas/)).toBeVisible();
    expect(screen.getByRole("button", { name: /Gorro de Rubén Galvillo: 7/ })).toBeVisible();
  });
});
