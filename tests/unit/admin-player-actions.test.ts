import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayer, setPlayerActive, updatePlayer } from "@/server/actions/admin/players";
const state = vi.hoisted(() => ({
  permission: vi.fn(),
  rpc: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
  factory: vi.fn(),
  role: true,
  actor: "11111111-1111-4111-8111-111111111111",
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: state.revalidate }));
vi.mock("@/server/actions/admin/_helpers", () => ({
  requirePermission: state.permission,
  requireAdmin: state.permission,
  throwIfError: (error: unknown, message: string) => {
    if (error) throw new Error(message);
  },
}));
vi.mock("@/server/actions/admin/teams", () => ({ rosterPlayer: vi.fn(), unrosterPlayer: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    state.factory();
    return {
      rpc: state.rpc,
      from: (table: string) => {
        const query = {
          select: () => query,
          eq: () => query,
          limit: () => query,
          maybeSingle: async () => ({
            data: table === "user_roles" && state.role ? { profile_id: "player" } : null,
            error: null,
          }),
          update: (value: unknown) => {
            state.update(value);
            return query;
          },
          single: async () => ({ data: { id: "player" }, error: null }),
        };
        return query;
      },
    };
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.role = true;
  state.permission.mockResolvedValue({ id: state.actor });
  state.rpc.mockResolvedValue({ data: { id: "player" }, error: null });
});
const id = "22222222-2222-4222-8222-222222222222";
describe("Protecciones de gestión de jugadores", () => {
  it("valida permisos antes de consultar o mutar datos", async () => {
    state.permission.mockRejectedValue(new Error("Sin permiso"));
    await expect(
      createPlayer({ full_name: "Pepe López", birth_year: 2012, team_id: id }),
    ).rejects.toThrow("Sin permiso");
    expect(state.factory).not.toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("registra por una sola operación transaccional", async () => {
    await createPlayer({ full_name: "Pepe López", birth_year: 2012, team_id: id });
    expect(state.rpc).toHaveBeenCalledExactlyOnceWith("register_admin_player", {
      p_input: { full_name: "Pepe López", birth_year: 2012, team_id: id },
    });
  });
  it("presenta el duplicado y evita exponer errores técnicos", async () => {
    state.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Ya existe un jugador con ese nombre y año." },
    });
    await expect(
      createPlayer({ full_name: "Pepe López", birth_year: 2012, team_id: id }),
    ).rejects.toThrow("Ya existe");
    state.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "internal schema SQL secret" },
    });
    await expect(
      createPlayer({ full_name: "Pepe López", birth_year: 2012, team_id: id }),
    ).rejects.toThrow("No pudimos completar");
  });
  it("actualiza solo el campo indicado, sin vaciar contacto o foto", async () => {
    await updatePlayer(id, { full_name: "Pepe López Díaz" });
    expect(state.update).toHaveBeenCalledExactlyOnceWith({ full_name: "Pepe López Díaz" });
  });
  it("rechaza editar o desactivar perfiles que no son jugadores", async () => {
    state.role = false;
    await expect(updatePlayer(id, { full_name: "Pepe López" })).rejects.toThrow(
      "ficha del jugador",
    );
    await expect(setPlayerActive({ profile_id: id, active: false })).rejects.toThrow(
      "ficha del jugador",
    );
    expect(state.update).not.toHaveBeenCalled();
  });
  it("impide desactivar el perfil propio por ambas acciones", async () => {
    await expect(setPlayerActive({ profile_id: state.actor, active: false })).rejects.toThrow(
      "propio perfil",
    );
    await expect(updatePlayer(state.actor, { is_active: false })).rejects.toThrow("propio perfil");
    expect(state.update).not.toHaveBeenCalled();
  });
});
