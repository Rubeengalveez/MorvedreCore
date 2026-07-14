import { describe, expect, it } from "vitest";
import {
  ageIndex,
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
  it("returns benjamin when age is 11 or less", () => {
    expect(inferCategory(2015, 2026)).toBe("benjamin");
    expect(inferCategory(2026, 2026)).toBe("benjamin");
  });

  it("returns alevin for ages 12 and 13", () => {
    expect(inferCategory(2014, 2026)).toBe("alevin");
    expect(inferCategory(2013, 2026)).toBe("alevin");
  });

  it("returns infantil for ages 14 and 15", () => {
    expect(inferCategory(2012, 2026)).toBe("infantil");
    expect(inferCategory(2011, 2026)).toBe("infantil");
  });

  it("returns cadete for ages 16 and 17", () => {
    expect(inferCategory(2010, 2026)).toBe("cadete");
    expect(inferCategory(2009, 2026)).toBe("cadete");
  });

  it("returns juvenil for ages 18 and 19", () => {
    expect(inferCategory(2008, 2026)).toBe("juvenil");
    expect(inferCategory(2007, 2026)).toBe("juvenil");
  });

  it("returns absoluto for ages 20 and above", () => {
    expect(inferCategory(2006, 2026)).toBe("absoluto");
    expect(inferCategory(2001, 2026)).toBe("absoluto");
  });

  it("treats the boundary correctly: age 11 is benjamin, age 12 is alevin", () => {
    expect(inferCategory(2015, 2026)).toBe("benjamin");
    expect(inferCategory(2014, 2026)).toBe("alevin");
  });

  it("throws when birthYear is in the future", () => {
    expect(() => inferCategory(2027, 2026)).toThrow();
  });

  it("keeps adult players in the absolute category regardless of age", () => {
    expect(inferCategory(1990, 2026)).toBe("absoluto");
    expect(inferCategory(1950, 2026)).toBe("absoluto");
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
