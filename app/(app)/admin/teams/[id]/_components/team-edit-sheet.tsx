"use client";
import type { Team } from "@/server/actions/admin/teams";
import { TeamEditor } from "@/components/team/team-editor";
export function TeamEditSheet({ team }: { team: Team }) {
  return <TeamEditor team={team} />;
}
