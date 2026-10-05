import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClubRankingsData } from "@/server/queries/club-rankings";
const state = vi.hoisted(() => ({
  rows: {} as Record<string, unknown[]>,
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  error: "",
}));
vi.mock("@/server/queries/seasons", () => ({ getSeasonCategoryYear: async () => 2025 }));
vi.mock("@/server/queries/swim-times", () => ({ getSwimTimeEntries: async () => [] }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string) {
      let start = 0;
      let end = 499;
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq", "neq", "in", "lte", "order", "range"])
        chain[method] = (...args: unknown[]) => {
          state.calls.push({ table, method, args });
          if (method === "range") {
            start = Number(args[0]);
            end = Number(args[1]);
          }
          return chain;
        };
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: (state.rows[table] ?? []).slice(start, end + 1),
          count: (state.rows[table] ?? []).length,
          error: state.error && table === "matches" ? { message: state.error } : null,
        }).then(resolve);
      return chain;
    },
  }),
}));
beforeEach(() => {
  state.rows = {};
  state.calls = [];
  state.error = "";
});

describe("lectura completa y privada de rankings", () => {
  it("pagina perfiles públicos y no lee contactos ni asistencia sin permisos", async () => {
    state.rows.profiles_public = Array.from({ length: 501 }, (_, i) => ({
      id: String(i),
      full_name: `Jugador ${i}`,
      birth_year: 2011,
      photo_url: null,
    }));
    const data = await getClubRankingsData({ id: "season", label: "2025/2026" }, "season", false);
    expect(data.players).toHaveLength(501);
    expect(state.calls).toContainEqual({
      table: "profiles_public",
      method: "range",
      args: [500, 999],
    });
    expect(
      state.calls.find((c) => c.table === "profiles_public" && c.method === "select")?.args[0],
    ).toBe("id, full_name, photo_url, birth_year");
    expect(
      state.calls.some((c) =>
        ["profiles", "training_attendance", "training_sessions"].includes(c.table),
      ),
    ).toBe(false);
    expect(
      state.calls
        .filter((c) => c.table === "team_rosters" && c.method === "order")
        .map((c) => c.args[0]),
    ).toEqual(["team_id", "player_id"]);
  });
  it("solo consulta partidos finalizados de la temporada elegida", async () => {
    await getClubRankingsData({ id: "season", label: "2025/2026" }, "season", false);
    expect(state.calls).toContainEqual({
      table: "matches",
      method: "eq",
      args: ["status", "played"],
    });
    expect(state.calls).toContainEqual({
      table: "matches",
      method: "eq",
      args: ["season_id", "season"],
    });
  });
  it("excluye el archivo de la temporada actual del histórico", async () => {
    await getClubRankingsData({ id: "season", label: "2025/2026" }, "legends", false);
    expect(state.calls).toContainEqual({
      table: "historical_player_stats",
      method: "neq",
      args: ["season_id", "season"],
    });
  });
  it("un fallo de consulta no se presenta como un ranking vacío", async () => {
    state.error = "connection failed";
    await expect(
      getClubRankingsData({ id: "season", label: "2025/2026" }, "season", false),
    ).rejects.toThrow("connection failed");
  });
});
