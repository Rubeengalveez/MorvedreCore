import { describe, expect, it } from "vitest";
import { canRosterPlayer, defaultTeamColor, defaultTeamGender } from "@/lib/domain/teams";
import {
  CATEGORY_COLORS,
  CATEGORY_DEFAULT_GENDER,
  type CategoryCode,
  type TeamGender,
} from "@/lib/domain/categories";

const CURRENT_YEAR = 2026;
const BENJAMIN_BIRTH = 2015;
const ALEVIN_BIRTH = 2013;
const INFANTIL_BIRTH = 2011;
const CADETE_BIRTH = 2009;
const JUVENIL_BIRTH = 2007;
const ABSOLUTO_BIRTH = 2001;

const ALL_CATEGORIES: readonly CategoryCode[] = [
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "absoluto",
  "escuela",
];

const ALL_GENDERS: readonly TeamGender[] = ["male", "female", "mixed"];

describe("canRosterPlayer", () => {
  it("allows a benjamin player in a benjamin team", () => {
    expect(canRosterPlayer(BENJAMIN_BIRTH, "benjamin", CURRENT_YEAR)).toBe(true);
  });

  it("allows a benjamin player in an alevin team (N+1)", () => {
    expect(canRosterPlayer(BENJAMIN_BIRTH, "alevin", CURRENT_YEAR)).toBe(true);
  });

  it("rejects a benjamin player in a cadete team (N+3)", () => {
    expect(canRosterPlayer(BENJAMIN_BIRTH, "cadete", CURRENT_YEAR)).toBe(false);
  });

  it("rejects a cadete player in a benjamin team", () => {
    expect(canRosterPlayer(CADETE_BIRTH, "benjamin", CURRENT_YEAR)).toBe(false);
  });

  it("allows a cadete player in a juvenil team (N+1)", () => {
    expect(canRosterPlayer(CADETE_BIRTH, "juvenil", CURRENT_YEAR)).toBe(true);
  });

  it("rejects a cadete player in an absoluto team (N+2)", () => {
    expect(canRosterPlayer(CADETE_BIRTH, "absoluto", CURRENT_YEAR)).toBe(false);
  });

  it("rejects an alevin player in a benjamin team", () => {
    expect(canRosterPlayer(ALEVIN_BIRTH, "benjamin", CURRENT_YEAR)).toBe(false);
  });

  it("rejects an alevin player in a cadete team (N+2)", () => {
    expect(canRosterPlayer(ALEVIN_BIRTH, "cadete", CURRENT_YEAR)).toBe(false);
  });

  it("allows an infantil player only in infantil and cadete teams", () => {
    expect(canRosterPlayer(INFANTIL_BIRTH, "benjamin", CURRENT_YEAR)).toBe(false);
    expect(canRosterPlayer(INFANTIL_BIRTH, "alevin", CURRENT_YEAR)).toBe(false);
    expect(canRosterPlayer(INFANTIL_BIRTH, "infantil", CURRENT_YEAR)).toBe(true);
    expect(canRosterPlayer(INFANTIL_BIRTH, "cadete", CURRENT_YEAR)).toBe(true);
  });

  it("rejects an infantil player in a juvenil team (N+2)", () => {
    expect(canRosterPlayer(INFANTIL_BIRTH, "juvenil", CURRENT_YEAR)).toBe(false);
  });

  it("rejects a juvenil player in a benjamin team", () => {
    expect(canRosterPlayer(JUVENIL_BIRTH, "benjamin", CURRENT_YEAR)).toBe(false);
  });

  it("allows a juvenil player in an absoluto team (N+1)", () => {
    expect(canRosterPlayer(JUVENIL_BIRTH, "absoluto", CURRENT_YEAR)).toBe(true);
  });

  it("allows an absoluto player only in absoluto", () => {
    expect(canRosterPlayer(ABSOLUTO_BIRTH, "absoluto", CURRENT_YEAR)).toBe(true);
    expect(canRosterPlayer(ABSOLUTO_BIRTH, "benjamin", CURRENT_YEAR)).toBe(false);
  });

  it("allows any player in an escuela team", () => {
    for (const birth of [
      BENJAMIN_BIRTH,
      ALEVIN_BIRTH,
      CADETE_BIRTH,
      JUVENIL_BIRTH,
      ABSOLUTO_BIRTH,
    ]) {
      expect(canRosterPlayer(birth, "escuela", CURRENT_YEAR)).toBe(true);
    }
  });
});

describe("defaultTeamColor", () => {
  it("returns the documented color for every category", () => {
    for (const category of ALL_CATEGORIES) {
      expect(defaultTeamColor(category)).toBe(CATEGORY_COLORS[category]);
    }
  });

  it("matches the expected hex for the main competitive categories", () => {
    expect(defaultTeamColor("benjamin")).toBe("#10B981");
    expect(defaultTeamColor("cadete")).toBe("#1E5AA8");
    expect(defaultTeamColor("absoluto")).toBe("#0F172A");
  });
});

describe("defaultTeamGender", () => {
  it("returns the documented gender for every category", () => {
    for (const category of ALL_CATEGORIES) {
      expect(defaultTeamGender(category)).toBe(CATEGORY_DEFAULT_GENDER[category]);
    }
  });

  it("uses mixed for the school-age categories", () => {
    expect(defaultTeamGender("benjamin")).toBe("mixed");
    expect(defaultTeamGender("alevin")).toBe("mixed");
    expect(defaultTeamGender("infantil")).toBe("mixed");
  });

  it("uses male for the older competitive categories", () => {
    expect(defaultTeamGender("cadete")).toBe("male");
    expect(defaultTeamGender("juvenil")).toBe("male");
    expect(defaultTeamGender("absoluto")).toBe("male");
  });

  it("only returns one of the three valid genders", () => {
    for (const category of ALL_CATEGORIES) {
      expect(ALL_GENDERS).toContain(defaultTeamGender(category));
    }
  });
});
