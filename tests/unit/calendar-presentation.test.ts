import { describe, it, expect } from "vitest";
import {
  calendarMonth,
  calendarMonthKey,
  compactMonthCells,
  calendarAttendanceStatus,
  groupCalendarTrainings,
  mergeCalendarData,
  calendarBackHref,
} from "@/lib/domain/calendar-presentation";
import { getMatchBackTarget } from "@/lib/domain/match-navigation";
import type { CalendarTraining, CalendarData } from "@/server/queries/calendar";
const training: CalendarTraining = {
  id: "a",
  team_id: "team-a",
  team_label: "Cadete A",
  team_color: "#112233",
  block_label: "Agua",
  scheduled_at: "2026-09-24T17:00:00Z",
  duration_minutes: 90,
  location: "Piscina",
  maps_url: null,
  cancelled: false,
  cancellation_reason: null,
  joint_id: "joint",
  training_kind: "water",
  attendance: [{ player_id: "child", name: "Luis", present: true }],
};
describe("Calendario mensual: fechas, familias y entrenamientos conjuntos", () => {
  it("los entrenamientos futuros no tienen asistencia provisional", () => {
    expect(
      calendarAttendanceStatus([
        {
          ...training,
          scheduled_at: "2040-10-05T17:00:00Z",
          attendance: [{ player_id: "child", name: "Luis", present: null }],
        },
      ]),
    ).toBeNull();
  });
  it("la presencia de un grupo conjunto no modifica el registro de origen", () => {
    const absent = {
      ...training,
      attendance: [{ player_id: "child", name: "Luis", present: false }],
    };
    expect(
      groupCalendarTrainings([absent, { ...training, id: "b", team_id: "team-b" }])[0]
        ?.attendance?.[0]?.present,
    ).toBe(true);
    expect(absent.attendance[0]?.present).toBe(false);
  });

  it("acepta meses válidos y rechaza fechas fuera del intervalo", () => {
    expect(calendarMonthKey(calendarMonth("2026-02"))).toBe("2026-02");
    expect(calendarMonthKey(calendarMonth("2026-99", new Date("2026-10-04T10:00:00Z")))).toBe(
      "2026-10",
    );
    expect(calendarMonthKey(calendarMonth("9999-01", new Date("2026-10-04T10:00:00Z")))).toBe(
      "2026-10",
    );
  });
  it("deriva el mes en Madrid cerca del cambio de día", () => {
    expect(
      calendarMonth(
        new Date("2026-09-30T22:30:00Z").toISOString().slice(0, 0),
        new Date("2026-09-30T22:30:00Z"),
      ),
    ).toEqual({ year: 2026, month: 9 });
  });
  it("quita solo las filas de semanas que no son necesarias", () => {
    expect(compactMonthCells(2021, 1)).toHaveLength(28);
    expect(compactMonthCells(2026, 8)).toHaveLength(35);
    expect(compactMonthCells(2026, 2)).toHaveLength(42);
    expect(compactMonthCells(2026, 8).filter((cell) => cell.inMonth)).toHaveLength(30);
  });
  it("conserva todos los equipos y sesiones de un entrenamiento conjunto", () => {
    const result = groupCalendarTrainings([
      training,
      {
        ...training,
        id: "b",
        team_id: "team-b",
        team_label: "Juvenil",
        can_manage: true,
        attendance: [{ player_id: "other", name: "Ana", present: false }],
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].team_ids).toEqual(["team-a", "team-b"]);
    expect(result[0].session_ids).toEqual(["a", "b"]);
    expect(result[0].id).toBe("b");
    expect(calendarAttendanceStatus(result)).toBe("mixed");
  });
  it("separa excepciones de horario y de cancelación dentro del mismo grupo", () => {
    expect(
      groupCalendarTrainings([
        training,
        { ...training, id: "b", team_id: "team-b", duration_minutes: 60 },
        { ...training, id: "c", cancelled: true },
      ]),
    ).toHaveLength(3);
  });
  it("una lista pendiente nunca se convierte en ausencia", () => {
    expect(
      calendarAttendanceStatus([
        { ...training, attendance: [{ player_id: "child", name: "Luis", present: null }] },
      ]),
    ).toBe("unreviewed");
    expect(
      calendarAttendanceStatus([
        {
          ...training,
          cancelled: true,
          attendance: [{ player_id: "child", name: "Luis", present: false }],
        },
      ]),
    ).toBeNull();
  });
  it("mantiene provisional a quien no tiene lista sin atribuirle una falta", () => {
    expect(
      calendarAttendanceStatus([
        {
          ...training,
          attendance: [
            { player_id: "child", name: "Luis", present: true },
            { player_id: "other", name: "Ana", present: null },
          ],
        },
      ]),
    ).toBe("unreviewed");
  });
  it("cuenta una sesión conjunta una vez por jugador y conserva su presencia", () => {
    const same = {
      ...training,
      id: "b",
      team_id: "team-b",
      attendance: [{ player_id: "child", name: "Luis", present: false }],
    };
    expect(calendarAttendanceStatus([training, same])).toBe("present");
  });
  it("fusiona calendarios familiares sin perder a quién pertenece la asistencia", () => {
    const left: CalendarData = new Map([["2026-10-05", { trainings: [training], matches: [] }]]);
    const right: CalendarData = new Map([
      [
        "2026-10-05",
        {
          trainings: [
            { ...training, attendance: [{ player_id: "other", name: "Ana", present: false }] },
          ],
          matches: [],
        },
      ],
    ]);
    const result = mergeCalendarData([left, right]);
    expect(result.get("2026-10-05")!.trainings).toHaveLength(1);
    expect(result.get("2026-10-05")!.trainings[0].attendance).toHaveLength(2);
    expect(left.get("2026-10-05")!.trainings[0].attendance).toHaveLength(1);
  });
  it("vuelve del partido al mismo mes, equipo y jugador sin destinos arbitrarios", () => {
    const input = {
      from: "calendar",
      calendarMonth: "2026-09",
      calendarPlayer: "550e8400-e29b-41d4-a716-446655440001",
      calendarTeam: "550e8400-e29b-41d4-a716-446655440002",
      calendarDay: "2026-09-08",
      matchTeamId: "x",
    };
    expect(getMatchBackTarget(input)).toEqual({
      href: "/calendar?month=2026-09&player=550e8400-e29b-41d4-a716-446655440001&team=550e8400-e29b-41d4-a716-446655440002&day=2026-09-08",
      label: "Calendario",
    });
    expect(
      calendarBackHref({
        calendarMonth: "bad",
        calendarPlayer: "javascript:alert(1)",
        calendarTeam: "/admin",
      }),
    ).toBe("/calendar");
  });
});
