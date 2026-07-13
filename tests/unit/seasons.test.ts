import { describe, expect, it } from "vitest";
import {
  inferSeasonForDate,
  seasonContainsDate,
  formatSeasonLabel,
  currentSeasonStart,
  currentSeasonEnd,
  nextSeasonDraft,
} from "@/lib/domain/seasons";

describe("inferSeasonForDate", () => {
  it("places mid-June in the season that started the previous September", () => {
    const season = inferSeasonForDate(new Date(2026, 5, 15));
    expect(season.label).toBe("2025/2026");
    expect(season.start).toEqual(new Date(2025, 8, 1));
    expect(season.end).toEqual(new Date(2026, 6, 31));
  });

  it("places September 1st in the new season that just started", () => {
    const season = inferSeasonForDate(new Date(2026, 8, 1));
    expect(season.label).toBe("2026/2027");
    expect(season.start).toEqual(new Date(2026, 8, 1));
    expect(season.end).toEqual(new Date(2027, 6, 31));
  });

  it("places mid-January in the season that started the previous September", () => {
    const season = inferSeasonForDate(new Date(2026, 0, 15));
    expect(season.label).toBe("2025/2026");
    expect(season.start).toEqual(new Date(2025, 8, 1));
    expect(season.end).toEqual(new Date(2026, 6, 31));
  });

  it("places the end of July in the season that started the previous September", () => {
    const season = inferSeasonForDate(new Date(2026, 6, 31));
    expect(season.label).toBe("2025/2026");
  });

  it("places August 1st in the season that just ended", () => {
    const season = inferSeasonForDate(new Date(2026, 7, 1));
    expect(season.label).toBe("2025/2026");
  });
});

describe("seasonContainsDate", () => {
  const start = new Date(2025, 8, 1);
  const end = new Date(2026, 6, 31);

  it("returns true for a date inside the season", () => {
    expect(seasonContainsDate(start, end, new Date(2025, 11, 15))).toBe(true);
  });

  it("returns true for the first day of the season", () => {
    expect(seasonContainsDate(start, end, new Date(2025, 8, 1))).toBe(true);
  });

  it("returns true for the last day of the season", () => {
    expect(seasonContainsDate(start, end, new Date(2026, 6, 31))).toBe(true);
  });

  it("returns false for a date before the season starts", () => {
    expect(seasonContainsDate(start, end, new Date(2025, 7, 31))).toBe(false);
  });

  it("returns false for a date after the season ends", () => {
    expect(seasonContainsDate(start, end, new Date(2026, 7, 1))).toBe(false);
  });
});

describe("formatSeasonLabel", () => {
  it("combines the start and end years with a slash", () => {
    expect(formatSeasonLabel(new Date(2025, 8, 1), new Date(2026, 6, 31))).toBe("2025/2026");
    expect(formatSeasonLabel(new Date(2026, 8, 1), new Date(2027, 6, 31))).toBe("2026/2027");
  });
});

describe("currentSeasonStart", () => {
  it("returns September 1st of the same year for September or later", () => {
    expect(currentSeasonStart(2026, 8)).toEqual(new Date(2026, 8, 1));
    expect(currentSeasonStart(2026, 9)).toEqual(new Date(2026, 8, 1));
    expect(currentSeasonStart(2026, 11)).toEqual(new Date(2026, 8, 1));
  });

  it("returns September 1st of the previous year for August or earlier", () => {
    expect(currentSeasonStart(2026, 0)).toEqual(new Date(2025, 8, 1));
    expect(currentSeasonStart(2026, 5)).toEqual(new Date(2025, 8, 1));
    expect(currentSeasonStart(2026, 7)).toEqual(new Date(2025, 8, 1));
  });
});

describe("currentSeasonEnd", () => {
  it("returns July 31st of the next year for September or later", () => {
    expect(currentSeasonEnd(2026, 8)).toEqual(new Date(2027, 6, 31));
    expect(currentSeasonEnd(2026, 11)).toEqual(new Date(2027, 6, 31));
  });

  it("returns July 31st of the same year for August or earlier", () => {
    expect(currentSeasonEnd(2026, 0)).toEqual(new Date(2026, 6, 31));
    expect(currentSeasonEnd(2026, 5)).toEqual(new Date(2026, 6, 31));
    expect(currentSeasonEnd(2026, 7)).toEqual(new Date(2026, 6, 31));
  });
});

describe("nextSeasonDraft", () => {
  it("moves both dates one year and builds the next label", () => {
    expect(nextSeasonDraft({ start_date: "2025-09-01", end_date: "2026-07-31" })).toEqual({
      label: "2026/2027",
      start_date: "2026-09-01",
      end_date: "2027-07-31",
    });
  });
});
