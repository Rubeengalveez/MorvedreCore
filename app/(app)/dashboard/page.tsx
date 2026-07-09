import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import {
  Activity,
  Banknote,
  CalendarDays,
  ChevronRight,
  Flame,
  ShieldAlert,
  ShoppingBag,
  Target,
  Trophy,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getDashboardData, type DashboardWeekEvent } from "@/server/queries/dashboard";
import { getTeamsForProfileInSeason, type TeamSummary } from "@/server/queries/teams";
import { getStreaksForPlayer, type ActiveStreakRow } from "@/server/queries/streaks";
import { LanePattern } from "@/components/ui/lane-pattern";
import { CapTile } from "@/components/ui/cap-tile";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Equipo } from "@/components/brand/pictograms";
import { PageShell, SectionHeader } from "@/components/ui/page-shell";
import { formatShortRelative } from "@/lib/domain/calendar";

import { DashboardHero, NextEventCard } from "@/components/dashboard/dashboard-blocks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inicio - Morvedre Core",
  description: "Tu resumen del dia en el Waterpolo Morvedre.",
};

interface TeamWithNext {
  id: string;
  label: string;
  color: string;
  category_label: string;
  next_match: { id: string; opponent: string; scheduled_at: string; is_home: boolean } | null;
  next_training: { id: string; scheduled_at: string; location: string | null } | null;
}

interface DashboardTeamRow {
  id: string;
  label: string;
  color: string;
  category_code: string;
}

interface DashboardMatchRow {
  id: string;
  team_id: string;
  opponent: string;
  scheduled_at: string;
  is_home: boolean | null;
}

interface DashboardTrainingRow {
  id: string;
  team_id: string;
  scheduled_at: string;
  location: string | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const [ctx, season] = await Promise.all([getActiveProfileContext(), getCurrentSeason()]);
  if (!ctx) redirect("/login");
  const { activeProfile } = ctx;
  const seasonId = season?.id ?? null;

