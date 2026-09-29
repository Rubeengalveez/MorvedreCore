import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  CallupEditor,
  type CallupCandidate,
  type CallupPick,
} from "@/app/(app)/admin/matches/[id]/_components/callup-editor";

const mockPush = vi.fn();
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

const INITIAL_PICKS: CallupPick[] = [{ player_id: "p1", cap_number: 7 }];

describe("CallupEditor", () => {
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

    expect(screen.getByLabelText("1 de 14 jugadores convocados")).toBeInTheDocument();
    expect(screen.getAllByText("Rubén Galvillo")[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gorro de Rubén Galvillo: 7/ })).toBeVisible();
    expect(screen.queryByText("Pau Martínez")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Añadir jugador" }));
    expect(screen.getByRole("button", { name: "Añadir a Pau Martínez" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Añadir a Lucas Gómez" })).toBeVisible();
    expect(screen.getByText("No disponible")).toBeVisible();
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

    expect(screen.getByLabelText("2 de 14 jugadores convocados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gorro de Pau Martínez: 3/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar convocatoria" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Guardar convocatoria" }));
    expect(screen.getByText("¿Dónde guardamos esta convocatoria?")).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar solo este partido" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Guardar también como predeterminada" }),
    ).toBeVisible();
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

    expect(screen.getByLabelText("0 de 14 jugadores convocados")).toBeInTheDocument();
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
    const searchInput = screen.getByRole("searchbox", { name: "¿A quién añades?" });
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

    expect(screen.getByText("¿Quitar todos los gorros?")).toBeInTheDocument();

    const confirmClear = screen.getByRole("button", { name: "Quitar gorros" });
    fireEvent.click(confirmClear);

    expect(screen.getByText("Sin nº")).toBeInTheDocument();
    expect(screen.getByText(/Faltan 1 gorro por asignar/i)).toBeInTheDocument();
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

    expect(screen.getByText("¿Salir sin guardar?")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    const confirmExit = screen.getByRole("button", { name: "Salir sin guardar" });
    fireEvent.click(confirmExit);

    expect(mockPush).toHaveBeenCalledWith("/admin/matches");
  });
});
