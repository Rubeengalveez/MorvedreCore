import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260713151840_function_privilege_hardening.sql"),
  "utf8",
).toLowerCase();

describe("function privilege hardening migration", () => {
  it("removes the obsolete profile pii helper", () => {
    expect(sql).toContain("drop function if exists public.can_see_profile_pii(uuid)");
  });

  it("lets computed-data triggers bypass caller RLS safely", () => {
    expect(sql).toContain("alter function public.refresh_opponent_stats() security definer");
    expect(sql).toContain("alter function public.sync_travel_seats_taken() security definer");
  });

  it("prevents direct calls to trigger functions", () => {
    expect(sql).toContain(
      "revoke execute on function public.refresh_opponent_stats() from public, anon, authenticated",
    );
    expect(sql).toContain(
      "revoke execute on function public.sync_travel_seats_taken() from public, anon, authenticated",
    );
    expect(sql).toContain(
      "revoke execute on function public.validate_travel_reservation() from public, anon, authenticated",
    );
  });
});
