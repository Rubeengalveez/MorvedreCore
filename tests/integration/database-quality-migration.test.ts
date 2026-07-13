import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260713150822_database_quality_hardening.sql"),
  "utf8",
).toLowerCase();

describe("database quality hardening migration", () => {
  it("removes the obsolete settings table", () => {
    expect(sql).toContain("drop table if exists public.app_settings");
  });

  it("gives user roles a stable primary key", () => {
    expect(sql).toContain("alter table public.user_roles add column if not exists id uuid");
    expect(sql).toContain("add constraint user_roles_pkey primary key (id)");
  });

  it("indexes every foreign key reported by the advisor", () => {
    const expectedIndexes = [
      "access_requests_approved_by_idx",
      "access_requests_candidate_profile_idx",
      "match_stats_entered_by_idx",
      "match_stats_validated_by_idx",
      "news_posts_audience_team_id_idx",
      "opponent_stats_team_id_idx",
      "parent_child_links_child_idx",
      "shop_orders_approved_by_idx",
      "shop_orders_managed_by_idx",
      "shop_products_created_by_idx",
      "team_staff_granted_by_idx",
      "training_attendance_marked_by_idx",
      "training_blocks_created_by_idx",
      "training_sessions_cancelled_by_idx",
      "treasury_lines_concept_id_idx",
      "treasury_period_closures_generated_by_idx",
      "treasury_profile_concepts_concept_id_idx",
      "user_roles_granted_by_idx",
    ];

    for (const index of expectedIndexes) {
      expect(sql).toContain(index);
    }
  });

  it("fixes team-news membership to compare profile ids", () => {
    expect(sql).toContain("tr.player_id = (");
    expect(sql).toContain("p.auth_user_id = (select auth.uid())");
    expect(sql).not.toContain("tr.player_id = auth.uid()");
  });

  it("consolidates overlapping update policies", () => {
    expect(sql).toContain("create policy match_callups_update_authorized");
    expect(sql).toContain("create policy match_stats_update_authorized");
    expect(sql).toContain('drop policy if exists "admins can manage access requests"');
  });
});
