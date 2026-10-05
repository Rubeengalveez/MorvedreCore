import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(join(process.cwd(), "server/queries/admin-trainings.ts"), "utf8");

describe("admin training query scope", () => {
  it("loads one-off sessions and bounds the date range by permitted teams", () => {
    expect(pageSource).toContain('.in("team_id", managedTeamIds)');
    expect(pageSource).toContain("getTrainingSessionsInRange");
    expect(
      readFileSync(join(process.cwd(), "server/queries/training-sessions.ts"), "utf8"),
    ).toContain('.gte("scheduled_at", from)');
    expect(pageSource).not.toContain('.in("block_id"');
    expect(pageSource).not.toContain('.from("training_attendance")');
  });
});
