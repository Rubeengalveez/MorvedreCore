import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck2,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Minus,
  X,
} from "lucide-react";

import { AttendanceHistoryCalendar } from "@/components/attendance/attendance-history-calendar";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
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

  if (candidates.length === 0) {
    return (
      <PageShell width="md" className="gap-4 pb-8">
        <Link
          href={"/calendar" as Route}
          className="text-pool-blue focus-visible:ring-pool-blue -ml-2 inline-flex min-h-12 items-center gap-2 self-start rounded-xl px-2 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Volver al calendario
        </Link>
        <EmptyState
          icon={<CalendarCheck2 className="h-7 w-7" aria-hidden="true" />}
          title="Todavía no hay asistencia"
          description="Cuando este perfil forme parte de un equipo y el entrenador pase lista, aparecerá aquí."
        />
      </PageShell>
    );
  }

  const selectedProfile =
    candidates.find((profile) => profile.id === params.player) ?? candidates[0]!;
  const month = isMonthKey(params.month) ? params.month : monthKeyFromDate();
  const { from, to } = getMonthRange(month);
  const records = await getAttendanceHistory({
    seasonId: season.id,
    playerIds: [selectedProfile.id],
    from,
    to,
  });
  const summary = summarizeAttendance(records);
  const [year, monthNumber] = month.split("-").map(Number);
  const monthDate = new Date(Date.UTC(year ?? 2000, (monthNumber ?? 1) - 1, 1, 12));
  const previousMonth = shiftMonthKey(month, -1);
  const nextMonth = shiftMonthKey(month, 1);
  const playerQuery = `player=${selectedProfile.id}`;

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <Link
        href={"/calendar" as Route}
        className="text-pool-blue focus-visible:ring-pool-blue -ml-2 inline-flex min-h-12 items-center gap-2 self-start rounded-xl px-2 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Volver al calendario
      </Link>

      <PageHeader
        eyebrow="Temporada actual"
        title="Historial de asistencia"
        description={`Días registrados de ${selectedProfile.full_name}.`}
        icon={<CalendarCheck2 className="h-5 w-5" aria-hidden="true" />}
        teamColor={selectedProfile.team_color}
      />

      {candidates.length > 1 ? (
        <nav
          aria-label="Elegir jugador"
          className="border-ink-200 bg-paper-card grid gap-2 rounded-2xl border p-2 sm:grid-cols-2"
        >
          {candidates.map((profile) => {
            const selected = profile.id === selectedProfile.id;
            return (
              <Link
                key={profile.id}
                href={`/attendance/history?player=${profile.id}&month=${month}` as Route}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-pool-blue flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
                  selected
                    ? "bg-pool-deep text-paper shadow-elev-1"
                    : "bg-paper-sunk text-pool-deep hover:bg-pool-foam",
                )}
              >
                <Avatar
                  name={profile.full_name}
                  src={profile.photo_url}
                  size={38}
                  teamColor={profile.team_color ?? undefined}
                />
                <span className="min-w-0 truncate text-sm font-extrabold">{profile.full_name}</span>
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
        />

        <div className="text-ink-700 flex flex-wrap gap-x-4 gap-y-2 px-1 text-sm font-semibold">
          <Legend icon={<Check className="h-4 w-4" />} label="Asistió" tone="success" />
          <Legend icon={<X className="h-4 w-4" />} label="No asistió" tone="danger" />
          <Legend icon={<Minus className="h-4 w-4" />} label="Doble sesión mixta" tone="brand" />
        </div>
      </section>

      <div className="border-pool-blue/20 bg-pool-foam/60 text-ink-700 flex gap-3 rounded-xl border p-3 text-sm leading-5">
        <Info className="text-pool-blue mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
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
          <ol className="flex flex-col gap-2">
            {records.map((record) => (
              <li
                key={`${record.session_id}-${record.player_id}`}
                className={cn(
                  "border-ink-200 bg-paper-card shadow-elev-1 flex min-h-18 items-center gap-3 rounded-xl border p-3",
                  record.present ? "border-l-success border-l-4" : "border-l-danger border-l-4",
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    record.present ? "bg-success/12 text-success" : "bg-danger/12 text-danger",
                  )}
                  aria-hidden="true"
                >
                  {record.present ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-pool-deep text-base leading-tight font-extrabold capitalize">
                    {dayFormatter.format(new Date(record.scheduled_at))}
                  </p>
                  <p className="text-ink-600 mt-1 text-sm font-semibold">
                    {record.team_label} · {timeFormatter.format(new Date(record.scheduled_at))}
                  </p>
                  {!record.present && record.reason ? (
                    <p className="text-ink-700 mt-1 text-sm">Motivo: {record.reason}</p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-lg px-2 py-1 text-xs font-extrabold",
                    record.present ? "bg-success/12 text-success" : "bg-danger/12 text-danger",
                  )}
                >
                  {record.present ? "Asistió" : "Ausente"}
                </span>
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
        "flex min-h-20 flex-col items-center justify-center rounded-xl border px-2 py-3 text-center",
        tone === "success" && "border-success/30 bg-success/8",
        tone === "danger" && "border-danger/30 bg-danger/8",
        tone === "brand" && "border-pool-blue/25 bg-pool-foam",
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
      <span className="text-ink-700 mt-2 text-xs leading-tight font-extrabold">{label}</span>
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
