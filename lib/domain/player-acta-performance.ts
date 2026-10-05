import { playerTotals, sheetSchema } from "./live-match";

export function playerActaPerformance(documents: unknown[], playerId: string) {
  const totals = {
    matches: 0,
    goals: 0,
    assists: 0,
    exclusions: 0,
    shots: 0,
    shotGoals: 0,
    saves: 0,
    conceded: 0,
  };
  for (const document of documents) {
    const parsed = sheetSchema.safeParse(document);
    if (!parsed.success || parsed.data.phase !== "finished") continue;
    const sheet = parsed.data;
    const player = sheet.players.find((player) => player.id === playerId);
    if (!player) continue;
    const stats = playerTotals(sheet, "us", player.cap);
    const shotGoals = stats.goalsNormal + stats.goalsExtra + stats.goalsPenalty;
    totals.matches += 1;
    totals.goals += stats.goals;
    totals.assists += stats.assists;
    totals.exclusions += stats.exclusions;
    totals.shots += shotGoals + stats.missedShots;
    totals.shotGoals += shotGoals;
    totals.saves += stats.saves;
    totals.conceded += stats.conceded;
  }
  return {
    ...totals,
    shootingPercent: totals.shots ? (totals.shotGoals * 100) / totals.shots : null,
    goalsPerMatch: totals.matches ? totals.goals / totals.matches : null,
    assistsPerMatch: totals.matches ? totals.assists / totals.matches : null,
  };
}
