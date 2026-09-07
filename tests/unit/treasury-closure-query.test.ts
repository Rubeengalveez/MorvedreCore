import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
import { getTreasuryClosure } from "@/server/queries/treasury";

beforeEach(() => vi.clearAllMocks());

function setup(failSecondPage = false) {
  const rows = Array.from({ length: 1205 }, (_, index) => ({
    id: `line-${index}`,
    amount_cents: 100,
    profiles: { full_name: "Perfil de prueba" },
  }));
  mocks.from.mockImplementation((table) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      maybeSingle: async () => ({ data: { id: "closure", total_cents: 120500 }, error: null }),
      range: async (from: number, to: number) =>
        failSecondPage && from > 0
          ? { data: null, count: null, error: { message: "unavailable" } }
          : { data: rows.slice(from, to + 1), count: rows.length, error: null },
    };
    if (!["treasury_lines", "treasury_period_closures"].includes(table))
      throw new Error("Unexpected table");
    return chain;
  });
}

it("returns every closure line and its profile name beyond 1000 rows", async () => {
  setup();
  const result = await getTreasuryClosure("closure");
  expect(result.lines).toHaveLength(1205);
  expect(result.closure?.line_count).toBe(1205);
  expect(result.lines.reduce((total, line) => total + line.amount_cents, 0)).toBe(
    result.closure?.total_cents,
  );
  expect(result.lines[1204]?.profile_name).toBe("Perfil de prueba");
});

it("does not return a partial closure to the export or email caller", async () => {
  setup(true);
  await expect(getTreasuryClosure("closure")).rejects.toThrow(
    "No pudimos cargar líneas del cierre",
  );
});
