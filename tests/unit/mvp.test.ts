import { describe, expect, it } from "vitest";
import { computeMvp, type MvpCandidate } from "@/lib/domain/mvp";

describe("computeMvp", () => {
  it("returns empty when no candidates", () => {
    expect(computeMvp([]).player_ids).toEqual([]);
  });

  it("picks the top scorer when there is a single leader", () => {
    const c: MvpCandidate[] = [
      { player_id: "a", goals: 0, exclusions: 0 },
      { player_id: "b", goals: 3, exclusions: 1 },
      { player_id: "c", goals: 1, exclusions: 0 },
    ];
    expect(computeMvp(c)).toEqual({
      player_ids: ["b"],
      is_tie: false,
      reason: "most_goals",
    });
  });

  it("breaks tie by fewer exclusions", () => {
    const c: MvpCandidate[] = [
      { player_id: "a", goals: 5, exclusions: 2 },
      { player_id: "b", goals: 5, exclusions: 0 },
      { player_id: "c", goals: 5, exclusions: 1 },
    ];
    expect(computeMvp(c)).toEqual({
      player_ids: ["b"],
      is_tie: false,
      reason: "fewer_exclusions_after_tie",
    });
  });

  it("ties when both goals and exclusions are equal", () => {
    const c: MvpCandidate[] = [
      { player_id: "a", goals: 5, exclusions: 1 },
      { player_id: "b", goals: 5, exclusions: 1 },
    ];
    expect(computeMvp(c)).toEqual({
      player_ids: ["a", "b"],
      is_tie: true,
      reason: "tie_after_exclusions",
    });
  });

  it("returns empty if everyone has 0 goals", () => {
    const c: MvpCandidate[] = [
      { player_id: "a", goals: 0, exclusions: 0 },
      { player_id: "b", goals: 0, exclusions: 3 },
    ];
    expect(computeMvp(c).player_ids).toEqual([]);
  });

  it("handles a high-scorer game (e.g. 18 goals) without limits", () => {
    const c: MvpCandidate[] = [
      { player_id: "a", goals: 18, exclusions: 0 },
      { player_id: "b", goals: 12, exclusions: 1 },
    ];
    expect(computeMvp(c)).toEqual({
      player_ids: ["a"],
      is_tie: false,
      reason: "most_goals",
    });
  });

  it("max 3 exclusions rule is enforced by data, not by the function", () => {
    const c: MvpCandidate[] = [
      { player_id: "a", goals: 5, exclusions: 3 },
      { player_id: "b", goals: 5, exclusions: 3 },
    ];
    expect(computeMvp(c).is_tie).toBe(true);
  });
});
