import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260714160150_prevent_future_day_attendance.sql"),
  "utf8",
).toLowerCase();

describe("future attendance migration", () => {
  it("removes attendance recorded for a later club day", () => {
    expect(sql).toContain("delete from public.training_attendance");
    expect(sql).toContain("session.scheduled_at at time zone 'europe/madrid'");
  });

  it("blocks inserts and updates for a later club day", () => {
    expect(sql).toContain("if session_date > (now() at time zone 'europe/madrid')::date then");
    expect(sql).toContain("la asistencia se habilita el día del entrenamiento");
  });

  it("keeps the integrity function private", () => {
    expect(sql).toContain("function private.enforce_training_attendance_integrity()");
    expect(sql).toContain(
      "revoke all on function private.enforce_training_attendance_integrity() from public, anon, authenticated",
    );
  });
});
