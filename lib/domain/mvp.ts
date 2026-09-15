export interface MvpCandidate {
  player_id: string;
  goals: number;
  exclusions: number;
  assists?: number;
}

export interface MvpResult {
  player_ids: string[];
  is_tie: boolean;
  reason:
    | "most_goals"
    | "most_contributions"
    | "fewer_exclusions_after_tie"
    | "tie_after_exclusions";
}

export interface ComputeMvpOptions {
  useAssists?: boolean;
}

export function computeMvp(
  candidates: MvpCandidate[],
  options?: ComputeMvpOptions,
): MvpResult {
  const useAssists = options?.useAssists ?? false;
  const primaryReason = useAssists ? "most_contributions" : "most_goals";

  if (candidates.length === 0) {
    return { player_ids: [], is_tie: false, reason: primaryReason };
  }

  const scoreOf = (c: MvpCandidate) => c.goals + (useAssists ? (c.assists ?? 0) : 0);
  const maxScore = candidates.reduce((m, c) => Math.max(m, scoreOf(c)), 0);

  if (maxScore === 0) {
    return { player_ids: [], is_tie: false, reason: primaryReason };
  }

  const topCandidates = candidates.filter((c) => scoreOf(c) === maxScore);
  if (topCandidates.length === 1) {
    return { player_ids: [topCandidates[0]!.player_id], is_tie: false, reason: primaryReason };
  }

  const minExclusions = topCandidates.reduce((m, c) => Math.min(m, c.exclusions), Infinity);
  const topByScoreAndFewerExclusions = topCandidates.filter(
    (candidate) => candidate.exclusions === minExclusions,
  );

  if (topByScoreAndFewerExclusions.length === 1) {
    return {
      player_ids: [topByScoreAndFewerExclusions[0]!.player_id],
      is_tie: false,
      reason: "fewer_exclusions_after_tie",
    };
  }

  return {
    player_ids: topByScoreAndFewerExclusions.map((candidate) => candidate.player_id),
    is_tie: true,
    reason: "tie_after_exclusions",
  };
}
