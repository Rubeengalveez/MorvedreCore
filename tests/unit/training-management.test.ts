import { describe, expect, it } from "vitest";
import {
  trainingPlanSchema,
  trainingChangeSchema,
  trainingDateTime,
  trainingDay,
  previewTrainingDates,
  trainingKind,
  groupTrainings,
  trainingBreakRanges,
} from "@/lib/domain/training-management";
import { computePlayerStats } from "@/lib/domain/stats";

const team = "550e8400-e29b-41d4-a716-446655440001";
const base = {
  mode: "weekly",
  team_ids: [team],
  kind: "water",
  start_date: "2026-10-19",
  end_date: "2026-10-30",
  slots: [{ weekdays: [1, 3, 5], start_time: "18:00", end_time: "19:30" }],
};
describe("training management", () => {
  it("groups separate holiday periods without duplicate dates", () => {
    expect(trainingBreakRanges(["2026-12-25", "2026-12-24", "2026-12-25", "2027-01-01"])).toEqual([
      { from: "2026-12-24", to: "2026-12-25" },
      { from: "2027-01-01", to: "2027-01-01" },
    ]);
  });
  it("keeps Madrid local times across the winter clock change", () => {
    expect(trainingDateTime("2026-10-23", "18:00")).toBe("2026-10-23T16:00:00.000Z");
    expect(trainingDateTime("2026-10-26", "18:00")).toBe("2026-10-26T17:00:00.000Z");
    expect(trainingDay("2026-10-26T23:30:00Z")).toBe("2026-10-27");
  });
  it("generates one joint occurrence per date, independent of the number of teams", () => {
    const plan = trainingPlanSchema.parse({
      ...base,
      team_ids: [team, "550e8400-e29b-41d4-a716-446655440002"],
    });
    expect(previewTrainingDates(plan)).toHaveLength(6);
  });
  it("omits holidays without shifting the weekly schedule", () => {
    const dates = previewTrainingDates(
      trainingPlanSchema.parse({ ...base, excluded_dates: ["2026-10-23", "2026-10-26"] }),
    );
    expect(dates).toHaveLength(4);
    expect(dates.some((date) => trainingDay(date.start_datetime) === "2026-10-26")).toBe(false);
  });
  it("allows a single day without asking for weekdays", () => {
    const dates = previewTrainingDates(
      trainingPlanSchema.parse({
        ...base,
        mode: "single",
        end_date: base.start_date,
        slots: [{ weekdays: [], start_time: "18:00", end_time: "19:30" }],
      }),
    );
    expect(dates).toHaveLength(1);
    expect(dates[0].duration_minutes).toBe(90);
  });
  it.each(["physical", "technical", "mixed", "school"])(
    "does not offer unsupported type %s",
    (kind) => {
      expect(trainingPlanSchema.safeParse({ ...base, kind }).success).toBe(false);
    },
  );
  it("maps legacy types without changing old attendance", () => {
    expect(trainingKind("mixed")).toBe("water");
    expect(trainingKind("physical")).toBe("dry");
  });
  it("rejects empty teams, empty players and invalid clock times", () => {
    for (const patch of [
      { team_ids: [] },
      { player_ids: [] },
      { slots: [{ weekdays: [1], start_time: "29:00", end_time: "30:00" }] },
      { slots: [{ weekdays: [], start_time: "18:00", end_time: "19:00" }] },
    ])
      expect(trainingPlanSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });
  it("rejects overlapping weekday slots while allowing disjoint days", () => {
    expect(
      trainingPlanSchema.safeParse({
        ...base,
        slots: [...base.slots, { weekdays: [1], start_time: "19:00", end_time: "20:00" }],
      }).success,
    ).toBe(false);
    expect(
      trainingPlanSchema.safeParse({
        ...base,
        slots: [...base.slots, { weekdays: [2], start_time: "19:00", end_time: "20:00" }],
      }).success,
    ).toBe(true);
  });
  it("bounds generation and requires cancellation reasons", () => {
    expect(trainingPlanSchema.safeParse({ ...base, end_date: "2030-10-30" }).success).toBe(false);
    expect(
      trainingChangeSchema.safeParse({ session_ids: [team], operation: "cancel" }).success,
    ).toBe(false);
    expect(
      trainingChangeSchema.safeParse({
        session_ids: [team],
        operation: "edit",
        start_time: "18:00",
        end_time: "18:01",
      }).success,
    ).toBe(false);
  });
  it("groups weekly slots for shared teams but keeps legacy blocks separate", () => {
    expect(
      groupTrainings(
        [
          { id: "1", series_id: "shared" },
          { id: "2", series_id: "shared" },
          { id: "3", series_id: null },
        ],
        "series_id",
      ),
    ).toHaveLength(2);
  });
  it("does not double count joint attendance or include another player's targeted session", () => {
    const rows = [
      {
        id: "1",
        team_id: "a",
        joint_id: "joint",
        scheduled_at: "2026-10-01T16:00:00Z",
        cancelled: false,
      },
      {
        id: "2",
        team_id: "b",
        joint_id: "joint",
        scheduled_at: "2026-10-01T16:00:00Z",
        cancelled: false,
      },
      {
        id: "3",
        team_id: "a",
        player_ids: ["other"],
        scheduled_at: "2026-10-02T16:00:00Z",
        cancelled: false,
      },
    ];
    const stats = computePlayerStats(
      "player",
      "season",
      rows,
      rows.map((s) => ({ session_id: s.id, player_id: "player", present: true })),
      [],
      [],
      [],
      "2026-10-03T00:00:00Z",
      ["a", "b"],
    );
    expect(stats.trainings_total).toBe(1);
    expect(stats.trainings_attended).toBe(1);
  });
});
