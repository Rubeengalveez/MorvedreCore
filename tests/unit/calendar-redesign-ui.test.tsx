import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { CalendarView } from "@/components/calendar/calendar-view";
import { AttendanceSheet } from "@/components/attendance/attendance-sheet";
import { AttendanceHistoryCalendar } from "@/components/attendance/attendance-history-calendar";
import type { DashboardCoachSession } from "@/server/queries/dashboard";
const state = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), save: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: state.replace, push: state.push }),
}));
vi.mock("@/server/actions/admin", () => ({ markAttendance: state.save }));
afterEach(cleanup);
beforeEach(() => {
  state.replace.mockReset();
  state.push.mockReset();
  state.save.mockReset().mockResolvedValue(undefined);
});
const session: DashboardCoachSession = {
  id: "training",
  team_id: "a",
  team_label: "Cadete A",
  team_color: "#112233",
  scheduled_at: "2026-10-04T16:00:00Z",
  end_at: null,
  location: "Piscina",
  is_past: false,
  present_count: 0,
  absent_count: 0,
  unmarked_count: 1,
  roster_count: 1,
  players: [{ id: "child", full_name: "Luis López Martínez", attendance: null, reason: null }],
};
describe("Calendario y asistencia: interacción", () => {
  it("mantiene un mes navegable y elimina el selector semana", () => {
    render(
      <CalendarView
        teams={[]}
        people={[]}
        player="all"
        team=""
        yearMonth={{ year: 2026, month: 8 }}
        eventsByDay={new Map()}
      />,
    );
    expect(screen.queryByRole("tab", { name: "Semana" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(state.replace).toHaveBeenCalledWith("/calendar?month=2026-10&player=all", {
      scroll: false,
    });
    expect(screen.getByRole("link", { name: "Asistencia" })).toHaveAttribute(
      "href",
      expect.stringContaining("month=2026-09"),
    );
  });
  it("aplica el mes elegido en el selector sin necesitar otra pulsación", () => {
    render(
      <CalendarView
        teams={[]}
        people={[]}
        player="all"
        team=""
        yearMonth={{ year: 2026, month: 8 }}
        eventsByDay={new Map()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Septiembre 2026" }));
    fireEvent.input(screen.getByLabelText("Mes y año"), { target: { value: "2026-11" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver este mes" }));
    expect(state.replace).toHaveBeenCalledWith("/calendar?month=2026-11&player=all", {
      scroll: false,
    });
  });
  it("la leyenda explica que una lista pendiente no es una ausencia", () => {
    render(
      <CalendarView
        teams={[]}
        people={[]}
        player="all"
        team=""
        yearMonth={{ year: 2026, month: 8 }}
        eventsByDay={new Map()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Leyenda" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Sin revisar cuenta como asistencia/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("abrir una lista nueva no guarda presencia sin confirmación", async () => {
    render(
      <AttendanceSheet
        session={session}
        canEdit
        origin="calendar"
        calendarHref="/calendar?month=2026-10"
      />,
    );
    expect(state.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Calendario" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(state.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Seguir revisando" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar lista y volver" }));
    await waitFor(() => expect(state.push).toHaveBeenCalledWith("/calendar?month=2026-10"));
    expect(state.save).toHaveBeenCalledWith({
      session_id: "training",
      entries: [{ player_id: "child", present: true, reason: null }],
    });
  });
  it("un fallo al guardar no permite salir como si estuviera guardado", async () => {
    state.save.mockRejectedValue(new Error("Sin conexión"));
    render(<AttendanceSheet session={session} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar lista y volver" }));
    await waitFor(() => expect(screen.getByText("No se han guardado los cambios")).toBeVisible());
    expect(state.push).not.toHaveBeenCalled();
  });
  it("los días sin lista muestran un detalle sin inventar ausencias", () => {
    render(
      <AttendanceHistoryCalendar
        year={2026}
        month={8}
        records={[]}
        profiles={[{ id: "child", full_name: "Luis" }]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Martes 1 de Septiembre: Luis: sin entrenamiento/ }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/No hay entrenamientos para este día/)).toBeVisible();
  });
});
