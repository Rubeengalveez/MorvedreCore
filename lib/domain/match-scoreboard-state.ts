import { finalScore, score, type LiveSheet } from "@/lib/domain/live-match";

interface MatchScoreboardInput {
  status: string;
  isHome: boolean;
  finalScoreUs: number | null;
  finalScoreThem: number | null;
  sheet: LiveSheet | null;
}

export function getMatchScoreboardState(input: MatchScoreboardInput): {
  mode: "preview" | "live" | "final";
  homeScore: number | null;
  awayScore: number | null;
  period: number | null;
  liveLabel: string | null;
  regulationScore: { home: number; away: number } | null;
} {
  const hasFinalScore = input.finalScoreUs != null && input.finalScoreThem != null;
  const liveSheet =
    input.sheet && ["playing", "break", "shootout"].includes(input.sheet.phase)
      ? input.sheet
      : null;
  const finishedSheet = input.sheet?.phase === "finished" ? input.sheet : null;
  const mode =
    hasFinalScore || finishedSheet
      ? "final"
      : liveSheet || input.status === "in_progress"
        ? "live"
        : "preview";
  const us = hasFinalScore
    ? input.finalScoreUs
    : finishedSheet
      ? finalScore(finishedSheet, "us")
      : liveSheet
        ? liveSheet.phase === "shootout"
          ? finalScore(liveSheet, "us")
          : score(liveSheet, "us")
        : mode === "live"
          ? 0
          : null;
  const them = hasFinalScore
    ? input.finalScoreThem
    : finishedSheet
      ? finalScore(finishedSheet, "them")
      : liveSheet
        ? liveSheet.phase === "shootout"
          ? finalScore(liveSheet, "them")
          : score(liveSheet, "them")
        : mode === "live"
          ? 0
          : null;
  const shootoutSheet = mode === "final" && input.sheet?.shootout ? input.sheet : null;
  return {
    mode,
    homeScore: input.isHome ? us : them,
    awayScore: input.isHome ? them : us,
    period: liveSheet?.phase === "shootout" ? null : (liveSheet?.period ?? null),
    liveLabel: liveSheet?.phase === "shootout" ? "Penaltis" : null,
    regulationScore: shootoutSheet
      ? {
          home: score(shootoutSheet, input.isHome ? "us" : "them"),
          away: score(shootoutSheet, input.isHome ? "them" : "us"),
        }
      : null,
  };
}
