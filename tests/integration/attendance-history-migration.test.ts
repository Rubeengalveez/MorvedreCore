import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260723131531_attendance_history_and_guardian_alerts.sql",
  ),
  "utf8",
).toLowerCase();

describe("attendance history and guardian alerts migration", () => {
  it("restricts attendance reads to the player, guardians and authorized staff", () => {
    expect(sql).toContain("drop policy if exists training_attendance_select_authenticated");
    expect(sql).toContain("training_attendance_select_authorized");
    expect(sql).toContain("parent_child_links");
    expect(sql).toContain("can_manage_attendance_for");
  });

  it("keeps an immutable technical trail of attendance changes", () => {
    expect(sql).toContain("create table public.training_attendance_audit");
    expect(sql).toContain("training_attendance_record_change");
    expect(sql).toContain("previous_present");
    expect(sql).toContain("changed_by");
  });

  it("notifies guardians for absences and later corrections", () => {
    expect(sql).toContain("'training_absence'");
    expect(sql).toContain("'training_attendance_corrected'");
    expect(sql).toContain("training_attendance_notify_guardians");
    expect(sql).toContain("link.parent_profile_id");
    expect(sql).toContain("related_profile_id");
  });

  it("defines explicit grants for the new table", () => {
    expect(sql).toContain(
      "revoke all on table public.training_attendance_audit from public, anon, authenticated",
    );
    expect(sql).toContain(
      "grant select on table public.training_attendance_audit to authenticated",
    );
    expect(sql).toContain("grant all on table public.training_attendance_audit to service_role");
  });
});
