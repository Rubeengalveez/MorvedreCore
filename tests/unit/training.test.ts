import { describe, expect, it } from "vitest";
import {
  durationMinutes,
  generateSessionsFromBlock,
  nextSessionDate,
  sessionsOverlap,
  weekdayMatches,
  type TrainingBlock,
  type TrainingSession,
} from "@/lib/domain/training";

function makeBlock(overrides: Partial<TrainingBlock> = {}): TrainingBlock {
  return {
    id: "block-1",
    team_id: "team-1",
    label: "Pretemporada Q1",
    weekdays: [1, 3, 5],
    start_date: "2026-09-07",
    end_date: "2026-09-11",
    start_time: "17:00",
    end_time: "18:30",
    location: "Piscina Municipal",
    kind: "water",
    ...overrides,
  };
}

describe("weekdayMatches", () => {
  it("matches Monday 2026-09-07 with weekday 1", () => {
    expect(weekdayMatches(1, "2026-09-07")).toBe(true);
  });

  it("matches Wednesday 2026-09-09 with weekday 3", () => {
    expect(weekdayMatches(3, "2026-09-09")).toBe(true);
  });

  it("matches Friday 2026-09-11 with weekday 5", () => {
    expect(weekdayMatches(5, "2026-09-11")).toBe(true);
  });

  it("matches Sunday 2026-09-13 with weekday 7", () => {
    expect(weekdayMatches(7, "2026-09-13")).toBe(true);
  });

  it("does not match Monday with weekday 2 (Tuesday)", () => {
    expect(weekdayMatches(2, "2026-09-07")).toBe(false);
  });

  it("accepts Date objects", () => {
    const monday = new Date(2026, 8, 7);
    expect(weekdayMatches(1, monday)).toBe(true);
    expect(weekdayMatches(2, monday)).toBe(false);
  });
});

describe("durationMinutes", () => {
  it("computes the difference for common pairs", () => {
    expect(durationMinutes("17:00", "18:30")).toBe(90);
    expect(durationMinutes("09:00", "10:00")).toBe(60);
    expect(durationMinutes("19:00", "21:00")).toBe(120);
    expect(durationMinutes("16:30", "17:00")).toBe(30);
  });

  it("handles a zero-duration session", () => {
    expect(durationMinutes("18:00", "18:00")).toBe(0);
  });

  it("handles end before start by adding 24h (overnight)", () => {
    expect(durationMinutes("22:00", "06:00")).toBe(480);
  });
});

describe("generateSessionsFromBlock", () => {
  it("generates 5 sessions for a Mon-Fri block in one week", () => {
    const block = makeBlock({ weekdays: [1, 2, 3, 4, 5] });
    const sessions = generateSessionsFromBlock(block);
    expect(sessions).toHaveLength(5);
  });

  it("generates 6 sessions for Mon-Wed-Fri across 2 weeks", () => {
    const block = makeBlock({
      start_date: "2026-09-07",
      end_date: "2026-09-18",
      weekdays: [1, 3, 5],
    });
    const sessions = generateSessionsFromBlock(block);
    expect(sessions).toHaveLength(6);
    expect(sessions.map((s) => s.scheduled_date)).toEqual([
      "2026-09-07",
      "2026-09-09",
      "2026-09-11",
      "2026-09-14",
      "2026-09-16",
      "2026-09-18",
    ]);
  });

  it("generates sessions only on weekends when weekdays is [6, 7]", () => {
    const block = makeBlock({
      start_date: "2026-09-07",
      end_date: "2026-09-13",
      weekdays: [6, 7],
    });
    const sessions = generateSessionsFromBlock(block);
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.scheduled_date)).toEqual(["2026-09-12", "2026-09-13"]);
  });

  it("excludes dates listed in skipDates", () => {
    const block = makeBlock({ weekdays: [1, 3, 5] });
    const sessions = generateSessionsFromBlock(block, { skipDates: ["2026-09-09"] });
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.scheduled_date)).toEqual(["2026-09-07", "2026-09-11"]);
  });

  it("preserves start_time and end_time in the datetimes", () => {
    const block = makeBlock({ start_time: "16:30", end_time: "18:00", weekdays: [1] });
    const sessions = generateSessionsFromBlock(block);
    expect(sessions).toHaveLength(1);
    const s = sessions[0]!;
    const startLocal = new Date(s.start_datetime);
    const endLocal = new Date(s.end_datetime);
    expect(startLocal.getHours()).toBe(16);
    expect(startLocal.getMinutes()).toBe(30);
    expect(endLocal.getHours()).toBe(18);
    expect(endLocal.getMinutes()).toBe(0);
    expect(s.duration_minutes).toBe(90);
  });

  it("sorts sessions ascending by start_datetime", () => {
    const block = makeBlock({ weekdays: [1, 3, 5] });
    const sessions = generateSessionsFromBlock(block);
    for (let i = 1; i < sessions.length; i++) {
      expect(sessions[i]!.start_datetime >= sessions[i - 1]!.start_datetime).toBe(true);
    }
  });

  it("returns an empty array when weekdays is empty", () => {
    const block = makeBlock({ weekdays: [] });
    expect(generateSessionsFromBlock(block)).toEqual([]);
  });

  it("returns an empty array when end_date is before start_date", () => {
    const block = makeBlock({ start_date: "2026-09-15", end_date: "2026-09-01" });
    expect(generateSessionsFromBlock(block)).toEqual([]);
  });

  it("includes block_id, team_id, location, and kind in every session", () => {
    const block = makeBlock({ weekdays: [1] });
    const [session] = generateSessionsFromBlock(block);
    expect(session).toBeDefined();
    expect(session!.block_id).toBe("block-1");
    expect(session!.team_id).toBe("team-1");
    expect(session!.location).toBe("Piscina Municipal");
    expect(session!.kind).toBe("water");
  });

  it("produces a single session when start_date equals end_date and weekday matches", () => {
    const block = makeBlock({
      start_date: "2026-09-09",
      end_date: "2026-09-09",
      weekdays: [1, 3, 5],
    });
    const sessions = generateSessionsFromBlock(block);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.scheduled_date).toBe("2026-09-09");
  });
});

