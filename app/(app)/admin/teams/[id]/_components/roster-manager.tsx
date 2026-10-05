"use client";
import type { CategoryCode } from "@/lib/domain/categories";
import { TeamMemberPicker, TeamMembersList } from "@/components/team/team-member-manager";
export interface PlayerOption {
  id: string;
  full_name: string;
  birth_year: number | null;
  categoryLabel?: string;
  category?: CategoryCode | null;
  categoryColor?: string;
}
export interface RosterAddSheetProps {
  teamId: string;
  candidates: PlayerOption[];
  triggerLabel?: string;
  usedCaps?: number[];
}
export function RosterAddSheet(props: RosterAddSheetProps) {
  return <TeamMemberPicker {...props} kind="player" />;
}
export interface RosterRow {
  player_id: string;
  full_name: string;
  birth_year: number | null;
  squad_number: number | null;
  categoryLabel: string;
  category?: CategoryCode | null;
  categoryColor?: string;
}
export interface RosterListProps {
  teamId: string;
  rows: RosterRow[];
}
export function RosterList({ teamId, rows }: RosterListProps) {
  return (
    <TeamMembersList
      teamId={teamId}
      kind="player"
      members={rows.map((row) => ({ ...row, id: row.player_id }))}
    />
  );
}
