import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarCheck2,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Minus,
  UsersRound,
  X,
} from "lucide-react";

import { AttendanceHistoryCalendar } from "@/components/attendance/attendance-history-calendar";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import {
  getMonthRange,
  isMonthKey,
  monthKeyFromDate,
  shiftMonthKey,
  summarizeAttendance,
} from "@/lib/domain/attendance-history";
import { cn } from "@/lib/utils/cn";
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

const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

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
  searchParams: Promise<{ player?: string; month?: string }>;
}) {
  const [ctx, season, params] = await Promise.all([
    getActiveProfileContext(),
    getCurrentSeason(),
    searchParams,
  ]);
  if (!ctx) redirect("/login");
  if (!season) redirect("/profile");

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
        <PageBackLink href={"/calendar" as Route}>Volver al calendario</PageBackLink>
        <EmptyState
          icon={<CalendarCheck2 className="h-7 w-7" aria-hidden="true" />}
          title="Todavía no hay asistencia"
          description="Cuando este perfil forme parte de un equipo y el entrenador pase lista, aparecerá aquí."
        />
      </PageShell>
    );
  }

  const showFamilySelector = childCandidates.length > 1;
  const requestedProfile = childCandidates.find((profile) => profile.id === params.player);
  const selectedProfiles = showFamilySelector
    ? requestedProfile
      ? [requestedProfile]
      : childCandidates
    : [childCandidates[0] ?? candidates[0]!];
  const selectedProfile = selectedProfiles.length === 1 ? selectedProfiles[0] : null;
  const month = isMonthKey(params.month) ? params.month : monthKeyFromDate();
  const { from, to } = getMonthRange(month);
  const records = await getAttendanceHistory({
    seasonId: season.id,
    playerIds: selectedProfiles.map((profile) => profile.id),
    from,
    to,
  });
  const summary = summarizeAttendance(records);
  const [year, monthNumber] = month.split("-").map(Number);
  const monthDate = new Date(Date.UTC(year ?? 2000, (monthNumber ?? 1) - 1, 1, 12));
  const previousMonth = shiftMonthKey(month, -1);
  const nextMonth = shiftMonthKey(month, 1);
  const playerQuery = `player=${selectedProfile?.id ?? "all"}`;
  const selectedNames = selectedProfiles.map(
    (profile) => profile.full_name.split(/\s+/)[0] ?? profile.full_name,
  );
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
      <PageBackLink href={"/calendar" as Route}>Volver al calendario</PageBackLink>

      <PageHeader
        eyebrow="Temporada actual"
        title="Historial de asistencia"
        description={`Días registrados de ${selectedNames.join(" y ")}.`}
        icon={<CalendarCheck2 className="h-5 w-5" aria-hidden="true" />}
        teamColor={selectedProfile?.team_color}
      />

      {showFamilySelector ? (
        <nav
          aria-label="Elegir jugador"
          className="border-ink-200 bg-paper-card grid grid-cols-3 gap-2 rounded-2xl border p-2"
        >
          <Link
            href={`/attendance/history?player=all&month=${month}` as Route}
            aria-current={selectedProfile === null ? "page" : undefined}
            className={cn(
              "focus-visible:ring-pool-blue flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-extrabold transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
              selectedProfile === null
                ? "bg-pool-deep text-paper shadow-elev-1"
                : "bg-paper-sunk text-pool-deep hover:bg-pool-foam",
            )}
          >
            <UsersRound className="h-5 w-5" aria-hidden="true" />
            Todos
          </Link>
          {childCandidates.map((profile) => {
            const selected = profile.id === selectedProfile?.id;
            return (
              <Link
                key={profile.id}
                href={`/attendance/history?player=${profile.id}&month=${month}` as Route}
                aria-current={selected ? "page" : undefined}
                aria-label={`Ver asistencia de ${profile.full_name}`}
                className={cn(
                  "focus-visible:ring-pool-blue flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
                  selected
                    ? "bg-pool-deep text-paper shadow-elev-1"
                    : "bg-paper-sunk text-pool-deep hover:bg-pool-foam",
                )}
              >
                <Avatar
                  name={profile.full_name}
                  src={profile.photo_url}
                  size={28}
                  teamColor={profile.team_color ?? undefined}
                />
                <span className="min-w-0 truncate text-sm font-extrabold">
                  {profile.full_name.split(/\s+/)[0] ?? profile.full_name}
                </span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      <section aria-labelledby="attendance-month-heading" className="flex flex-col gap-3">
        <div className="border-ink-200 bg-paper-card grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2 rounded-2xl border p-2">
          <Link
            href={`/attendance/history?${playerQuery}&month=${previousMonth}` as Route}
            aria-label="Ver el mes anterior"
            className="border-ink-200 text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue flex h-12 w-12 items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Link>
          <h2
            id="attendance-month-heading"
            className="font-display text-pool-deep text-center text-lg font-extrabold capitalize"
          >
            {monthFormatter.format(monthDate)}
          </h2>
          <Link
            href={`/attendance/history?${playerQuery}&month=${nextMonth}` as Route}
            aria-label="Ver el mes siguiente"
            className="border-ink-200 text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue flex h-12 w-12 items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </Link>
        </div>

        <div aria-label="Resumen del mes seleccionado" className="grid grid-cols-3 gap-2">
          <SummaryCard value={summary.attended} label="Asistencias" tone="success" />
          <SummaryCard value={summary.absent} label="Ausencias" tone="danger" />
          <SummaryCard
            value={summary.percentage == null ? "—" : `${summary.percentage} %`}
            label="% del mes"
            tone="brand"
          />
        </div>

        <AttendanceHistoryCalendar
          year={year ?? 2000}
          month={(monthNumber ?? 1) - 1}
          records={records}
          profiles={selectedProfiles}
        />

        <div className="text-ink-700 flex flex-wrap gap-x-4 gap-y-2 px-1 text-sm font-semibold">
          <Legend icon={<Check className="h-4 w-4" />} label="Asistió" tone="success" />
          <Legend icon={<X className="h-4 w-4" />} label="No asistió" tone="danger" />
          <Legend icon={<Minus className="h-4 w-4" />} label="Doble sesión mixta" tone="brand" />
        </div>
      </section>

      <div className="border-ink-300 bg-paper-card text-ink-900 shadow-elev-1 flex items-start gap-3 rounded-xl border p-3 text-sm leading-5">
        <span className="bg-pool-deep text-paper flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <Info className="h-5 w-5" aria-hidden="true" />
        </span>
        <p>
          Solo cuentan las listas guardadas por un entrenador. Un entrenamiento sin lista no se
          muestra como ausencia.
        </p>
      </div>

      <section aria-labelledby="attendance-detail-heading" className="flex flex-col gap-3">
        <h2
          id="attendance-detail-heading"
          className="font-display text-pool-deep text-xl font-extrabold"
        >
          Detalle del mes
        </h2>
        {records.length > 0 ? (
          <ol className="flex flex-col gap-2.5">
            {recordsByDay.map(([day, dayRecords]) => (
              <li key={day}>
                <section className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-xl border">
                  <h3 className="bg-pool-ice text-pool-deep border-ink-200 border-b px-3 py-2 text-sm leading-none font-extrabold first-letter:uppercase">
                    {day}
                  </h3>
                  <ol className="divide-ink-200 divide-y">
                    {dayRecords.map((record) => {
                      const profileName =
                        profileById.get(record.player_id)?.full_name ?? "Jugador";
                      return (
                        <li
                          key={`${record.session_id}-${record.player_id}`}
                          className="grid min-h-14 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2"
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              record.present
                                ? "bg-emerald-50 text-success"
                                : "bg-red-50 text-danger",
                            )}
                          >
                            {record.present ? (
                              <Check className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <X className="h-5 w-5" aria-hidden="true" />
                            )}
                            <span className="sr-only">
                              {record.present ? "Asistió" : "Ausente"}
                            </span>
                          </span>
                          <div className="min-w-0">
                            <p className="text-pool-deep truncate text-sm leading-tight font-extrabold">
                              {selectedProfiles.length > 1 ? profileName : record.team_label}
                            </p>
                            <p className="text-ink-600 mt-0.5 truncate text-xs leading-tight font-semibold">
                              {selectedProfiles.length > 1 ? record.team_label : "Entrenamiento"}
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
      </section>
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
        "border-ink-300 bg-paper-card shadow-elev-1 flex min-h-20 flex-col items-center justify-center rounded-xl border border-t-4 px-2 py-3 text-center",
        tone === "success" && "border-t-success",
        tone === "danger" && "border-t-danger",
        tone === "brand" && "border-t-pool-blue",
      )}
    >
      <strong
        className={cn(
          "font-mono text-xl leading-none font-extrabold tabular-nums",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
          tone === "brand" && "text-pool-blue",
        )}
      >
        {value}
      </strong>
      <span className="text-ink-900 mt-2 text-xs leading-tight font-extrabold">{label}</span>
    </div>
  );
}

function Legend({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "success" | "danger" | "brand";
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
          tone === "brand" && "text-pool-blue",
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      {label}
    </span>
  );
}
