import { describe, expect, it, vi } from "vitest";
import { getSeasonActaStats } from "@/server/queries/rankings";
import { sheetSchema } from "@/lib/domain/live-match";
import type { TypedSupabaseClient } from "@/lib/supabase/types";
vi.mock("@/server/queries/seasons", () => ({ getSeasonCategoryYear: vi.fn() }));
const player = "10000000-0000-4000-8000-000000000001";
describe("Estadísticas de Inicio", () => {
  it("incluye las actas de refuerzo de la persona y separa inscripciones del equipo", async () => {
    const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
    const document = sheetSchema.parse({
      version: 2,
      players: [{ id: player, cap: 2, name: "Jugador" }],
      opponentCaps: [1],
      periods: 4,
      period: 4,
      phase: "finished",
      keeper: null,
      baseline: [],
      baselineThem: 0,
      events: [
        {
          id: "20000000-0000-4000-8000-000000000001",
          playerId: player,
          side: "us",
          cap: 2,
          kind: "goal",
          period: 1,
          keeper: null,
          deleted: false,
        },
      ],
    });
    const client = {
      from: (table: string) => {
        const chain: Record<string, unknown> = {};
        for (const method of ["select", "eq", "in", "order", "range"])
          chain[method] = (...args: unknown[]) => {
            calls.push({ table, method, args });
            return chain;
          };
        chain.then = (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            data: table === "matches" ? [{ id: "reinforcement" }] : [{ document }],
            error: null,
          }).then(resolve);
        return chain;
      },
    } as unknown as TypedSupabaseClient;
    const stats = await getSeasonActaStats(client, "season", undefined, undefined, [player]);
    expect(stats.get(player)).toEqual({ matches: 1, goals: 1, assists: 0 });
    expect(calls).toContainEqual({
      table: "matches",
      method: "in",
      args: ["match_callups.player_id", [player]],
    });
    expect(calls.some((c) => c.method === "in" && c.args[0] === "team_id")).toBe(false);
  });
});
