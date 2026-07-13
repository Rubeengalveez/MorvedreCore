import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AttendanceSheet } from "@/components/attendance/attendance-sheet";
import type { DashboardCoachSession } from "@/server/queries/dashboard";

const { markAttendanceMock } = vi.hoisted(() => ({
  markAttendanceMock: vi.fn().mockResolvedValue({ updated: 2 }),
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
    markAttendanceMock.mockClear();
    markAttendanceMock.mockResolvedValue({ updated: 2 });
  });

  it("starts with every unmarked player present and saves automatically", async () => {
    render(<AttendanceSheet session={session} />);

    const anaControls = screen.getByRole("group", { name: "Asistencia de Ana García" });
    expect(within(anaControls).getByRole("button", { name: "Presente" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(anaControls).getByRole("button", { name: "Ausente" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await waitFor(() => expect(markAttendanceMock).toHaveBeenCalledTimes(1));
    expect(markAttendanceMock).toHaveBeenCalledWith({
      session_id: session.id,
      entries: [
        { player_id: session.players[0]!.id, present: true, reason: null },
        { player_id: session.players[1]!.id, present: true, reason: null },
      ],
    });
    expect(await screen.findByText("Guardado automáticamente")).toBeVisible();
  });

  it("marks an absence with one tap and saves it without a save button", async () => {
    render(<AttendanceSheet session={session} />);

    await waitFor(() => expect(markAttendanceMock).toHaveBeenCalledTimes(1));
    markAttendanceMock.mockClear();

    const anaControls = screen.getByRole("group", { name: "Asistencia de Ana García" });
    fireEvent.click(within(anaControls).getByRole("button", { name: "Ausente" }));

    await waitFor(() => expect(markAttendanceMock).toHaveBeenCalledTimes(1));
    expect(markAttendanceMock).toHaveBeenCalledWith({
      session_id: session.id,
      entries: [
        { player_id: session.players[0]!.id, present: false, reason: null },
        { player_id: session.players[1]!.id, present: true, reason: null },
      ],
    });
    expect(screen.queryByRole("button", { name: "Guardar lista" })).not.toBeInTheDocument();
  });

  it("allows a saved absence from another day to be corrected", async () => {
    const pastSession: DashboardCoachSession = {
      ...session,
      is_past: true,
      present_count: 1,
      absent_count: 1,
      unmarked_count: 0,
      players: [
        { ...session.players[0]!, attendance: false },
        { ...session.players[1]!, attendance: true },
      ],
    };
    render(<AttendanceSheet session={pastSession} />);

    expect(markAttendanceMock).not.toHaveBeenCalled();
    const anaControls = screen.getByRole("group", { name: "Asistencia de Ana García" });
    fireEvent.click(within(anaControls).getByRole("button", { name: "Presente" }));

    await waitFor(() => expect(markAttendanceMock).toHaveBeenCalledTimes(1));
    expect(markAttendanceMock).toHaveBeenCalledWith({
      session_id: session.id,
      entries: [
        { player_id: session.players[0]!.id, present: true, reason: null },
        { player_id: session.players[1]!.id, present: true, reason: null },
      ],
    });
  });
});
