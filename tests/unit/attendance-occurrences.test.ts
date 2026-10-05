import { describe, it, expect } from "vitest";
import { buildAttendanceOccurrences } from "@/lib/domain/attendance-occurrences";

const now = new Date("2026-09-30T22:00:00Z");
const roster = { team_id: "team", player_id: "p", joined_at: "2026-09-01", left_at: null };
const session = { id: "s", team_id: "team", scheduled_at: "2026-09-02T18:00:00Z", joint_id: null };
describe("asistencia provisional", () => {
  it("cuenta una lista sin revisar como presente y una falta marcada la sustituye", () => {
    const input = { sessions: [session], rosters: [roster], entries: [], through: now };
    expect(buildAttendanceOccurrences(input)[0]).toMatchObject({ present: true, unreviewed: true });
    expect(
      buildAttendanceOccurrences({
        ...input,
        entries: [{ session_id: "s", player_id: "p", present: false }],
      })[0],
    ).toMatchObject({ present: false, unreviewed: false });
  });
  it("respeta cancelaciones, futuro, destinos y fechas de plantilla", () => {
    const sessions = [
      session,
      { ...session, id: "future", scheduled_at: "2026-10-02T18:00:00Z" },
      { ...session, id: "cancelled", cancelled: true },
      { ...session, id: "target", player_ids: ["other"] },
      { ...session, id: "early", scheduled_at: "2026-08-30T18:00:00Z" },
      { ...session, id: "late", scheduled_at: "2026-09-10T18:00:00Z" },
    ];
    expect(
      buildAttendanceOccurrences({
        sessions,
        rosters: [{ ...roster, left_at: "2026-09-05" }],
        entries: [],
        through: now,
      }).map((r) => r.session_id),
    ).toEqual(["s"]);
  });
  it("una falta explícita prevalece sobre otra copia conjunta sin revisar", () => {
    const sessions = [
      { ...session, joint_id: "joint" },
      { ...session, id: "s2", team_id: "other", joint_id: "joint" },
    ];
    const input = {
      sessions,
      rosters: [roster, { ...roster, team_id: "other" }],
      entries: [{ session_id: "s", player_id: "p", present: false }],
      through: now,
    };
    expect(buildAttendanceOccurrences(input)).toHaveLength(1);
    expect(buildAttendanceOccurrences(input)[0]).toMatchObject({
      present: false,
      unreviewed: false,
    });
    expect(
      buildAttendanceOccurrences({ ...input, deduplicate: false }).every(
        (r) => !r.present && !r.unreviewed,
      ),
    ).toBe(true);
  });
  it("la revisión más reciente sustituye a un registro conjunto antiguo", () => {
    const sessions = [
      { ...session, joint_id: "joint" },
      { ...session, id: "s2", team_id: "other", joint_id: "joint" },
    ];
    const entries = [
      { session_id: "s", player_id: "p", present: true, updated_at: "2026-09-02T19:00:00Z" },
      { session_id: "s2", player_id: "p", present: false, updated_at: "2026-09-02T20:00:00Z" },
    ];
    expect(
      buildAttendanceOccurrences({
        sessions,
        rosters: [roster, { ...roster, team_id: "other" }],
        entries,
        through: now,
      })[0]?.present,
    ).toBe(false);
  });
  it("aplica el día local de Madrid y no cuenta a perfiles ajenos", () => {
    const records = buildAttendanceOccurrences({
      sessions: [{ ...session, scheduled_at: "2026-08-31T22:30:00Z" }],
      rosters: [roster, { ...roster, player_id: "other" }],
      entries: [],
      playerIds: ["p"],
      through: now,
    });
    expect(records.map((r) => r.player_id)).toEqual(["p"]);
  });
});
