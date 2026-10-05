export interface AttendanceRow {
  player_id: string;
  present: boolean;
  reason: string | null;
}

export interface AttendanceResult {
  rows: AttendanceRow[];
  present_count: number;
  absent_count: number;
  unmarked_count: number;
}

export function countAttendanceOccurrences(
  rows: Array<{
    player_id: string;
    present: boolean;
    session_id: string;
    joint_id: string | null;
    scheduled_at: string;
  }>,
): Map<string, { attended: number; total: number }> {
  const occurrences = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = `${row.player_id}/${row.joint_id ?? row.session_id}/${row.scheduled_at}`;
    const previous = occurrences.get(key);
    occurrences.set(key, { ...row, present: row.present || Boolean(previous?.present) });
  }
  const counts = new Map<string, { attended: number; total: number }>();
  for (const row of occurrences.values()) {
    const count = counts.get(row.player_id) ?? { attended: 0, total: 0 };
    count.total += 1;
    if (row.present) count.attended += 1;
    counts.set(row.player_id, count);
  }
  return counts;
}

const attendanceDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getAttendanceDayKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = attendanceDayFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export function canEditAttendanceForDay(
  scheduledAt: Date | string,
  now: Date = new Date(),
): boolean {
  return getAttendanceDayKey(scheduledAt) <= getAttendanceDayKey(now);
}

export function buildAttendanceResult(
  playerIds: string[],
  existingAttendance: AttendanceRow[],
): AttendanceResult {
  const byPlayer = new Map(existingAttendance.map((a) => [a.player_id, a]));
  const rows: AttendanceRow[] = playerIds.map((id) => {
    const existing = byPlayer.get(id);
    if (existing) {
      return {
        player_id: id,
        present: existing.present,
        reason: existing.reason,
      };
    }
    return { player_id: id, present: false, reason: null };
  });

  let present_count = 0;
  let absent_count = 0;
  let unmarked_count = 0;
  for (const row of rows) {
    if (byPlayer.has(row.player_id)) {
      if (row.present) present_count += 1;
      else absent_count += 1;
    } else {
      unmarked_count += 1;
    }
  }

  return { rows, present_count, absent_count, unmarked_count };
}

export function markAllPresent(playerIds: string[]): AttendanceRow[] {
  return playerIds.map((id) => ({ player_id: id, present: true, reason: null }));
}

export interface AttendanceDiff {
  added: AttendanceRow[];
  removed: AttendanceRow[];
  changed: { before: AttendanceRow; after: AttendanceRow }[];
}

export function diffAttendance(existing: AttendanceRow[], next: AttendanceRow[]): AttendanceDiff {
  const existingByPlayer = new Map(existing.map((a) => [a.player_id, a]));
  const nextByPlayer = new Map(next.map((a) => [a.player_id, a]));

  const added: AttendanceRow[] = [];
  const removed: AttendanceRow[] = [];
  const changed: { before: AttendanceRow; after: AttendanceRow }[] = [];

  for (const [playerId, row] of nextByPlayer) {
    const before = existingByPlayer.get(playerId);
    if (!before) {
      added.push(row);
    } else if (before.present !== row.present || before.reason !== row.reason) {
      changed.push({ before, after: row });
    }
  }

  for (const [playerId, row] of existingByPlayer) {
    if (!nextByPlayer.has(playerId)) {
      removed.push(row);
    }
  }

  return { added, removed, changed };
}
