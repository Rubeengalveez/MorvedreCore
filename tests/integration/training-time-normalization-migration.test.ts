import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260713165557_normalize_training_session_times.sql"),
  "utf8",
).toLowerCase();

describe("training time normalization migration", () => {
  it("uses the club timezone and the configured block time", () => {
    expect(sql).toContain("block.start_time");
    expect(sql).toContain("at time zone 'europe/madrid'");
  });

  it("removes impossible future attendance rows", () => {
    expect(sql).toContain("delete from public.training_attendance");
    expect(sql).toContain("session.scheduled_at > now()");
  });
});
