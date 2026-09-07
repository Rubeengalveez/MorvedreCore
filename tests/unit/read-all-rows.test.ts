import { describe, expect, it } from "vitest";
import { readAllRows } from "@/lib/supabase/read-all-rows";

describe("complete database reads", () => {
  it("reads through a server limit smaller than the requested page", async () => {
    const rows = Array.from({ length: 1207 }, (_, id) => ({ id }));
    const result = await readAllRows("registros", async (from) => ({
      data: rows.slice(from, from + 100),
      error: null,
      count: rows.length,
    }));
    expect(result).toEqual(rows);
  });

  it("rejects a partial result when a later page fails", async () => {
    await expect(
      readAllRows("registros", async (from) =>
        from === 0
          ? { data: [{ id: 1 }], count: 2, error: null }
          : { data: null, count: null, error: { message: "sin conexión" } },
      ),
    ).rejects.toThrow("No pudimos cargar registros");
  });

  it("rejects missing rows and changed counts", async () => {
    for (const next of [
      { data: [], count: 2 },
      { data: [{ id: 2 }], count: 3 },
    ]) {
      await expect(
        readAllRows("registros", async (from) => ({
          ...(from === 0 ? { data: [{ id: 1 }], count: 2 } : next),
          error: null,
        })),
      ).rejects.toThrow();
    }
  });

  it("requires an exact count, including for empty tables", async () => {
    await expect(
      readAllRows("registros", async () => ({ data: [], count: null, error: null })),
    ).rejects.toThrow("comprobar");
    await expect(
      readAllRows("registros", async () => ({ data: [], count: 0, error: null })),
    ).resolves.toEqual([]);
  });
});
