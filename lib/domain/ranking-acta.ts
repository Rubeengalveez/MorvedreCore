import { playerTotals, sheetSchema } from "./live-match";

export interface ActaContribution {
  playerId: string;
  goals: number;
  assists: number;
}

export function contributionsFromFinishedActa(document: unknown): ActaContribution[] {
  const parsed = sheetSchema.safeParse(document);
  if (!parsed.success || parsed.data.phase !== "finished") return [];

  return parsed.data.players.map((player) => {
    const totals = playerTotals(parsed.data, "us", player.cap);
    return { playerId: player.id, goals: totals.goals, assists: totals.assists };
  });
}
