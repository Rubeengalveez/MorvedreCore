import { act, fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/server/actions/live-match", () => ({ prepareLiveMatch: vi.fn() }));
import { LiveMatchEntryState } from "@/components/matches/live-match-entry-state";
import { DelegateMatchEntry } from "@/components/matches/delegate-match-entry";
import { canUseLiveMatch, deriveAdminCapabilities } from "@/lib/domain/permissions";
import { prepareLiveMatch } from "@/server/actions/live-match";
afterEach(cleanup);
const id = "10000000-0000-4000-8000-000000000001";
it("permite reintentar la preparación si la conexión no responde", async () => {
  vi.useFakeTimers();
  vi.mocked(prepareLiveMatch).mockReturnValueOnce(new Promise(() => {}));
  try {
    render(
      <LiveMatchEntryState
        error=""
        preparation={{
          team: "Infantil",
          opponent: "Rival",
          reason: "caps",
          players: [{ id, cap: 1, name: "Álex" }],
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar gorros y abrir acta" }));
    expect(screen.getByRole("button", { name: "Guardando gorros…" })).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8001);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Tus cambios siguen aquí");
    expect(screen.getByRole("button", { name: "Guardar gorros y abrir acta" })).toBeEnabled();
  } finally {
    cleanup();
    vi.useRealTimers();
  }
});
it("la carga y el error mantienen la salida al partido visible", async () => {
  history.replaceState({}, "", `/acta?match=${id}`);
  const view = render(<LiveMatchEntryState error="" />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Volver al partido" })).toBeInTheDocument(),
  );
  expect(screen.getByRole("status")).toHaveTextContent("Preparando tu acta");
  view.rerender(<LiveMatchEntryState error="No tienes permiso" />);
  expect(screen.getByRole("alert")).toHaveTextContent("No tienes permiso");
  expect(screen.getByRole("button", { name: "Volver al partido" })).toBeInTheDocument();
});
it("señala los gorros repetidos y permite corregirlos en la misma pantalla", () => {
  render(
    <LiveMatchEntryState
      error=""
      preparation={{
        opponent: "Rival",
        team: "Infantil",
        reason: "caps",
        players: [
          { id, name: "Álex", cap: 2 },
          { id: "p2", name: "Marcos", cap: 2 },
        ],
      }}
    />,
  );
  expect(screen.getAllByText("Gorro repetido")).toHaveLength(2);
  const save = screen.getByRole("button", { name: "Guardar gorros y abrir acta" });
  expect(save).toBeDisabled();
  fireEvent.change(screen.getByRole("combobox", { name: /Álex/ }), { target: { value: "1" } });
  expect(save).toBeEnabled();
  expect(screen.queryByText("Gorro repetido")).toBeNull();
});
it("desasignar gorros requiere confirmación y avisa si se sale sin guardar", () => {
  render(
    <LiveMatchEntryState
      error=""
      preparation={{
        opponent: "Rival",
        team: "Infantil",
        reason: "caps",
        players: [
          { id, name: "Álex", cap: 1 },
          { id: "p2", name: "Marcos", cap: 2 },
        ],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Desasignar todos los gorros" }));
  expect(screen.getByRole("heading", { name: "¿Quitar todos los gorros?" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Quitar gorros" }));
  expect(screen.getByRole("button", { name: "Guardar gorros y abrir acta" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Volver al partido" }));
  expect(screen.getByRole("heading", { name: "Tienes cambios sin guardar" })).toBeInTheDocument();
});
it("permite elegir un máximo de 14 cuando una convocatoria antigua tiene más jugadores", () => {
  const players = Array.from({ length: 16 }, (_, index) => ({
    id: `${String(index + 1).padStart(8, "0")}-0000-4000-8000-000000000001`,
    name: `Jugador ${index + 1}`,
    cap: index + 1,
  }));
  render(
    <LiveMatchEntryState
      error=""
      preparation={{ opponent: "Rival", team: "Infantil", reason: "too_many", players }}
    />,
  );
  expect(screen.getByText("14 de 14 elegidos")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Guardar gorros y abrir acta" })).toBeEnabled();
  expect(screen.getByRole("checkbox", { name: "Elegir a Jugador 15" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: "Quitar a Jugador 1" }));
  expect(screen.getByRole("checkbox", { name: "Elegir a Jugador 15" })).toBeEnabled();
});
it("muestra solo el acta en directo", () => {
  const { rerender } = render(<DelegateMatchEntry matchId={id} started={false} finished={false} />);
  expect(screen.getByRole("link", { name: "Abrir acta" })).toHaveAttribute(
    "href",
    `/acta?match=${id}`,
  );
  rerender(<DelegateMatchEntry matchId={id} started finished={false} />);
  expect(screen.getByText("En curso")).toBeVisible();
  expect(screen.getByRole("link", { name: "Abrir acta" })).toBeVisible();
  rerender(<DelegateMatchEntry matchId={id} started finished />);
  expect(screen.getByRole("link", { name: "Ver acta" })).toBeVisible();
  expect(screen.queryByRole("link", { name: /Solo goles y expulsiones/ })).toBeNull();
});
it("solo una asignación de delegado del equipo concede acceso", () => {
  for (const role of ["admin", "coach", "delegate"]) {
    const access = deriveAdminCapabilities({
      isAdmin: role === "admin",
      permissions: [{ permission: "manage_matches" }],
      roles: [{ role, scope_team_id: id }],
      staff: [],
    });
    expect(canUseLiveMatch(access, id)).toBe(role === "delegate");
    expect(canUseLiveMatch(access, "otro-equipo")).toBe(false);
  }
  expect(
    canUseLiveMatch(
      deriveAdminCapabilities({
        isAdmin: false,
        permissions: [],
        roles: [],
        staff: [{ role: "delegate", team_id: id }],
      }),
      id,
    ),
  ).toBe(true);
});
