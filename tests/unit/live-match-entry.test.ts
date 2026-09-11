import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ from: vi.fn(), access: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mock.from }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/actions/admin/_helpers", () => ({
  getAdminAccess: mock.access,
  requireMatchStaffOf: mock.access,
}));
import { loadLiveMatch } from "@/server/actions/live-match";

const id = "10000000-0000-4000-8000-000000000001";
const player = (n: number) => ({
  player_id: `10000000-0000-4000-8000-00000000000${n}`,
  cap_number: 2,
  profiles: { full_name: `Jugador ${n}` },
});
beforeEach(() => {
  mock.access.mockResolvedValue({
    profile: { id },
    isAdmin: false,
    permissions: new Set(),
    coachTeamIds: new Set(),
    matchStaffTeamIds: new Set([id]),
    delegateTeamIds: new Set([id]),
  });
  mock.from.mockImplementation((table: string) => {
    const result = {
      data:
        table === "matches"
          ? {
              id,
              team_id: id,
              opponent: "Rival",
              teams: { label: "Infantil", category_code: "infantil" },
            }
          : table === "live_match_sheets"
            ? null
            : table === "match_callups"
              ? [player(2), player(3)]
              : [],
      error: null,
    };
    const query: Record<string, unknown> = {
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    };
    for (const method of ["select", "eq", "in", "single", "maybeSingle"])
      query[method] = () => query;
    return query;
  });
});

it("ofrece corregir los gorros de una convocatoria existente sin enviarte al administrador", async () => {
  const result = await loadLiveMatch(id);
  expect(result).toMatchObject({ ok: false, preparation: { players: [{ cap: 2 }, { cap: 2 }] } });
  expect(JSON.stringify(result)).not.toContain("Prepara la convocatoria");
});

it("un administrador sin asignación de delegado no puede abrir el acta", async () => {
  const access = await mock.access();
  mock.access.mockResolvedValue({ ...access, isAdmin: true, delegateTeamIds: new Set() });
  expect(await loadLiveMatch(id)).toMatchObject({
    ok: false,
    error: "El acta en directo está reservada al delegado de este equipo.",
  });
});
