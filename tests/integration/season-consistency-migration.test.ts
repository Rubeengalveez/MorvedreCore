import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260713151438_season_data_consistency.sql"),
  "utf8",
).toLowerCase();

describe("season data consistency migration", () => {
  it("repairs and prevents a current archived season", () => {
    expect(sql).toContain("set archived_at = null");
    expect(sql).toContain("constraint seasons_current_not_archived");
    expect(sql).toContain("not (is_current and archived_at is not null)");
  });

  it("only removes empty future placeholders", () => {
    expect(sql).toContain("not exists (select 1 from public.teams");
    expect(sql).toContain("not exists (select 1 from public.matches");
    expect(sql).toContain("future.start_date >");
  });

  it("keeps access request children explicitly closed", () => {
    expect(sql).toContain("create policy access_request_children_explicit_deny");
    expect(sql).toContain("using (false)");
    expect(sql).toContain("with check (false)");
  });
});
