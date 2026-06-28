import { describe, expect, it } from "vitest";
import {
  applyStreak,
  emptyStreak,
  exclConsecEvents,
  goalsConsecEvents,
  mvpConsecEvents,
  trainConsecEvents,
  winsConsecEvents,
  type StreakRecord,
} from "@/lib/domain/streaks";

function at(daysAgo: number, hour = 18): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe("applyStreak", () => {
  it("starts at zero", () => {
    const r = applyStreak(emptyStreak(), [], at(0));
    expect(r.current_value).toBe(0);
    expect(r.best_value).toBe(0);
  });

  it("counts consecutive passes and updates best", () => {
    const r = applyStreak(
      emptyStreak(),
      [
        { occurred_at: at(5), pass: true },
        { occurred_at: at(4), pass: true },
        { occurred_at: at(3), pass: true },
      ],
      at(0),
    );
    expect(r.current_value).toBe(3);
    expect(r.best_value).toBe(3);
    expect(r.best_at).toBe(at(3));
  });

  it("resets on a fail", () => {
    const r = applyStreak(
      emptyStreak(),
      [
        { occurred_at: at(5), pass: true },
        { occurred_at: at(4), pass: true },
        { occurred_at: at(3), pass: false },
        { occurred_at: at(2), pass: true },
      ],
      at(0),
    );
    expect(r.current_value).toBe(1);
    expect(r.best_value).toBe(2);
  });

  it("preserves best when no new pass exceeds it", () => {
    const prev: StreakRecord = {
      current_value: 1,
      best_value: 5,
      best_at: at(10),
      last_event_at: at(1),
    };
    const r = applyStreak(
      prev,
      [
        { occurred_at: at(2), pass: false },
        { occurred_at: at(1), pass: false },
      ],
      at(0),
    );
    expect(r.best_value).toBe(5);
    expect(r.best_at).toBe(at(10));
  });
});

describe("goalsConsecEvents", () => {
  it("pass when goals >= 1", () => {
    const evs = goalsConsecEvents([
      { match_id: "m1", scheduled_at: at(3), goals: 0 },
      { match_id: "m2", scheduled_at: at(2), goals: 2 },
      { match_id: "m3", scheduled_at: at(1), goals: 1 },
    ]);
    expect(evs[0]?.pass).toBe(false);
    expect(evs[1]?.pass).toBe(true);
    expect(evs[2]?.pass).toBe(true);
  });
});

describe("exclConsecEvents", () => {
  it("pass when exclusions >= 1", () => {
    const evs = exclConsecEvents([
      { match_id: "m1", scheduled_at: at(2), exclusions: 0 },
      { match_id: "m2", scheduled_at: at(1), exclusions: 1 },
    ]);
    expect(evs[0]?.pass).toBe(false);
    expect(evs[1]?.pass).toBe(true);
  });
});

describe("trainConsecEvents", () => {
  it("ignores cancelled sessions", () => {
    const evs = trainConsecEvents(
      [
        { id: "s1", scheduled_at: at(3), cancelled: true },
        { id: "s2", scheduled_at: at(2), cancelled: false },
        { id: "s3", scheduled_at: at(1), cancelled: false },
      ],
      [
        { session_id: "s1", present: true },
        { session_id: "s2", present: true },
        { session_id: "s3", present: false },
      ],
    );
    expect(evs).toHaveLength(2);
    expect(evs[0]?.pass).toBe(true);
    expect(evs[1]?.pass).toBe(false);
  });
});

describe("mvpConsecEvents", () => {
  it("passes when player is the MVP of the match", () => {
    const evs = mvpConsecEvents(
      [
        { id: "m1", scheduled_at: at(3), mvp_player_id: "p1" },
        { id: "m2", scheduled_at: at(2), mvp_player_id: "p2" },
        { id: "m3", scheduled_at: at(1), mvp_player_id: "p1" },
      ],
      "p1",
    );
    expect(evs[0]?.pass).toBe(true);
    expect(evs[1]?.pass).toBe(false);
    expect(evs[2]?.pass).toBe(true);
  });
});

describe("winsConsecEvents", () => {
  it("only counts played matches with a higher us score", () => {
    const evs = winsConsecEvents([
      { id: "m1", scheduled_at: at(3), status: "played", final_score_us: 10, final_score_them: 5 },
      { id: "m2", scheduled_at: at(2), status: "played", final_score_us: 8, final_score_them: 9 },
      { id: "m3", scheduled_at: at(1), status: "scheduled", final_score_us: null, final_score_them: null },
      { id: "m4", scheduled_at: at(0), status: "played", final_score_us: 12, final_score_them: 11 },
    ]);
    expect(evs).toHaveLength(3);
    expect(evs[0]?.pass).toBe(true);
    expect(evs[1]?.pass).toBe(false);
    expect(evs[2]?.pass).toBe(true);
  });
});
