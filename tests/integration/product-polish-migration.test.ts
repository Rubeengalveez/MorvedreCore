import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260714013318_product_polish_permissions_profiles.sql"),
  "utf8",
);

describe("product polish migration", () => {
  it("adds modular permissions behind an authenticated helper", () => {
    expect(sql).toContain("create or replace function public.has_permission");
    expect(sql).toContain("revoke all on function public.has_permission(text) from public, anon");
    expect(sql).toContain("'manage_shop'");
    expect(sql).toContain("'manage_treasury'");
  });

  it("protects avatars and treasury settings with RLS", () => {
    expect(sql).toContain("alter table public.treasury_profile_settings enable row level security");
    expect(sql).toContain("avatars_insert_owner_or_manager");
    expect(sql).toContain("public.has_permission('manage_players')");
  });

  it("stores only normalized order phone snapshots", () => {
    expect(sql).toContain("shop_orders_contact_phone_format");
    expect(sql).toContain("contact_phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'");
  });
});
