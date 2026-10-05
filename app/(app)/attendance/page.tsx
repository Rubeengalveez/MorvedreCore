import { calendarBackHref, calendarReturnParams } from "@/lib/domain/calendar-presentation";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, ClipboardCheck } from "lucide-react";

import { PageBackLink } from "@/components/ui/page-back-link";
import { PageShell } from "@/components/ui/page-shell";
import { AttendanceDatePicker } from "@/components/attendance/attendance-day-navigation";
import { AttendanceSectionNav } from "@/components/attendance/attendance-section-nav";
import { getAttendanceDayKey } from "@/lib/domain/attendance";
import { AttendanceSessionCard } from "@/components/attendance/attendance-session-card";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getAttendanceTeams,
  getCoachAttendanceSessions,
  getDashboardAudience,
} from "@/server/queries/dashboard";
import { getCurrentSeason } from "@/server/queries/seasons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Pasar lista — Morvedre Core",
  description: "Pasa lista en los entrenamientos de hoy.",
};

function validDay(value: string | undefined, fallback: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? fallback
    : value;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    from?: string;
    calendarMonth?: string;
    calendarPlayer?: string;
    calendarTeam?: string;
    calendarDay?: string;
  }>;
}) {
  const [ctx, season] = await Promise.all([getActiveProfileContext(), getCurrentSeason()]);
  if (!ctx) redirect("/login");
  if (!season) redirect("/dashboard");

  const audience = await getDashboardAudience(ctx.ownProfile.id, season.id);
  if (!audience.can_manage_attendance) redirect("/dashboard");
  const attendanceTeams = await getAttendanceTeams(season.id);

  const now = new Date();
  const today = getAttendanceDayKey(now);
  const originParams = await searchParams;
  const calendarContext =
    originParams.from === "calendar"
      ? calendarReturnParams(
          originParams.calendarMonth ?? "",
          originParams.calendarPlayer ?? "",
          originParams.calendarTeam,
          originParams.calendarDay,
        ).replace("from=calendar&", "")
      : "";
  const originName =
    originParams.from === "calendar"
      ? "calendar"
      : originParams.from === "dashboard"
        ? "dashboard"
        : originParams.from === "profile-activity"
          ? "profile-activity"
          : undefined;
  const origin = originName
    ? `&from=${originName}${calendarContext ? `&${calendarContext}` : ""}`
    : "";
  const requestedDate =
    originParams.date ?? (originName === "calendar" ? originParams.calendarDay : undefined);
  const selectedDay = validDay(requestedDate, today);
  const sessions = await getCoachAttendanceSessions(attendanceTeams, selectedDay, now);
  const isFutureDay = selectedDay > today;
  return (
    <PageShell width="sm" className="gap-3 py-3 sm:py-4">
      {origin && (
        <PageBackLink
          href={
            originName === "calendar"
              ? (calendarBackHref(originParams) as Route)
              : originName === "dashboard"
                ? "/dashboard"
                : "/profile/activity"
          }
        >
          {originName === "calendar"
            ? "Calendario"
            : originName === "dashboard"
              ? "Inicio"
              : "Mi actividad"}
        </PageBackLink>
      )}
      <header className="flex min-h-12 items-center gap-2.5 px-1">
        <span className="bg-pool-deep flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
          <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="text-pool-deep flex-1 text-2xl font-extrabold">Pasar lista</h1>
        {selectedDay !== today && (
          <Link
            replace
            href={`/attendance?date=${today}${origin}` as Route}
            className="text-pool-blue focus-visible:outline-pool-blue flex min-h-12 min-w-12 items-center justify-center rounded-lg px-2 text-sm font-extrabold focus-visible:outline-2"
          >
            Hoy
          </Link>
        )}
      </header>
      <AttendanceSectionNav current="list" origin={originName} calendarContext={calendarContext} />
      <AttendanceDatePicker
        key={selectedDay}
        selectedDay={selectedDay}
        isToday={selectedDay === today}
        origin={originName}
        calendarContext={calendarContext}
      />
      {isFutureDay && (
        <div className="border-pool-deep/65 text-pool-deep flex items-center gap-3 rounded-xl border-2 bg-blue-50 p-3 text-sm font-semibold">
          <CalendarClock className="h-5 w-5 shrink-0" aria-hidden="true" />
          Podrás pasar lista el día del entrenamiento.
        </div>
      )}
      <section aria-label="Entrenamientos del día" className="flex flex-col gap-3">
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <AttendanceSessionCard
              key={session.id}
              session={session}
              future={isFutureDay}
              href={`/attendance/${session.id}${originName ? `?from=${originName}${calendarContext ? `&${calendarContext}` : ""}` : ""}`}
            />
          ))
        ) : (
          <div className="border-pool-deep/65 text-pool-deep rounded-2xl border-2 bg-white px-5 py-7 text-center">
            <CalendarClock className="text-pool-blue mx-auto h-10 w-10" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-extrabold">No hay entrenamientos este día</h2>
          </div>
        )}
      </section>
    </PageShell>
  );
}
