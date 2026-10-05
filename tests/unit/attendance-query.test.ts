import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAttendanceTeams, getCoachAttendanceSessions } from "@/server/queries/dashboard";

const state = vi.hoisted(() => ({ responses: {} as Record<string, unknown> }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "in", "eq", "gte", "lte", "order", "or"])
        chain[method] = () => chain;
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(state.responses[table] ?? { data: [], error: null }).then(resolve);
      return chain;
    },
  }),
}));

const teams = [{ id: "team", label: "Infantil", color: "#123456", staff_role: "coach" }];
beforeEach(() => {
  state.responses = {
    training_sessions: {
      data: [
        {
          id: "session",
          team_id: "team",
          scheduled_at: "2026-09-02T22:30:00Z",
          end_at: null,
          location: null,
          kind: "dry",
          player_ids: ["child"],
        },
      ],
      error: null,
    },
    team_rosters: {
      data: [
        { team_id: "team", player_id: "child" },
        { team_id: "team", player_id: "other" },
      ],
      error: null,
    },
    profiles: {
      data: [
        { id: "child", full_name: "Ana García" },
        { id: "other", full_name: "Pablo López" },
      ],
      error: null,
    },
    training_attendance: {
      data: [{ session_id: "session", player_id: "child", present: false, reason: "Avisado" }],
      error: null,
    },
  };
});

describe("Consultas de pasar lista", () => {
  it("respeta el día de Madrid, el tipo de entrenamiento y los jugadores seleccionados", async () => {
    expect(await getCoachAttendanceSessions(teams, "2026-09-02")).toEqual([]);
    const sessions = await getCoachAttendanceSessions(teams, "2026-09-03");
    expect(sessions[0]).toMatchObject({
      kind: "dry",
      roster_count: 1,
      absent_count: 1,
      players: [{ id: "child", attendance: false, reason: "Avisado" }],
    });
  });
  it.each(["training_sessions", "team_rosters", "profiles", "training_attendance"])(
    "no presenta una lista vacía cuando falla %s",
    async (table) => {
      state.responses[table] = { data: null, error: { message: "offline" } };
      await expect(getCoachAttendanceSessions(teams, "2026-09-03")).rejects.toThrow();
    },
  );
  it("no presenta un día sin equipos cuando falla la consulta", async () => {
    state.responses.teams = { data: null, error: { message: "offline" } };
    await expect(getAttendanceTeams("season")).rejects.toThrow();
  });
});
