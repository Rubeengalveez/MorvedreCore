import { score, type LiveSheet, type Side } from "./live-match";

export function orderedScore(
  sheet: LiveSheet,
  homeAway?: "home" | "away" | "neutral",
  period?: number,
) {
  const homeSide: Side = homeAway === "away" ? "them" : "us";
  const awaySide: Side = homeSide === "us" ? "them" : "us";
  return {
    homeSide,
    awaySide,
    home: score(sheet, homeSide, period),
    away: score(sheet, awaySide, period),
  };
}
