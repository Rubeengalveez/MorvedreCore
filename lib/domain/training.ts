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

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function isoWeekday(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

function parseTime(time: string): { hours: number; minutes: number } {
  const parts = time.split(":");
  return { hours: Number(parts[0]), minutes: Number(parts[1]) };
}

function eachDateInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur.getTime() <= last.getTime()) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function combineDateAndTime(date: Date, time: string): Date {
  const t = parseTime(time);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    t.hours,
    t.minutes,
    0,
    0,
  );
}

export function weekdayMatches(weekday: number, date: Date | string): boolean {
  const d = typeof date === "string" ? parseISODate(date) : new Date(date.getTime());
  return isoWeekday(d) === weekday;
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
  const afterTime = new Date(
    after.getFullYear(),
    after.getMonth(),
    after.getDate(),
  ).getTime();
  for (const d of dates) {
    if (d.getTime() <= afterTime) continue;
    if (weekdaySet.has(isoWeekday(d))) return d;
  }
  return null;
}
