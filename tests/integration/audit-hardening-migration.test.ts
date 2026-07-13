import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260712171403_audit_security_hardening.sql"),
  "utf8",
).toLowerCase();

describe("audit security hardening migration", () => {
  it("removes direct access to private profile columns", () => {
    expect(sql).toContain("revoke select on public.profiles from authenticated");
    expect(sql).not.toMatch(/grant select \([^)]*phone_e164/);
    expect(sql).not.toMatch(/grant select \([^)]*email_contact/);
    expect(sql).not.toMatch(/grant select \([^)]*calendar_token/);
    expect(sql).not.toMatch(/grant select \([^)]*school_payment_paid/);
  });

  it("blocks unauthenticated access-request writes", () => {
    expect(sql).toContain('drop policy if exists "anon can submit access requests"');
    expect(sql).toContain(
      "revoke insert, update, delete on public.access_requests from anon, authenticated",
    );
    expect(sql).toContain(
      "revoke insert, update, delete on public.access_request_children from anon, authenticated",
    );
  });

  it("forces shop mutations through authorized server actions", () => {
    expect(sql).toContain("revoke insert, update, delete on public.shop_orders from authenticated");
    expect(sql).toContain(
      "revoke insert, update, delete on public.shop_order_items from authenticated",
    );
  });
});