  const [calendarTeams, streaks, playerStatsRes] = await Promise.all([
    seasonId ? getTeamsForProfileInSeason(activeProfile.id, seasonId) : Promise.resolve([]),
    seasonId
      ? getStreaksForPlayer(seasonId, activeProfile.id)
      : Promise.resolve([] as ActiveStreakRow[]),
    seasonId
      ? supabase
          .from("ranking_snapshots")
          .select(
            "goals, exclusions, mvp_count, matches_played, attendance_pct, attendance_streak, trainings_attended, trainings_total",
          )
          .eq("season_id", seasonId)
          .eq("scope", "season")
          .eq("scope_key", "all")
          .eq("player_id", activeProfile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const typedCalendarTeams = calendarTeams as TeamSummary[];
  const teamIds = typedCalendarTeams.map((t) => t.id);
  const hasTeam = teamIds.length > 0;
  const playerStats = playerStatsRes.data;

  const now = new Date();
  const nowIso = now.toISOString();

  const dashboardData: Awaited<ReturnType<typeof getDashboardData>> = hasTeam
    ? await getDashboardData({ teamIds, profileId: activeProfile.id, now })
    : { weekEvents: [], teamInfo: null, recentActivity: [], seasonStats: null };

  let teamBreakdown: TeamWithNext[] = [];
  if (seasonId && hasTeam) {
    const [teamsRes, matchesRes, trainingsRes] = await Promise.all([
      supabase.from("teams").select("id, label, color, category_code").in("id", teamIds),
      supabase
        .from("matches")
        .select("id, team_id, opponent, scheduled_at, is_home, status")
        .in("team_id", teamIds)
        .in("status", ["scheduled", "in_progress"])
        .gt("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("training_sessions")
        .select("id, team_id, scheduled_at, location, cancelled")
        .in("team_id", teamIds)
        .eq("cancelled", false)
        .gt("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true }),
    ]);

    const teamsData = (teamsRes.data ?? []) as DashboardTeamRow[];
    const matchesData = (matchesRes.data ?? []) as DashboardMatchRow[];
    const trainingsData = (trainingsRes.data ?? []) as DashboardTrainingRow[];

    teamBreakdown = teamsData.map((t) => {
      const nextMatch = matchesData.find((m) => m.team_id === t.id);
      const nextTrain = trainingsData.find((s) => s.team_id === t.id);
      return {
        id: t.id,
        label: t.label,
        color: t.color,
        category_label: t.category_code,
        next_match: nextMatch
          ? {
              id: nextMatch.id,
              opponent: nextMatch.opponent,
              scheduled_at: nextMatch.scheduled_at,
              is_home: nextMatch.is_home ?? true,
            }
          : null,
        next_training: nextTrain
          ? { id: nextTrain.id, scheduled_at: nextTrain.scheduled_at, location: nextTrain.location }
          : null,
      };
    });
    teamBreakdown.sort((a, b) => {
      const aTime = a.next_match?.scheduled_at ?? a.next_training?.scheduled_at ?? "";
      const bTime = b.next_match?.scheduled_at ?? b.next_training?.scheduled_at ?? "";
      return aTime.localeCompare(bTime);
    });
  }

  const upcomingWeekEvents = dashboardData.weekEvents.filter(
    (e) => !e.cancelled && new Date(e.scheduled_at).getTime() >= now.getTime() - 1000 * 60 * 60 * 6,
  );
  const nextEvent: DashboardWeekEvent | null = upcomingWeekEvents[0] ?? null;
  const teamColor = activeProfile.team_color ?? typedCalendarTeams[0]?.color ?? "var(--pool-blue)";
  const activeStreaks = (streaks as ActiveStreakRow[]).filter((s) => s.current_value > 0);

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0 opacity-70" />
      <PageShell className="gap-3">
        <DashboardHero
          profile={{
            full_name: activeProfile.full_name,
            team_color: teamColor,
          }}
          hasTeam={hasTeam}
          capNumber={activeProfile.cap_number}
        />

        {activeStreaks.length > 0 ? (
          <section
            data-streak-strip
            className="border-action/25 bg-action/[7%] no-scrollbar flex items-center gap-2 overflow-x-auto rounded-md border px-3 py-2"
            aria-label="Rachas activas"
          >
            <span className="bg-action text-paper flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
              <Flame className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 items-center gap-1.5">
              {activeStreaks.map((streak) => (
                <span
                  key={streak.type}
                  title={`Mejor: ${streak.best_value}`}
                  className="border-ink-300 bg-paper text-pool-deep shadow-elev-1 inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-sm font-bold"
                >
                  <span className="text-action font-mono text-base font-extrabold">
                    {streak.current_value}
                  </span>
                  <span className="text-ink-700 font-semibold">
                    {streakShortLabel(streak.type)}
                  </span>
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="today-heading" className="flex flex-col gap-2">
          <SectionHeader title="Tu semana" />
          <div className="border-ink-300 bg-paper-card shadow-elev-1 rounded-md border p-2">
            {upcomingWeekEvents.length > 0 ? (
              <ul className="divide-ink-200 flex flex-col divide-y">
                {upcomingWeekEvents.slice(0, 4).map((event) => (
                  <li key={`${event.kind}-${event.id}`}>
                    <Link
                      href={
                        event.kind === "match"
                          ? (`/matches/${event.id}` as Route)
                          : ("/calendar" as Route)
                      }
                      className="flex min-h-[58px] items-center gap-3 py-2"
                    >
                      <span
                        className="h-10 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: event.team_color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-pool-deep line-clamp-1 text-sm font-extrabold">
                          {event.title}
                        </p>
                        <p className="text-ink-600 mt-0.5 line-clamp-1 text-xs font-bold">
                          {event.team_label} / {formatShortRelative(event.scheduled_at, now)}
                        </p>
                      </div>
                      <ChevronRight className="text-ink-300 h-4 w-4 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-600 px-2 py-4 text-sm leading-relaxed font-semibold">
                No tienes eventos proximos esta semana.
              </p>
            )}
          </div>
        </section>

        <section aria-label="Accesos rapidos" className="grid grid-cols-5 gap-1.5">
          <QuickAction
            href="/calendar"
            icon={<CalendarDays className="h-4 w-4" />}
            label="Agenda"
          />
          <QuickAction href="/rankings" icon={<Trophy className="h-4 w-4" />} label="Ranking" />
          <QuickAction href="/team" icon={<Users className="h-4 w-4" />} label="Equipo" />
          <QuickAction href="/shop" icon={<ShoppingBag className="h-4 w-4" />} label="Tienda" />
          <QuickAction href="/treasury" icon={<Banknote className="h-4 w-4" />} label="Pagos" />
        </section>

        {nextEvent ? (
          <section aria-labelledby="next-event-heading" className="flex flex-col gap-2">
            <SectionHeader title="Proximo evento" />
            <NextEventCard event={nextEvent} now={now} />
          </section>
        ) : null}

        {playerStats ? (
          <section aria-labelledby="your-season-heading" className="flex flex-col gap-2">
            <SectionHeader
              title="Tu temporada"
              action={
                <Link
                  href={"/rankings" as Route}
                  className="border-ink-300 bg-paper-card text-pool-blue shadow-elev-1 inline-flex min-h-9 items-center gap-1 rounded-md border px-2.5 text-sm font-extrabold"
                >
                  Ranking
                  <ChevronRight className="h-4 w-4" />
                </Link>
              }
            />
            <div className="no-scrollbar -mx-1 flex items-stretch gap-2 overflow-x-auto px-1 pb-1">
              <StatTile
                icon={<Target className="h-4 w-4" />}
                label="Goles"
                value={playerStats.goals}
                color="var(--success)"
              />
              <StatTile
                icon={<Trophy className="h-4 w-4" />}
                label="MVP"
                value={playerStats.mvp_count}
                color="var(--ball-gold)"
              />
              <StatTile
                icon={<ShieldAlert className="h-4 w-4" />}
                label="Excl."
                value={playerStats.exclusions}
                color="var(--goggle-red)"
              />
              <StatTile
                icon={<Activity className="h-4 w-4" />}
                label="Asist."
                value={`${playerStats.attendance_pct ?? 0}%`}
                color="var(--pool-blue)"
              />
            </div>
          </section>
        ) : null}

        {hasTeam ? (
          <section aria-label="Tus equipos" className="flex flex-col gap-2">
            <SectionHeader
              title="Tus equipos"
              action={
                <span className="text-ink-600 text-sm font-extrabold">{teamBreakdown.length}</span>
              }
            />
            <ul className="flex flex-col gap-2">
              {teamBreakdown.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/team/${t.id}` as Route}
                    className="group border-ink-300 bg-paper-card shadow-elev-1 hover:border-pool-blue hover:shadow-elev-2 flex min-h-[74px] items-center gap-3 rounded-md border p-3 transition-all"
                  >
                    <PictogramBadge pictogram={Equipo} color={t.color} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-pool-deep line-clamp-1 text-base font-extrabold">
                        {t.label}
                      </p>
                      {t.next_match ? (
                        <p className="text-ink-600 mt-1 line-clamp-1 text-sm font-medium">
                          <span className="text-pool-deep font-bold">
                            vs {t.next_match.opponent}
                          </span>
                          {" / "}
                          {formatShortRelative(t.next_match.scheduled_at, now)}
                        </p>
                      ) : t.next_training ? (
                        <p className="text-ink-600 mt-1 line-clamp-1 text-sm font-medium">
                          <span className="text-pool-blue font-bold">Entreno</span>
                          {" / "}
                          {formatShortRelative(t.next_training.scheduled_at, now)}
                        </p>
                      ) : (
                        <p className="text-ink-500 mt-1 text-sm">Sin eventos proximos</p>
                      )}
                    </div>
                    {activeProfile.cap_number != null ? (
                      <CapTile
                        number={activeProfile.cap_number}
                        teamColor={t.color}
                        size="sm"
                        aria-label={`Tu dorsal ${activeProfile.cap_number}`}
                      />
                    ) : null}
                    <ChevronRight className="text-ink-300 group-hover:text-pool-deep h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </PageShell>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link
      href={href as Route}
      className="border-ink-300 bg-paper-card text-pool-deep shadow-elev-1 flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-md border px-1 text-center text-[0.68rem] font-extrabold"
    >
      <span className="bg-pool-foam text-pool-blue flex h-8 w-8 items-center justify-center rounded-md">
        {icon}
      </span>
      {label}
    </Link>
  );
}

function StatTile({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="border-ink-300 bg-paper-card shadow-elev-1 flex min-w-[116px] shrink-0 flex-col gap-1 rounded-md border px-3 py-3">
      <div className="inline-flex items-center gap-1.5 text-sm font-extrabold" style={{ color }}>
        {icon}
        {label}
      </div>
      <p className="text-pool-deep font-mono text-2xl leading-none font-extrabold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function streakShortLabel(
  type: "goals_consec" | "excl_consec" | "train_consec" | "mvp_consec" | "wins_consec",
): string {
  switch (type) {
    case "goals_consec":
      return "goles";
    case "excl_consec":
      return "excl.";
    case "train_consec":
      return "entrenos";
    case "mvp_consec":
      return "MVP";
    case "wins_consec":
      return "victorias";
  }
}
