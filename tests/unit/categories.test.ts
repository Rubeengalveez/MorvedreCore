import { describe, expect, it } from "vitest";
import {
  ageIndex,
  calendarSeasonStartYear,
  inferCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type CategoryCode,
} from "@/lib/domain/categories";

const ALL_CODES: readonly CategoryCode[] = [
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "absoluto",
  "escuela",
];

describe("ageIndex", () => {
  it("returns the difference in years", () => {
    expect(ageIndex(2010, 2026)).toBe(16);
    expect(ageIndex(2015, 2026)).toBe(11);
    expect(ageIndex(2015, 2015)).toBe(0);
  });

  it("handles older players", () => {
    expect(ageIndex(2001, 2026)).toBe(25);
  });
});

describe("inferCategory", () => {
  it.each([
    [2016, "benjamin"],
    [2015, "alevin"],
    [2014, "alevin"],
    [2013, "infantil"],
    [2012, "infantil"],
    [2011, "cadete"],
    [2010, "cadete"],
    [2009, "juvenil"],
    [2008, "juvenil"],
    [2007, "absoluto"],
    [1950, "absoluto"],
  ] as const)(
    "clasifica %i en %s durante 2025/2026 y desplaza la siguiente temporada",
    (birth, category) => {
      expect(inferCategory(birth, 2025)).toBe(category);
      expect(inferCategory(birth + 1, 2026)).toBe(category);
    },
  );
  it("rechaza años futuros", () => {
    expect(() => inferCategory(2027, 2026)).toThrow();
  });
});

describe("calendarSeasonStartYear", () => {
  it("mantiene la temporada hasta agosto y cambia en septiembre", () => {
    expect(calendarSeasonStartYear(new Date(2026, 0, 1))).toBe(2025);
    expect(calendarSeasonStartYear(new Date(2026, 7, 31))).toBe(2025);
    expect(calendarSeasonStartYear(new Date(2026, 8, 1))).toBe(2026);
  });
});

describe("CATEGORY_LABELS", () => {
  it("has a Spanish label for every CategoryCode", () => {
    for (const code of ALL_CODES) {
      expect(CATEGORY_LABELS[code]).toBeTruthy();
      expect(typeof CATEGORY_LABELS[code]).toBe("string");
    }
  });

  it("uses accented Spanish labels for the common categories", () => {
    expect(CATEGORY_LABELS.benjamin).toBe("Benjamín");
    expect(CATEGORY_LABELS.alevin).toBe("Alevín");
    expect(CATEGORY_LABELS.absoluto).toBe("Absoluto");
  });
});

describe("CATEGORY_COLORS", () => {
  it("has a valid hex color for every CategoryCode", () => {
    for (const code of ALL_CODES) {
      expect(CATEGORY_COLORS[code]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("uses the documented palette for the main categories", () => {
    expect(CATEGORY_COLORS.benjamin).toBe("#10B981");
    expect(CATEGORY_COLORS.alevin).toBe("#F4C430");
    expect(CATEGORY_COLORS.infantil).toBe("#FF6B35");
    expect(CATEGORY_COLORS.cadete).toBe("#1E5AA8");
    expect(CATEGORY_COLORS.juvenil).toBe("#DC2626");
    expect(CATEGORY_COLORS.absoluto).toBe("#0F172A");
  });
});
