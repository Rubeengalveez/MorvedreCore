import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlayerFormSheet } from "@/app/(app)/admin/players/_components/player-form-sheet";
import { PlayersTable, type PlayerRow } from "@/app/(app)/admin/players/_components/players-table";
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  status: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/server/actions/admin/player-editor", () => ({ savePlayerWithPhoto: mocks.save }));
vi.mock("@/server/actions/admin/players", () => ({ setPlayerActive: mocks.status }));
const teams = [{ id: "team", label: "Alevín", category_code: "alevin", occupiedCaps: [1] }];
const player: PlayerRow = {
  id: "player",
  full_name: "Pepe López",
  birth_year: 2014,
  gender: "male",
  cap_number: 2,
  photo_url: null,
  phone_e164: null,
  email_contact: null,
  notes: null,
  school_enrolled: false,
  school_payment_paid: false,
  is_active: true,
  currentTeam: "Alevín",
  category: "alevin",
  categoryLabel: "Alevín",
};
beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.save.mockResolvedValue(undefined);
});
describe("Gestión sencilla de jugadores", () => {
  it.each([
    [2025, "Cadete"],
    [2026, "Juvenil"],
  ])("edita sin género ni notas y calcula 2010 para %i", (seasonYear, category) => {
    render(<PlayerFormSheet player={player} seasonYear={Number(seasonYear)} open />);
    fireEvent.change(screen.getByLabelText("Año de nacimiento"), { target: { value: "2010" } });
    expect(screen.getByText(category)).toBeVisible();
    fireEvent.click(screen.getByText("Otros datos"));
    expect(screen.queryByLabelText(/Género/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Notas internas/)).not.toBeInTheDocument();
  });
  it("no guarda datos incompletos y enfoca el nombre", () => {
    render(<PlayerFormSheet teams={teams} seasonYear={2025} open />);
    fireEvent.click(screen.getByRole("button", { name: "Revisar y guardar" }));
    expect(screen.getByLabelText("Nombre completo")).toHaveFocus();
    expect(screen.getByLabelText("Año de nacimiento")).toHaveAttribute("aria-invalid", "true");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("revisa el alta antes de registrar y bloquea dobles pulsaciones", async () => {
    let complete!: () => void;
    mocks.save.mockReturnValue(
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
    );
    render(<PlayerFormSheet teams={teams} seasonYear={2025} open />);
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Pepe López" } });
    fireEvent.change(screen.getByLabelText("Año de nacimiento"), { target: { value: "2014" } });
    fireEvent.change(screen.getByLabelText("Equipo principal"), { target: { value: "team" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar y guardar" }));
    expect(screen.getByRole("heading", { name: "Confirmar alta" })).toBeVisible();
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Registrar jugador" }));
    fireEvent.click(screen.getByRole("button", { name: "Registrar jugador" }));
    expect(mocks.save).toHaveBeenCalledTimes(1);
    const input = JSON.parse(mocks.save.mock.calls[0][0].get("input"));
    expect(input).toMatchObject({
      team_id: "team",
      full_name: "Pepe López",
      birth_year: 2014,
      cap_number: null,
    });
    expect(input).not.toHaveProperty("gender");
    expect(input).not.toHaveProperty("notes");
    complete();
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });
  it("salir con un borrador exige confirmar y no lo guarda", () => {
    const close = vi.fn();
    render(<PlayerFormSheet teams={teams} seasonYear={2025} open onOpenChange={close} />);
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Pepe López" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("heading", { name: "¿Salir sin guardar?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Pepe López");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Salir sin guardar" }));
    expect(close).toHaveBeenCalledWith(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("un error de guardado permite volver a editar sin perder los datos", async () => {
    mocks.save.mockRejectedValue(new Error("No hay conexión."));
    render(<PlayerFormSheet player={player} seasonYear={2025} open />);
    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "Pepe López Díaz" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Revisar y guardar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No hay conexión."));
    fireEvent.click(screen.getByRole("button", { name: "Volver a editar" }));
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Pepe López Díaz");
  });
  it("una edición sin cambios efectivos no habilita guardar", () => {
    render(<PlayerFormSheet player={player} seasonYear={2025} open />);
    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: " Pepe López " },
    });
    expect(screen.getByRole("button", { name: "Revisar y guardar" })).toBeDisabled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("quitar la inscripción en Escuela limpia la cuota pagada", () => {
    render(
      <PlayerFormSheet
        player={{ ...player, school_enrolled: true, school_payment_paid: true }}
        seasonYear={2025}
        open
      />,
    );
    fireEvent.click(screen.getByLabelText("Inscrito en Escuela"));
    expect(screen.queryByLabelText("Cuota pagada")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Inscrito en Escuela"));
    expect(screen.getByLabelText("Cuota pagada")).not.toBeChecked();
  });
  it("desactivar requiere confirmación y presenta el error sin salir", async () => {
    mocks.status.mockRejectedValue(new Error("No puedes desactivar tu propio perfil."));
    render(
      <PlayersTable
        players={[player]}
        teams={teams}
        total={1}
        totalPages={1}
        filters={{ page: 1, query: "", status: "active", teamId: "", category: "" }}
        seasonYear={2025}
      />,
    );
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Desactivar a Pepe López" }));
    expect(mocks.status).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Desactivar jugador" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("No puedes desactivar"),
    );
  });
});
