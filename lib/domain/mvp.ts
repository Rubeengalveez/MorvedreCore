export interface MvpCandidate {
  player_id: string;
  goals: number;
  exclusions: number;
}

export interface MvpResult {
  player_ids: string[];
  is_tie: boolean;
  reason: "most_goals" | "fewer_exclusions_after_tie" | "tie_after_exclusions";
}

export function computeMvp(candidates: MvpCandidate[]): MvpResult {
  if (candidates.length === 0) {
    return { player_ids: [], is_tie: false, reason: "most_goals" };
  }
  const maxGoals = candidates.reduce((m, c) => Math.max(m, c.goals), 0);
  if (maxGoals === 0) {
    return { player_ids: [], is_tie: false, reason: "most_goals" };
  }
  const topByGoals = candidates.filter((c) => c.goals === maxGoals);
  if (topByGoals.length === 1) {
    return { player_ids: [topByGoals[0]!.player_id], is_tie: false, reason: "most_goals" };
  }
  const minExcl = topByGoals.reduce((m, c) => Math.min(m, c.exclusions), Infinity);
  const topByGoalsAndFewerExcl = topByGoals.filter((c) => c.exclusions === minExcl);
  if (topByGoalsAndFewerExcl.length === 1) {
    return {
      player_ids: [topByGoalsAndFewerExcl[0]!.player_id],
      is_tie: false,
      reason: "fewer_exclusions_after_tie",
    };
  }
  return {
    player_ids: topByGoalsAndFewerExcl.map((c) => c.player_id),
    is_tie: true,
    reason: "tie_after_exclusions",
  };
}
