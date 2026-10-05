import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboardHome } from "@/server/queries/dashboard-home";
import { deriveAdminCapabilities } from "@/lib/domain/permissions";

const state = vi.hoisted(() => ({
  ctx: null as unknown,
  access: null as unknown,
  audience: null as unknown,
  records: [] as Array<{ table: string; method: string; args: unknown[] }>,
  responses: {} as Record<string, unknown>,
  upcoming: vi.fn(),
  attendance: vi.fn(),
  stats: vi.fn(),
}));
vi.mock("@/server/queries/active-profile", () => ({
  getActiveProfileContext: () => Promise.resolve(state.ctx),
}));
vi.mock("@/server/queries/seasons", () => ({
  getCurrentSeason: () => Promise.resolve({ id: "season" }),
}));
vi.mock("@/server/actions/admin/_helpers", () => ({
  getRenderAdminAccess: () => Promise.resolve(state.access),
}));
vi.mock("@/server/queries/dashboard", () => ({
  getDashboardAudience: () => Promise.resolve(state.audience),
  getUpcomingDashboardEvents: state.upcoming,
  getCoachAttendanceSessions: state.attendance,
  getClubDayKey: (d: Date) => d.toISOString().slice(0, 10),
}));
vi.mock("@/server/queries/rankings", () => ({ getSeasonActaStats: state.stats }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      from: (table: string) => {
        const chain: Record<string, unknown> = {};
        for (const method of [
          "select",
          "in",
          "is",
          "eq",
          "or",
          "not",
          "lte",
          "order",
          "limit",
          "maybeSingle",
          "throwOnError",
        ])
          chain[method] = (...args: unknown[]) => {
            state.records.push({ table, method, args });
            return chain;
          };
        chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve()
            .then(() => {
              const response = state.responses[table];
              if (response instanceof Error) throw response;
              return response ?? { data: [], count: 0 };
            })
            .then(resolve, reject);
        return chain;
      },
    }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.records = [];
  state.ctx = {
    ownProfile: { id: "own", full_name: "Padre", photo_url: null },
    linkedProfiles: [{ id: "child", full_name: "Ana", photo_url: null }],
  };
  state.access = deriveAdminCapabilities({ isAdmin: false, permissions: [], roles: [], staff: [] });
  state.audience = { staff_teams: [], can_manage_attendance: false };
  state.responses = {
    team_rosters: { data: [{ player_id: "child", team_id: "team", teams: { label: "Alevín" } }] },
    matches: { data: null },
    news_posts: { data: [] },
  };
  state.upcoming.mockResolvedValue([]);
  state.attendance.mockResolvedValue([]);
  state.stats.mockResolvedValue(new Map());
});
describe("Inicio: consultas limitadas a la cuenta y familia autorizada", () => {
  it("añade una convocatoria de refuerzo aunque no pertenezca a su equipo habitual", async () => {
    state.responses.match_callups = {
      data: [
        {
          player_id: "child",
          match_id: "reinforcement",
          matches: {
            id: "reinforcement",
            team_id: "older",
            opponent: "Turia",
            is_home: true,
            pool_name: "Piscina",
            location: null,
            maps_url: null,
            scheduled_at: new Date(Date.now() + 86400000).toISOString(),
            status: "scheduled",
            teams: { label: "Infantil", color: "#123456" },
          },
        },
      ],
    };
    const home = await getDashboardHome();
    expect(home?.events).toHaveLength(1);
    expect(home?.events[0]).toMatchObject({
      personIds: ["child"],
      calledPersonIds: ["child"],
      canOpenActa: false,
      team_label: "Infantil",
    });
    expect(state.records).toContainEqual({
      table: "match_callups",
      method: "in",
      args: ["player_id", ["own", "child"]],
    });
    expect(state.records).toContainEqual({
      table: "notifications",
      method: "eq",
      args: ["recipient_id", "own"],
    });
    expect(state.records).toContainEqual({
      table: "shop_orders",
      method: "in",
      args: ["requested_by", ["child"]],
    });
  });
  it("no mezcla estadísticas de otros miembros con las del perfil", async () => {
    state.stats.mockResolvedValue(
      new Map([
        ["child", { goals: 5, matches: 2, assists: 1 }],
        ["unrelated", { goals: 100, matches: 50, assists: 9 }],
      ]),
    );
    expect((await getDashboardHome())?.stats).toEqual({
      child: { goals: 5, matches: 2, assists: 1 },
    });
  });
  it("conserva las noticias y explica un fallo parcial de agenda", async () => {
    state.upcoming.mockRejectedValue(new Error("Network"));
    state.responses.news_posts = {
      data: [
        {
          id: "news",
          title: "Noticias",
          image_url: null,
          pinned: false,
          published_at: "2026-10-04T08:00:00Z",
          teams: null,
        },
      ],
    };
    const home = await getDashboardHome();
    expect(home?.issues).toContain("agenda");
    expect(home?.news).toHaveLength(1);
  });
  it("deduplica una convocatoria que también está en la agenda familiar", async () => {
    const date = new Date(Date.now() + 86400000).toISOString();
    state.upcoming.mockImplementation((teamIds: string[]) =>
      Promise.resolve(
        teamIds.length
          ? [
              {
                id: "match",
                team_id: "team",
                kind: "match",
                scheduled_at: date,
                status: "scheduled",
                team_label: "Alevín",
                location: null,
                title: "Turia",
              },
            ]
          : [],
      ),
    );
    state.responses.match_callups = {
      data: [
        {
          player_id: "child",
          matches: {
            id: "match",
            team_id: "team",
            opponent: "Turia",
            scheduled_at: date,
            status: "scheduled",
            location: null,
            teams: { label: "Alevín", color: "#123456" },
          },
        },
      ],
    };
    const home = await getDashboardHome();
    expect(home?.events).toHaveLength(1);
    expect(home?.events[0].calledPersonIds).toEqual(["child"]);
  });
  it("evita consultas autenticadas adicionales cuando no hay sesión", async () => {
    state.ctx = null;
    expect(await getDashboardHome()).toBeNull();
    expect(state.records).toEqual([]);
  });
});
