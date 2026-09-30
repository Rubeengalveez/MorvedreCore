import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), winners: vi.fn(), authorize: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mocks.from }) }));
vi.mock("@/server/actions/admin/_helpers", () => ({
  requireAdmin: vi.fn(),
  requireAttendanceManagerOf: vi.fn(),
  requireMatchStaffOf: mocks.authorize,
}));

import { recomputeStreaksForMatch } from "@/server/actions/admin/streaks";

describe("cálculo del MVP al cerrar el partido", () => {
  it("consulta el partido directamente aunque haya más de 1000 estadísticas de temporada", async () => {
    const match = {
      id: "current-match",
      season_id: "season",
      team_id: "team",
      status: "played",
      scheduled_at: "2026-09-30T12:00:00Z",
      final_score_us: 3,
      final_score_them: 1,
      mvp_player_id: null,
    };
    const target = { match_id: match.id, player_id: "winner", goals: 3, exclusions: 0, mvp: false };
    const stats = [
      ...Array.from({ length: 1000 }, (_, i) => ({
        ...target,
        match_id: "other-match",
        player_id: `other-${i}`,
      })),
      target,
    ];
    mocks.winners.mockClear();
    mocks.authorize.mockClear();
    mocks.from.mockImplementation((table: string) => {
      let matchFilter: string | undefined;
      const result = () => ({
        data:
          table === "matches"
            ? [match]
            : table === "match_stats"
              ? matchFilter
                ? stats.filter((s) => s.match_id === matchFilter)
                : stats.slice(0, 1000)
              : [],
        error: null,
      });
      const chain = {
        select: () => chain,
        eq: (column: string, value: string) => {
          if (column === "match_id") matchFilter = value;
          return chain;
        },
        update: () => chain,
        upsert: () => chain,
        in: (_column: string, values: string[]) => {
          mocks.winners(values);
          return chain;
        },
        maybeSingle: async () => ({ data: table === "matches" ? match : null, error: null }),
        then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return chain;
    });
    await recomputeStreaksForMatch(match.id);
    expect(mocks.authorize).toHaveBeenCalledWith("team");
    expect(mocks.winners).toHaveBeenCalledWith(["winner"]);
  });
});
