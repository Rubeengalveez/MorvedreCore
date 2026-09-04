import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260727222316_allow_all_coaches_manage_attendance.sql"),
  "utf8",
).toLowerCase();
const helpersSource = readFileSync(join(process.cwd(), "server/actions/admin/_helpers.ts"), "utf8");
const dashboardSource = readFileSync(join(process.cwd(), "server/queries/dashboard.ts"), "utf8");
const streaksSource = readFileSync(join(process.cwd(), "server/actions/admin/streaks.ts"), "utf8");

describe("shared attendance access for coaches", () => {
  it("authorizes any assigned coach in the same season at the RLS layer", () => {
    expect(migrationSql).toContain("function public.can_manage_attendance_for");
    expect(migrationSql).toContain("staff.role in ('head_coach', 'assistant_coach')");
    expect(migrationSql).toContain("staff_team.season_id = target_team.season_id");
    expect(migrationSql).not.toContain("profile_permissions");
    expect(migrationSql).not.toContain("permission.permission = 'manage_attendance'");
  });

  it("does not require a manual attendance permission in server authorization", () => {
    const helper = helpersSource.slice(
      helpersSource.indexOf("export async function requireAttendanceManagerOf"),
    );
    expect(helper).not.toContain('from("profile_permissions")');
    expect(dashboardSource).not.toContain("attendancePermissionRes");
  });

  it("uses attendance authorization during the post-save streak refresh", () => {
    const refresh = streaksSource.slice(
      streaksSource.indexOf("export async function recomputeTrainingStreaksForSession"),
    );
    expect(refresh).toContain("await requireAttendanceManagerOf(session.team_id)");
    expect(refresh).not.toContain("await requireCoachOf(session.team_id)");
  });
});
