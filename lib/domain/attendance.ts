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

export function diffAttendance(
  existing: AttendanceRow[],
  next: AttendanceRow[],
): AttendanceDiff {
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
