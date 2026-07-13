import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711154016_phase_8_history.sql"),
  "utf8",
).toLowerCase();

describe("phase 8 migration security", () => {
  it.each(["historical_player_stats", "historical_team_matchups", "audit_log"])(
    "enables RLS on %s",
    (table) => {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    },
  );

  it("keeps historical tables append-only for authenticated users", () => {
    expect(sql).not.toContain("create policy historical_player_stats_insert");
    expect(sql).not.toContain("create policy historical_player_stats_update");
    expect(sql).not.toContain("create policy historical_player_stats_delete");
    expect(sql).not.toContain("create policy historical_team_matchups_insert");
    expect(sql).not.toContain("create policy historical_team_matchups_update");
    expect(sql).not.toContain("create policy historical_team_matchups_delete");
  });

  it("locks down the privileged archive function", () => {
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("if not (select public.is_admin())");
    expect(sql).toContain(
      "revoke execute on function public.archive_season(uuid, text, date, date) from public, anon",
    );
  });

  it("uses a transaction-level advisory lock and readiness checks", () => {
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("hay actas de partido pendientes de validar");
    expect(sql).toContain("todavía hay partidos pendientes");
  });

  it("protects archived seasons from later edits or deletion", () => {
    expect(sql).toContain("create or replace function private.protect_archived_season()");
    expect(sql).toContain("before update or delete on public.seasons");
    expect(sql).toContain("una temporada archivada es inmutable");
  });
});
