import { describe, expect, it, vi } from "vitest";
import { getTrainingSessionsInRange } from "@/server/queries/training-sessions";

function clientFor(range: ReturnType<typeof vi.fn>) {
  const query: Record<string, unknown> = { range };
  for (const name of ["select", "in", "gte", "lt", "order"]) query[name] = vi.fn(() => query);
  return { from: vi.fn(() => query) } as unknown as Parameters<
    typeof getTrainingSessionsInRange
  >[0];
}
describe("training session pagination", () => {
  it("does not lose sessions beyond Supabase's first 1000 rows", async () => {
    const range = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, i) => ({ id: String(i) })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ id: "last" }], error: null });
    const sessions = await getTrainingSessionsInRange(
      clientFor(range),
      ["team"],
      "2026-10-04",
      "2026-11-01",
    );
    expect(sessions).toHaveLength(1001);
    expect(sessions.at(-1)?.id).toBe("last");
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
  it("rejects incomplete results when a later page fails", async () => {
    const range = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, () => ({ id: "session" })),
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { message: "network" } });
    await expect(
      getTrainingSessionsInRange(clientFor(range), ["team"], "2026-10-04", "2026-11-01"),
    ).rejects.toThrow("No pudimos cargar");
  });
});
