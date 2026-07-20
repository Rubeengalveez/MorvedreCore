import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260720185541_family_guardian_experience.sql"),
  "utf8",
);
const privilegesSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260720195234_family_function_privileges.sql"),
  "utf8",
);
const linkIntegritySql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260720200228_family_link_integrity.sql"),
  "utf8",
);
const sportsManagementSql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260720203127_family_guardian_sports_management.sql",
  ),
  "utf8",
);
const callupIntegritySql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260720204711_family_callup_column_integrity.sql"),
  "utf8",
);

describe("family guardian migration", () => {
  it("records and enforces whether a shop order needs guardian approval", () => {
    expect(sql).toContain("guardian_approval_required boolean not null default false");
    expect(sql).toContain("profile_is_minor");
    expect(sql).toContain("shop_orders_guardian_flow");
    expect(sql).toContain("A minor needs a linked guardian");
  });

  it("does not let a minor read personal treasury lines", () => {
    expect(sql).toContain("profile.birth_year <= extract(year from current_date)::integer - 18");
    expect(sql).toContain("link.child_profile_id = treasury_lines.profile_id");
  });

  it("does not expose trigger helpers as Data API RPCs", () => {
    expect(privilegesSql).toContain(
      "revoke all on function public.profile_is_minor(uuid, date) from public, anon, authenticated",
    );
    expect(privilegesSql).toContain(
      "revoke all on function public.enforce_shop_order_guardian_flow() from public, anon, authenticated",
    );
  });

  it("only accepts active adult guardians linked to minors", () => {
    expect(linkIntegritySql).toContain("A guardian must be an adult with a known birth year");
    expect(linkIntegritySql).toContain("Family-managed profiles must be minors");
    expect(linkIntegritySql).toContain("parent_child_links_validate_profiles");
    expect(linkIntegritySql).toContain(
      "revoke all on function public.validate_parent_child_link() from public, anon, authenticated",
    );
  });

  it("lets a guardian manage only a linked minor's sports responses", () => {
    expect(sportsManagementSql).toContain("match_callups_update_authorized");
    expect(sportsManagementSql).toContain("match_availability_update_self_or_admin");
    expect(sportsManagementSql).toContain("link.child_profile_id = player_id");
    expect(sportsManagementSql).toContain(
      "child.birth_year is null or child.birth_year > extract(year from current_date)::integer - 18",
    );
  });

  it("limits family RSVP updates to response columns and states", () => {
    expect(callupIntegritySql).toContain(
      "new.match_id is distinct from old.match_id or new.player_id is distinct from old.player_id",
    );
    expect(callupIntegritySql).toContain(
      "new.status not in ('confirmed', 'declined', 'withdrawn')",
    );
    expect(callupIntegritySql).toContain("new.confirmed_at := case");
  });
});
