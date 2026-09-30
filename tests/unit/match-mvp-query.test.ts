import { beforeEach, describe, expect, it, vi } from "vitest";
import { sheetSchema, type LiveSheet } from "@/lib/domain/live-match";

const mocks = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  document: null as unknown,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      let mvpOnly = false;
      const result = () => ({
        data:
          table === "live_match_sheets"
            ? { document: mocks.document }
            : table === "match_callups"
              ? mocks.rows.map((row) => ({ player_id: row.player_id, cap_number: row.cap_number }))
              : mocks.rows.filter((row) => !mvpOnly || row.mvp),
        error: null,
      });
      const chain = {
        select: () => chain,
        eq: (column: string) => {
          if (column === "mvp") mvpOnly = true;
          return chain;
        },
        limit: () => chain,
        order: () => chain,
        maybeSingle: async () => {
          const r = result();
          return { ...r, data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data };
        },
        then: (resolve: (r: ReturnType<typeof result>) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return chain;
    },
  }),
}));

import { getMatchMvp, getMatchMvps } from "@/server/queries/matches";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
beforeEach(() => {
  mocks.rows = [
    {
      player_id: id(1),
      cap_number: 5,
      goals: 1,
      exclusions: 0,
      mvp: false,
      profiles: { full_name: "Alejandro Molina Castro" },
    },
    {
      player_id: id(2),
      cap_number: 3,
      goals: 1,
      exclusions: 0,
      mvp: false,
      profiles: { full_name: "Asier Carmona Ruiz" },
    },
  ];
  mocks.document = sheetSchema.parse({
    version: 2,
    players: [
      { id: id(1), cap: 5, name: "Alejandro Molina Castro" },
      { id: id(2), cap: 3, name: "Asier Carmona Ruiz" },
    ],
    opponentCaps: [1],
    periods: 4,
    period: 4,
    phase: "finished",
    keeper: null,
    baseline: [],
    baselineThem: 0,
    events: [
      { id: id(101), side: "us", cap: 5, kind: "goal", period: 1, keeper: null, deleted: false },
      { id: id(102), side: "us", cap: 3, kind: "goal", period: 2, keeper: null, deleted: false },
      { id: id(103), side: "us", cap: 5, kind: "assist", period: 2, keeper: null, deleted: false },
      { id: id(104), side: "us", cap: 5, kind: "assist", period: 3, keeper: null, deleted: false },
    ],
  });
});

describe("MVP del partido terminado", () => {
  it("conserva todos los ganadores cuando el MVP es compartido", async () => {
    const sheet = mocks.document as LiveSheet;
    sheet.events.push(
      { id: id(105), side: "us", cap: 3, kind: "assist", period: 3, keeper: null, deleted: false },
      { id: id(106), side: "us", cap: 3, kind: "assist", period: 4, keeper: null, deleted: false },
    );
    expect((await getMatchMvps(id(800))).map((p) => p.player_id)).toEqual([id(2), id(1)]);
  });
  it("recalcula con las jugadas válidas y no conserva un MVP desactualizado", async () => {
    const sheet = mocks.document as LiveSheet;
    sheet.events
      .filter((e) => e.kind === "assist")
      .forEach((e) => {
        e.deleted = true;
      });
    sheet.events.push({
      id: id(105),
      side: "us",
      cap: 3,
      kind: "goal",
      period: 4,
      keeper: null,
      deleted: false,
    });
    mocks.rows[0].mvp = true;
    expect(await getMatchMvp(id(800))).toMatchObject({ player_id: id(2), goals: 2, assists: 0 });
  });
  it("respeta un MVP guardado de un partido sin acta", async () => {
    mocks.document = null;
    mocks.rows[1].mvp = true;
    expect(await getMatchMvp(id(800))).toMatchObject({ player_id: id(2), goals: 1 });
  });
  it("muestra el MVP del acta aunque falte la marca almacenada", async () => {
    expect(await getMatchMvp(id(800))).toMatchObject({
      player_id: id(1),
      full_name: "Alejandro Molina Castro",
      cap_number: 5,
      goals: 1,
      assists: 2,
    });
  });
});
