import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ClipboardCheck,
  UsersRound,
} from "lucide-react";

import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { AttendanceSectionNav } from "@/components/attendance/attendance-section-nav";
import { getAttendanceDayKey } from "@/lib/domain/attendance";
import { cn } from "@/lib/utils/cn";
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
  title: "Asistencia — Morvedre Core",
  description: "Pasa lista en los entrenamientos de hoy.",
};

const dayFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  minute: "2-digit",
});

function validDay(value: string | undefined, fallback: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? fallback
    : value;
}

function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const [ctx, season] = await Promise.all([getActiveProfileContext(), getCurrentSeason()]);
  if (!ctx) redirect("/login");
  if (!season) redirect("/dashboard");

  const audience = await getDashboardAudience(ctx.activeProfile.id, season.id);
  if (!audience.can_manage_attendance) redirect("/dashboard");
  const attendanceTeams = await getAttendanceTeams(season.id);

  const now = new Date();
  const today = getAttendanceDayKey(now);
  const requestedDate = (await searchParams).date;
  const selectedDay = validDay(requestedDate, today);
  const sessions = await getCoachAttendanceSessions(attendanceTeams, selectedDay, now);
  const previousDay = addDays(selectedDay, -1);
  const nextDay = addDays(selectedDay, 1);
  const selectedDate = new Date(`${selectedDay}T12:00:00.000Z`);
  const isFutureDay = selectedDay > today;

  return (
    <PageShell width="sm" className="gap-4 pb-8">
      <PageHeader
        eyebrow="Entrenamientos"
        title="Asistencia"
        description="Pasa lista y corrige días anteriores."
        icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
      />

      <AttendanceSectionNav current="list" />

      <section aria-labelledby="attendance-date-heading" className="flex flex-col gap-3">
        <div className="border-ink-200 bg-paper-card rounded-2xl border p-3">
          <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_3.25rem] items-center gap-2">
            <Link
              href={`/attendance?date=${previousDay}` as Route}
              aria-label="Ver el día anterior"
              className="border-ink-200 text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue flex h-13 w-13 touch-manipulation items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
            >
              <ChevronLeft className="h-7 w-7" aria-hidden="true" />
            </Link>
            <div className="min-w-0 text-center">
              <p className="text-pool-blue text-xs font-extrabold tracking-[0.08em] uppercase">
                {selectedDay === today ? "Hoy" : isFutureDay ? "Próximo día" : "Fecha seleccionada"}
              </p>
              <h2
                id="attendance-date-heading"
                className="text-pool-deep mt-0.5 text-base font-extrabold capitalize"
              >
                {dayFormatter.format(selectedDate)}
              </h2>
            </div>
            <Link
              href={`/attendance?date=${nextDay}` as Route}
              aria-label="Ver el día siguiente"
              className="border-ink-200 text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue flex h-13 w-13 touch-manipulation items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
            >
              <ChevronRight className="h-7 w-7" aria-hidden="true" />
            </Link>
          </div>
          <form action="/attendance" method="get" className="border-ink-200 mt-3 border-t pt-3">
            <label htmlFor="attendance-date" className="text-pool-deep text-sm font-extrabold">
              Ir a una fecha
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="attendance-date"
                name="date"
                type="date"
                defaultValue={selectedDay}
                className="border-ink-300 bg-paper text-pool-deep focus-visible:ring-pool-blue min-h-12 min-w-0 flex-1 rounded-xl border px-3 font-semibold focus-visible:ring-2 focus-visible:outline-none"
              />
              <button
                type="submit"
                className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-4 font-extrabold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
                Ver
              </button>
            </div>
          </form>
          {selectedDay !== today ? (
            <Link
              href={"/attendance" as Route}
              className="text-pool-blue focus-visible:ring-pool-blue mt-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
            >
              Volver a hoy
            </Link>
          ) : null}
          {isFutureDay ? (
            <div className="border-ink-200 bg-paper-sunk text-ink-700 mt-2 flex gap-2.5 rounded-xl border px-3 py-3 text-sm leading-5 font-semibold">
              <CalendarClock className="text-ink-500 mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>Puedes consultar la plantilla. La asistencia se habilitará ese mismo día.</p>
            </div>
          ) : null}
        </div>

        {sessions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {sessions.map((session) => {
              const complete = session.roster_count > 0 && session.unmarked_count === 0;
              return (
                <Link
                  key={session.id}
                  href={`/attendance/${session.id}` as Route}
                  className={cn(
                    "focus-visible:ring-pool-blue flex min-h-28 touch-manipulation items-center gap-3 rounded-2xl border-2 p-4 transition-[background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none",
                    isFutureDay
                      ? "border-ink-200 bg-paper-sunk hover:border-ink-300"
                      : "border-ink-200 bg-paper-card shadow-elev-1 hover:border-pool-blue/60 hover:bg-pool-foam/35",
                  )}
                >
                  <span
                    className="h-16 w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: isFutureDay ? "var(--ink-300)" : session.team_color,
                    }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-xl leading-tight font-extrabold",
                        isFutureDay ? "text-ink-600" : "text-pool-deep",
                      )}
                    >
                      {session.team_label}
                    </span>
                    <span
                      className={cn(
                        "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold",
                        isFutureDay ? "text-ink-500" : "text-ink-600",
                      )}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-4 w-4" aria-hidden="true" />
                        {timeFormatter.format(new Date(session.scheduled_at))}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <UsersRound className="h-4 w-4" aria-hidden="true" />
                        {session.roster_count} jugadores
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-extrabold",
                        isFutureDay
                          ? "bg-ink-200 text-ink-600"
                          : complete
                            ? "bg-success/12 text-success"
                            : "bg-ball-gold/20 text-pool-deep",
                      )}
                    >
                      {isFutureDay ? (
                        <CalendarClock className="h-4 w-4" aria-hidden="true" />
                      ) : complete ? (
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      ) : null}
                      {isFutureDay
                        ? "Solo consulta"
                        : complete
                          ? session.absent_count > 0
                            ? `${session.present_count} presentes · ${session.absent_count} ausentes`
                            : "Todo el equipo presente"
                          : "Sin revisar"}
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-7 w-7 shrink-0",
                      isFutureDay ? "text-ink-500" : "text-pool-blue",
                    )}
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="border-ink-200 bg-paper-card rounded-2xl border border-dashed px-5 py-10 text-center">
            <CheckCircle2 className="text-success mx-auto h-11 w-11" aria-hidden="true" />
            <h2 className="text-pool-deep mt-3 text-xl font-extrabold">
              No hay entrenamientos este día
            </h2>
            <p className="text-ink-600 mt-1 text-sm leading-relaxed">
              Usa las flechas o el calendario para consultar otra fecha.
            </p>
          </div>
        )}
      </section>
    </PageShell>
  );
}
