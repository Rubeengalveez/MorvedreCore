import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  permission: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));
vi.mock("@/server/actions/admin/_helpers", () => ({ requirePermission: mocks.permission }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/email/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/exports/treasury-export", () => ({
  buildTreasuryClosureWorkbook: vi.fn(),
  treasuryClosureFilename: vi.fn(),
}));
vi.mock("@/server/queries/treasury", () => ({ getTreasuryClosure: vi.fn() }));

import { buildTreasuryPeriodClosure, markTreasuryLinePaid } from "@/server/actions/admin/treasury";

const input = {
  season_id: "10000000-0000-4000-8000-000000000001",
  period_start: "2026-09-01",
  period_end: "2026-09-30",
};
const result = { id: "10000000-0000-4000-8000-000000000002", total_cents: 0, line_count: 0 };

function query(response: { data: unknown; error: { message: string } | null }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(async (from: number, to: number) => ({
      data: Array.isArray(response.data) ? response.data.slice(from, to + 1) : response.data,
      count: Array.isArray(response.data) ? response.data.length : null,
      error: response.error,
    })),
    update: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => response),
    then: (resolve: (value: typeof response) => unknown) => Promise.resolve(response).then(resolve),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permission.mockResolvedValue({ id: "10000000-0000-4000-8000-000000000003" });
  mocks.from.mockImplementation(() => query({ data: [], error: null }));
  mocks.rpc.mockResolvedValue({ data: result, error: null });
});

describe("treasury writes", () => {
  it("loads all assignments beyond the first API page", async () => {
    const rows = Array.from({ length: 1205 }, (_, index) => ({
      id: `assignment-${index}`,
      profile_id: "missing",
      concept_id: "missing",
    }));
    const assignments = query({ data: rows, error: null });
    mocks.from.mockImplementation((table) =>
      table === "treasury_profile_concepts" ? assignments : query({ data: [], error: null }),
    );
    await buildTreasuryPeriodClosure(input);
    expect(assignments.range).toHaveBeenCalledTimes(3);
    expect(assignments.range).toHaveBeenLastCalledWith(1000, 1499);
  });

  it("restricts the roster to the selected season", async () => {
    const rosters = query({ data: [], error: null });
    mocks.from.mockImplementation((table) =>
      table === "team_rosters" ? rosters : query({ data: [], error: null }),
    );
    await buildTreasuryPeriodClosure(input);
    expect(rosters.eq).toHaveBeenCalledWith("teams.season_id", input.season_id);
    expect(rosters.select).toHaveBeenCalledWith(expect.stringContaining("teams!inner"), {
      count: "exact",
    });
  });
  it.each([
    "treasury_concepts",
    "treasury_profile_concepts",
    "profiles",
    "team_rosters",
    "shop_orders",
    "treasury_profile_settings",
  ])("does not generate a partial closure when reading %s fails", async (failedTable) => {
    mocks.from.mockImplementation((table) =>
      query({ data: [], error: table === failedTable ? { message: "unavailable" } : null }),
    );
    await expect(buildTreasuryPeriodClosure(input)).rejects.toThrow("No pudimos cargar");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("saves through one atomic operation and returns the database result", async () => {
    await expect(buildTreasuryPeriodClosure(input)).resolves.toEqual(result);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "atomic_save_treasury_closure",
      expect.objectContaining({ p_lines: [] }),
    );
    expect(mocks.from).not.toHaveBeenCalledWith("treasury_lines");
    expect(mocks.from).not.toHaveBeenCalledWith("treasury_period_closures");
  });

  it("surfaces a protected closure without claiming a successful update", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "Este cierre tiene cobros registrados." },
    });
    await expect(buildTreasuryPeriodClosure(input)).rejects.toThrow("cobros registrados");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("does not claim a payment was updated when its line disappeared", async () => {
    mocks.from.mockImplementation(() => query({ data: null, error: null }));
    await expect(markTreasuryLinePaid({ line_id: result.id, paid: true })).rejects.toThrow(
      "ya no existe",
    );
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
