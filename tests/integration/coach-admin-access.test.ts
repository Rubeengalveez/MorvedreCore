import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const adminHome = source("app/(app)/admin/page.tsx");
const adminLayout = source("app/(app)/admin/layout.tsx");
const topBar = source("components/layout/top-bar.tsx");
const helpers = source("server/actions/admin/_helpers.ts");
const trainingsLayout = source("app/(app)/admin/trainings/layout.tsx");
const matchesLayout = source("app/(app)/admin/matches/layout.tsx");
const trainingsPage = source("app/(app)/admin/trainings/page.tsx");
const matchesPage = source("app/(app)/admin/matches/page.tsx");
const matchDetail = source("app/(app)/admin/matches/[id]/page.tsx");
const migration = source(
  "supabase/migrations/20260727223405_allow_coaches_manage_training_blocks.sql",
).toLowerCase();
const coachScopeMigration = source(
  "supabase/migrations/20260727223823_scope_training_block_coach_access.sql",
).toLowerCase();

describe("coach admin access", () => {
  it("recognizes team-scoped coach roles as admin-area access", () => {
    expect(helpers).toContain("coachTeamIds: Set<string>");
    expect(adminLayout).toContain("access.coachTeamIds.size === 0");
    expect(topBar).toContain('userRoles.includes("coach")');
  });

  it("shows and opens only the coach-capable admin modules", () => {
    expect(adminHome.match(/allowCoach: true/g)).toHaveLength(2);
    expect(trainingsLayout).toContain('permission="manage_trainings" allowCoach');
    expect(matchesLayout).toContain('permission="manage_matches" allowCoach');
  });

  it("scopes training and match reads to the coach teams", () => {
    expect(trainingsPage).toContain('teamsQuery = teamsQuery.in("id", teamScope)');
    expect(trainingsPage).toContain('blocksQuery = blocksQuery.in("team_id", teamScope)');
    expect(matchesPage).toContain('matchesQuery = matchesQuery.in("team_id", teamScope)');
    expect(matchDetail).toContain("await loadMatch(id, teamScope)");
  });

  it("lets coaches mutate training blocks only for their own teams", () => {
    expect(migration).toContain("training_blocks_insert_admin_coach");
    expect(migration).toContain("training_blocks_update_admin_coach");
    expect(migration).toContain("training_blocks_delete_admin_coach");
    expect(migration).toContain("public.is_coach_of(team_id)");
  });

  it("ignores legacy global coach roles for training block authorization", () => {
    expect(coachScopeMigration).toContain("function public.is_assigned_coach_of");
    expect(coachScopeMigration).toContain("role.scope_team_id = p_team_id");
    expect(coachScopeMigration).not.toContain("scope_team_id = p_team_id or scope_team_id is null");
    expect(coachScopeMigration).not.toContain("delete from public.user_roles");
  });
});
