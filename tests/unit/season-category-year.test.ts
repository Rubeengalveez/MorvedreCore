import { beforeEach, expect, it, vi } from "vitest";
import { getSeasonCategoryYear } from "@/server/queries/seasons";
import { safeInferCategory } from "@/lib/domain/categories";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  result: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.create }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.create.mockResolvedValue({ from: () => ({ select: mocks.select }) });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.result });
});

it.each([
  ["2025-09-01", "cadete", "cadete"],
  ["2026-09-01", "juvenil", "cadete"],
] as const)(
  "usa el inicio de %s aunque cambie el año del ordenador",
  async (start, older, younger) => {
    mocks.result.mockResolvedValue({ data: { start_date: start }, error: null });
    const year = await getSeasonCategoryYear("selected-season");
    expect(mocks.eq).toHaveBeenCalledWith("id", "selected-season");
    expect(safeInferCategory(2010, year)).toBe(older);
    expect(safeInferCategory(2011, year)).toBe(younger);
  },
);

it.each([
  { data: null, error: null },
  { data: null, error: { message: "offline" } },
])("no inventa una temporada si la consulta falla", async (result) => {
  mocks.result.mockResolvedValue(result);
  await expect(getSeasonCategoryYear("missing-season")).rejects.toThrow("comprobar la temporada");
});
