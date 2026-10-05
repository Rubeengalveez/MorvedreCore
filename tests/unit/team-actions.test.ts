import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTeam, rosterPlayer } from "@/server/actions/admin/teams";
const state = vi.hoisted(() => ({
  existing: null as { left_at: string | null } | null,
  writeError: false,
  writeCount: 1,
  birth: 2015,
  calls: vi.fn(),
  revalidate: vi.fn(),
  permission: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: state.revalidate }));
vi.mock("@/server/actions/admin/_helpers", () => ({
  requirePermission: state.permission,
  requireAnyPermission: state.permission,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      let mode = "read";
      const q = {
        select: () => q,
        eq: () => q,
        update: (input: unknown) => {
          mode = "write";
          state.calls(table, "update", input);
          return q;
        },
        insert: (input: unknown) => {
          mode = "write";
          state.calls(table, "insert", input);
          return q;
        },
        maybeSingle: async () => ({
          error: null,
          data:
            table === "seasons"
              ? { id: teamId }
              : table === "teams"
                ? { id: teamId, category_code: "alevin", seasons: { start_date: "2026-09-01" } }
                : table === "profiles"
                  ? { id: playerId, birth_year: state.birth }
                  : state.existing,
        }),
        single: async () => ({ error: null, data: { id: teamId } }),
        then: (resolve: (result: unknown) => unknown) =>
          Promise.resolve({
            error: mode === "write" && state.writeError ? { message: "offline" } : null,
            count: state.writeCount,
          }).then(resolve),
      };
      return q;
    },
  }),
}));
const teamId = "11111111-1111-4111-8111-111111111111",
  playerId = "22222222-2222-4222-8222-222222222222";
beforeEach(() => {
  vi.clearAllMocks();
  state.existing = null;
  state.writeError = false;
  state.writeCount = 1;
  state.birth = 2015;
});
describe("Gestión de equipos", () => {
  it("crea el equipo con las notas elegidas y actualiza ambas vistas", async () => {
    await createTeam({
      season_id: teamId,
      label: "Alevín B",
      category_code: "alevin",
      gender: "mixed",
      notes: "Prueba de notas",
    });
    expect(state.calls).toHaveBeenCalledWith(
      "teams",
      "insert",
      expect.objectContaining({ notes: "Prueba de notas" }),
    );
    expect(state.revalidate).toHaveBeenCalledWith("/team");
  });
  it("reincorpora al jugador que salió conservando su registro anterior", async () => {
    state.existing = { left_at: "2026-09-21" };
    await rosterPlayer({ team_id: teamId, player_id: playerId, squad_number: 8 });
    expect(state.calls).toHaveBeenCalledWith("team_rosters", "update", {
      left_at: null,
      squad_number: 8,
    });
    expect(state.calls).not.toHaveBeenCalledWith("team_rosters", "insert", expect.anything());
    expect(state.revalidate).toHaveBeenCalledWith(`/team/${teamId}`);
  });
  it("rechaza un jugador ya activo", async () => {
    state.existing = { left_at: null };
    await expect(rosterPlayer({ team_id: teamId, player_id: playerId })).rejects.toThrow("ya está");
    expect(state.calls).not.toHaveBeenCalled();
  });
  it("si otra sesión cambia la plantilla, no comunica una reincorporación que no ocurrió", async () => {
    state.existing = { left_at: "2026-09-21" };
    state.writeCount = 0;
    await expect(rosterPlayer({ team_id: teamId, player_id: playerId })).rejects.toThrow(
      "plantilla ha cambiado",
    );
    expect(state.revalidate).not.toHaveBeenCalled();
  });
  it("la reincorporación vuelve a comprobar la categoría", async () => {
    state.existing = { left_at: "2026-09-21" };
    state.birth = 2000;
    await expect(rosterPlayer({ team_id: teamId, player_id: playerId })).rejects.toThrow(
      "categoría",
    );
    expect(state.calls).not.toHaveBeenCalled();
  });
  it("no anuncia éxito ni invalida vistas si falla la escritura", async () => {
    state.writeError = true;
    await expect(rosterPlayer({ team_id: teamId, player_id: playerId })).rejects.toThrow(
      "No pudimos añadir",
    );
    expect(state.revalidate).not.toHaveBeenCalled();
  });
});
