import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCalendarData } from "@/server/queries/calendar";
const state = vi.hoisted(() => ({
  responses: {} as Record<string, unknown>,
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "in", "eq", "gte", "lte", "order"])
        chain[method] = (...args: unknown[]) => {
          state.calls.push({ table, method, args });
          return chain;
        };
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(state.responses[table] ?? { data: [], error: null }).then(resolve);
      return chain;
    },
  }),
}));
const input = {
  teamIds: ["team"],
  profileId: "child",
  startIso: "2026-09-01T00:00:00Z",
  endIso: "2026-09-30T23:59:59Z",
};
beforeEach(() => {
  state.responses = {};
  state.calls = [];
});
describe("Calendario: alcance y fallos de consultas", () => {
  it("incluye una convocatoria de refuerzo fuera del equipo habitual", async () => {
    state.responses.match_callups = {
      data: [
        {
          match_id: "match",
          status: "called",
          cap_number: 7,
          matches: {
            id: "match",
            team_id: "older",
            scheduled_at: "2026-09-02T17:00:00Z",
            opponent: "Turia",
            teams: { label: "Infantil", color: "#123456" },
          },
        },
      ],
    };
    const data = await getCalendarData(input);
    expect(data.get("2026-09-02")?.matches[0]).toMatchObject({
      id: "match",
      team_label: "Infantil",
      cap_number: 7,
      callup_status: "called",
    });
    expect(state.calls).toContainEqual({
      table: "match_callups",
      method: "eq",
      args: ["player_id", "child"],
    });
    expect(state.calls).toContainEqual({
      table: "training_sessions",
      method: "gte",
      args: ["scheduled_at", input.startIso],
    });
  });
  it("respeta el equipo elegido sin colar convocatorias de otro equipo", async () => {
    state.responses.match_callups = {
      data: [
        {
          match_id: "match",
          status: "called",
          cap_number: 7,
          matches: { id: "match", team_id: "older", scheduled_at: "2026-09-02T17:00:00Z" },
        },
      ],
    };
    expect((await getCalendarData({ ...input, includeCalledMatches: false })).size).toBe(0);
  });
  it("oculta una sesión individual de otra persona, pero la muestra a su técnico", async () => {
    state.responses.training_sessions = {
      data: [
        {
          id: "session",
          team_id: "team",
          player_ids: ["other"],
          kind: "dry",
          scheduled_at: "2026-09-02T22:30:00Z",
          teams: { label: "Cadete" },
        },
      ],
    };
    expect((await getCalendarData(input)).size).toBe(0);
    state.responses.team_staff = { data: [{ team_id: "team" }] };
    expect((await getCalendarData(input)).get("2026-09-03")?.trainings[0]).toMatchObject({
      id: "session",
      training_kind: "dry",
    });
  });
  it.each(["training_sessions", "matches", "team_staff", "match_callups"])(
    "muestra un error si falla %s, no un falso calendario vacío",
    async (table) => {
      state.responses[table] = { data: null, error: { message: "offline" } };
      await expect(getCalendarData(input)).rejects.toThrow();
    },
  );
});
