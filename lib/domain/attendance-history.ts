import { getAttendanceDayKey } from "./attendance";
import {
  buildAttendanceOccurrences,
  type AttendanceOccurrenceSession,
} from "./attendance-occurrences";

export type AttendancePeriod = "week" | "month";

export interface AttendanceHistoryRecord {
  session_id: string;
  player_id: string;
  present: boolean;
  reason: string | null;
  marked_at: string;
  updated_at: string;
  scheduled_at: string;
  team_id: string;
  team_label: string;
  team_color: string;
  unreviewed?: boolean;
  joint_id?: string | null;
}

export interface AttendanceHistorySummary {
  attended: number;
  absent: number;
  total: number;
  percentage: number | null;
  unreviewed: number;
}

export interface AttendanceReportPlayer {
  id: string;
  full_name: string;
  photo_url: string | null;
}

export interface AttendanceReportTeam {
  id: string;
  label: string;
  color: string;
}

export type AttendanceReportSession = AttendanceOccurrenceSession;

export interface AttendanceReportRoster {
  team_id: string;
  player_id: string;
  joined_at: string;
  left_at: string | null;
}

export interface AttendancePlayerReport extends AttendanceHistorySummary {
  id: string;
  full_name: string;
  photo_url: string | null;
  records: AttendanceHistoryRecord[];
}

export interface AttendanceTeamReport {
  id: string;
  label: string;
  color: string;
  session_count: number;
  reviewed_session_count: number;
  attended: number;
  absent: number;
  percentage: number | null;
  players: AttendancePlayerReport[];
}

function parseDateKey(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

function formatDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function isDateKey(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseDateKey(value);
  return !Number.isNaN(parsed.getTime()) && formatDateKey(parsed) === value;
}

export function isMonthKey(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return false;
  const [year, month] = value.split("-").map(Number);
  return year != null && month != null && year >= 2000 && month >= 1 && month <= 12;
}

export function monthKeyFromDate(value: Date = new Date()): string {
  return getAttendanceDayKey(value).slice(0, 7);
}

export function shiftMonthKey(monthKey: string, amount: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1 + amount, 1, 12));
  return shifted.toISOString().slice(0, 7);
}

export function getMonthRange(monthKey: string): { from: string; to: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, 1, 12));
  const last = new Date(Date.UTC(year ?? 2000, month ?? 1, 0, 12));
  return { from: formatDateKey(first), to: formatDateKey(last) };
}

export function getAttendancePeriodRange(
  anchor: string,
  period: AttendancePeriod,
): { from: string; to: string } {
  const date = parseDateKey(anchor);
  if (period === "month") {
    return getMonthRange(anchor.slice(0, 7));
  }
  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(date);
  monday.setUTCDate(monday.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return { from: formatDateKey(monday), to: formatDateKey(sunday) };
}

export function shiftAttendancePeriod(
  anchor: string,
  period: AttendancePeriod,
  amount: number,
): string {
  if (period === "month") {
    const shifted = shiftMonthKey(anchor.slice(0, 7), amount);
    return `${shifted}-01`;
  }
  const date = parseDateKey(anchor);
  date.setUTCDate(date.getUTCDate() + amount * 7);
  return formatDateKey(date);
}

export function summarizeAttendance(
  records: Array<Pick<AttendanceHistoryRecord, "present" | "unreviewed">>,
): AttendanceHistorySummary {
  const attended = records.filter((record) => record.present).length;
  const absent = records.length - attended;
  return {
    attended,
    absent,
    total: records.length,
    percentage: records.length > 0 ? Math.round((attended / records.length) * 100) : null,
    unreviewed: records.filter((record) => record.unreviewed).length,
  };
}

export function buildAttendanceTeamReports(input: {
  teams: AttendanceReportTeam[];
  sessions: AttendanceReportSession[];
  rosters: AttendanceReportRoster[];
  players: AttendanceReportPlayer[];
  records: AttendanceHistoryRecord[];
  from?: string;
  to?: string;
  now?: Date;
}): AttendanceTeamReport[] {
  const playerById = new Map(input.players.map((player) => [player.id, player]));
  const recordsByTeamPlayer = new Map<string, AttendanceHistoryRecord[]>();
  const reviewedSessionsByTeam = new Map<string, Set<string>>();
  const recordsBySession = new Map<string, AttendanceHistoryRecord[]>();

  const teams = new Map(input.teams.map((team) => [team.id, team]));
  const occurrences = buildAttendanceOccurrences({
    sessions: input.sessions,
    rosters: input.rosters,
    entries: input.records,
    through: input.now,
    deduplicate: false,
  });
  for (const occurrence of occurrences) {
    const team = teams.get(occurrence.team_id);
    if (!team) continue;
    const record: AttendanceHistoryRecord = {
      ...occurrence,
      reason: occurrence.reason ?? null,
      marked_at: occurrence.marked_at ?? "",
      updated_at: occurrence.updated_at ?? "",
      team_label: team.label,
      team_color: team.color,
    };
    const key = `${record.team_id}:${record.player_id}`;
    const records = recordsByTeamPlayer.get(key) ?? [];
    records.push(record);
    recordsByTeamPlayer.set(key, records);
    const day = getAttendanceDayKey(record.scheduled_at);
    if ((!input.from || day >= input.from) && (!input.to || day <= input.to)) {
      recordsBySession.set(record.session_id, [
        ...(recordsBySession.get(record.session_id) ?? []),
        record,
      ]);
    }
  }
  for (const records of recordsBySession.values())
    if (records.length && records.every((record) => !record.unreviewed)) {
      const first = records[0]!;
      const reviewed = reviewedSessionsByTeam.get(first.team_id) ?? new Set<string>();
      reviewed.add(first.session_id);
      reviewedSessionsByTeam.set(first.team_id, reviewed);
    }

  return input.teams
    .map((team) => {
      const sessionCount = input.sessions.filter((session) => {
        const day = getAttendanceDayKey(session.scheduled_at);
        return (
          session.team_id === team.id &&
          !session.cancelled &&
          new Date(session.scheduled_at).getTime() <= (input.now ?? new Date()).getTime() &&
          (!input.from || day >= input.from) &&
          (!input.to || day <= input.to)
        );
      }).length;
      const rosterPlayerIds = Array.from(
        new Set(
          input.rosters
            .filter((roster) => roster.team_id === team.id)
            .map((roster) => roster.player_id),
        ),
      );
      const players = rosterPlayerIds
        .map((playerId) => {
          const player = playerById.get(playerId);
          if (!player) return null;
          const records = recordsByTeamPlayer.get(`${team.id}:${playerId}`) ?? [];
          const summary = summarizeAttendance(
            records.filter((record) => {
              const day = getAttendanceDayKey(record.scheduled_at);
              return (!input.from || day >= input.from) && (!input.to || day <= input.to);
            }),
          );
          return { ...player, ...summary, records };
        })
        .filter((player): player is AttendancePlayerReport => player !== null)
        .sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));
      const attended = players.reduce((total, player) => total + player.attended, 0);
      const absent = players.reduce((total, player) => total + player.absent, 0);
      const total = attended + absent;

      return {
        ...team,
        session_count: sessionCount,
        reviewed_session_count: reviewedSessionsByTeam.get(team.id)?.size ?? 0,
        attended,
        absent,
        percentage: total > 0 ? Math.round((attended / total) * 100) : null,
        players,
      };
    })
    .filter((team) => team.session_count > 0 || team.players.length > 0);
}
