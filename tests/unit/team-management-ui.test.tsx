import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TeamDirectory } from "@/components/team/team-directory";
import { TeamEditor } from "@/components/team/team-editor";
import { TeamDefaultCapsEditor } from "@/components/team/team-default-caps-editor";
import { TeamMemberPicker, TeamMembersList } from "@/components/team/team-member-manager";
import type { Season } from "@/server/actions/admin";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  roster: vi.fn(),
  unroster: vi.fn(),
  assign: vi.fn(),
  unassign: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  caps: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/server/actions/admin/teams", () => ({
  createTeam: mocks.create,
  updateTeam: mocks.update,
  rosterPlayer: mocks.roster,
  unrosterPlayer: mocks.unroster,
  assignStaff: mocks.assign,
  unassignStaff: mocks.unassign,
  saveTeamDefaultCaps: mocks.caps,
}));
vi.mock("@/components/ui/adaptive-player-name", () => ({
  AdaptivePlayerName: ({ name }: { name: string }) => <span>{name}</span>,
}));
const season = {
  id: "11111111-1111-4111-8111-111111111111",
  label: "2026/2027",
  is_current: true,
} as Season;
const teams = [
  {
    id: "a",
    label: "Alevín",
    category_code: "alevin",
    gender: "mixed",
    color: "#0A2E5C",
    playerCount: 8,
    coachName: "Rubén Gálvez",
    relationship: "coach" as const,
  },
  {
    id: "b",
    label: "Infantil",
    category_code: "infantil",
    gender: "mixed",
    color: "#0A2E5C",
    playerCount: 9,
    coachName: "Vitaliy",
  },
];
const candidates = [
  { id: "juan", full_name: "Juan López", categoryLabel: "Alevín" },
  { id: "ruben", full_name: "Rubén Gálvez", categoryLabel: "Absoluto" },
];
beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
  mocks.create.mockResolvedValue({ id: "new" });
  mocks.roster.mockResolvedValue(undefined);
  mocks.unroster.mockResolvedValue(undefined);
  vi.stubGlobal("scrollTo", vi.fn());
});
describe("Flujos de equipos", () => {
  it("intercambia gorros con confirmación y guarda una sola vez", async () => {
    const players = [
      { player_id: "juan", full_name: "Juan López", cap_number: 2 },
      { player_id: "ruben", full_name: "Rubén Gálvez", cap_number: 3 },
    ];
    let done!: () => void;
    mocks.caps.mockReturnValue(
      new Promise<void>((resolve) => {
        done = resolve;
      }),
    );
    render(<TeamDefaultCapsEditor teamId="team" players={players} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar gorros por defecto" }));
    expect(screen.getByRole("button", { name: "Guardar gorros" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Cambiar gorro de Juan/ }));
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar con el gorro 3" }));
    expect(mocks.caps).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Intercambiar gorros" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar gorros" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardando…" }));
    expect(mocks.caps).toHaveBeenCalledTimes(1);
    expect(mocks.caps).toHaveBeenCalledWith({
      team_id: "team",
      expected: players.map(({ player_id, cap_number }) => ({ player_id, cap_number })),
      players: [
        { player_id: "juan", cap_number: 3 },
        { player_id: "ruben", cap_number: 2 },
      ],
    });
    done();
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });
  it("dejar sin gorros requiere confirmar y cancelar no guarda", () => {
    render(
      <TeamDefaultCapsEditor
        teamId="team"
        players={[{ player_id: "juan", full_name: "Juan López", cap_number: 2 }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Editar gorros por defecto" }));
    fireEvent.click(screen.getByRole("button", { name: "Dejar todos sin gorro" }));
    fireEvent.click(screen.getByRole("button", { name: "Dejar sin gorros" }));
    expect(screen.getByRole("button", { name: /Cambiar gorro de Juan.*sin gorro/ })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Salir sin guardar" }));
    expect(mocks.caps).not.toHaveBeenCalled();
  });
  it("el directorio administrativo muestra solo la temporada actual, sin búsqueda ni filtros", () => {
    render(
      <TeamDirectory
        admin
        teams={[
          ...teams.map((t) => ({ ...t, season_id: season.id })),
          { ...teams[0], id: "old", season_id: "old-season" },
        ]}
        defaultSeasonId={season.id}
      />,
    );
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Filtros/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
  it("el directorio público conserva todos/mis equipos sin búsqueda, filtros ni género", () => {
    render(<TeamDirectory teams={teams} />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Filtros/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Mixto")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
  });
  it("separa mis equipos y todos sin esconder opciones a la familia", () => {
    render(<TeamDirectory teams={teams} />);
    fireEvent.click(screen.getByRole("button", { name: "Mis equipos" }));
    expect(screen.queryByRole("link", { name: /Infantil/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(screen.getByRole("link", { name: /Infantil/ })).toBeVisible();
  });
  it("crear equipo guarda una sola vez y abre su ficha", async () => {
    let resolve!: (result: { id: string }) => void;
    mocks.create.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    render(<TeamEditor defaultSeasonId={season.id} triggerLabel="Añadir equipo" />);
    fireEvent.click(screen.getByRole("button", { name: "Añadir equipo" }));
    expect(screen.queryByLabelText("Temporada")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nombre del equipo"), { target: { value: "Alevín B" } });
    const save = screen.getByRole("button", { name: "Crear equipo" });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(save).toBeDisabled();
    resolve({ id: "new" });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/admin/teams/new"));
  });
  it("al salir con cambios ofrece conservar el formulario", () => {
    render(<TeamEditor defaultSeasonId={season.id} triggerLabel="Añadir equipo" />);
    fireEvent.click(screen.getByRole("button", { name: "Añadir equipo" }));
    fireEvent.change(screen.getByLabelText("Nombre del equipo"), { target: { value: "Alevín B" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("heading", { name: "¿Salir sin guardar?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.getByLabelText("Nombre del equipo")).toHaveValue("Alevín B");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("al fallar una incorporación conserva el jugador y el error", async () => {
    mocks.roster.mockRejectedValue(new Error("No pudimos guardar"));
    render(
      <TeamMemberPicker
        teamId="team"
        kind="player"
        candidates={candidates}
        triggerLabel="Añadir jugador"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Añadir jugador" }));
    fireEvent.click(screen.getByRole("button", { name: /Juan López/ }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir a la plantilla" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No pudimos guardar"));
    expect(screen.getByText("Juan López")).toBeVisible();
    expect(screen.getByRole("button", { name: "Añadir a la plantilla" })).toBeEnabled();
  });
  it("elige un gorro libre visualmente y bloquea los ocupados", async () => {
    render(
      <TeamMemberPicker teamId="team" kind="player" candidates={candidates} usedCaps={[1, 3]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Añadir jugador" }));
    fireEvent.click(screen.getByRole("button", { name: /Juan López/ }));
    expect(screen.getByRole("button", { name: "Gorro 1, ocupado" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sin gorro, seleccionado" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Asignar gorro 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir a la plantilla" }));
    await waitFor(() =>
      expect(mocks.roster).toHaveBeenCalledWith({
        team_id: "team",
        player_id: "juan",
        squad_number: 2,
      }),
    );
  });
  it("muestra el color directamente sin notas internas", () => {
    render(<TeamEditor defaultSeasonId={season.id} />);
    fireEvent.click(screen.getByRole("button", { name: "Nuevo equipo" }));
    expect(screen.getByLabelText("Color del equipo")).toBeVisible();
    expect(screen.queryByLabelText("Notas internas (opcional)")).not.toBeInTheDocument();
  });
  it("una persona asignada puede tener otra función, pero no duplicar la misma", () => {
    render(
      <TeamMemberPicker
        teamId="team"
        kind="staff"
        candidates={candidates}
        assigned={[{ profile_id: "ruben", role: "head_coach" }]}
        triggerLabel="Añadir personal"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Añadir personal" }));
    expect(screen.queryByRole("button", { name: /Rubén Gálvez/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Entrenador asistente")).not.toBeInTheDocument();
    expect(screen.queryByText("Preparador físico")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delegado" }));
    expect(screen.getByRole("button", { name: /Rubén Gálvez/ })).toBeVisible();
  });
  it("quitar un jugador requiere confirmar y cancelar no escribe", async () => {
    render(
      <TeamMembersList
        teamId="team"
        kind="player"
        members={[{ id: "juan", full_name: "Juan López", squad_number: 3 }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Quitar a Juan López/ }));
    expect(mocks.unroster).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Mantener/ }));
    expect(mocks.unroster).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Quitar a Juan López/ }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /Quitar del equipo/ }),
    );
    await waitFor(() =>
      expect(mocks.unroster).toHaveBeenCalledWith({ team_id: "team", player_id: "juan" }),
    );
  });
});
