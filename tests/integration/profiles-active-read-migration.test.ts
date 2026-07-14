import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260714153000_profiles_active_public_read.sql"),
  "utf8",
);

describe("profiles active read migration", () => {
  it("allows authenticated members to filter inactive players", () => {
    expect(sql).toContain("grant select (is_active) on public.profiles to authenticated");
    expect(sql).not.toContain("to anon");
    expect(sql).not.toContain("to public");
  });
});
