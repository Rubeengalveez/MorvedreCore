import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SwimHistoryList } from "@/components/swim-times/swim-history-list";
import type { SwimTimeEntryInput } from "@/lib/domain/swim-times";

const actions = vi.hoisted(() => ({ update: vi.fn(), void: vi.fn() }));
vi.mock("@/server/actions/swim-times", () => ({
  updateSwimTime: actions.update,
  voidSwimTime: actions.void,
}));
const entry: SwimTimeEntryInput = {
  id: "entry",
  revision: 1,
  player_id: "pau",
  full_name: "Pau Pérez Méndez",
  photo_url: null,
  birth_year: 2009,
  team_id: "team",
  team_label: "Cadete B",
  team_color: null,
  team_category: "cadete",
  season_id: "season",
  season_label: "2026/2027",
  season_end_year: 2027,
  test_date: "2026-09-30",
  created_at: "2026-09-30T10:00:00Z",
  time_50_cs: 3400,
  time_100_cs: 7000,
};
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.scrollTo = vi.fn();
});

describe("Corregir tiempos", () => {
  it("solo ofrece corrección en equipos autorizados", () => {
    render(<SwimHistoryList initialEntries={[entry]} editableTeamIds={[]} />);
    expect(screen.queryByRole("button", { name: "Corregir anotación" })).not.toBeInTheDocument();
  });
  it("anular requiere confirmación y cancelar conserva la anotación", () => {
    render(<SwimHistoryList initialEntries={[entry]} editableTeamIds={["team"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir anotación" }));
    fireEvent.click(screen.getByRole("button", { name: "Anular anotación" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Mantener anotación" }),
    );
    expect(actions.void).not.toHaveBeenCalled();
    expect(screen.getByText("34,00 s")).toBeVisible();
  });
  it("si falla la conexión conserva la corrección y muestra el error sin cerrar el formulario", async () => {
    actions.update.mockRejectedValueOnce(new Error("network"));
    render(<SwimHistoryList initialEntries={[entry]} editableTeamIds={["team"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Corregir anotación" }));
    fireEvent.change(screen.getByLabelText("50 m"), { target: { value: "35,20" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("No pudimos confirmar"),
    );
    expect(screen.getByLabelText("50 m")).toHaveValue("35,20");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled(),
    );
  });
});
