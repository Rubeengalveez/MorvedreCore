import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260714101500_remove_shop_stock.sql"),
  "utf8",
).toLowerCase();

describe("shop made-to-order migration", () => {
  it("removes the stock column from shop products", () => {
    expect(sql).toContain("alter table public.shop_products");
    expect(sql).toContain("drop column if exists stock");
  });
});
