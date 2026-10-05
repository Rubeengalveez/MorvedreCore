import { beforeEach, expect, it, vi } from "vitest";
import { createTeam } from "@/server/actions/admin/teams";

const mocks = vi.hoisted(() => ({ client: vi.fn(), permission: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/server/actions/admin/_helpers", () => ({
  requirePermission: mocks.permission,
  requireAnyPermission: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.invalidate }));
beforeEach(() => vi.resetAllMocks());
const input = {
  season_id: "11111111-1111-4111-8111-111111111111",
  category_code: "alevin" as const,
  label: "Alevín",
  gender: "mixed" as const,
};
it("el servidor elige la temporada actual aunque le envíen otra", async () => {
  const insert = vi.fn(() => ({
    select: () => ({ single: async () => ({ data: { id: "team" }, error: null }) }),
  }));
  const eq = vi.fn(() => ({
    maybeSingle: async () => ({ data: { id: "current-season" }, error: null }),
  }));
  mocks.client.mockResolvedValue({
    from: (name: string) => (name === "seasons" ? { select: () => ({ eq }) } : { insert }),
  });
  await createTeam(input);
  expect(eq).toHaveBeenCalledWith("is_current", true);
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ season_id: "current-season" }));
  expect(mocks.permission).toHaveBeenCalledWith("manage_teams");
});
it("sin temporada actual no crea el equipo", async () => {
  const from = vi.fn(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
  }));
  mocks.client.mockResolvedValue({ from });
  await expect(createTeam(input)).rejects.toThrow("Activa una temporada");
  expect(from).toHaveBeenCalledTimes(1);
});
