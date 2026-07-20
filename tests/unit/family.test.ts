import { describe, expect, it } from "vitest";

import {
  ageFromBirthYear,
  canViewPersonalFinances,
  requiresGuardianApproval,
} from "@/lib/domain/family";

const date = new Date("2026-07-20T12:00:00+02:00");

describe("family age rules", () => {
  it("requires guardian approval for underage profiles", () => {
    expect(requiresGuardianApproval(2010, date)).toBe(true);
    expect(canViewPersonalFinances(2010, date)).toBe(false);
  });

  it("lets adult profiles order and see finances directly", () => {
    expect(requiresGuardianApproval(2008, date)).toBe(false);
    expect(canViewPersonalFinances(2008, date)).toBe(true);
  });

  it("treats an unknown age conservatively", () => {
    expect(requiresGuardianApproval(null, date)).toBe(true);
    expect(canViewPersonalFinances(null, date)).toBe(false);
    expect(ageFromBirthYear(null, date)).toBeNull();
  });
});
