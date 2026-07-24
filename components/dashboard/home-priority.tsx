import Link from "next/link";
import type { Route } from "next";
import {
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  UsersRound,
} from "lucide-react";

import { formatRelativeUpcoming, formatTimeRangeFromDuration } from "@/lib/domain/calendar";
import type { DashboardCoachSession, DashboardWeekEvent } from "@/server/queries/dashboard";
import type { FamilyOverview } from "@/server/queries/family";

const dayFormatter = new Intl.DateTimeFormat("es-ES", { day: "2-digit" });
const weekdayFormatter = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

export interface AttendanceSeasonStats {
  attendance_pct: number | null;
  trainings_attended: number;
  trainings_total: number;
}

export function HomePriority({
  event,
  now,
  hasSportActivity,
  canManageAttendance,
  coachSessions,
  family,
  playerStats,
}: {
  event: DashboardWeekEvent | null;
  now: Date;
  hasSportActivity: boolean;
  canManageAttendance: boolean;
  coachSessions: DashboardCoachSession[];
  family: FamilyOverview | null;
  playerStats: AttendanceSeasonStats | null;
}) {
  const showAttendance =
    canManageAttendance || Boolean(family?.members.length) || playerStats != null;

  return (
    <div
      className={
        showAttendance
          ? "grid gap-4 md:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)] md:items-stretch"
          : undefined
      }
    >
      {event ? (
        <NextEventSpotlight event={event} now={now} />
      ) : (
        <QuietWeekSpotlight hasSportActivity={hasSportActivity} />
      )}
      {showAttendance ? (
        <AttendanceHub
          canManageAttendance={canManageAttendance}
          coachSessions={coachSessions}
          family={family}
          playerStats={playerStats}
        />
      ) : null}
    </div>
  );
}

function NextEventSpotlight({ event, now }: { event: DashboardWeekEvent; now: Date }) {
  const date = new Date(event.scheduled_at);
  const isMatch = event.kind === "match";
  const title = isMatch ? event.title.replace(/^Partido contra /, "Contra ") : "Entrenamiento";
  const time =
    event.kind === "training" && event.duration_minutes
      ? formatTimeRangeFromDuration(event.scheduled_at, event.duration_minutes)
      : timeFormatter.format(date);
  const href = isMatch ? (`/matches/${event.id}` as Route) : ("/calendar" as Route);

  return (
    <section
      aria-labelledby="next-event-heading"
      className="border-ink-200 bg-paper-card shadow-elev-1 h-full overflow-hidden rounded-2xl border"
    >
      <header className="bg-paper-sunk border-ink-200 flex min-h-16 items-center gap-3 border-b px-4 py-2.5">
        <span className="bg-paper-card text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.06em] uppercase">
            Lo siguiente
          </p>
          <h2 id="next-event-heading" className="text-pool-deep text-base font-extrabold">
            <span className="min-[360px]:hidden">{isMatch ? "Partido" : "Entrenamiento"}</span>
            <span className="hidden min-[360px]:inline">
              {isMatch ? "Próximo partido" : "Próximo entrenamiento"}
            </span>
          </h2>
        </div>
        {event.is_today || event.is_tomorrow ? (
          <span className="bg-paper-card text-pool-deep border-pool-blue/15 inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 text-xs font-extrabold shadow-sm">
            {event.is_today ? "Hoy" : "Mañana"}
          </span>
        ) : null}
      </header>

      <Link
        href={href}
        className="hover:bg-pool-foam/55 focus-visible:bg-pool-foam/55 focus-visible:ring-pool-blue flex min-h-24 touch-manipulation items-center gap-3 px-4 py-3 transition-[background-color,transform] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset active:scale-[0.995] motion-reduce:transition-none"
      >
        <time
          dateTime={event.scheduled_at}
          className="bg-pool-foam flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full"
        >
          <span className="text-pool-blue text-xs leading-none font-extrabold uppercase">
            {weekdayFormatter.format(date).replace(".", "")}
          </span>
          <span className="text-pool-deep mt-1 font-mono text-lg leading-none font-extrabold tabular-nums">
            {dayFormatter.format(date)}
          </span>
        </time>
        <span className="min-w-0 flex-1">
          <span className="font-display text-pool-deep line-clamp-2 block text-base leading-tight font-extrabold">
            {title}
          </span>
          <span className="text-ink-600 mt-1 block text-sm leading-snug font-semibold">
            {event.team_label} · {time}
            {!event.is_today && !event.is_tomorrow
              ? ` · ${formatRelativeUpcoming(event.scheduled_at, now)}`
              : ""}
          </span>
        </span>
        <ChevronRight className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
        <span
          className="h-10 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: event.team_color }}
          aria-hidden="true"
        />
      </Link>
    </section>
  );
}

