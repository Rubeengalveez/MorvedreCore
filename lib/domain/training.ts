export type TrainingKind = "water" | "dry" | "physical" | "technical" | "mixed";

export interface TrainingBlock {
  id: string;
  team_id: string;
  label: string;
  weekdays: number[];
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  kind: TrainingKind;
}

export interface GeneratedSession {
  block_id: string;
  team_id: string;
  scheduled_date: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  location: string | null;
  kind: TrainingKind;
}

export interface TrainingSession {
  id: string;
  block_id: string | null;
  team_id: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  cancelled: boolean;
}

const CLUB_TIME_ZONE = "Europe/Madrid";
const clubDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLUB_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function isoWeekday(d: Date): number {
  const day = d.getUTCDay();
  return day === 0 ? 7 : day;
}

function parseTime(time: string): { hours: number; minutes: number } {
  const parts = time.split(":");
  return { hours: Number(parts[0]), minutes: Number(parts[1]) };
}

function eachDateInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cur.getTime() <= last.getTime()) {
    dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function timeZoneOffsetMs(value: Date): number {
  const parts = clubDateTimeFormatter.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value ?? 0);
  const representedAsUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return representedAsUtc - value.getTime();
}

function combineDateAndTime(date: Date, time: string): Date {
  const t = parseTime(time);
  const wallClockAsUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    t.hours,
    t.minutes,
  );
  const firstGuess = new Date(wallClockAsUtc);
  const firstResult = new Date(wallClockAsUtc - timeZoneOffsetMs(firstGuess));
  return new Date(wallClockAsUtc - timeZoneOffsetMs(firstResult));
}

export function weekdayMatches(weekday: number, date: Date | string): boolean {
  if (typeof date === "string") return isoWeekday(parseISODate(date)) === weekday;
  const day = date.getDay();
  return (day === 0 ? 7 : day) === weekday;
}

export function durationMinutes(startTime: string, endTime: string): number {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const startMin = start.hours * 60 + start.minutes;
  let endMin = end.hours * 60 + end.minutes;
  if (endMin < startMin) endMin += 24 * 60;
  return endMin - startMin;
}

export function generateSessionsFromBlock(
  block: TrainingBlock,
  options?: { skipDates?: string[] },
): GeneratedSession[] {
  if (block.weekdays.length === 0) return [];
  const start = parseISODate(block.start_date);
  const end = parseISODate(block.end_date);
  if (end.getTime() < start.getTime()) return [];

  const skip = new Set(options?.skipDates ?? []);
  const dates = eachDateInRange(start, end);
  const duration = durationMinutes(block.start_time, block.end_time);
  const weekdaySet = new Set(block.weekdays);

  const sessions: GeneratedSession[] = [];
  for (const date of dates) {
    const iso = formatISODate(date);
    if (skip.has(iso)) continue;
    if (!weekdaySet.has(isoWeekday(date))) continue;
    const startDt = combineDateAndTime(date, block.start_time);
    let endDt = combineDateAndTime(date, block.end_time);
    if (endDt.getTime() <= startDt.getTime()) {
      endDt = new Date(endDt.getTime() + 24 * 60 * 60 * 1000);
    }
    sessions.push({
      block_id: block.id,
      team_id: block.team_id,
      scheduled_date: iso,
      start_datetime: startDt.toISOString(),
      end_datetime: endDt.toISOString(),
      duration_minutes: duration,
      location: block.location,
      kind: block.kind,
    });
  }
  sessions.sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
  return sessions;
}

export function sessionsOverlap(a: TrainingSession, b: TrainingSession): boolean {
  const aStart = new Date(a.scheduled_at).getTime();
  const aEnd = aStart + a.duration_minutes * 60_000;
  const bStart = new Date(b.scheduled_at).getTime();
  const bEnd = bStart + b.duration_minutes * 60_000;
  return aStart < bEnd && bStart < aEnd;
}

export function nextSessionDate(block: TrainingBlock, after: Date): Date | null {
  if (block.weekdays.length === 0) return null;
  const start = parseISODate(block.start_date);
  const end = parseISODate(block.end_date);
  if (end.getTime() < start.getTime()) return null;
  const weekdaySet = new Set(block.weekdays);
  const dates = eachDateInRange(start, end);
  const afterTime = Date.UTC(after.getFullYear(), after.getMonth(), after.getDate());
  for (const d of dates) {
    if (d.getTime() <= afterTime) continue;
    if (weekdaySet.has(isoWeekday(d))) return d;
  }
  return null;
}
