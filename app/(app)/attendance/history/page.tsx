import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { CalendarCheck2, Check, X } from "lucide-react";

import { AttendanceHistoryCalendar } from "@/components/attendance/attendance-history-calendar";
import { AttendanceHistoryControls } from "@/components/attendance/attendance-history-controls";
import {
  calendarBackHref,
  calendarReturnParams,
  calendarMonth,
  calendarMonthKey,
} from "@/lib/domain/calendar-presentation";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import {
  getMonthRange,
  monthKeyFromDate,
  summarizeAttendance,
} from "@/lib/domain/attendance-history";
import { cn } from "@/lib/utils/cn";
import { notificationBackTarget } from "@/lib/domain/notifications";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getAttendanceHistory } from "@/server/queries/attendance";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Historial de asistencia — Morvedre Core",
  description: "Consulta los entrenamientos a los que has asistido y tus ausencias.",
};

const dayFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Madrid",
});

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

export default async function AttendanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    player?: string;
    month?: string;
    from?: string;
    notificationId?: string;
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
  if (!season) redirect("/profile");
  const profileOrigin =
    params.from === "family" || params.from === "profile-activity" || params.from === "profile";
  const notification = notificationBackTarget(params.from, params.notificationId);
  const origin =
    params.from === "calendar"
      ? `&${calendarReturnParams(params.calendarMonth ?? params.month ?? monthKeyFromDate(), params.calendarPlayer ?? params.player ?? "", params.calendarTeam, params.calendarDay)}`
      : notification
        ? `&from=notification&notificationId=${params.notificationId}`
        : profileOrigin
          ? `&from=${params.from}`
          : "";
  const backHref =
    (params.from === "calendar" ? calendarBackHref(params) : null) ??
    notification?.href ??
    (params.from === "family"
      ? "/profile/family"
      : params.from === "profile-activity"
        ? "/profile/activity"
        : params.from === "profile"
          ? "/profile"
          : "/calendar");
  const backLabel =
    notification?.label ??
    (params.from === "family"
      ? "Mi familia"
      : params.from === "profile-activity"
        ? "Mi actividad"
        : params.from === "profile"
          ? "Mi perfil"
          : "Volver al calendario");

  const profiles = [ctx.ownProfile, ...ctx.linkedProfiles];
  const profilesWithTeams = await Promise.all(
    profiles.map(async (profile) => ({
      profile,
      teams: await getTeamsForProfileInSeason(profile.id, season.id),
    })),
  );
  const candidates = profilesWithTeams
    .filter((entry) => entry.teams.length > 0)
    .map((entry) => entry.profile);
  const childCandidates = candidates.filter((profile) =>
    ctx.linkedProfiles.some((linkedProfile) => linkedProfile.id === profile.id),
  );

  if (candidates.length === 0) {
    return (
      <PageShell width="md" className="gap-4 pb-8">
        <PageBackLink href={backHref as Route}>{backLabel}</PageBackLink>
        <EmptyState
          icon={<CalendarCheck2 className="h-7 w-7" aria-hidden="true" />}
          title="Todavía no hay asistencia"
          description="Cuando este perfil forme parte de un equipo y el entrenador pase lista, aparecerá aquí."
        />
      </PageShell>
    );
  }

  const requestedProfile = candidates.find((profile) => profile.id === params.player);
  const selectedProfiles =
    params.player === "all"
      ? candidates
      : requestedProfile
        ? [requestedProfile]
        : params.from === "profile-activity" &&
            candidates.some((profile) => profile.id === ctx.ownProfile.id)
          ? [ctx.ownProfile]
          : childCandidates.length
            ? childCandidates
            : [candidates[0]!];
  const selectedProfile = selectedProfiles.length === 1 ? selectedProfiles[0] : null;
  const month = calendarMonthKey(calendarMonth(params.month));
  const { from, to } = getMonthRange(month);
  const records = await getAttendanceHistory({
    seasonId: season.id,
    playerIds: selectedProfiles.map((profile) => profile.id),
    from,
    to,
  });
  const summary = summarizeAttendance(records);
  const [year, monthNumber] = month.split("-").map(Number);
  const profileById = new Map(selectedProfiles.map((profile) => [profile.id, profile]));
  const recordsByDay = Array.from(
    records.reduce((groups, record) => {
      const day = dayFormatter.format(new Date(record.scheduled_at));
      const entries = groups.get(day);
      if (entries) entries.push(record);
      else groups.set(day, [record]);
      return groups;
    }, new Map<string, typeof records>()),
  );

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageBackLink href={backHref as Route}>{backLabel}</PageBackLink>

      <header className="flex min-h-12 items-center gap-2.5 px-1">
        <span className="bg-pool-deep flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
          <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-pool-deep text-2xl font-extrabold">Asistencia</h1>
          <p className="text-pool-deep text-sm font-bold">
            <AdaptivePlayerName name={selectedProfile?.full_name ?? "Toda la familia"} />
          </p>
        </div>
      </header>
      <AttendanceHistoryControls
        month={month}
        player={selectedProfile?.id ?? "all"}
        people={candidates}
        origin={origin}
      />
      <section aria-label="Asistencia del mes" className="flex flex-col gap-3">
        <div aria-label="Resumen del mes seleccionado" className="grid grid-cols-3 gap-2">
          <SummaryCard value={summary.attended} label="Asistió" tone="success" />
          <SummaryCard value={summary.absent} label="No asistió" tone="danger" />
          <SummaryCard
            value={summary.percentage == null ? "—" : `${summary.percentage} %`}
            label="Asistencia"
            tone="brand"
          />
        </div>

        <AttendanceHistoryCalendar
          year={year ?? 2000}
          month={(monthNumber ?? 1) - 1}
          records={records}
          profiles={selectedProfiles}
        />
      </section>

      <details className="border-pool-deep/65 rounded-xl border-2 bg-white p-3 open:pb-3">
        <summary className="text-pool-deep focus-visible:outline-pool-blue min-h-12 cursor-pointer content-center rounded-lg text-base font-extrabold focus-visible:outline-2">
          Detalle del mes · {records.length} registros
        </summary>
        {records.length > 0 ? (
          <ol className="flex flex-col gap-2.5">
            {recordsByDay.map(([day, dayRecords]) => (
              <li key={day}>
                <section className="border-pool-deep/65 shadow-elev-1 overflow-hidden rounded-xl border-2 bg-white">
                  <h3 className="bg-pool-deep px-3 py-3 text-base leading-tight font-extrabold text-white first-letter:uppercase">
                    {day}
                  </h3>
                  <ol className="space-y-1">
                    {dayRecords.map((record) => {
                      const profileName = profileById.get(record.player_id)?.full_name ?? "Jugador";
                      return (
                        <li
                          key={`${record.session_id}-${record.player_id}`}
                          className="grid min-h-14 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2"
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              record.unreviewed
                                ? "bg-amber-50 text-amber-950"
                                : record.present
                                  ? "bg-emerald-50 text-green-800"
                                  : "bg-red-50 text-red-800",
                            )}
                          >
                            {record.present ? (
                              <Check className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <X className="h-5 w-5" aria-hidden="true" />
                            )}
                            <span className="sr-only">
                              {record.unreviewed
                                ? "Sin revisar"
                                : record.present
                                  ? "Asistió"
                                  : "Ausente"}
                            </span>
                          </span>
                          <div className="min-w-0">
                            <p className="text-pool-deep truncate text-base leading-tight font-extrabold">
                              {selectedProfiles.length > 1 ? profileName : record.team_label}
                            </p>
                            <p className="text-pool-deep mt-0.5 truncate text-sm leading-tight font-semibold">
                              {record.unreviewed
                                ? "Sin revisar · asistencia provisional"
                                : selectedProfiles.length > 1
                                  ? record.team_label
                                  : "Entrenamiento"}
                              {!record.present && record.reason ? ` · ${record.reason}` : ""}
                            </p>
                          </div>
                          <time
                            dateTime={record.scheduled_at}
                            className="text-pool-deep font-mono text-sm font-extrabold tabular-nums"
                          >
                            {timeFormatter.format(new Date(record.scheduled_at))}
                          </time>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            icon={<CalendarCheck2 className="h-7 w-7" aria-hidden="true" />}
            title="Sin listas este mes"
            description="No hay entrenamientos con asistencia registrada en el mes seleccionado."
          />
        )}
      </details>
    </PageShell>
  );
}

function SummaryCard({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone: "success" | "danger" | "brand";
}) {
  return (
    <div
      className={cn(
        "border-pool-deep/65 shadow-elev-1 flex min-h-18 flex-col items-center justify-center rounded-xl border-2 bg-white px-2 py-3 text-center",
        tone === "success" && "border-green-800 bg-green-50",
        tone === "danger" && "border-red-800 bg-red-50",
        tone === "brand" && "border-pool-deep/65 bg-blue-50",
      )}
    >
      <strong
        className={cn(
          "font-mono text-2xl leading-none font-extrabold tabular-nums",
          tone === "success" && "text-green-800",
          tone === "danger" && "text-red-800",
          tone === "brand" && "text-pool-blue",
        )}
      >
        {value}
      </strong>
      <span className="text-ink-900 mt-2 text-sm leading-tight font-extrabold">{label}</span>
    </div>
  );
}
