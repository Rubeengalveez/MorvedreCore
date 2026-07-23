import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Info,
  UsersRound,
  X,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { AttendanceSectionNav } from "@/components/attendance/attendance-section-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { getAttendanceDayKey } from "@/lib/domain/attendance";
import {
  getAttendancePeriodRange,
  isDateKey,
  shiftAttendancePeriod,
  type AttendancePeriod,
  type AttendanceTeamReport,
} from "@/lib/domain/attendance-history";
import { cn } from "@/lib/utils/cn";
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
  searchParams: Promise<{ period?: string; date?: string; team?: string }>;
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

  const period: AttendancePeriod = params.period === "week" ? "week" : "month";
  const today = getAttendanceDayKey(new Date());
  const anchor = isDateKey(params.date) ? params.date : today;
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
    (report) => report.session_count > 0 || report.players.some((player) => player.total > 0),
  );
  const attended = visibleReports.reduce((sum, report) => sum + report.attended, 0);
  const absent = visibleReports.reduce((sum, report) => sum + report.absent, 0);
  const total = attended + absent;
  const reviewed = visibleReports.reduce((sum, report) => sum + report.reviewed_session_count, 0);
  const sessions = visibleReports.reduce((sum, report) => sum + report.session_count, 0);

  return (
    <PageShell width="lg" className="gap-4 pb-8">
      <Link
        href={"/attendance" as Route}
        className="text-pool-blue focus-visible:ring-pool-blue -ml-2 inline-flex min-h-12 items-center gap-2 self-start rounded-xl px-2 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Volver a pasar lista
      </Link>

      <PageHeader
        eyebrow="Todas las categorías"
        title="Resumen de asistencia"
        description="Revisa la semana o el mes sin mezclar equipos."
        icon={<CalendarRange className="h-5 w-5" aria-hidden="true" />}
      />

      <AttendanceSectionNav current="summary" />

      <section
        aria-label="Periodo del resumen"
        className="border-ink-200 bg-paper-card rounded-2xl border p-3"
      >
        <nav
          aria-label="Elegir periodo"
          className="bg-paper-sunk grid min-h-12 grid-cols-2 gap-1 rounded-xl p-1"
        >
          {(["week", "month"] as const).map((value) => (
            <Link
              key={value}
              href={`/attendance/summary?period=${value}&date=${anchor}${queryTeam}` as Route}
              aria-current={period === value ? "page" : undefined}
              className={cn(
                "focus-visible:ring-pool-blue flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none",
                period === value ? "bg-pool-deep text-paper shadow-elev-1" : "text-ink-700",
              )}
            >
              {value === "week" ? "Semana" : "Mes"}
            </Link>
          ))}
        </nav>

        <div className="mt-3 grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2">
          <Link
            href={
              `/attendance/summary?period=${period}&date=${previousAnchor}${queryTeam}` as Route
            }
            aria-label={`Ver ${period === "week" ? "la semana" : "el mes"} anterior`}
            className="border-ink-200 text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue flex h-12 w-12 items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Link>
          <h2 className="font-display text-pool-deep text-center text-base font-extrabold capitalize">
            {periodLabel(period, range.from, range.to)}
          </h2>
          <Link
            href={`/attendance/summary?period=${period}&date=${nextAnchor}${queryTeam}` as Route}
            aria-label={`Ver ${period === "week" ? "la semana" : "el mes"} siguiente`}
            className="border-ink-200 text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue flex h-12 w-12 items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </Link>
        </div>

        <form action="/attendance/summary" method="get" className="mt-3">
          <input type="hidden" name="period" value={period} />
          <input type="hidden" name="date" value={anchor} />
          <label htmlFor="attendance-team" className="text-pool-deep text-sm font-extrabold">
            Categoría
          </label>
          <div className="mt-2 flex gap-2">
            <select
              id="attendance-team"
              name="team"
              defaultValue={selectedTeamId}
              className="border-ink-300 bg-paper text-pool-deep focus-visible:ring-pool-blue min-h-12 min-w-0 flex-1 rounded-xl border px-3 text-base font-semibold focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="all">Todas las categorías</option>
              {allTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue min-h-12 shrink-0 rounded-xl px-4 text-sm font-extrabold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Ver
            </button>
          </div>
        </form>
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

      <div className="border-pool-blue/20 bg-pool-foam/60 text-ink-700 flex gap-3 rounded-xl border p-3 text-sm leading-5">
        <Info className="text-pool-blue mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          Los porcentajes solo usan listas guardadas. Las sesiones todavía sin revisar aparecen en
          «Listas revisadas», pero no cuentan como faltas.
        </p>
      </div>

      {visibleReports.length > 0 ? (
        <div className="flex flex-col gap-4">
          {visibleReports.map((report) => (
            <TeamReport key={report.id} report={report} />
          ))}
        </div>
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
    <div className="border-ink-200 bg-paper-card flex min-h-20 flex-col justify-center rounded-xl border px-3 py-3">
      <strong
        className={cn(
          "font-mono text-xl leading-none font-extrabold tabular-nums",
          tone === "brand" && "text-pool-blue",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </strong>
      <span className="text-ink-700 mt-2 text-xs leading-tight font-extrabold">{label}</span>
    </div>
  );
}

function TeamReport({ report }: { report: AttendanceTeamReport }) {
  return (
    <section
      aria-labelledby={`team-attendance-${report.id}`}
      className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border"
    >
      <header className="flex items-center gap-3 px-4 py-4">
        <span
          className="h-12 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: report.color }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2
            id={`team-attendance-${report.id}`}
            className="font-display text-pool-deep text-xl font-extrabold"
          >
            {report.label}
          </h2>
          <p className="text-ink-600 mt-1 text-sm font-semibold">
            {report.reviewed_session_count}/{report.session_count} listas revisadas
          </p>
        </div>
        <span className="bg-pool-foam text-pool-blue rounded-xl px-3 py-2 font-mono text-base font-extrabold tabular-nums">
          {report.percentage == null ? "—" : `${report.percentage} %`}
        </span>
      </header>

      {report.players.length > 0 ? (
        <ul className="divide-ink-200 border-ink-200 divide-y border-t">
          {report.players.map((player) => (
            <li key={player.id} className="px-3 py-3 sm:px-4">
              <div className="flex items-center gap-3">
                <Avatar
                  name={player.full_name}
                  src={player.photo_url}
                  size={44}
                  teamColor={report.color}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-pool-deep truncate text-base font-extrabold">
                    {player.full_name}
                  </p>
                  <p className="text-ink-600 mt-0.5 text-sm font-semibold">
                    {player.total > 0
                      ? `${player.attended} de ${player.total} entrenamientos`
                      : "Sin listas registradas"}
                  </p>
                </div>
                <span
                  className={cn(
                    "min-w-14 rounded-lg px-2 py-1.5 text-center font-mono text-sm font-extrabold tabular-nums",
                    player.percentage == null && "bg-ink-100 text-ink-600",
                    player.percentage != null &&
                      player.percentage >= 80 &&
                      "bg-success/12 text-success",
                    player.percentage != null &&
                      player.percentage < 80 &&
                      "bg-danger/10 text-danger",
                  )}
                >
                  {player.percentage == null ? "—" : `${player.percentage} %`}
                </span>
              </div>
              {player.total > 0 ? (
                <div className="mt-2 grid grid-cols-2 gap-2 pl-14">
                  <span className="bg-success/8 text-success inline-flex min-h-9 items-center justify-center gap-1 rounded-lg px-2 text-sm font-extrabold">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {player.attended} asistencias
                  </span>
                  <span className="bg-danger/8 text-danger inline-flex min-h-9 items-center justify-center gap-1 rounded-lg px-2 text-sm font-extrabold">
                    <X className="h-4 w-4" aria-hidden="true" />
                    {player.absent} ausencias
                  </span>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-ink-200 text-ink-600 flex items-center gap-2 border-t px-4 py-5 text-sm">
          <UsersRound className="h-5 w-5" aria-hidden="true" />
          No hay jugadores en la plantilla de este periodo.
        </div>
      )}
    </section>
  );
}
