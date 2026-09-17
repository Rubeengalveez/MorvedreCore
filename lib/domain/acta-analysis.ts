import {
  activeEvents,
  finalScore,
  isGoal,
  isMissedShot,
  playerTotals,
  score,
  type ActionKind,
  type LiveSheet,
  type Side,
} from "./live-match";
import { keeperQuarters } from "./live-match-keepers";

export function actaPlayerTotals(sheet: LiveSheet, side: Side, cap: number) {
  const totals = playerTotals(sheet, side, cap);
  const shots = (sheet.shootout?.shots ?? []).filter((shot) => shot.side === side && shot.cap === cap);
  const goals = shots.filter((shot) => shot.outcome === "goal").length;
  const outside = shots.filter((shot) => shot.outcome === "out" || shot.outcome === "post").length;
  const received = side === "us"
    ? (sheet.shootout?.shots ?? []).filter((shot) => shot.side === "them" && shot.keeper === cap)
    : [];
  const saves = received.filter((shot) => shot.outcome === "save").length;
  return {
    ...totals,
    goals: totals.goals + goals,
    goalsPenalty: totals.goalsPenalty + goals,
    shots: totals.shots + shots.length,
    missedShots: totals.missedShots + shots.length - goals,
    shotsOut: totals.shotsOut + outside,
    shotsBlocked: totals.shotsBlocked + shots.filter((shot) => shot.outcome === "save").length,
    penaltiesMissed: totals.penaltiesMissed + shots.length - goals,
    saves: totals.saves + saves,
    penaltySaves: totals.penaltySaves + saves,
    conceded: totals.conceded + received.filter((shot) => shot.outcome === "goal").length,
    received: totals.received + received.length,
    receivedOut: totals.receivedOut + received.filter((shot) => shot.outcome === "out" || shot.outcome === "post").length,
  };
}

export function actaAnalysis(sheet: LiveSheet) {
  const events = activeEvents(sheet);
  const shootoutShots = sheet.shootout?.shots ?? [];
  const count = (side: Side, ...kinds: ActionKind[]) =>
    events.filter((e) => e.side === side && kinds.includes(e.kind)).length;
  const ratio = (value: number, total: number) => (total > 0 ? (value / total) * 100 : null);
  const shooting = (side: Side, cap?: number) => {
    const rows = events.filter((e) => e.side === side && (cap === undefined || e.cap === cap));
    const penalties = shootoutShots.filter((shot) => shot.side === side && (cap === undefined || shot.cap === cap));
    const scored = penalties.filter((shot) => shot.outcome === "goal").length;
    const goals = rows.filter((e) => isGoal(e.kind)).length + scored;
    const misses = rows.filter((e) => isMissedShot(e.kind)).length + penalties.length - scored;
    const penaltyGoals = rows.filter(
      (e) => e.kind === "goal_penalty" || (e.kind === "goal" && e.origin === "penalty_flow"),
    ).length + scored;
    const penaltyMisses = rows.filter((e) => e.kind === "penalty_missed").length + penalties.length - scored;
    const outside = rows.filter(
      (e) => e.kind === "shot_out" || (e.kind === "penalty_missed" && e.missOutcome === "out"),
    ).length + penalties.filter((shot) => shot.outcome === "out" || shot.outcome === "post").length;
    const onTarget =
      goals +
      rows.filter(
        (e) =>
          ["shot_saved", "shot_blocked", "shot_corner"].includes(e.kind) ||
          (e.kind === "penalty_missed" && e.missOutcome === "save"),
      ).length + penalties.filter((shot) => shot.outcome === "save").length;
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
      const totals = actaPlayerTotals(sheet, "us", player.cap);
      const regulation = playerTotals(sheet, "us", player.cap);
      const quarters = keeperQuarters(sheet, player.cap);
      return {
        ...player,
        totals,
        shooting: shooting("us", player.cap),
        expulsions: events.filter(
          (e) => e.side === "us" && e.cap === player.cap && e.kind === "exclusion",
        ).length,
        contribution: totals.goals + totals.assists,
        goalShare: ratio(totals.goals, finalScore(sheet, "us")),
        saveRate: ratio(totals.saves, totals.saves + totals.conceded),
        quarters,
        concededPerQuarter: quarters.length ? regulation.conceded / quarters.length : null,
        savesPerQuarter: quarters.length ? regulation.saves / quarters.length : null,
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
  const rivalMisses = count("us", "save", "penalty_save", "keeper_out") +
    shootoutShots.filter((shot) => shot.side === "them" && shot.outcome !== "goal").length;
  const rivalScorers = sheet.opponentCaps
    .map((cap) => ({ cap, goals: actaPlayerTotals(sheet, "them", cap).goals }))
    .filter((p) => p.goals > 0)
    .sort((p, q) => q.goals - p.goals || p.cap - q.cap)
    .map((p) => ({ ...p, share: ratio(p.goals, finalScore(sheet, "them")) }));
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
    rivalShots: finalScore(sheet, "them") + rivalMisses,
    rivalScorers,
    extraGoals: count("us", "goal_extra"),
    extraOpportunities: count("them", "exclusion"),
    extraRate: ratio(count("us", "goal_extra"), count("them", "exclusion")),
    unassignedConceded: events.filter(
      (e) => e.side === "them" && isGoal(e.kind) && !players.some((p) => p.cap === e.keeper),
    ).length + shootoutShots.filter(
      (shot) => shot.side === "them" && shot.outcome === "goal" && !players.some((p) => p.cap === shot.keeper),
    ).length,
  };
}
