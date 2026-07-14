import { describe, expect, it } from "vitest";
import {
  buildAttendanceResult,
  canEditAttendanceForDay,
  diffAttendance,
  markAllPresent,
  type AttendanceRow,
} from "@/lib/domain/attendance";

describe("canEditAttendanceForDay", () => {
  const tuesdayMorning = new Date("2026-07-14T08:00:00.000Z");

  it("allows attendance for any time on the current club day", () => {
    expect(canEditAttendanceForDay("2026-07-14T20:00:00.000Z", tuesdayMorning)).toBe(true);
  });

  it("allows corrections for previous days", () => {
    expect(canEditAttendanceForDay("2026-07-13T18:00:00.000Z", tuesdayMorning)).toBe(true);
  });

  it("blocks attendance for a later club day", () => {
    expect(canEditAttendanceForDay("2026-07-15T08:00:00.000Z", tuesdayMorning)).toBe(false);
  });

  it("uses Europe/Madrid when the UTC date is still the same", () => {
    const lateTuesday = new Date("2026-07-14T21:30:00.000Z");
    expect(canEditAttendanceForDay("2026-07-14T22:30:00.000Z", lateTuesday)).toBe(false);
  });
});

describe("buildAttendanceResult", () => {
  it("marks every player as unmarked when existingAttendance is empty", () => {
    const result = buildAttendanceResult(["p-1", "p-2", "p-3"], []);
    expect(result.rows).toEqual([
      { player_id: "p-1", present: false, reason: null },
      { player_id: "p-2", present: false, reason: null },
      { player_id: "p-3", present: false, reason: null },
    ]);
    expect(result.present_count).toBe(0);
    expect(result.absent_count).toBe(0);
    expect(result.unmarked_count).toBe(3);
  });

  it("counts every player as present when all are present in existing", () => {
    const existing: AttendanceRow[] = [
      { player_id: "p-1", present: true, reason: null },
      { player_id: "p-2", present: true, reason: null },
    ];
    const result = buildAttendanceResult(["p-1", "p-2"], existing);
    expect(result.present_count).toBe(2);
    expect(result.absent_count).toBe(0);
    expect(result.unmarked_count).toBe(0);
  });

  it("counts every player as absent when all are absent in existing", () => {
    const existing: AttendanceRow[] = [
      { player_id: "p-1", present: false, reason: "enfermedad" },
      { player_id: "p-2", present: false, reason: null },
    ];
    const result = buildAttendanceResult(["p-1", "p-2"], existing);
    expect(result.present_count).toBe(0);
    expect(result.absent_count).toBe(2);
    expect(result.unmarked_count).toBe(0);
    expect(result.rows[0]!.reason).toBe("enfermedad");
  });

  it("splits a mixed result correctly", () => {
    const existing: AttendanceRow[] = [
      { player_id: "p-1", present: true, reason: null },
      { player_id: "p-3", present: false, reason: "viaje" },
    ];
    const result = buildAttendanceResult(["p-1", "p-2", "p-3"], existing);
    expect(result.present_count).toBe(1);
    expect(result.absent_count).toBe(1);
    expect(result.unmarked_count).toBe(1);
  });

  it("preserves the order of playerIds in the result rows", () => {
    const result = buildAttendanceResult(
      ["p-3", "p-1", "p-2"],
      [{ player_id: "p-1", present: true, reason: null }],
    );
    expect(result.rows.map((r) => r.player_id)).toEqual(["p-3", "p-1", "p-2"]);
  });
});

describe("markAllPresent", () => {
  it("returns one row per player with present=true", () => {
    const rows = markAllPresent(["p-1", "p-2", "p-3"]);
    expect(rows).toEqual([
      { player_id: "p-1", present: true, reason: null },
      { player_id: "p-2", present: true, reason: null },
      { player_id: "p-3", present: true, reason: null },
    ]);
  });

  it("returns an empty array for an empty list", () => {
    expect(markAllPresent([])).toEqual([]);
  });
});

describe("diffAttendance", () => {
  it("detects added, removed, and changed rows", () => {
    const before: AttendanceRow[] = [
      { player_id: "p-1", present: true, reason: null },
      { player_id: "p-2", present: false, reason: "enfermedad" },
      { player_id: "p-3", present: true, reason: null },
    ];
    const after: AttendanceRow[] = [
      { player_id: "p-1", present: false, reason: null },
      { player_id: "p-3", present: true, reason: null },
      { player_id: "p-4", present: true, reason: null },
    ];
    const diff = diffAttendance(before, after);
    expect(diff.added.map((r) => r.player_id)).toEqual(["p-4"]);
    expect(diff.removed.map((r) => r.player_id)).toEqual(["p-2"]);
    expect(diff.changed).toEqual([
      {
        before: { player_id: "p-1", present: true, reason: null },
        after: { player_id: "p-1", present: false, reason: null },
      },
    ]);
  });

  it("returns an empty diff when the lists are identical", () => {
    const list: AttendanceRow[] = [
      { player_id: "p-1", present: true, reason: null },
      { player_id: "p-2", present: false, reason: null },
    ];
    const diff = diffAttendance(list, list);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([]);
  });

  it("detects reason changes as a change", () => {
    const before: AttendanceRow[] = [{ player_id: "p-1", present: false, reason: null }];
    const after: AttendanceRow[] = [{ player_id: "p-1", present: false, reason: "Médico" }];
    const diff = diffAttendance(before, after);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([{ before: before[0], after: after[0] }]);
  });
});