describe("nextSessionDate", () => {
  it("returns the next valid weekday after the given date", () => {
    const block = makeBlock({ weekdays: [1, 3, 5] });
    const result = nextSessionDate(block, new Date(2026, 8, 6));
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(8);
    expect(result!.getDate()).toBe(7);
  });

  it("skips days that do not match weekdays", () => {
    const block = makeBlock({ weekdays: [3] });
    const result = nextSessionDate(block, new Date(2026, 8, 7));
    expect(result).not.toBeNull();
    expect(result!.getDate()).toBe(9);
  });

  it("returns null when no more sessions fall after the given date", () => {
    const block = makeBlock({
      start_date: "2026-09-07",
      end_date: "2026-09-11",
      weekdays: [1, 3, 5],
    });
    const result = nextSessionDate(block, new Date(2026, 8, 12));
    expect(result).toBeNull();
  });

  it("returns null when weekdays is empty", () => {
    const block = makeBlock({ weekdays: [] });
    expect(nextSessionDate(block, new Date(2026, 8, 6))).toBeNull();
  });
});

describe("sessionsOverlap", () => {
  function session(overrides: Partial<TrainingSession>): TrainingSession {
    return {
      id: "id",
      block_id: "block-1",
      team_id: "team-1",
      scheduled_at: "2026-09-09T17:00:00.000Z",
      duration_minutes: 90,
      location: null,
      cancelled: false,
      ...overrides,
    };
  }

  it("detects overlap when sessions share any time range", () => {
    const a = session({ scheduled_at: "2026-09-09T17:00:00.000Z", duration_minutes: 90 });
    const b = session({ scheduled_at: "2026-09-09T18:00:00.000Z", duration_minutes: 90 });
    expect(sessionsOverlap(a, b)).toBe(true);
  });

  it("returns false for back-to-back sessions touching at the boundary", () => {
    const a = session({ scheduled_at: "2026-09-09T17:00:00.000Z", duration_minutes: 60 });
    const b = session({ scheduled_at: "2026-09-09T18:00:00.000Z", duration_minutes: 60 });
    expect(sessionsOverlap(a, b)).toBe(false);
  });

  it("returns false for sessions on different days", () => {
    const a = session({ scheduled_at: "2026-09-09T17:00:00.000Z", duration_minutes: 90 });
    const b = session({ scheduled_at: "2026-09-10T17:00:00.000Z", duration_minutes: 90 });
    expect(sessionsOverlap(a, b)).toBe(false);
  });

  it("returns true when one session fully contains the other", () => {
    const a = session({ scheduled_at: "2026-09-09T17:00:00.000Z", duration_minutes: 180 });
    const b = session({ scheduled_at: "2026-09-09T18:00:00.000Z", duration_minutes: 30 });
    expect(sessionsOverlap(a, b)).toBe(true);
  });
});
