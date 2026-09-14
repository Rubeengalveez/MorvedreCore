import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260914120358_swim_times.sql"),
  "utf8",
);

describe("swim times migration", () => {
  it("stores either distance and keeps retries idempotent", () => {
    expect(sql).toContain("time_50_cs is not null or time_100_cs is not null");
    expect(sql).toContain("unique (created_by, operation_id)");
  });

  it("allows writes only for coaches assigned to the team", () => {
    expect(sql).toContain("create policy swim_time_entries_insert_coach");
    expect(sql).toContain("create policy swim_time_entries_update_coach");
    expect(sql).toContain("ur.role = 'coach'");
    expect(sql).toContain("ts.role in ('head_coach', 'assistant_coach')");
    expect(sql).not.toMatch(/is_admin\s*\(/);
  });

  it("checks season, roster membership and future dates in RLS", () => {
    expect(sql).toContain("test_date <= (now() at time zone 'Europe/Madrid')::date");
    expect(sql).toContain("test_date between s.start_date and s.end_date");
    expect(sql).toContain("test_date >= tr.joined_at");
    expect(sql).toContain("tr.left_at is null or swim_time_entries.test_date <= tr.left_at");
  });

  it("does not allow pre-voided inserts or attributing an annulment to someone else", () => {
    expect(sql).toContain("and voided_at is null");
    expect(sql).toContain("and voided_by is null");
    expect(sql).toContain("voided_at is null or voided_by = actor.id");
  });

  it("enables RLS and audits every change", () => {
    expect(sql).toContain("alter table public.swim_time_entries enable row level security");
    expect(sql).toContain("execute function private.audit_sensitive_change('id')");
  });
});
