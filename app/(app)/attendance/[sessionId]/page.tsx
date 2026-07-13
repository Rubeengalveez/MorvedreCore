import { notFound, redirect } from "next/navigation";

import { AttendanceSheet } from "@/components/attendance/attendance-sheet";
import { PageShell } from "@/components/ui/page-shell";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getAttendanceTeams,
  getCoachAttendanceSession,
  getDashboardAudience,
} from "@/server/queries/dashboard";
import { getCurrentSeason } from "@/server/queries/seasons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Pasar lista — Morvedre Core",
  description: "Marca la asistencia del entrenamiento de hoy.",
};

export default async function AttendanceSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const [{ sessionId }, ctx, season] = await Promise.all([
    params,
    getActiveProfileContext(),
    getCurrentSeason(),
  ]);
  if (!ctx) redirect("/login");
  if (!season) redirect("/dashboard");

  const audience = await getDashboardAudience(ctx.activeProfile.id, season.id);
  if (!audience.can_manage_attendance) redirect("/dashboard");
  const attendanceTeams = await getAttendanceTeams(season.id);

  const session = await getCoachAttendanceSession(attendanceTeams, sessionId);
  if (!session) notFound();

  return (
    <PageShell width="sm" className="gap-4 pb-8">
      <AttendanceSheet session={session} />
    </PageShell>
  );
}
