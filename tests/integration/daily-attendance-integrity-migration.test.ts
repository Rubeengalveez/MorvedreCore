import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260713164411_daily_attendance_integrity.sql"),
  "utf8",
).toLowerCase();

describe("daily attendance integrity migration", () => {
  it("requires every attendance player to belong to the session roster", () => {
    expect(sql).toContain("create trigger training_attendance_enforce_integrity");
    expect(sql).toContain("team_rosters.player_id = new.player_id");
    expect(sql).toContain("team_rosters.joined_at <= session_date");
  });

  it("records the authenticated profile as the marker", () => {
    expect(sql).toContain("new.marked_by := actor_id");
    expect(sql).toContain("new.marked_at := now()");
  });

  it("limits absence reasons at database level", () => {
    expect(sql).toContain("training_attendance_reason_length_check");
    expect(sql).toContain("char_length(reason) <= 500");
  });

  it("does not expose the trigger function as an RPC", () => {
    expect(sql).toContain(
      "revoke all on function public.enforce_training_attendance_integrity() from public, anon, authenticated",
    );
  });
});
