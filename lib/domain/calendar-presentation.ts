import type { CalendarData, CalendarTraining } from "@/server/queries/calendar";
import { getAttendanceDayKey } from "./attendance";
import { getMonthCells, type YearMonth } from "./calendar";

export function calendarMonth(value?: string, now = new Date()): YearMonth {
  const key =
    value &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value) &&
    Number(value.slice(0, 4)) >= 2000 &&
    Number(value.slice(0, 4)) <= 2100
      ? value
      : getAttendanceDayKey(now).slice(0, 7);
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5)) - 1 };
}

export function calendarMonthKey({ year, month }: YearMonth) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function compactMonthCells(year: number, month: number) {
  const cells = getMonthCells(year, month);
  const last = cells.findLastIndex((cell) => cell.inMonth);
  return cells.slice(0, Math.ceil((last + 1) / 7) * 7);
}

export function calendarReturnParams(month: string, player: string, team = "", day = "") {
  const params = new URLSearchParams({ from: "calendar", calendarMonth: month });
  if (player) params.set("calendarPlayer", player);
  if (team) params.set("calendarTeam", team);
  if (day) params.set("calendarDay", day);
  return params.toString();
}

export function calendarBackHref(input: {
  calendarMonth?: string;
  calendarPlayer?: string;
  calendarTeam?: string;
  calendarDay?: string;
}) {
  const params = new URLSearchParams();
  if (input.calendarMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(input.calendarMonth))
    params.set("month", input.calendarMonth);
  if (input.calendarPlayer === "all" || /^[\da-f-]{36}$/i.test(input.calendarPlayer ?? ""))
    params.set("player", input.calendarPlayer!);
  if (/^[\da-f-]{36}$/i.test(input.calendarTeam ?? "")) params.set("team", input.calendarTeam!);
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.calendarDay ?? "")) params.set("day", input.calendarDay!);
  return `/calendar${params.size ? `?${params}` : ""}`;
}

export function groupCalendarTrainings(trainings: CalendarTraining[]): CalendarTraining[] {
  const groups = new Map<string, CalendarTraining>();
  for (const training of trainings) {
    const key = training.joint_id
      ? [
          training.joint_id,
          training.scheduled_at,
          training.duration_minutes,
          training.cancelled,
          training.location,
          training.training_kind,
          training.block_label,
          training.cancellation_reason,
        ].join("/")
      : training.id;
    const previous = groups.get(key);
    if (!previous) {
      groups.set(key, {
        ...training,
        team_ids: [training.team_id],
        session_ids: [training.id],
        attendance: (training.attendance ?? []).map((entry) => ({ ...entry })),
      });
      continue;
    }
    if (!previous.team_ids!.includes(training.team_id)) {
      previous.team_label += ` · ${training.team_label}`;
      previous.team_ids!.push(training.team_id);
      previous.session_ids!.push(training.id);
    }
    for (const attendance of training.attendance ?? []) {
      const entry = previous.attendance!.find((item) => item.player_id === attendance.player_id);
      if (!entry) previous.attendance!.push({ ...attendance });
      else if (attendance.present === true) entry.present = true;
      else if (entry.present === null && attendance.present !== null)
        entry.present = attendance.present;
    }
    if (training.can_manage && !previous.can_manage) {
      previous.can_manage = true;
      previous.id = training.id;
    }
  }
  return Array.from(groups.values()).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
}

export function mergeCalendarData(sources: CalendarData[]): CalendarData {
  const result: CalendarData = new Map();
  for (const source of sources)
    for (const [date, day] of source) {
      const target = result.get(date) ?? { trainings: [], matches: [] };
      for (const training of day.trainings) {
        const existing = target.trainings.find((item) => item.id === training.id);
        if (!existing)
          target.trainings.push({
            ...training,
            attendance: (training.attendance ?? []).map((entry) => ({ ...entry })),
          });
        else
          for (const entry of training.attendance ?? [])
            if (!existing.attendance?.some((item) => item.player_id === entry.player_id))
              existing.attendance = [...(existing.attendance ?? []), entry];
      }
      for (const match of day.matches) {
        const existing = target.matches.find((item) => item.id === match.id);
        if (!existing) target.matches.push({ ...match });
        else if (match.callup_status) {
          existing.callup_status = match.callup_status;
          existing.callups = [
            ...(existing.callups ?? []),
            ...(match.callups ?? []).filter(
              (entry) => !existing.callups?.some((item) => item.player_id === entry.player_id),
            ),
          ];
        }
      }
      result.set(date, target);
    }
  return result;
}

export function calendarAttendanceStatus(trainings: CalendarTraining[]) {
  const values = groupCalendarTrainings(
    trainings.filter(
      (training) =>
        !training.cancelled &&
        !training.upcoming &&
        new Date(training.scheduled_at).getTime() <= Date.now(),
    ),
  )
    .flatMap((training) => training.attendance ?? [])
    .map((entry) => entry.present);
  if (!values.length) return null;
  if (values.every((value) => value === true)) return "present" as const;
  if (values.every((value) => value === false)) return "absent" as const;
  if (!values.includes(false) && values.includes(null)) return "unreviewed" as const;
  return "mixed" as const;
}
