import { describe, expect, it } from "vitest";

import {
  addDaysIso,
  addMonths,
  currentYearMonth,
  daysInMonth,
  formatLongDate,
  formatShortDate,
  formatTimeOfDay,
  formatTimeRangeFromDuration,
  getMonthCells,
  getNext30Days,
  isoDateFromDate,
  isoDateFromYMD,
  isSameLocalDay,
  monthLabel,
  timeAgo,
  todayIso,
  weekdayMonFirst,
} from "@/lib/domain/calendar";

describe("isoDateFromYMD", () => {
  it("pads month and day with two digits", () => {
    expect(isoDateFromYMD(2026, 0, 5)).toBe("2026-01-05");
    expect(isoDateFromYMD(2026, 11, 31)).toBe("2026-12-31");
  });
});

describe("isoDateFromDate", () => {
  it("formats a Date as YYYY-MM-DD using local time", () => {
    const d = new Date(2026, 5, 15);
    expect(isoDateFromDate(d)).toBe("2026-06-15");
  });
});

describe("weekdayMonFirst", () => {
  it("returns 1 for Monday", () => {
    expect(weekdayMonFirst(new Date(2026, 0, 5))).toBe(1);
  });

  it("returns 7 for Sunday", () => {
    expect(weekdayMonFirst(new Date(2026, 0, 4))).toBe(7);
  });
});

describe("daysInMonth", () => {
  it("returns 31 for January", () => {
    expect(daysInMonth(2026, 0)).toBe(31);
  });

  it("returns 28 for February in a non-leap year", () => {
    expect(daysInMonth(2025, 1)).toBe(28);
  });

  it("returns 29 for February in a leap year", () => {
    expect(daysInMonth(2024, 1)).toBe(29);
  });
});

describe("getMonthCells", () => {
  it("returns exactly 42 cells", () => {
    const cells = getMonthCells(2026, 0);
    expect(cells).toHaveLength(42);
  });

  it("marks inMonth correctly for the requested month", () => {
    const cells = getMonthCells(2026, 0);
    const inMonth = cells.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0]?.day).toBe(1);
    expect(inMonth[inMonth.length - 1]?.day).toBe(31);
  });

  it("starts the grid on Monday", () => {
    const cells = getMonthCells(2026, 0);
    expect(cells[0]?.weekdayMonFirst).toBe(1);
  });

  it("emits valid ISO dates for every cell", () => {
    const cells = getMonthCells(2026, 0);
    for (const c of cells) {
      expect(c.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("getNext30Days", () => {
  it("returns exactly 30 dates", () => {
    const from = new Date(2026, 0, 1);
    expect(getNext30Days(from)).toHaveLength(30);
  });

  it("starts on the provided date", () => {
    const from = new Date(2026, 0, 1);
    const days = getNext30Days(from);
    expect(days[0]?.toISOString()).toBe(new Date(2026, 0, 1).toISOString());
  });
});

describe("addMonths", () => {
  it("adds 1 month", () => {
    expect(addMonths({ year: 2026, month: 0 }, 1)).toEqual({
      year: 2026,
      month: 1,
    });
  });

  it("rolls over the year boundary", () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({
      year: 2027,
      month: 0,
    });
  });

  it("supports negative deltas", () => {
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({
      year: 2025,
      month: 11,
    });
  });
});

describe("addDaysIso", () => {
  it("adds days within the same month", () => {
    expect(addDaysIso("2026-06-15", 5)).toBe("2026-06-20");
  });

  it("rolls over the month boundary", () => {
    expect(addDaysIso("2026-06-28", 5)).toBe("2026-07-03");
  });

  it("supports negative deltas", () => {
    expect(addDaysIso("2026-01-05", -10)).toBe("2025-12-26");
  });
});

describe("formatTimeOfDay", () => {
  it("formats ISO time as HH:MM", () => {
    expect(formatTimeOfDay("2026-06-15T18:30:00Z")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns an em-dash for invalid input", () => {
    expect(formatTimeOfDay("not-a-date")).toBe("—");
  });
});

describe("formatTimeRangeFromDuration", () => {
  it("muestra de forma explícita la hora de inicio y de fin", () => {
    expect(formatTimeRangeFromDuration("2026-06-15T16:30:00Z", 90)).toBe("18:30–20:00");
  });

  it("conserva la hora de inicio si la duración no es válida", () => {
    expect(formatTimeRangeFromDuration("2026-06-15T16:30:00Z", 0)).toBe("18:30");
  });
});

describe("formatLongDate and formatShortDate", () => {
  it("returns a Spanish label for a valid date", () => {
    const out = formatLongDate("2026-06-15T12:00:00Z");
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toBe("—");
  });

  it("returns an em-dash for invalid input", () => {
    expect(formatLongDate("not-a-date")).toBe("—");
    expect(formatShortDate("not-a-date")).toBe("—");
  });
});

describe("timeAgo", () => {
  it("returns 'ahora mismo' for a very recent timestamp", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const out = timeAgo("2026-06-15T12:00:00Z", now);
    expect(out).toBe("ahora mismo");
  });

  it("returns 'hace N min' for a few minutes ago", () => {
    const now = new Date("2026-06-15T12:05:00Z");
    expect(timeAgo("2026-06-15T12:00:00Z", now)).toBe("hace 5 min");
  });

  it("returns 'hace N h' for hours", () => {
    const now = new Date("2026-06-15T15:00:00Z");
    expect(timeAgo("2026-06-15T12:00:00Z", now)).toBe("hace 3 h");
  });

  it("returns 'hace N d' for days", () => {
    const now = new Date("2026-06-18T12:00:00Z");
    expect(timeAgo("2026-06-15T12:00:00Z", now)).toBe("hace 3 d");
  });

  it("returns an em-dash for invalid input", () => {
    expect(timeAgo("not-a-date")).toBe("—");
  });
});

describe("isSameLocalDay", () => {
  it("returns true for the same day", () => {
    const a = new Date(2026, 0, 1, 8, 0, 0);
    const b = new Date(2026, 0, 1, 22, 0, 0);
    expect(isSameLocalDay(a, b)).toBe(true);
  });

  it("returns false for different days", () => {
    const a = new Date(2026, 0, 1);
    const b = new Date(2026, 0, 2);
    expect(isSameLocalDay(a, b)).toBe(false);
  });
});

describe("monthLabel", () => {
  it("returns a Spanish month name plus the year", () => {
    expect(monthLabel({ year: 2026, month: 0 })).toBe("Enero 2026");
    expect(monthLabel({ year: 2026, month: 11 })).toBe("Diciembre 2026");
  });
});

describe("todayIso", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("currentYearMonth", () => {
  it("returns a valid YearMonth for the current date", () => {
    const ym = currentYearMonth();
    const d = new Date();
    expect(ym.year).toBe(d.getFullYear());
    expect(ym.month).toBe(d.getMonth());
  });
});
