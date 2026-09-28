export interface CallupPick {
  player_id: string;
  cap_number: number | null;
}

export interface CallupCandidate {
  player_id: string;
  full_name: string;
  cap_number: number | null;
  has_conflict: boolean;
  is_current_team: boolean;
}

export function nextFreeCap(
  preferred: number | null,
  occupied: ReadonlySet<number>,
): number | null {
  if (preferred != null && preferred >= 1 && preferred <= 14 && !occupied.has(preferred)) {
    return preferred;
  }
  for (let cap = 1; cap <= 14; cap += 1) {
    if (!occupied.has(cap)) return cap;
  }
  return null;
}

export function prepareCallupSource(
  source: CallupPick[],
  candidates: CallupCandidate[],
  currentIds: ReadonlySet<string>,
): { players: CallupPick[]; omitted: number } {
  const byId = new Map(candidates.map((candidate) => [candidate.player_id, candidate]));
  const used = new Set<number>();
  const players: CallupPick[] = [];
  let omitted = 0;
  for (const pick of source) {
    const candidate = byId.get(pick.player_id);
    if (
      !candidate ||
      (candidate.has_conflict && !currentIds.has(pick.player_id)) ||
      players.some((player) => player.player_id === pick.player_id)
    ) {
      omitted += 1;
      continue;
    }
    if (players.length >= 14) {
      omitted += 1;
      continue;
    }
    const cap = nextFreeCap(pick.cap_number, used);
    if (cap == null) {
      omitted += 1;
      continue;
    }
    used.add(cap);
    players.push({ player_id: pick.player_id, cap_number: cap });
  }
  return { players, omitted };
}
