import { describe, expect, it } from "vitest";

import {
  MOTIVATIONAL_STREAK_TYPES,
  isMotivationalStreakType,
} from "@/lib/domain/streak-presentation";

describe("streak presentation", () => {
  it("promotes only positive player challenges", () => {
    expect(MOTIVATIONAL_STREAK_TYPES).toEqual(["goals_consec", "mvp_consec"]);
    expect(isMotivationalStreakType("excl_consec")).toBe(false);
  });

  it("rejects unknown URL values", () => {
    expect(isMotivationalStreakType("goals_consec")).toBe(true);
    expect(isMotivationalStreakType("train_consec")).toBe(false);
    expect(isMotivationalStreakType("anything")).toBe(false);
    expect(isMotivationalStreakType(undefined)).toBe(false);
  });
});
