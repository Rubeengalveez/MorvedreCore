import { describe, expect, it } from "vitest";
import {
  canAccessAdminArea,
  canAccessAdminModule,
  canManageTeam,
  deriveAdminCapabilities,
  getTeamScope,
  type TeamCapability,
} from "@/lib/domain/permissions";

const capabilities = (input: Partial<Parameters<typeof deriveAdminCapabilities>[0]> = {}) =>
  deriveAdminCapabilities({ isAdmin: false, roles: [], staff: [], permissions: [], ...input });

describe("shared administrative capabilities", () => {
  it("denies ordinary members and unknown permission strings", () => {
    const access = capabilities({ permissions: [{ permission: "anything" }] });
    expect(canAccessAdminArea(access)).toBe(false);
    expect(canAccessAdminModule(access, "admin")).toBe(false);
    expect(getTeamScope(access, "trainings")).toEqual([]);
  });

  it("does not confuse the attendance shortcut with an administration module", () => {
    expect(
      canAccessAdminArea(capabilities({ permissions: [{ permission: "manage_attendance" }] })),
    ).toBe(false);
  });

  it("requires an explicit team for coaching", () => {
    const access = capabilities({
      roles: [{ role: "coach", scope_team_id: null }],
      staff: [{ role: "head_coach", team_id: "a" }],
    });
    expect(canAccessAdminArea(access)).toBe(false);
    expect(canManageTeam(access, "trainings", "a")).toBe(false);
  });

  it("scopes coaches to their own teams across reads and mutations", () => {
    const access = capabilities({ roles: [{ role: "coach", scope_team_id: "a" }] });
    expect(canAccessAdminModule(access, "manage_trainings")).toBe(true);
    expect(canAccessAdminModule(access, "manage_matches")).toBe(true);
    for (const capability of [
      "trainings",
      "match_schedule",
      "match_operations",
    ] as TeamCapability[]) {
      expect(getTeamScope(access, capability)).toEqual(["a"]);
      expect(canManageTeam(access, capability, "a")).toBe(true);
      expect(canManageTeam(access, capability, "b")).toBe(false);
    }
  });

  it.each(["roles", "staff"] as const)(
    "allows delegate operations from %s without schedule access",
    (source) => {
      const access = capabilities(
        source === "roles"
          ? { roles: [{ role: "delegate", scope_team_id: "a" }] }
          : {
              staff: [
                { role: "delegate", team_id: "a" },
                { role: "physical_trainer", team_id: "b" },
              ],
            },
      );
      expect(canAccessAdminArea(access)).toBe(true);
      expect(canAccessAdminModule(access, "manage_matches")).toBe(true);
      expect(canManageTeam(access, "match_operations", "a")).toBe(true);
      expect(canManageTeam(access, "match_operations", "b")).toBe(false);
      expect(canManageTeam(access, "match_schedule", "a")).toBe(false);
      expect(canAccessAdminModule(access, "manage_trainings")).toBe(false);
    },
  );

  it("keeps multiple role scopes separate", () => {
    const access = capabilities({
      roles: [{ role: "coach", scope_team_id: "a" }],
      staff: [
        { role: "delegate", team_id: "b" },
        { role: "delegate", team_id: "b" },
      ],
    });
    expect(getTeamScope(access, "match_operations")).toEqual(["a", "b"]);
    expect(getTeamScope(access, "match_schedule")).toEqual(["a"]);
  });

  it("grants modular permissions only to their module", () => {
    const access = capabilities({ permissions: [{ permission: "manage_trainings" }] });
    expect(getTeamScope(access, "trainings")).toBeNull();
    expect(getTeamScope(access, "match_schedule")).toEqual([]);
    const matches = capabilities({ permissions: [{ permission: "manage_matches" }] });
    expect(getTeamScope(matches, "match_operations")).toBeNull();
    expect(getTeamScope(matches, "match_schedule")).toBeNull();
    expect(canAccessAdminModule(matches, "manage_staff")).toBe(false);
  });

  it("allows the global administrator", () => {
    const access = capabilities({ isAdmin: true });
    expect(canAccessAdminArea(access)).toBe(true);
    expect(canAccessAdminModule(access, "admin")).toBe(true);
    expect(getTeamScope(access, "trainings")).toBeNull();
    expect(getTeamScope(access, "match_operations")).toBeNull();
  });
});
