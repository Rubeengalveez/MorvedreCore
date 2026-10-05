import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { AttendanceSummaryPlayers } from "@/components/attendance/attendance-summary-players";
import { buildAttendanceTeamReports } from "@/lib/domain/attendance-history";
afterEach(cleanup);
function reports() {
  return buildAttendanceTeamReports({
    teams: [{ id: "team", label: "Infantil", color: "#1657a8" }],
    sessions: ["01", "02", "03"].map((day) => ({
      id: day,
      team_id: "team",
      scheduled_at: `2026-09-${day}T18:00:00Z`,
    })),
    rosters: ["alex", "belen"].map((player_id) => ({
      team_id: "team",
      player_id,
      joined_at: "2026-09-01",
      left_at: null,
    })),
    players: [
      { id: "alex", full_name: "Álex García", photo_url: null },
      { id: "belen", full_name: "Belén Ruiz", photo_url: null },
    ],
    records: [true, false].map((present, i) => ({
      session_id: i === 0 ? "01" : "02",
      player_id: "alex",
      present,
      reason: present ? null : "Avisado",
      marked_at: "2026-09-03T10:00:00Z",
      updated_at: "2026-09-03T10:00:00Z",
      scheduled_at: `2026-09-0${i + 1}T18:00:00Z`,
      team_id: "team",
      team_label: "Infantil",
      team_color: "#1657a8",
    })),
    now: new Date("2026-09-30T22:00:00Z"),
  });
}
describe("resumen por jugador", () => {
  it("busca sin tildes y conserva los datos provisionales de las tarjetas", () => {
    render(
      <AttendanceSummaryPlayers
        reports={reports()}
        initialMonth="2026-09"
        calendarMonths={["2026-09"]}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar jugador" }), {
      target: { value: "alex garcia" },
    });
    expect(
      screen.getByRole("button", { name: /Álex García: 2 asistencias, 1 faltas, 1 sin revisar/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Belén Ruiz:/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Borrar búsqueda" }));
    expect(
      screen.getByRole("button", { name: /Belén Ruiz: 3 asistencias, 0 faltas, 3 sin revisar/ }),
    ).toBeInTheDocument();
  });
  it("abre el calendario del mes y diferencia presencia, falta y lista sin revisar", () => {
    render(
      <AttendanceSummaryPlayers
        reports={reports()}
        initialMonth="2026-09"
        calendarMonths={["2026-09"]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Álex García: 2 asistencias/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "septiembre de 2026" })).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /1 de Septiembre.*asistió/ }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /2 de Septiembre.*no asistió/ }),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /3 de Septiembre.*sin revisar/ }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(
      within(dialog).getByText("Cuenta como asistencia hasta que se revise."),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
