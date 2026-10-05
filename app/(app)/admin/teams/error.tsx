"use client";
import { TeamProblem } from "@/components/team/team-feedback";
export default function Error({ retry }: { retry: () => void }) {
  return <TeamProblem admin retry={retry} />;
}
