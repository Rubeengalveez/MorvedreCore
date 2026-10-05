import { calendarBackHref } from "@/lib/domain/calendar-presentation";
import { notFound, redirect } from "next/navigation";

import { AttendanceSheet } from "@/components/attendance/attendance-sheet";
import { PageShell } from "@/components/ui/page-shell";
import { canEditAttendanceForDay } from "@/lib/domain/attendance";
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
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{
    from?: string;
    calendarMonth?: string;
    calendarPlayer?: string;
    calendarTeam?: string;
    calendarDay?: string;
  }>;
}) {
  const [{ sessionId }, query, ctx, season] = await Promise.all([
    params,
    searchParams,
    getActiveProfileContext(),
    getCurrentSeason(),
  ]);
  if (!ctx) redirect("/login");
  if (!season) redirect("/dashboard");

  const audience = await getDashboardAudience(ctx.ownProfile.id, season.id);
  if (!audience.can_manage_attendance) redirect("/dashboard");
  const attendanceTeams = await getAttendanceTeams(season.id);

  const session = await getCoachAttendanceSession(attendanceTeams, sessionId);
  if (!session) notFound();

  return (
    <PageShell width="sm" className="gap-4 pb-8">
      <AttendanceSheet
        session={session}
        canEdit={canEditAttendanceForDay(session.scheduled_at)}
        calendarHref={query.from === "calendar" ? calendarBackHref(query) : undefined}
        origin={
          query.from === "calendar"
            ? "calendar"
            : query.from === "dashboard"
              ? "dashboard"
              : query.from === "profile-activity"
                ? "profile-activity"
                : query.from === "admin-trainings"
                  ? "admin-trainings"
                  : undefined
        }
      />
    </PageShell>
  );
}
