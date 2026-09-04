import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

describe("Schedule Atomic Replacement & Audit Index Migration", () => {
  it("includes migration defining training_attendance_audit index and atomic RPC", () => {
    const migrationsDir = resolve(process.cwd(), "supabase/migrations");
    const files = readdirSync(migrationsDir);
    const migrationFile = files.find((f) => f.includes("audit_remediation_indexes_and_schedule"));

    expect(migrationFile).toBeDefined();
    const content = readFileSync(resolve(migrationsDir, migrationFile!), "utf8");

    expect(content).toContain("training_attendance_audit_changed_by_idx");
    expect(content).toContain("create or replace function public.atomic_replace_training_schedule");
    expect(content).toContain("delete from public.training_sessions");
    expect(content).toContain("insert into public.training_sessions");
  });
});
