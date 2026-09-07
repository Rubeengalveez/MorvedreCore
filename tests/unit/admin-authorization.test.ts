import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  filters: vi.fn(),
  results: {} as Record<string, { data: unknown; error: unknown }>,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }),
}));

import {
  getAdminAccess,
  requireCoachOf,
  requireMatchManagerOf,
  requireMatchStaffOf,
  requireTrainingManagerOf,
} from "@/server/actions/admin/_helpers";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-owner" } }, error: null });
  mocks.results = {
    profiles: { data: { id: "profile-owner" }, error: null },
    admin: { data: null, error: null },
    coach: { data: null, error: null },
    user_roles: { data: [], error: null },
    team_staff: { data: [], error: null },
    profile_permissions: { data: [], error: null },
  };
  mocks.from.mockImplementation((table: string) => {
    let key = table;
    const chain = {
      select: () => chain,
      eq: (column: string, value: string) => {
        mocks.filters(table, column, value);
        if (table === "user_roles" && column === "role") key = value;
        return chain;
      },
      is: () => chain,
      in: () => chain,
      not: () => chain,
      maybeSingle: async () => mocks.results[key],
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(mocks.results[key]).then(resolve),
    };
    return chain;
  });
});

describe("team authorization", () => {
  it("accepts multiple technical roles for the same team", async () => {
    mocks.results.team_staff.data = [
      { role: "head_coach", team_id: "team-a" },
      { role: "delegate", team_id: "team-a" },
    ];
    await expect(requireMatchStaffOf("team-a")).resolves.toEqual({ id: "profile-owner" });
    expect(mocks.filters).toHaveBeenCalledWith("team_staff", "profile_id", "profile-owner");
    await expect(requireMatchStaffOf("team-b")).rejects.toThrow("No tienes permisos");
  });

  it("rejects a profile without any authorized role", async () => {
    await expect(requireMatchStaffOf("team-a")).rejects.toThrow("No tienes permisos");
  });

  it("reports a staff lookup failure instead of treating it as missing membership", async () => {
    mocks.results.team_staff = { data: null, error: { message: "unavailable" } };
    await expect(requireMatchStaffOf("team-a")).rejects.toThrow(
      "No pudimos verificar tus permisos",
    );
  });

  it.each([requireCoachOf, requireMatchStaffOf])(
    "fails closed when the administrator lookup fails",
    async (guard) => {
      mocks.results.admin.error = { message: "unavailable" };
      mocks.results.coach.data = { role: "coach" };
      mocks.results.user_roles.data = [{ role: "coach" }];
      await expect(guard("team-a")).rejects.toThrow("No pudimos verificar tus permisos");
    },
  );

  it.each([requireCoachOf, requireMatchStaffOf])(
    "does not query roles after an authentication error",
    async (guard) => {
      mocks.getUser.mockResolvedValue({
        data: { user: { id: "auth-owner" } },
        error: { message: "invalid" },
      });
      await expect(guard("team-a")).rejects.toThrow("No pudimos verificar tu identidad");
      expect(mocks.from).not.toHaveBeenCalled();
    },
  );

  it("allows an explicitly assigned coach", async () => {
    mocks.results.coach.data = { role: "coach" };
    await expect(requireCoachOf("team-a")).resolves.toEqual({ id: "profile-owner" });
    expect(mocks.filters).toHaveBeenCalledWith("user_roles", "scope_team_id", "team-a");
  });

  it("uses the same scope for navigation and match actions", async () => {
    mocks.results.user_roles.data = [{ role: "coach", scope_team_id: "team-a" }];
    expect((await getAdminAccess()).coachTeamIds).toEqual(new Set(["team-a"]));
    await expect(requireMatchManagerOf("team-a")).resolves.toEqual({ id: "profile-owner" });
    await expect(requireMatchManagerOf("team-b")).rejects.toThrow("No tienes permisos");
  });

  it("honors only the requested modular permission", async () => {
    mocks.results.profile_permissions.data = [{ permission: "manage_trainings" }];
    await expect(requireTrainingManagerOf("team-b")).resolves.toEqual({ id: "profile-owner" });
    await expect(requireMatchManagerOf("team-b")).rejects.toThrow("No tienes permisos");
  });

  it("does not treat an unscoped coach or an isolated staff label as authorization", async () => {
    mocks.results.user_roles.data = [{ role: "coach", scope_team_id: null }];
    mocks.results.team_staff.data = [{ role: "head_coach", team_id: "team-a" }];
    await expect(requireTrainingManagerOf("team-a")).rejects.toThrow("No tienes permisos");
    await expect(requireMatchStaffOf("team-a")).rejects.toThrow("No tienes permisos");
  });
});