function AttendanceHub({
  canManageAttendance,
  coachSessions,
  family,
  playerStats,
}: {
  canManageAttendance: boolean;
  coachSessions: DashboardCoachSession[];
  family: FamilyOverview | null;
  playerStats: AttendanceSeasonStats | null;
}) {
  if (canManageAttendance) {
    const completed = coachSessions.filter(
      (session) => session.roster_count > 0 && session.unmarked_count === 0,
    ).length;
    const pending = Math.max(0, coachSessions.length - completed);

    return (
      <AttendanceCard
        icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
        eyebrow="Control diario"
        title="Asistencia de hoy"
      >
        <div className="grid grid-cols-2 gap-2">
          <AttendanceMetric
            value={coachSessions.length}
            label={coachSessions.length === 1 ? "entrenamiento" : "entrenamientos"}
          />
          <AttendanceMetric
            value={pending}
            label={pending === 1 ? "lista pendiente" : "listas pendientes"}
          />
        </div>
        <AttendanceProgress
          value={coachSessions.length > 0 ? (completed / coachSessions.length) * 100 : 0}
          label={
            coachSessions.length > 0
              ? `${completed} de ${coachSessions.length} listas completadas`
              : "Hoy no hay entrenamientos programados"
          }
        />
        <div className="grid gap-2">
          <AttendanceLink href="/attendance" label="Pasar lista" primary />
          <AttendanceLink href="/attendance/summary" label="Ver resumen por equipos" />
        </div>
      </AttendanceCard>
    );
  }

  if (family && family.members.length > 0) {
    return (
      <AttendanceCard
        icon={<UsersRound className="h-5 w-5" aria-hidden="true" />}
        eyebrow="Este mes"
        title="Asistencia familiar"
      >
        <div className="border-ink-200 divide-ink-200 overflow-hidden rounded-xl border divide-y">
          {family.members.map((member) => {
            const attended = member.stats?.month_trainings_attended ?? 0;
            const total = member.stats?.month_trainings_total ?? 0;
            const percentage = member.stats?.month_attendance_pct;
            return (
              <div key={member.id} className="flex min-h-14 items-center gap-2.5 px-3 py-2">
                <span
                  className="h-8 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      member.team_color ?? member.teams[0]?.color ?? "var(--pool-blue)",
                  }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="text-pool-deep block truncate text-sm font-extrabold">
                    {member.display_name}
                  </span>
                  <span className="text-ink-500 mt-0.5 block text-xs font-semibold">
                    {total > 0 ? `${attended} de ${total} entrenamientos` : "Sin registros todavía"}
                  </span>
                </span>
                <strong className="text-pool-deep shrink-0 font-mono text-lg font-extrabold tabular-nums">
                  {percentage == null ? "—" : `${percentage}%`}
                </strong>
              </div>
            );
          })}
        </div>
        <AttendanceLink href="/attendance/history" label="Ver asistencia de la familia" primary />
      </AttendanceCard>
    );
  }

  if (!playerStats) return null;
  const percentage = Math.round(Number(playerStats.attendance_pct ?? 0));

  return (
    <AttendanceCard
      icon={<CalendarCheck2 className="h-5 w-5" aria-hidden="true" />}
      eyebrow="Esta temporada"
      title="Tu asistencia"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <strong className="text-pool-deep font-mono text-3xl leading-none font-extrabold tabular-nums">
            {percentage}%
          </strong>
          <p className="text-ink-500 mt-1 text-xs font-semibold">Asistencia registrada</p>
        </div>
        <p className="text-ink-600 text-right text-sm leading-snug font-bold">
          {playerStats.trainings_total > 0
            ? `${playerStats.trainings_attended} de ${playerStats.trainings_total}`
            : "Sin entrenamientos"}
          <span className="text-ink-500 block text-xs font-semibold">entrenamientos</span>
        </p>
      </div>
      <AttendanceProgress
        value={percentage}
        label={
          playerStats.trainings_total > 0
            ? "Consulta cada día registrado"
            : "Tu historial aparecerá cuando pasen lista"
        }
      />
      <AttendanceLink href="/attendance/history" label="Ver mi asistencia" primary />
    </AttendanceCard>
  );
}

