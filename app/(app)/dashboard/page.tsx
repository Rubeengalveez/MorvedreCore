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
} from "lucide-react";

import { PageShell } from "@/components/ui/page-shell";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeUpcoming, formatTimeRangeFromDuration } from "@/lib/domain/calendar";
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
import { getFamilyOverview, type FamilyOverview } from "@/server/queries/family";

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

  const [audience, family] = await Promise.all([
    getDashboardAudience(activeProfile.id, season.id),
    linkedProfiles.length > 0
      ? getFamilyOverview(ctx.ownProfile.id, season.id)
      : Promise.resolve(null),
  ]);
  const isPlayer = audience.player_team_ids.length > 0;
  const isCoach = audience.staff_teams.length > 0;
  const isAdmin = audience.roles.includes("admin");
  const teamIds = Array.from(
    new Set([
      ...audience.player_team_ids,
      ...audience.staff_teams.map((team) => team.id),
      ...(family?.team_ids ?? []),
    ]),
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
    family && family.members.length > 0
      ? isPlayer || isCoach
        ? "Familia · club"
        : "Familia"
      : isPlayer && isCoach
        ? "Jugador · entrenador"
        : isCoach
          ? "Entrenador"
          : isPlayer
            ? "Jugador"
            : isAdmin
              ? "Gestión del club"
              : "Club";
  return (
    <PageShell width="md" className="gap-5 pb-8">
      <HomeHero firstName={firstName} now={now} contextLabel={contextLabel} />

      {events[0] ? (
        <NextTurn event={events[0]} now={now} />
      ) : (
        <QuietWeek isPlayer={isPlayer} isCoach={isCoach} />
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {isPlayer && activeStreaks.length > 0 ? <PlayerStreaks streaks={activeStreaks} /> : null}

          {isPlayer && playerStatsRes.data ? <SeasonSnapshot stats={playerStatsRes.data} /> : null}

          {events.length > 1 || newsItems.length > 0 ? (
            <HomeDigest events={events.slice(1, 4)} posts={newsItems} />
          ) : null}

          {family && family.members.length > 0 ? <FamilyPanel family={family} /> : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          {teams.length > 0 ? (
            <section aria-labelledby="home-teams-heading">
              <SectionHeading
                id="home-teams-heading"
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
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.08em] uppercase">
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
          <span className="text-pool-blue mt-0.5 text-xs leading-tight font-extrabold tracking-[0.05em] uppercase">
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
  const timeStr =
    event.kind === "training" && event.duration_minutes
      ? formatTimeRangeFromDuration(event.scheduled_at, event.duration_minutes)
      : timeFormatter.format(date);
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
              <span className="bg-pool-deep text-paper rounded-full px-2.5 py-1 text-xs font-extrabold uppercase">
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
            {event.team_label} · {timeStr} · {formatRelativeUpcoming(event.scheduled_at, now)}
          </p>
          <Link
            href={isMatch ? (`/matches/${event.id}` as Route) : ("/calendar" as Route)}
            className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue mt-4 inline-flex min-h-12 touch-manipulation items-center gap-2 rounded-lg text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
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

function HomeDigest({
  events,
  posts,
}: {
  events: DashboardWeekEvent[];
  posts: NewsPostWithReactions[];
}) {
  return (
    <section aria-label="Agenda y noticias" className="grid gap-3 md:grid-cols-2 md:items-start">
      {events.length > 0 ? (
        <article className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border">
          <DigestHeader
            icon={CalendarDays}
            title="Próximos días"
            detail={`${events.length} ${events.length === 1 ? "compromiso" : "compromisos"}`}
            href="/calendar"
            linkLabel="Calendario"
          />
          <div className="divide-ink-200 divide-y">
            {events.map((event) => (
              <AgendaDigestRow key={`${event.kind}-${event.id}`} event={event} />
            ))}
          </div>
        </article>
      ) : null}

      {posts.length > 0 ? (
        <article className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border">
          <DigestHeader
            icon={Megaphone}
            title="Noticias del club"
            detail="Lo último publicado"
            href="/news"
            linkLabel="Ver todas"
          />
          <div className="divide-ink-200 divide-y">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/news/${post.id}` as Route}
                className="hover:bg-pool-foam/60 focus-visible:bg-pool-foam/60 focus-visible:ring-pool-blue flex min-h-[4.5rem] touch-manipulation items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
              >
                <span className="bg-pool-foam text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Megaphone className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-pool-deep line-clamp-2 block text-sm leading-snug font-extrabold">
                    {post.title}
                  </span>
                  <span className="text-ink-500 mt-1 block truncate text-xs font-semibold">
                    {post.audience_team_label ?? "Todo el club"} ·{" "}
                    {newsDateFormatter.format(new Date(post.published_at))}
                  </span>
                </span>
                <ChevronRight className="text-ink-400 h-5 w-5 shrink-0" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}

function DigestHeader({
  icon: Icon,
  title,
  detail,
  href,
  linkLabel,
}: {
  icon: typeof CalendarDays;
  title: string;
  detail: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <header className="bg-paper-sunk border-ink-200 flex min-h-16 items-center gap-3 border-b px-4 py-2.5">
      <span className="bg-paper-card text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-pool-deep text-base leading-tight font-extrabold">{title}</h2>
        <p className="text-ink-500 mt-0.5 truncate text-xs font-semibold">{detail}</p>
      </div>
      <Link
        href={href as Route}
        className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-12 shrink-0 items-center gap-1 rounded-lg px-1 text-xs font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {linkLabel}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </header>
  );
}

function AgendaDigestRow({ event }: { event: DashboardWeekEvent }) {
  const date = new Date(event.scheduled_at);
  const isMatch = event.kind === "match";
  const timeStr =
    event.kind === "training" && event.duration_minutes
      ? formatTimeRangeFromDuration(event.scheduled_at, event.duration_minutes)
      : timeFormatter.format(date);

  return (
    <Link
      href={isMatch ? (`/matches/${event.id}` as Route) : ("/calendar" as Route)}
      className="hover:bg-pool-foam/60 focus-visible:bg-pool-foam/60 focus-visible:ring-pool-blue flex min-h-[4.5rem] touch-manipulation items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
    >
      <time
        dateTime={event.scheduled_at}
        className="bg-pool-foam flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl"
      >
        <span className="text-pool-blue text-xs leading-tight font-extrabold uppercase">
          {weekdayFormatter.format(date).replace(".", "")}
        </span>
        <span className="text-pool-deep mt-1 font-mono text-base leading-none font-extrabold tabular-nums">
          {dayFormatter.format(date)}
        </span>
      </time>
      <span className="min-w-0 flex-1">
        <span className="text-pool-deep block truncate text-sm font-extrabold">
          {isMatch ? event.title.replace(/^Partido contra /, "Contra ") : "Entrenamiento"}
        </span>
        <span className="text-ink-500 mt-1 block truncate text-xs font-semibold">
          {event.team_label} · {timeStr}
        </span>
      </span>
      <span
        className="h-8 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: event.team_color }}
        aria-hidden="true"
      />
    </Link>
  );
}

interface PlayerSeasonStats {
  goals: number;
  exclusions: number;
  mvp_count: number;
  matches_played: number;
  attendance_pct: number | null;
}

function PlayerStreaks({ streaks }: { streaks: ActiveStreakRow[] }) {
  return (
    <section aria-labelledby="streaks-heading">
      <SectionHeading id="streaks-heading" eyebrow="Tu mejor momento" title="Rachas activas" />
      <div className="border-ink-200 bg-paper-card shadow-elev-1 mt-3 overflow-hidden rounded-2xl border">
        <div className="divide-ink-200 divide-y">
          {streaks.slice(0, 3).map((streak, index) => (
            <div key={streak.type} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
              <span className="bg-action/10 text-action flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                <Flame className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-pool-deep text-sm leading-snug font-extrabold">
                  {streakLabel(streak.type)}
                </p>
                <p className="text-ink-500 mt-0.5 text-xs font-semibold">
                  Mejor marca: {streak.best_value}
                  {index === 0 ? " · Tu racha más alta" : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <strong className="text-pool-deep font-mono text-2xl leading-none font-extrabold tabular-nums">
                  {streak.current_value}
                </strong>
                <p className="text-ink-600 mt-0.5 text-xs font-bold uppercase">ahora</p>
              </div>
            </div>
          ))}
        </div>
        <Link
          href={"/rankings?metric=streak#streaks" as Route}
          className="border-ink-200 bg-paper-sunk/65 text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue flex min-h-12 items-center justify-between border-t px-4 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        >
          Ver todas las rachas
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function SeasonSnapshot({ stats }: { stats: PlayerSeasonStats }) {
  const items = [
    { label: "Goles", value: stats.goals, icon: Target },
    { label: "Partidos", value: stats.matches_played, icon: CalendarDays },
    {
      label: "Asistencia",
      value: `${Math.round(Number(stats.attendance_pct ?? 0))} %`,
      icon: ShieldCheck,
    },
    { label: "MVP", value: stats.mvp_count, icon: Trophy },
  ];

  return (
    <section
      aria-labelledby="season-summary-heading"
      className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border"
    >
      <header className="bg-paper-sunk border-ink-200 flex min-h-16 items-center gap-3 border-b px-4 py-2.5">
        <span className="bg-paper-card text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm">
          <Target className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.06em] uppercase">
            Esta temporada
          </p>
          <h2 id="season-summary-heading" className="text-pool-deep text-base font-extrabold">
            Resumen deportivo
          </h2>
        </div>
        <Link
          href={"/rankings" as Route}
          className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-12 shrink-0 items-center gap-1 rounded-lg px-1 text-xs font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Rankings
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="border-ink-200 flex min-h-17 items-center gap-2.5 border-r border-b px-3 py-2.5 even:border-r-0 nth-[n+3]:border-b-0 sm:border-b-0 sm:last:border-r-0 sm:even:border-r"
            >
              <Icon className="text-pool-blue h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-pool-deep font-mono text-lg leading-none font-extrabold tabular-nums">
                  {item.value}
                </p>
                <p className="text-ink-600 mt-1 truncate text-xs font-bold">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FamilyPanel({ family }: { family: FamilyOverview }) {
  const memberCount = family.members.length;

  return (
    <section aria-labelledby="family-heading">
      <SectionHeading id="family-heading" eyebrow="Todo en una vista" title="Tu familia" />
      <div className="border-ink-200 bg-paper-card shadow-elev-1 mt-3 overflow-hidden rounded-2xl border">
        <div className="divide-ink-200 divide-y">
          {family.members.map((member) => (
            <div key={member.id} className="flex min-h-16 items-center gap-3 px-4 py-3">
              <span
                className="h-9 w-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    member.team_color ?? member.teams[0]?.color ?? "var(--pool-blue)",
                }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-pool-deep truncate text-sm font-extrabold">{member.full_name}</p>
                <p className="text-ink-500 truncate text-xs font-semibold">
                  {member.teams.map((team) => team.label).join(" · ") || "Sin equipo"}
                </p>
              </div>
              {member.pending_order_count > 0 ? (
                <span className="bg-ball-gold/20 text-pool-deep rounded-full px-2.5 py-1 text-xs font-extrabold">
                  {member.pending_order_count}{" "}
                  {member.pending_order_count === 1 ? "pedido" : "pedidos"}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <Link
          href={"/profile" as Route}
          className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue m-3 inline-flex min-h-12 w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {memberCount === 1 ? "Ver perfil y gestiones" : "Ver familia y gestiones"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
      <SectionHeading id="management-heading" eyebrow="Administración" title="Gestionar" />
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

function SectionHeading({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">{eyebrow}</p>
      <h2
        className="font-display text-pool-deep mt-1 text-2xl leading-tight font-extrabold tracking-tight"
        id={id}
      >
        {title}
      </h2>
    </div>
  );
}

function streakLabel(type: ActiveStreakRow["type"]): string {
  switch (type) {
    case "goals_consec":
      return "partidos marcando";
    case "excl_consec":
      return "partidos con expulsión";
    case "train_consec":
      return "entrenos seguidos";
    case "mvp_consec":
      return "MVP seguidos";
    case "wins_consec":
      return "victorias seguidas";
  }
}
