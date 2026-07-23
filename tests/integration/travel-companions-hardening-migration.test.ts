import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260723133133_harden_travel_companions.sql"),
  "utf8",
).toLowerCase();

describe("travel companions hardening migration", () => {
  it("repairs legacy rows before enforcing the new constraints", () => {
    expect(sql).toContain("ranked_companions");
    expect(sql).toContain("duplicate_position > 1");
    expect(sql).toContain("set\n  offer_id = reservation_offer_id");
    expect(sql).toContain("full_name = btrim(full_name)");
    expect(sql).toContain("delete from public.travel_companions");
  });

  it("keeps the companion attached to the same offer as the reservation", () => {
    expect(sql).toContain("check (offer_id = reservation_offer_id)");
    expect(sql).toContain("travel_companions_protect_identity");
    expect(sql).toContain("new.reservation_player_id is distinct from old.reservation_player_id");
  });

  it("rejects whitespace-only and untrimmed names", () => {
    expect(sql).toContain("full_name = btrim(full_name)");
    expect(sql).toContain("full_name ~ '[^[:space:]]'");
  });

  it("locks down trigger functions and grants the service role explicitly", () => {
    expect(sql).toContain(
      "revoke all on function public.sync_travel_seats_taken() from public, anon, authenticated",
    );
    expect(sql).toContain(
      "revoke all on function public.validate_travel_companion() from public, anon, authenticated",
    );
    expect(sql).toContain("grant all on table public.travel_companions to service_role");
  });
});