function AttendanceCard({
  icon,
  eyebrow,
  title,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="home-attendance-heading"
      className="border-ink-200 bg-paper-card shadow-elev-1 flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border"
    >
      <header className="bg-paper-sunk/70 border-ink-200 flex min-h-16 items-center gap-3 border-b px-4 py-2.5">
        <span className="bg-paper-card text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.06em] uppercase">
            {eyebrow}
          </p>
          <h2 id="home-attendance-heading" className="text-pool-deep text-base font-extrabold">
            {title}
          </h2>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-3 p-3.5">{children}</div>
    </section>
  );
}

function AttendanceMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-pool-foam/55 rounded-xl px-3 py-2.5">
      <strong className="text-pool-deep block font-mono text-2xl leading-none font-extrabold tabular-nums">
        {value}
      </strong>
      <span className="text-ink-600 mt-1 block text-xs leading-tight font-semibold">{label}</span>
    </div>
  );
}

function AttendanceProgress({ value, label }: { value: number; label: string }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div
        className="bg-ink-200 h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safeValue)}
      >
        <span
          className="bg-success block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${safeValue}%` }}
        />
      </div>
      <p className="text-ink-500 mt-1.5 text-xs leading-snug font-semibold">{label}</p>
    </div>
  );
}

function AttendanceLink({
  href,
  label,
  primary = false,
}: {
  href: "/attendance" | "/attendance/history" | "/attendance/summary";
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href as Route}
      className={
        primary
          ? "bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue flex min-h-12 w-full touch-manipulation items-center justify-between rounded-xl px-4 text-sm font-extrabold transition-[background-color,transform] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none"
          : "border-ink-200 text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue flex min-h-12 w-full touch-manipulation items-center justify-between rounded-xl border px-4 text-sm font-extrabold transition-[background-color,transform] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none"
      }
    >
      <span className="inline-flex items-center gap-2">
        {primary ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
        {label}
      </span>
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function QuietWeekSpotlight({ hasSportActivity }: { hasSportActivity: boolean }) {
  return (
    <section className="border-ink-200 bg-paper-card shadow-elev-1 flex min-h-40 items-center gap-4 rounded-2xl border px-5 py-6">
      <span className="bg-pool-foam text-pool-blue flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
        <CalendarDays className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="font-display text-pool-deep text-xl font-extrabold">
          La piscina está tranquila
        </h2>
        <p className="text-ink-600 mt-1 text-sm leading-relaxed">
          {hasSportActivity
            ? "No tienes entrenamientos ni partidos programados en los próximos 30 días."
            : "Cuando tengas actividad vinculada, aparecerá aquí primero."}
        </p>
      </div>
    </section>
  );
}
