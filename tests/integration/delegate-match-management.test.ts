import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { requireMatchStaffOf } from "@/server/actions/admin/_helpers";

const migrationsDir = resolve(process.cwd(), "supabase/migrations");

describe("Delegate Match Management & Roles Hardening", () => {
  it("includes migration defining is_match_staff_of and updated RLS", () => {
    const files = readdirSync(migrationsDir);
    const migrationFile = files.find((f) => f.includes("delegate_match_management_rls"));

    expect(migrationFile).toBeDefined();
    const content = readFileSync(resolve(migrationsDir, migrationFile!), "utf8");

    expect(content).toContain("create or replace function public.is_delegate_of");
    expect(content).toContain("create or replace function public.is_match_staff_of");
    expect(content).toContain("match_callups_insert_staff");
    expect(content).toContain("match_callups_update_authorized");
    expect(content).toContain("match_callups_delete_staff");
    expect(content).toContain("match_stats_insert_staff");
    expect(content).toContain("match_stats_update_staff");
  });

  it("consolidates the update policy without unlocking validated stats", () => {
    const migrationFile = readdirSync(migrationsDir).find((name) =>
      name.includes("consolidate_match_stats_update_policy"),
    );
    expect(migrationFile).toBeDefined();

    const content = readFileSync(resolve(migrationsDir, migrationFile!), "utf8");
    expect(content).toContain("drop policy if exists match_stats_update_staff");
    expect(content).toContain("create policy match_stats_update_authorized");
    expect(content).toContain("validated_at is null");
    expect(content).toContain("public.is_match_staff_of(m.team_id)");
  });

  it("exports requireMatchStaffOf helper", () => {
    expect(typeof requireMatchStaffOf).toBe("function");
  });
});
