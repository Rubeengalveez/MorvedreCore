import { beforeEach, describe, it, expect, vi } from "vitest";
import { getCoachAttendanceReport } from "@/server/queries/attendance";
const state = vi.hoisted(() => ({
  rows: {} as Record<string, Record<string, unknown>[]>,
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  error: "",
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string) {
      let from = 0,
        to = 499;
      const filters: Array<(row: Record<string, unknown>) => boolean> = [];
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "in", "eq", "gte", "lte", "or", "order", "range"])
        chain[method] = (...args: unknown[]) => {
          state.calls.push({ table, method, args });
          if (method === "range") {
            from = Number(args[0]);
            to = Number(args[1]);
          }
          if (method === "in")
            filters.push((row) => (args[1] as unknown[]).includes(row[String(args[0])]));
          if (method === "eq") filters.push((row) => row[String(args[0])] === args[1]);
          if (method === "gte")
            filters.push((row) => String(row[String(args[0])]) >= String(args[1]));
          if (method === "lte")
            filters.push((row) => String(row[String(args[0])]) <= String(args[1]));
          return chain;
        };
      chain.then = (resolve: (value: unknown) => unknown) => {
        const rows = (state.rows[table] ?? []).filter((row) =>
          filters.every((filter) => filter(row)),
        );
        return Promise.resolve({
          data: rows.slice(from, to + 1),
          count: rows.length,
          error: state.error === table ? { message: "Sin conexión" } : null,
        }).then(resolve);
      };
      return chain;
    },
  }),
}));
const team = { id: "team", label: "Infantil", color: "#1657a8" };
beforeEach(() => {
  state.calls = [];
  state.error = "";
  state.rows = {
    training_sessions: ["01", "08"].map((day) => ({
      id: day,
      team_id: "team",
      joint_id: null,
      player_ids: null,
      scheduled_at: `2026-09-${day}T18:00:00Z`,
      cancelled: false,
    })),
    team_rosters: [{ player_id: "p", team_id: "team", joined_at: "2026-09-01", left_at: null }],
    profiles_public: [{ id: "p", full_name: "Álex García", photo_url: null }],
    training_attendance: [
      {
        session_id: "08",
        player_id: "p",
        present: false,
        reason: null,
        marked_at: "2026-09-09T10:00:00Z",
        updated_at: "2026-09-09T10:00:00Z",
      },
    ],
  };
});
describe("consulta de resumen", () => {
  it("conserva el calendario completo aunque el resumen elegido sea semanal", async () => {
    const result = await getCoachAttendanceReport({
      teams: [team],
      from: "2026-09-07",
      to: "2026-09-13",
      now: new Date("2026-09-30T20:00:00Z"),
    });
    expect(result[0]?.players[0]).toMatchObject({
      attended: 0,
      absent: 1,
      total: 1,
      unreviewed: 0,
    });
    expect(result[0]?.players[0]?.records).toHaveLength(2);
    expect(result[0]?.players[0]?.records[0]).toMatchObject({ present: true, unreviewed: true });
    expect(state.calls.some((call) => call.table === "profiles")).toBe(false);
  });
  it("una lectura fallida no se convierte en presencia provisional", async () => {
    state.error = "training_attendance";
    await expect(
      getCoachAttendanceReport({ teams: [team], from: "2026-09-01", to: "2026-09-30" }),
    ).rejects.toThrow("asistencia registrada");
  });
  it("lee más de 500 registros completos sin truncar listas", async () => {
    state.rows.training_sessions = Array.from({ length: 51 }, (_, i) => ({
      id: `s${i}`,
      team_id: "team",
      scheduled_at: "2026-09-08T18:00:00Z",
      cancelled: false,
    }));
    state.rows.team_rosters = Array.from({ length: 11 }, (_, i) => ({
      player_id: `p${i}`,
      team_id: "team",
      joined_at: "2026-09-01",
      left_at: null,
    }));
    state.rows.profiles_public = Array.from({ length: 11 }, (_, i) => ({
      id: `p${i}`,
      full_name: `Jugador ${i}`,
      photo_url: null,
    }));
    state.rows.training_attendance = state.rows.training_sessions.flatMap((s) =>
      state.rows.team_rosters!.map((p) => ({
        session_id: s.id,
        player_id: p.player_id,
        present: true,
        reason: null,
        marked_at: "2026-09-09T10:00:00Z",
        updated_at: "2026-09-09T10:00:00Z",
      })),
    );
    const reports = await getCoachAttendanceReport({
      teams: [team],
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(reports[0]?.attended).toBe(561);
    expect(reports[0]?.reviewed_session_count).toBe(51);
    expect(state.calls).toContainEqual({
      table: "training_attendance",
      method: "range",
      args: [500, 999],
    });
  });
});
