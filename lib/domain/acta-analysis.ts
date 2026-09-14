import {
  activeEvents,
  isGoal,
  isMissedShot,
  playerTotals,
  score,
  type ActionKind,
  type LiveSheet,
  type Side,
} from "./live-match";
import { keeperQuarters } from "./live-match-keepers";

export function actaAnalysis(sheet: LiveSheet) {
  const events = activeEvents(sheet);
  const count = (side: Side, ...kinds: ActionKind[]) =>
    events.filter((e) => e.side === side && kinds.includes(e.kind)).length;
  const ratio = (value: number, total: number) => (total > 0 ? (value / total) * 100 : null);
  const shooting = (side: Side, cap?: number) => {
    const rows = events.filter((e) => e.side === side && (cap === undefined || e.cap === cap));
    const goals = rows.filter((e) => isGoal(e.kind)).length;
    const misses = rows.filter((e) => isMissedShot(e.kind)).length;
    const penaltyGoals = rows.filter(
      (e) => e.kind === "goal_penalty" || (e.kind === "goal" && e.origin === "penalty_flow"),
    ).length;
    const penaltyMisses = rows.filter((e) => e.kind === "penalty_missed").length;
    const outside = rows.filter(
      (e) => e.kind === "shot_out" || (e.kind === "penalty_missed" && e.missOutcome === "out"),
    ).length;
    const onTarget =
      goals +
      rows.filter(
        (e) =>
          ["shot_saved", "shot_blocked", "shot_corner"].includes(e.kind) ||
          (e.kind === "penalty_missed" && e.missOutcome === "save"),
      ).length;
    return {
      goals,
      misses,
      outside,
      onTarget,
      unclassified: rows.filter((e) => e.kind === "penalty_missed" && !e.missOutcome).length,
      attempts: goals + misses,
      accuracy: ratio(goals, goals + misses),
      outsideRate: ratio(outside, goals + misses),
      onTargetRate: ratio(onTarget, goals + misses),
      penaltyGoals,
      penaltyMisses,
      penaltyAccuracy: ratio(penaltyGoals, penaltyGoals + penaltyMisses),
    };
  };
  const goalsUs = score(sheet, "us");
  const goalsThem = score(sheet, "them");
  const players = [...sheet.players]
    .sort((a, b) => a.cap - b.cap)
    .map((player) => {
      const totals = playerTotals(sheet, "us", player.cap);
      const quarters = keeperQuarters(sheet, player.cap);
      return {
        ...player,
        totals,
        shooting: shooting("us", player.cap),
        expulsions: events.filter(
          (e) => e.side === "us" && e.cap === player.cap && e.kind === "exclusion",
        ).length,
        contribution: totals.goals + totals.assists,
        goalShare: ratio(totals.goals, goalsUs),
        saveRate: ratio(totals.saves, totals.saves + totals.conceded),
        quarters,
        concededPerQuarter: quarters.length ? totals.conceded / quarters.length : null,
        savesPerQuarter: quarters.length ? totals.saves / quarters.length : null,
        keeper: quarters.length > 0 || player.cap === sheet.keeper || totals.received > 0,
      };
    });
  const baseUs = sheet.baseline.reduce((sum, row) => sum + row.goals, 0);
  const played =
    sheet.phase === "ready" ? 0 : sheet.phase === "finished" ? sheet.periods : sheet.period;
  const periods = Array.from({ length: played }, (_, i) => ({
    period: i + 1,
    us: score(sheet, "us", i + 1),
    them: score(sheet, "them", i + 1),
    cumulativeUs:
      baseUs + events.filter((e) => e.period <= i + 1 && e.side === "us" && isGoal(e.kind)).length,
    cumulativeThem:
      sheet.baselineThem +
      events.filter((e) => e.period <= i + 1 && e.side === "them" && isGoal(e.kind)).length,
  }));
  const goalProgression: { position: number; us: number; them: number; quarter: number | null }[] =
    [{ position: 0, us: baseUs, them: sheet.baselineThem, quarter: 0 }];
  let runningUs = baseUs;
  let runningThem = sheet.baselineThem;
  for (const period of periods) {
    const goals = events.filter((e) => e.period === period.period && isGoal(e.kind));
    goals.forEach((goal, index) => {
      if (goal.side === "us") runningUs++;
      else runningThem++;
      goalProgression.push({
        position: period.period - 1 + (index + 1) / (goals.length + 1),
        us: runningUs,
        them: runningThem,
        quarter: null,
      });
    });
    goalProgression.push({
      position: period.period,
      us: runningUs,
      them: runningThem,
      quarter: period.period,
    });
  }
  const ownShooting = shooting("us");
  const rivalMisses = count("us", "save", "penalty_save", "keeper_out");
  const rivalScorers = sheet.opponentCaps
    .map((cap) => ({ cap, goals: playerTotals(sheet, "them", cap).goals }))
    .filter((p) => p.goals > 0)
    .sort((p, q) => q.goals - p.goals || p.cap - q.cap)
    .map((p) => ({ ...p, share: ratio(p.goals, goalsThem) }));
  return {
    events,
    count,
    players,
    periods,
    baseUs,
    baseThem: sheet.baselineThem,
    imported:
      sheet.baseline.some((row) => row.goals > 0 || row.exclusions > 0) || sheet.baselineThem > 0,
    ownShooting,
    goalProgression,
    goalsUs,
    goalsThem,
    rivalMisses,
    rivalShots: goalsThem + rivalMisses,
    rivalScorers,
    extraGoals: count("us", "goal_extra"),
    extraOpportunities: count("them", "exclusion"),
    extraRate: ratio(count("us", "goal_extra"), count("them", "exclusion")),
    unassignedConceded: events.filter(
      (e) => e.side === "them" && isGoal(e.kind) && !players.some((p) => p.cap === e.keeper),
    ).length,
  };
}
