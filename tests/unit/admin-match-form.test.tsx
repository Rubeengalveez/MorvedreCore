import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchFormSheet } from "@/app/(app)/admin/matches/_components/match-form-sheet";
import type { Team } from "@/server/actions/admin";

const { create, push, refresh } = vi.hoisted(() => ({
  create: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/server/actions/admin", () => ({ createMatch: create }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

const team = {
  id: "11111111-1111-4111-8111-111111111111",
  season_id: "22222222-2222-4222-8222-222222222222",
  label: "Infantil",
  season_label: "2026/2027",
  home_pool: "Piscina propia",
} as Team & { season_label: string };
function open() {
  render(
    <MatchFormSheet
      teams={[team]}
      defaultTeamId={team.id}
      defaultSeasonId={team.season_id}
      trigger={<button>Nuevo partido</button>}
    />,
  );
  screen.getByRole("button", { name: "Nuevo partido" }).focus();
  fireEvent.click(screen.getByRole("button", { name: "Nuevo partido" }));
}
async function review() {
  fireEvent.change(screen.getByRole("textbox", { name: "Rival" }), {
    target: { value: "CN Prueba" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByLabelText("Fecha y hora");
  fireEvent.change(screen.getByLabelText("Fecha y hora"), {
    target: { value: "2026-11-08T12:30" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByRole("button", { name: "Crear partido" });
}

beforeEach(() => {
  create.mockReset();
  push.mockReset();
  refresh.mockReset();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
describe("Crear partidos", () => {
  it("bloquea el fondo y devuelve el foco al cerrar sin cambios", async () => {
    open();
    expect(document.body.style.position).toBe("fixed");
    expect(screen.getByRole("dialog", { name: "Nuevo partido" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar nuevo partido" }));
    await waitFor(() => expect(document.body.style.position).not.toBe("fixed"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuevo partido" })).toHaveFocus();
  });
  it("explica qué falta y no deja avanzar sin rival ni fecha", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText("Escribe el nombre del rival (al menos 2 letras).");
    expect(screen.getByRole("textbox", { name: "Rival" })).toHaveAttribute("aria-invalid", "true");
    expect(create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "Rival" }), {
      target: { value: "CN Prueba" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByLabelText("Fecha y hora");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText("Elige la fecha y la hora del partido.");
    expect(create).not.toHaveBeenCalled();
  });
  it("conserva los datos entre pasos y exige una decisión antes de descartarlos", async () => {
    open();
    await review();
    fireEvent.click(screen.getByRole("button", { name: "Editar equipos" }));
    expect(screen.getByRole("textbox", { name: "Rival" })).toHaveValue("CN Prueba");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar nuevo partido" }));
    await screen.findByRole("heading", { name: "¿Dejarlo para después?" });
    fireEvent.click(screen.getByRole("button", { name: "Seguir rellenando" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Rival" })).toHaveValue("CN Prueba"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cerrar nuevo partido" }));
    await screen.findByRole("button", { name: "Descartar y cerrar" });
    fireEvent.click(screen.getByRole("button", { name: "Descartar y cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Nuevo partido" }));
    expect(screen.getByRole("textbox", { name: "Rival" })).toHaveValue("");
  });
  it("solo crea al confirmar el resumen y mantiene la temporada del equipo", async () => {
    create.mockResolvedValue({ id: "match-new" });
    open();
    await review();
    expect(create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Crear partido" }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        team_id: team.id,
        season_id: team.season_id,
        opponent: "CN Prueba",
        location: "Piscina Internúcleos",
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/matches/match-new?from=admin"));
  });
  it("conserva el formulario cuando falla la red y bloquea el doble envío pendiente", async () => {
    let reject!: (reason: Error) => void;
    create.mockReturnValue(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    open();
    await review();
    fireEvent.click(screen.getByRole("button", { name: "Crear partido" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Creando partido…" })).toBeDisabled(),
    );
    expect(screen.getByRole("button", { name: "Cerrar nuevo partido" })).toBeDisabled();
    await act(async () => reject(new Error("Sin conexión. Inténtalo de nuevo.")));
    await screen.findByText("Sin conexión. Inténtalo de nuevo.");
    expect(push).not.toHaveBeenCalled();
    expect(
      within(screen.getByRole("region", { name: "Resumen del partido" })).getByText(/CN Prueba/),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Crear partido" })).toBeEnabled();
  });
});
