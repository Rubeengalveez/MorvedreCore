import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/server/actions/live-match", () => ({ prepareLiveMatch: vi.fn() }));
import { LiveMatchEntryState } from "@/components/matches/live-match-entry-state";
import { DelegateMatchEntry } from "@/components/matches/delegate-match-entry";
import { canUseLiveMatch, deriveAdminCapabilities } from "@/lib/domain/permissions";
afterEach(cleanup);
const id = "10000000-0000-4000-8000-000000000001";
it("la carga y el error siempre permiten volver al mismo partido", async () => {
  history.replaceState({}, "", `/acta?match=${id}`);
  const view = render(<LiveMatchEntryState error="" />);
  await waitFor(() =>
    expect(screen.getByRole("link", { name: "Volver al partido" })).toHaveAttribute(
      "href",
      `/matches/${id}`,
    ),
  );
  expect(screen.getByRole("status")).toHaveTextContent("Preparando tu acta");
  view.rerender(<LiveMatchEntryState error="No tienes permiso" />);
  expect(screen.getByRole("alert")).toHaveTextContent("No tienes permiso");
  expect(screen.getByRole("link")).not.toHaveAttribute("href", "/admin/matches");
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
it("muestra ambos modos directamente sin enlaces de administración", () => {
  render(<DelegateMatchEntry matchId={id} started={false} finished={false} />);
  expect(screen.getByRole("link", { name: /Abrir acta en directo/ })).toHaveAttribute(
    "href",
    `/acta?match=${id}`,
  );
  expect(screen.getByRole("link", { name: /Solo goles y expulsiones/ })).toHaveAttribute(
    "href",
    `/matches/${id}/registro`,
  );
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
