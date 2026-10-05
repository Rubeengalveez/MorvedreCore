"use client";
import { TeamDirectory } from "@/components/team/team-directory";
import type { Season, Team } from "@/server/actions/admin";
export interface TeamCardData extends Team {
  playerCount: number;
  coachName: string | null;
  categoryLabel: string;
}
export interface TeamsGridProps {
  seasons: Season[];
  teamsBySeason: Map<string, TeamCardData[]>;
  defaultSeasonId: string;
}
export function TeamsGrid({ teamsBySeason, defaultSeasonId }: TeamsGridProps) {
  return (
    <TeamDirectory
      admin
      teams={[...teamsBySeason.values()].flat()}
      defaultSeasonId={defaultSeasonId}
    />
  );
}
