import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260723234913_shop_order_references.sql"),
  "utf8",
).toLowerCase();

describe("shop order references migration", () => {
  it("backfills and validates readable daily references", () => {
    expect(sql).toContain("row_number() over");
    expect(sql).toContain("at time zone 'europe/madrid'");
    expect(sql).toContain("check (order_reference ~ '^[0-9]{8}[a-z]+$')");
    expect(sql).toContain("create unique index if not exists shop_orders_reference_uidx");
  });

  it("assigns references atomically from a private daily sequence", () => {
    expect(sql).toContain("private.shop_order_daily_sequences");
    expect(sql).toContain("on conflict (order_date) do update");
    expect(sql).toContain("before insert or update of order_reference");
  });

  it("keeps helper functions private and protected", () => {
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain(
      "revoke all on function private.assign_shop_order_reference()\n  from public, anon, authenticated",
    );
  });
});
