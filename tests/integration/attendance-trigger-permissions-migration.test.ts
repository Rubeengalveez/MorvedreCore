import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260713165849_fix_attendance_integrity_trigger_permissions.sql",
  ),
  "utf8",
).toLowerCase();

describe("attendance trigger permissions migration", () => {
  it("moves the privileged lookup into the unexposed private schema", () => {
    expect(sql).toContain(
      "create or replace function private.enforce_training_attendance_integrity()",
    );
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
  });

  it("revokes direct execution and removes the exposed implementation", () => {
    expect(sql).toContain(
      "revoke all on function private.enforce_training_attendance_integrity() from public, anon, authenticated",
    );
    expect(sql).toContain("drop function if exists public.enforce_training_attendance_integrity()");
  });
});
