import { calendarBackHref, calendarReturnParams } from "@/lib/domain/calendar-presentation";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarRange, ChevronLeft, ChevronRight, ClipboardCheck, Info } from "lucide-react";

import { AttendanceSummaryPlayers } from "@/components/attendance/attendance-summary-players";
import { AttendanceSummaryCategory } from "@/components/attendance/attendance-summary-category";
import { AttendanceSectionNav } from "@/components/attendance/attendance-section-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { getAttendanceDayKey } from "@/lib/domain/attendance";
import {
  getAttendancePeriodRange,
  isDateKey,
  shiftAttendancePeriod,
  summarizeAttendance,
  type AttendancePeriod,
} from "@/lib/domain/attendance-history";
import { cn } from "@/lib/utils/cn";
import { deduplicateAttendanceOccurrences } from "@/lib/domain/attendance-occurrences";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCoachAttendanceReport } from "@/server/queries/attendance";
import { getAttendanceTeams, getDashboardAudience } from "@/server/queries/dashboard";
import { getCurrentSeason } from "@/server/queries/seasons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Resumen de asistencia — Morvedre Core",
  description: "Consulta la asistencia semanal o mensual de todas las categorías.",
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

function periodLabel(period: AttendancePeriod, from: string, to: string): string {
  if (period === "month") {
    return monthFormatter.format(new Date(`${from}T12:00:00.000Z`));
  }
  return `${dateFormatter.format(new Date(`${from}T12:00:00.000Z`))} – ${dateFormatter.format(new Date(`${to}T12:00:00.000Z`))}`;
}

