import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AttendanceSheet } from "@/components/attendance/attendance-sheet";
import type { DashboardCoachSession } from "@/server/queries/dashboard";

const { markAttendanceMock, pushMock } = vi.hoisted(() => ({
  markAttendanceMock: vi.fn().mockResolvedValue({ updated: 2 }),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: pushMock, back: vi.fn() }),
}));

vi.mock("@/server/actions/admin", () => ({
  markAttendance: markAttendanceMock,
}));

const session: DashboardCoachSession = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  team_id: "550e8400-e29b-41d4-a716-446655440010",
  team_label: "Cadete B",
  team_color: "#0A2E5C",
  scheduled_at: "2026-07-13T17:00:00.000Z",
  end_at: "2026-07-13T18:30:00.000Z",
  location: "Piscina Municipal",
  is_past: false,
  present_count: 0,
  absent_count: 0,
  unmarked_count: 2,
  roster_count: 2,
  players: [
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      full_name: "Ana García",
      attendance: null,
      reason: null,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002",
      full_name: "Pablo Pérez",
      attendance: null,
      reason: null,
    },
  ],
};

describe("AttendanceSheet", () => {
  beforeEach(() => {
    markAttendanceMock.mockReset().mockResolvedValue({ updated: 2 });
    pushMock.mockReset();
  });
  it("prepara la lista sin guardar y la registra al terminar", async () => {
    render(<AttendanceSheet session={session} canEdit />);
    const controls = screen.getByRole("group", { name: "Asistencia de Ana García" });
    expect(within(controls).getByRole("button", { name: "Ha venido: Ana García" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(markAttendanceMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Guardar lista y volver" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/attendance?date=2026-07-13"));
    expect(markAttendanceMock).toHaveBeenCalledTimes(1);
    expect(markAttendanceMock).toHaveBeenCalledWith({
      session_id: session.id,
      entries: session.players.map((player) => ({
        player_id: player.id,
        present: true,
        reason: null,
      })),
    });
  });
  it("marca una falta con una pulsación y evita repetir el mismo guardado", async () => {
    render(<AttendanceSheet session={session} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: "No ha venido: Ana García" }));
    await waitFor(() => expect(markAttendanceMock).toHaveBeenCalledTimes(1));
    expect(markAttendanceMock.mock.calls[0][0].entries[0]).toEqual({
      player_id: session.players[0].id,
      present: false,
      reason: null,
    });
    fireEvent.click(screen.getByRole("button", { name: "No ha venido: Ana García" }));
    expect(markAttendanceMock).toHaveBeenCalledTimes(1);
  });
  it("espera los cambios rápidos en orden y bloquea la edición al terminar", async () => {
    let resolveSave!: (value: { updated: number }) => void;
    markAttendanceMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(<AttendanceSheet session={session} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: "No ha venido: Ana García" }));
    await waitFor(() => expect(markAttendanceMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Ha venido: Ana García" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar lista y volver" }));
    expect(screen.getByRole("button", { name: "No ha venido: Ana García" })).toBeDisabled();
    expect(pushMock).not.toHaveBeenCalled();
    resolveSave({ updated: 2 });
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(markAttendanceMock).toHaveBeenCalledTimes(2);
    expect(markAttendanceMock.mock.calls[1][0].entries[0].present).toBe(true);
  });
  it("un error conserva la selección, permite reintentar y no navega antes de guardar", async () => {
    markAttendanceMock.mockRejectedValueOnce(new Error("Sin conexión"));
    render(<AttendanceSheet session={session} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: "No ha venido: Ana García" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("No se han guardado los cambios"),
    );
    expect(pushMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar guardado" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Lista guardada"));
    expect(markAttendanceMock.mock.calls[1][0].entries[0].present).toBe(false);
    expect(pushMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Guardar lista y volver" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(markAttendanceMock).toHaveBeenCalledTimes(2);
  });
  it("conserva el origen y permite seguir revisando sin escribir al abrir", () => {
    render(
      <AttendanceSheet
        session={session}
        canEdit
        origin="calendar"
        calendarHref="/calendar?month=2026-07&day=2026-07-13"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Calendario" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(markAttendanceMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Seguir revisando" }));
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("consulta el futuro sin controles de asistencia ni escrituras", () => {
    render(<AttendanceSheet session={session} canEdit={false} />);
    expect(screen.getByText("Podrás pasar lista el día del entrenamiento.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Ha venido:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /No ha venido:/ })).not.toBeInTheDocument();
    expect(markAttendanceMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Volver a entrenamientos" }));
    expect(pushMock).toHaveBeenCalledWith("/attendance?date=2026-07-13");
  });
});
