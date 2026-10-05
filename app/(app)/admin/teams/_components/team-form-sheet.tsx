"use client";
import { TeamEditor } from "@/components/team/team-editor";
export interface TeamFormSheetProps {
  defaultSeasonId: string;
  triggerLabel?: string;
}
export function TeamFormSheet(props: TeamFormSheetProps) {
  return <TeamEditor {...props} />;
}