export default async function AttendanceSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    date?: string;
    team?: string;
    from?: string;
    calendarMonth?: string;
    calendarPlayer?: string;
    calendarTeam?: string;
    calendarDay?: string;
  }>;
}) {
  const [ctx, season, params] = await Promise.all([
    getActiveProfileContext(),
    getCurrentSeason(),
    searchParams,
  ]);
  if (!ctx) redirect("/login");
  if (!season) redirect("/dashboard");

  const audience = await getDashboardAudience(ctx.ownProfile.id, season.id);
  if (!audience.can_manage_attendance) redirect("/dashboard");

  const calendarContext =
    params.from === "calendar"
      ? calendarReturnParams(
          params.calendarMonth ?? "",
          params.calendarPlayer ?? "",
          params.calendarTeam,
          params.calendarDay,
        ).replace("from=calendar&", "")
      : "";
  const originName =
    params.from === "calendar"
      ? "calendar"
      : params.from === "dashboard"
        ? "dashboard"
        : params.from === "profile-activity"
          ? "profile-activity"
          : undefined;
  const origin = originName
    ? `&from=${originName}${calendarContext ? `&${calendarContext}` : ""}`
    : "";
  const period: AttendancePeriod = params.period === "week" ? "week" : "month";
  const today = getAttendanceDayKey(new Date());
  const requestedDate =
    params.date ?? (params.from === "calendar" ? params.calendarDay : undefined);
  const anchor = isDateKey(requestedDate) ? requestedDate : today;
  const range = getAttendancePeriodRange(anchor, period);
  const allTeams = await getAttendanceTeams(season.id);
  const selectedTeamId = allTeams.some((team) => team.id === params.team) ? params.team! : "all";
  const selectedTeams =
    selectedTeamId === "all" ? allTeams : allTeams.filter((team) => team.id === selectedTeamId);
  const reports = await getCoachAttendanceReport({
    teams: selectedTeams,
    from: range.from,
    to: range.to,
  });
  const previousAnchor = shiftAttendancePeriod(anchor, period, -1);
  const nextAnchor = shiftAttendancePeriod(anchor, period, 1);
  const queryTeam = selectedTeamId === "all" ? "" : `&team=${selectedTeamId}`;
  const visibleReports = reports.filter(
    (report) => report.session_count > 0 || report.players.length > 0,
  );
  const overview = summarizeAttendance(
    deduplicateAttendanceOccurrences(
      visibleReports
        .flatMap((report) => report.players.flatMap((player) => player.records))
        .filter((record) => {
          const day = getAttendanceDayKey(record.scheduled_at);
          return day >= range.from && day <= range.to;
        })
        .map((record) => ({
          ...record,
          joint_id: record.joint_id ?? null,
          unreviewed: record.unreviewed ?? false,
        })),
    ),
  );
  const attended = overview.attended;
  const absent = overview.absent;
  const total = attended + absent;
  const reviewed = visibleReports.reduce((sum, report) => sum + report.reviewed_session_count, 0);
  const sessions = visibleReports.reduce((sum, report) => sum + report.session_count, 0);

  return (
    <PageShell width="lg" className="gap-4 pb-8">
      <PageBackLink
        href={
          params.from === "calendar"
            ? (calendarBackHref(params) as Route)
            : params.from === "dashboard"
              ? "/dashboard"
              : params.from === "profile-activity"
                ? "/profile/activity"
                : "/attendance"
        }
      >
        {params.from === "calendar"
          ? "Calendario"
          : params.from === "dashboard"
            ? "Inicio"
            : params.from === "profile-activity"
              ? "Mi actividad"
              : "Volver a pasar lista"}
      </PageBackLink>

      <header className="flex min-h-12 items-center gap-2.5">
        <span className="bg-pool-deep flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
          <CalendarRange className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="text-pool-deep text-2xl font-extrabold">Resumen de asistencia</h1>
      </header>

      <AttendanceSectionNav
        current="summary"
        origin={originName}
        calendarContext={calendarContext}
      />

      <section
        aria-label="Periodo del resumen"
        className="border-pool-deep/65 bg-paper-card rounded-2xl border p-3"
      >
        <nav
          aria-label="Elegir periodo"
          className="bg-paper-sunk grid min-h-12 grid-cols-2 gap-1 rounded-xl p-1"
        >
          {(["week", "month"] as const).map((value) => (
            <Link
              key={value}
              href={
                `/attendance/summary?period=${value}&date=${anchor}${queryTeam}${origin}` as Route
              }
              aria-current={period === value ? "page" : undefined}
              className={cn(
                "focus-visible:ring-pool-blue flex min-h-12 touch-manipulation items-center justify-center rounded-lg px-3 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none",
                period === value ? "bg-pool-deep text-paper shadow-elev-1" : "text-pool-deep",
              )}
            >
              {value === "week" ? "Semana" : "Mes"}
            </Link>
          ))}
        </nav>

        <div className="mt-3 grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2">
          <Link
            href={
              `/attendance/summary?period=${period}&date=${previousAnchor}${queryTeam}${origin}` as Route
            }
            aria-label={`Ver ${period === "week" ? "la semana" : "el mes"} anterior`}
            className="border-pool-deep/65 text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue flex h-12 w-12 items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Link>
          <h2 className="font-display text-pool-deep text-center text-base font-extrabold capitalize">
            {periodLabel(period, range.from, range.to)}
          </h2>
          <Link
            href={
              `/attendance/summary?period=${period}&date=${nextAnchor}${queryTeam}${origin}` as Route
            }
            aria-label={`Ver ${period === "week" ? "la semana" : "el mes"} siguiente`}
            className="border-pool-deep/65 text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue flex h-12 w-12 items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </Link>
        </div>

        <AttendanceSummaryCategory
          teams={allTeams.map((team) => ({ id: team.id, label: team.label }))}
          selectedTeamId={selectedTeamId}
          baseHref={`/attendance/summary?period=${period}&date=${anchor}${origin}`}
        />
      </section>

      <section aria-label="Resumen general" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric value={`${reviewed}/${sessions}`} label="Listas revisadas" tone="brand" />
        <Metric
          value={total > 0 ? `${Math.round((attended / total) * 100)} %` : "—"}
          label="Asistencia media"
          tone="success"
        />
        <Metric value={attended} label="Asistencias" tone="success" />
        <Metric value={absent} label="Ausencias" tone="danger" />
      </section>

      <div className="border-pool-blue bg-pool-ice text-pool-deep flex gap-3 rounded-xl border p-3 text-sm leading-5">
        <Info className="text-pool-blue mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          Sin revisar cuenta como asistencia provisional. Solo se cuenta una falta cuando el
          entrenador la marca.
        </p>
      </div>

      {visibleReports.length > 0 ? (
        <AttendanceSummaryPlayers
          reports={visibleReports}
          initialMonth={anchor.slice(0, 7)}
          calendarMonths={Array.from(new Set([range.from.slice(0, 7), range.to.slice(0, 7)]))}
        />
      ) : (
        <EmptyState
          icon={<ClipboardCheck className="h-7 w-7" aria-hidden="true" />}
          title="Sin asistencia en este periodo"
          description="Prueba otra semana, otro mes o selecciona todas las categorías."
        />
      )}
    </PageShell>
  );
}

function Metric({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone: "brand" | "success" | "danger";
}) {
  return (
    <div className="border-pool-deep/65 bg-paper-card flex min-h-20 flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-center">
      <strong
        className={cn(
          "font-mono text-xl leading-none font-extrabold tabular-nums",
          tone === "brand" && "text-pool-blue",
          tone === "success" && "text-green-800",
          tone === "danger" && "text-red-800",
        )}
      >
        {value}
      </strong>
      <span className="text-pool-deep mt-2 text-xs leading-tight font-extrabold">{label}</span>
    </div>
  );
}
