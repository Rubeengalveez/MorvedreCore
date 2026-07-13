import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260713182951_add_attendance_staff_permission.sql"),
  "utf8",
).toLowerCase();
const backfillSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260713183943_backfill_attendance_coach_scopes.sql"),
  "utf8",
).toLowerCase();
const globalPermissionSql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260713184319_global_attendance_manager_permission.sql",
  ),
  "utf8",
).toLowerCase();
const globalRlsSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260713185620_global_attendance_rls.sql"),
  "utf8",
).toLowerCase();

describe("attendance staff permission migration", () => {
  it("adds a denied-by-default attendance permission", () => {
    expect(sql).toContain("can_manage_attendance boolean not null default false");
  });

  it("preserves attendance access for existing coaches", () => {
    expect(sql).toContain("set can_manage_attendance = true");
    expect(sql).toContain("where role in ('head_coach', 'assistant_coach')");
  });

  it("prevents non-coach staff from receiving the permission", () => {
    expect(sql).toContain("team_staff_attendance_coach_only_check");
    expect(sql).toContain("not can_manage_attendance");
  });

  it("aligns every enabled assignment with a team-scoped coach role", () => {
    expect(backfillSql).toContain("insert into public.user_roles");
    expect(backfillSql).toContain("staff.can_manage_attendance");
    expect(backfillSql).toContain("on conflict (profile_id, role, scope_team_id) do nothing");
  });

  it("normalizes attendance access as one global permission per coach", () => {
    expect(globalPermissionSql).toContain("create table public.profile_permissions");
    expect(globalPermissionSql).toContain("primary key (profile_id, permission)");
    expect(globalPermissionSql).toContain("'manage_attendance'");
    expect(globalPermissionSql).toContain("drop column can_manage_attendance");
  });

  it("requires a coach assignment and removes orphan permissions", () => {
    expect(globalPermissionSql).toContain("profile_permissions_require_coach");
    expect(globalPermissionSql).toContain("attendance manager must be assigned as coach");
    expect(globalPermissionSql).toContain("team_staff_remove_orphan_attendance_permission");
  });

  it("lets an authorized coach manage another team in the same season", () => {
    expect(globalRlsSql).toContain("function public.can_manage_attendance_for");
    expect(globalRlsSql).toContain("staff_team.season_id = target_team.season_id");
    expect(globalRlsSql).toContain("permission.permission = 'manage_attendance'");
    expect(globalRlsSql).toContain("training_attendance_insert_authorized_coach");
    expect(globalRlsSql).toContain("training_attendance_update_authorized_coach");
  });
});
