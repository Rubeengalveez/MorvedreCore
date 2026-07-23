import { describe, expect, it } from "vitest";

import {
  buildAttendanceTeamReports,
  getAttendancePeriodRange,
  getMonthRange,
  shiftAttendancePeriod,
  summarizeAttendance,
  type AttendanceHistoryRecord,
} from "@/lib/domain/attendance-history";

function record(
  playerId: string,
  present: boolean,
  sessionId: string,
  teamId = "team-1",
): AttendanceHistoryRecord {
  return {
    session_id: sessionId,
    player_id: playerId,
    present,
    reason: null,
    marked_at: "2026-07-10T20:00:00.000Z",
    updated_at: "2026-07-10T20:00:00.000Z",
    scheduled_at: "2026-07-10T18:00:00.000Z",
    team_id: teamId,
    team_label: "Cadete",
    team_color: "#1E5AA8",
  };
}

describe("attendance period ranges", () => {
  it("builds a Monday to Sunday week", () => {
    expect(getAttendancePeriodRange("2026-07-23", "week")).toEqual({
      from: "2026-07-20",
      to: "2026-07-26",
    });
  });

  it("handles month lengths and shifts without drifting", () => {
    expect(getMonthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(shiftAttendancePeriod("2026-01-31", "month", 1)).toBe("2026-02-01");
  });
});

describe("attendance summaries", () => {
  it("does not invent a percentage when no list has been recorded", () => {
    expect(summarizeAttendance([])).toEqual({
      attended: 0,
      absent: 0,
      total: 0,
      percentage: null,
    });
  });

  it("uses recorded lists as the denominator", () => {
    expect(
      summarizeAttendance([record("p-1", true, "s-1"), record("p-1", false, "s-2")]),
    ).toMatchObject({ attended: 1, absent: 1, total: 2, percentage: 50 });
  });

  it("keeps categories separate and includes players without recorded lists", () => {
    const reports = buildAttendanceTeamReports({
      teams: [{ id: "team-1", label: "Cadete", color: "#1E5AA8" }],
      sessions: [
        { id: "s-1", team_id: "team-1", scheduled_at: "2026-07-10T18:00:00.000Z" },
        { id: "s-2", team_id: "team-1", scheduled_at: "2026-07-12T18:00:00.000Z" },
      ],
      rosters: [
        { team_id: "team-1", player_id: "p-1", joined_at: "2026-01-01", left_at: null },
        { team_id: "team-1", player_id: "p-2", joined_at: "2026-01-01", left_at: null },
      ],
      players: [
        { id: "p-1", full_name: "Ana García", photo_url: null },
        { id: "p-2", full_name: "Bruno López", photo_url: null },
      ],
      records: [record("p-1", false, "s-1")],
    });

    expect(reports[0]).toMatchObject({
      session_count: 2,
      reviewed_session_count: 1,
      absent: 1,
      percentage: 0,
    });
    expect(reports[0]?.players[1]).toMatchObject({
      full_name: "Bruno López",
      total: 0,
      percentage: null,
    });
  });
});
