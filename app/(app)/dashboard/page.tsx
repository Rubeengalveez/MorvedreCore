import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Megaphone,
  ShieldCheck,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";

import { PageShell } from "@/components/ui/page-shell";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeUpcoming } from "@/lib/domain/calendar";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getDashboardAudience,
  getUpcomingDashboardEvents,
  type DashboardWeekEvent,
} from "@/server/queries/dashboard";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getNewsFeed, type NewsPostWithReactions } from "@/server/queries/news";
import { getStreaksForPlayer, type ActiveStreakRow } from "@/server/queries/streaks";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inicio — Morvedre Core",
  description: "Lo importante de tu día en el Waterpolo Morvedre.",
};

const dayFormatter = new Intl.DateTimeFormat("es-ES", { day: "2-digit" });
const monthFormatter = new Intl.DateTimeFormat("es-ES", { month: "short" });
const weekdayFormatter = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});
const newsDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

export default async function DashboardPage() {
  const [ctx, season] = await Promise.all([getActiveProfileContext(), getCurrentSeason()]);
  if (!ctx) redirect("/login");

  const { activeProfile, linkedProfiles } = ctx;
  const now = new Date();
  const firstName = activeProfile.full_name.split(" ")[0] ?? activeProfile.full_name;

  if (!season) {
    return (
      <PageShell width="md" className="pb-8">
        <HomeHero firstName={firstName} now={now} contextLabel="Club" />
      </PageShell>
    );
  }

  const audience = await getDashboardAudience(activeProfile.id, season.id);
  const isPlayer = audience.player_team_ids.length > 0;
  const isCoach = audience.staff_teams.length > 0;
  const isAdmin = audience.roles.includes("admin");
  const teamIds = Array.from(
    new Set([...audience.player_team_ids, ...audience.staff_teams.map((team) => team.id)]),
  );
  const supabase = await createClient();

  const [events, streaks, playerStatsRes, teams, newsFeed] = await Promise.all([
    getUpcomingDashboardEvents(teamIds, now),
    isPlayer
      ? getStreaksForPlayer(season.id, activeProfile.id)
      : Promise.resolve([] as ActiveStreakRow[]),
    isPlayer
      ? supabase
          .from("ranking_snapshots")
          .select(
            "goals, exclusions, mvp_count, matches_played, attendance_pct, attendance_streak, trainings_attended, trainings_total",
          )
          .eq("season_id", season.id)
          .eq("scope", "season")
          .eq("scope_key", "all")
          .eq("player_id", activeProfile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getTeamsForProfileInSeason(activeProfile.id, season.id),
    getNewsFeed({ myProfileId: activeProfile.id, pageSize: 3 }),
  ]);

  const activeStreaks = streaks.filter((streak) => streak.current_value > 0).slice(0, 3);
  const newsItems = [...newsFeed.pinned, ...newsFeed.recent].slice(0, 2);
  const contextLabel =
    isPlayer && isCoach
      ? "Jugador · entrenador"
      : isCoach
        ? "Entrenador"
        : isPlayer
          ? "Jugador"
          : isAdmin
            ? "Gestión del club"
            : "Club";
  return (
    <PageShell width="md" className="gap-6 pb-8">
      <HomeHero firstName={firstName} now={now} contextLabel={contextLabel} />

      {events[0] ? (
        <NextTurn event={events[0]} now={now} />
      ) : (
        <QuietWeek isPlayer={isPlayer} isCoach={isCoach} />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {events.length > 1 ? <WeekAgenda events={events.slice(1, 6)} /> : null}

          {newsItems.length > 0 ? <ClubNewsPanel posts={newsItems} /> : null}

          {isPlayer && activeStreaks.length > 0 ? <StreaksPanel streaks={activeStreaks} /> : null}

          {isPlayer && playerStatsRes.data ? <SeasonPanel stats={playerStatsRes.data} /> : null}

          {!isPlayer && !isCoach && linkedProfiles.length > 0 ? (
            <FamilyPanel profiles={linkedProfiles} />
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          {teams.length > 0 ? (
            <section aria-labelledby="home-teams-heading">
              <SectionHeading
                eyebrow="Tu vestuario"
                title={teams.length === 1 ? "Tu equipo" : "Tus equipos"}
              />
              <div className="border-ink-200 bg-paper-card shadow-elev-1 mt-3 overflow-hidden rounded-2xl border">
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/team/${team.id}` as Route}
                    className="border-ink-200 hover:bg-pool-foam/60 focus-visible:bg-pool-foam/60 focus-visible:ring-pool-blue flex min-h-16 touch-manipulation items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                  >
                    <span
                      className="h-10 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: team.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-pool-deep block truncate text-base font-extrabold">
                        {team.label}
                      </span>
                      <span className="text-ink-500 block text-sm font-semibold">
                        {audience.staff_teams.some((staffTeam) => staffTeam.id === team.id)
                          ? "Cuerpo técnico"
                          : "Plantilla"}
                      </span>
                    </span>
                    <ChevronRight className="text-ink-400 h-5 w-5 shrink-0" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {isAdmin ? <ManagementPanel /> : null}
        </aside>
      </div>
    </PageShell>
  );
}

function HomeHero({
  firstName,
  now,
  contextLabel,
}: {
  firstName: string;
  now: Date;
  contextLabel: string;
}) {
  return (
    <header className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-pool-blue text-[11px] font-extrabold tracking-[0.14em] uppercase">
            {contextLabel}
          </p>
          <h1 className="font-display text-pool-deep mt-0.5 truncate text-[1.35rem] leading-tight font-extrabold tracking-tight">
            Hola, {firstName}
          </h1>
        </div>
        <time
          dateTime={now.toISOString()}
          className="bg-pool-foam text-pool-deep border-pool-blue/15 flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border"
          aria-label={new Intl.DateTimeFormat("es-ES", {
            timeZone: "Europe/Madrid",
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(now)}
        >
          <span className="font-mono text-lg leading-none font-extrabold tabular-nums">
            {dayFormatter.format(now)}
          </span>
          <span className="text-pool-blue mt-0.5 text-[9px] font-extrabold tracking-[0.1em] uppercase">
            {monthFormatter.format(now).replace(".", "")}
          </span>
        </time>
      </div>
    </header>
  );
}

function NextTurn({ event, now }: { event: DashboardWeekEvent; now: Date }) {
  const date = new Date(event.scheduled_at);
  const isMatch = event.kind === "match";
  const title = isMatch ? event.title.replace(/^Partido contra /, "Contra ") : "Entrenamiento";
  return (
    <section
      aria-labelledby="next-turn-heading"
      className="border-ink-200 bg-paper-card shadow-elev-2 overflow-hidden rounded-2xl border"
    >
      <div className="flex items-stretch">
        <div className="bg-pool-foam text-pool-deep border-ink-200 flex w-[4.75rem] shrink-0 flex-col items-center justify-center border-r px-2 py-5 sm:w-24">
          <span className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
            {weekdayFormatter.format(date).replace(".", "")}
          </span>
          <span className="mt-1 font-mono text-3xl leading-none font-extrabold tabular-nums">
            {dayFormatter.format(date)}
          </span>
          <span className="text-ink-500 mt-1 text-xs font-bold uppercase">
            {monthFormatter.format(date).replace(".", "")}
          </span>
        </div>
        <div className="min-w-0 flex-1 px-4 py-5 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
              Lo siguiente
            </p>
            {event.is_today || event.is_tomorrow ? (
              <span className="bg-pool-deep text-paper rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase">
                {event.is_today ? "Hoy" : "Mañana"}
              </span>
            ) : null}
          </div>
          <h2
            id="next-turn-heading"
            className="font-display text-pool-deep mt-2 text-2xl leading-tight font-extrabold text-balance sm:text-3xl"
          >
            {title}
          </h2>
          <p className="text-ink-600 mt-2 text-sm font-semibold">
            {event.team_label} · {timeFormatter.format(date)} ·{" "}
            {formatRelativeUpcoming(event.scheduled_at, now)}
          </p>
          <Link
            href={isMatch ? (`/matches/${event.id}` as Route) : ("/calendar" as Route)}
            className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue mt-4 inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-lg text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {isMatch ? "Ver partido" : "Abrir calendario"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="h-1" style={{ backgroundColor: event.team_color }} aria-hidden="true" />
    </section>
  );
}

function WeekAgenda({ events }: { events: DashboardWeekEvent[] }) {
  return (
    <section aria-labelledby="week-agenda-heading">
      <SectionHeading eyebrow="Agenda personal" title="Después" />
      <div className="border-ink-200 bg-paper-card shadow-elev-1 mt-3 overflow-hidden rounded-2xl border">
        {events.map((event) => {
          const date = new Date(event.scheduled_at);
          const isMatch = event.kind === "match";
          return (
            <Link
              key={`${event.kind}-${event.id}`}
              href={isMatch ? (`/matches/${event.id}` as Route) : ("/calendar" as Route)}
              className="border-ink-200 hover:bg-pool-foam/60 focus-visible:bg-pool-foam/60 focus-visible:ring-pool-blue flex min-h-[4.75rem] touch-manipulation items-center gap-3 border-b px-3 py-3 transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:px-4"
            >
              <span className="bg-pool-foam flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl">
                <span className="text-pool-blue text-[10px] leading-none font-extrabold uppercase">
                  {weekdayFormatter.format(date).replace(".", "")}
                </span>
                <span className="text-pool-deep mt-1 font-mono text-lg leading-none font-extrabold tabular-nums">
                  {dayFormatter.format(date)}
                </span>
              </span>
              <span
                className="h-9 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: event.team_color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="text-pool-deep block truncate text-base font-extrabold">
                  {isMatch ? event.title.replace(/^Partido contra /, "Contra ") : "Entrenamiento"}
                </span>
                <span className="text-ink-500 mt-0.5 block truncate text-sm font-semibold">
                  {event.team_label} · {timeFormatter.format(date)}
                </span>
              </span>
              <ChevronRight className="text-ink-400 h-5 w-5 shrink-0" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
      <Link
        href={"/calendar" as Route}
        className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        Ver calendario completo <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function StreaksPanel({ streaks }: { streaks: ActiveStreakRow[] }) {
  return (
    <section aria-labelledby="streaks-heading">
      <SectionHeading eyebrow="Solo para ti" title="Rachas en curso" />
      <div className="border-ink-200 bg-paper-card shadow-elev-1 mt-3 grid overflow-hidden rounded-2xl border sm:grid-cols-3">
        {streaks.map((streak) => (
          <div
            key={streak.type}
            className="border-ink-200 flex items-center gap-3 border-b px-4 py-4 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
          >
            <span className="bg-action/10 text-action flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <Flame className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-pool-deep font-mono text-xl leading-none font-extrabold tabular-nums">
                {streak.current_value}
              </p>
              <p className="text-ink-600 mt-1 text-sm font-bold">{streakLabel(streak.type)}</p>
              <p className="text-ink-400 mt-0.5 text-xs font-semibold">
                Mejor: {streak.best_value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClubNewsPanel({ posts }: { posts: NewsPostWithReactions[] }) {
  return (
    <section aria-labelledby="home-news-heading">
      <SectionHeading eyebrow="Tablón del club" title="Últimas noticias" />
      <div className="border-ink-200 bg-paper-card shadow-elev-1 mt-3 overflow-hidden rounded-2xl border">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/news/${post.id}` as Route}
            className="border-ink-200 hover:bg-pool-foam/60 focus-visible:bg-pool-foam/60 focus-visible:ring-pool-blue flex min-h-[4.75rem] touch-manipulation items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
          >
            <span className="bg-pool-foam text-pool-blue flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <Megaphone className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-pool-deep line-clamp-1 block text-base font-extrabold">
                {post.title}
              </span>
              <span className="text-ink-500 mt-0.5 block truncate text-sm font-semibold">
                {post.audience_team_label ?? "Todo el club"} ·{" "}
                {newsDateFormatter.format(new Date(post.published_at))}
              </span>
            </span>
            <ChevronRight className="text-ink-400 h-5 w-5 shrink-0" aria-hidden="true" />
          </Link>
        ))}
      </div>
      <Link
        href={"/news" as Route}
        className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        Ver todo el tablón <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function SeasonPanel({
  stats,
}: {
  stats: {
    goals: number;
    exclusions: number;
    mvp_count: number;
    matches_played: number;
    attendance_pct: number | null;
  };
}) {
  const items = [
    { label: "Goles", value: stats.goals, icon: Target },
    { label: "Partidos", value: stats.matches_played, icon: CalendarDays },
    { label: "Asistencia", value: `${stats.attendance_pct ?? 0}%`, icon: ShieldCheck },
    { label: "MVP", value: stats.mvp_count, icon: Trophy },
  ];
  return (
    <section aria-labelledby="season-heading">
      <SectionHeading eyebrow="Tu rendimiento" title="Esta temporada" />
      <div className="border-ink-200 bg-paper-card shadow-elev-1 mt-3 grid grid-cols-2 overflow-hidden rounded-2xl border sm:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="border-ink-200 border-r border-b px-4 py-4 even:border-r-0 nth-[n+3]:border-b-0 sm:border-b-0 sm:last:border-r-0 sm:even:border-r"
            >
              <Icon className="text-pool-blue h-5 w-5" aria-hidden="true" />
              <p className="text-pool-deep mt-3 font-mono text-2xl leading-none font-extrabold tabular-nums">
                {item.value}
              </p>
              <p className="text-ink-500 mt-1 text-sm font-bold">{item.label}</p>
            </div>
          );
        })}
      </div>
      <Link
        href={"/rankings" as Route}
        className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        Ver rankings <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function FamilyPanel({ profiles }: { profiles: Array<{ id: string; full_name: string }> }) {
  return (
    <section aria-labelledby="family-heading">
      <SectionHeading eyebrow="Perfiles vinculados" title="Tu familia" />
      <div className="border-ink-200 bg-paper-card shadow-elev-1 mt-3 rounded-2xl border p-4">
        <div className="flex items-start gap-3">
          <span className="bg-pool-foam text-pool-blue flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
            <UsersRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-pool-deep text-base font-extrabold">
              {profiles.length} {profiles.length === 1 ? "perfil vinculado" : "perfiles vinculados"}
            </p>
            <p className="text-ink-600 mt-1 text-sm leading-relaxed">
              Cambia al perfil de cada jugador para ver su agenda, rachas y equipo.
            </p>
          </div>
        </div>
        <Link
          href={"/profile" as Route}
          className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Gestionar perfiles <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function ManagementPanel() {
  const items = [
    { href: "/admin", label: "Panel de gestión", icon: ShieldCheck },
    { href: "/admin/trainings", label: "Entrenamientos", icon: ClipboardCheck },
    { href: "/admin/matches", label: "Partidos", icon: CalendarDays },
  ];
  return (
    <section aria-labelledby="management-heading">
      <SectionHeading eyebrow="Administración" title="Gestionar" />
      <nav
        aria-label="Acciones de administración"
        className="border-ink-200 bg-paper-card shadow-elev-1 mt-3 overflow-hidden rounded-2xl border"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className="border-ink-200 hover:bg-pool-foam/60 focus-visible:bg-pool-foam/60 focus-visible:ring-pool-blue flex min-h-14 items-center gap-3 border-b px-4 transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
            >
              <Icon className="text-pool-blue h-5 w-5" aria-hidden="true" />
              <span className="text-pool-deep min-w-0 flex-1 text-sm font-extrabold">
                {item.label}
              </span>
              <ChevronRight className="text-ink-400 h-5 w-5" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

function QuietWeek({ isPlayer, isCoach }: { isPlayer: boolean; isCoach: boolean }) {
  return (
    <section className="border-ink-200 bg-paper-card flex min-h-40 flex-col items-center gap-4 rounded-2xl border border-dashed px-5 py-6 text-center min-[360px]:flex-row min-[360px]:text-left">
      <span className="bg-pool-foam text-pool-blue flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
        <CalendarDays className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="font-display text-pool-deep text-xl font-extrabold">
          La piscina está tranquila
        </h2>
        <p className="text-ink-600 mt-1 text-sm leading-relaxed">
          {isPlayer || isCoach
            ? "No tienes entrenamientos ni partidos programados en los próximos 30 días."
            : "Cuando tengas actividad vinculada, aparecerá aquí primero."}
        </p>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">{eyebrow}</p>
      <h2
        className="font-display text-pool-deep mt-1 text-2xl leading-tight font-extrabold tracking-tight"
        id={headingId(title)}
      >
        {title}
      </h2>
    </div>
  );
}

function headingId(title: string): string {
  if (title === "Después") return "week-agenda-heading";
  if (title === "Rachas en curso") return "streaks-heading";
  if (title === "Esta temporada") return "season-heading";
  if (title === "Tu familia") return "family-heading";
  if (title === "Gestionar") return "management-heading";
  if (title === "Últimas noticias") return "home-news-heading";
  return "home-teams-heading";
}

function streakLabel(type: ActiveStreakRow["type"]): string {
  switch (type) {
    case "goals_consec":
      return "partidos marcando";
    case "excl_consec":
      return "partidos con exclusión";
    case "train_consec":
      return "entrenos seguidos";
    case "mvp_consec":
      return "MVP seguidos";
    case "wins_consec":
      return "victorias seguidas";
  }
}
