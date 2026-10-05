import { getAttendanceDayKey } from "./attendance";

export interface AttendanceOccurrenceSession {
  id: string;
  team_id: string;
  scheduled_at: string;
  joint_id?: string | null;
  player_ids?: string[] | null;
  cancelled?: boolean;
}
export interface AttendanceOccurrenceRoster {
  team_id: string;
  player_id: string;
  joined_at: string;
  left_at: string | null;
}
export interface AttendanceOccurrenceEntry {
  session_id: string;
  player_id: string;
  present: boolean;
  reason?: string | null;
  marked_at?: string;
  updated_at?: string;
}
export interface AttendanceOccurrence extends AttendanceOccurrenceEntry {
  team_id: string;
  scheduled_at: string;
  joint_id: string | null;
  unreviewed: boolean;
}

export function deduplicateAttendanceOccurrences<T extends AttendanceOccurrence>(
  records: T[],
): T[] {
  const result = new Map<string, T>();
  for (const record of records) {
    const key = `${record.player_id}/${record.joint_id ?? record.session_id}/${record.scheduled_at}`;
    const previous = result.get(key);
    if (
      !previous ||
      (previous.unreviewed && !record.unreviewed) ||
      (previous.unreviewed === record.unreviewed &&
        (record.updated_at ?? "") >= (previous.updated_at ?? ""))
    )
      result.set(key, record);
  }
  return [...result.values()];
}

export function buildAttendanceOccurrences(input: {
  sessions: AttendanceOccurrenceSession[];
  rosters: AttendanceOccurrenceRoster[];
  entries: AttendanceOccurrenceEntry[];
  playerIds?: string[];
  through?: Date;
  deduplicate?: boolean;
}): AttendanceOccurrence[] {
  const now = (input.through ?? new Date()).getTime();
  const wanted = input.playerIds ? new Set(input.playerIds) : null;
  const entries = new Map(
    input.entries.map((entry) => [`${entry.session_id}/${entry.player_id}`, entry]),
  );
  const byTeam = new Map<string, AttendanceOccurrenceRoster[]>();
  for (const roster of input.rosters) {
    if (wanted && !wanted.has(roster.player_id)) continue;
    byTeam.set(roster.team_id, [...(byTeam.get(roster.team_id) ?? []), roster]);
  }
  const records: AttendanceOccurrence[] = [];
  for (const session of input.sessions) {
    const scheduled = new Date(session.scheduled_at).getTime();
    if (session.cancelled || !Number.isFinite(scheduled) || scheduled > now) continue;
    const day = getAttendanceDayKey(session.scheduled_at);
    const targets = session.player_ids ? new Set(session.player_ids) : null;
    const eligible = new Set(
      (byTeam.get(session.team_id) ?? [])
        .filter(
          (roster) =>
            roster.joined_at <= day &&
            (roster.left_at == null || roster.left_at >= day) &&
            (!targets || targets.has(roster.player_id)),
        )
        .map((roster) => roster.player_id),
    );
    for (const player_id of eligible) {
      const entry = entries.get(`${session.id}/${player_id}`);
      records.push({
        ...entry,
        session_id: session.id,
        player_id,
        present: entry?.present ?? true,
        team_id: session.team_id,
        scheduled_at: session.scheduled_at,
        joint_id: session.joint_id ?? null,
        unreviewed: !entry,
      });
    }
  }
  const canonical = deduplicateAttendanceOccurrences(records);
  if (input.deduplicate !== false) return canonical;
  const byOccurrence = new Map(
    canonical.map((record) => [
      `${record.player_id}/${record.joint_id ?? record.session_id}/${record.scheduled_at}`,
      record,
    ]),
  );
  return records.map((record) => {
    const resolved = byOccurrence.get(
      `${record.player_id}/${record.joint_id ?? record.session_id}/${record.scheduled_at}`,
    )!;
    return {
      ...record,
      present: resolved.present,
      unreviewed: resolved.unreviewed,
      reason: resolved.reason,
      marked_at: resolved.marked_at,
      updated_at: resolved.updated_at,
    };
  });
}
