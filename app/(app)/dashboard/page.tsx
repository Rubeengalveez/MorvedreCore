import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Flame, Trophy, Target, ShieldAlert, Activity, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getDashboardData, type DashboardWeekEvent } from "@/server/queries/dashboard";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import { getStreaksForPlayer } from "@/server/queries/streaks";
import { LanePattern } from "@/components/ui/lane-pattern";
import { CapTile } from "@/components/ui/cap-tile";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Equipo } from "@/components/brand/pictograms";

import { DashboardHero, NextEventCard } from "@/components/dashboard/dashboard-blocks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inicio — Morvedre Core",
  description: "Tu resumen del día en el Waterpolo Morvedre.",
};

interface TeamWithNext {
  id: string;
  label: string;
  color: string;
  category_label: string;
  next_match: { id: string; opponent: string; scheduled_at: string; is_home: boolean } | null;
  next_training: { id: string; scheduled_at: string; location: string | null } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { activeProfile, ownProfile } = ctx;

  const isAdmin = ownProfile
    ? !!(await supabase
        .from("user_roles")
        .select("role")
        .eq("profile_id", ownProfile.id)
        .eq("role", "admin")
        .is("scope_team_id", null)
        .maybeSingle()).data
    : false;

  const { data: seasonRow } = await supabase
    .from("seasons")
    .select("id, label, is_current")
    .eq("is_current", true)
    .maybeSingle();

  const seasonId = seasonRow?.id ?? null;

  const calendarTeams = seasonId
    ? await getTeamsForProfileInSeason(activeProfile.id, seasonId)
    : [];

  const teamIds = calendarTeams.map((t) => t.id);
  const hasTeam = teamIds.length > 0;

  const now = new Date();
  const nowIso = now.toISOString();

  const [dashboardData, streaks, playerStats] = await Promise.all([
    teamIds.length > 0
      ? getDashboardData({ teamIds, profileId: activeProfile.id, now })
      : Promise.resolve({
          weekEvents: [],
          teamInfo: null,
          recentActivity: [],
          seasonStats: null,
        }),
    seasonId
      ? getStreaksForPlayer(seasonId, activeProfile.id)
      : Promise.resolve([]),
    seasonId
      ? supabase
          .from("ranking_snapshots")
          .select("goals, exclusions, mvp_count, matches_played, attendance_pct, attendance_streak, trainings_attended, trainings_total")
          .eq("season_id", seasonId)
          .eq("scope", "season")
          .eq("scope_key", "all")
          .eq("player_id", activeProfile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let teamBreakdown: TeamWithNext[] = [];
  if (seasonId && teamIds.length > 0) {
    const [{ data: teamsData }, { data: matchesData }] = await Promise.all([
      supabase
        .from("teams")
        .select("id, label, color, category_code")
        .in("id", teamIds),
      supabase
        .from("matches")
        .select("id, team_id, opponent, scheduled_at, is_home, status")
        .in("team_id", teamIds)
        .in("status", ["scheduled", "in_progress"])
        .gt("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true }),
    ]);
    const { data: trainingsData } = await supabase
      .from("training_sessions")
      .select("id, team_id, scheduled_at, location, cancelled")
      .in("team_id", teamIds)
      .eq("cancelled", false)
      .gt("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true });

    teamBreakdown = (teamsData ?? []).map((t) => {
      const nextMatch = (matchesData ?? []).find((m) => m.team_id === t.id);
      const nextTrain = (trainingsData ?? []).find((s) => s.team_id === t.id);
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
  const teamColor = activeProfile.team_color ?? calendarTeams[0]?.color ?? "var(--pool-blue)";

  const activeStreaks = streaks.filter((s) => s.current_value > 0);
  const stats = playerStats?.data;

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
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
            className="flex flex-wrap items-center gap-1.5 rounded-md border border-action/30 bg-action/5 px-3 py-2"
            aria-label="Rachas activas"
          >
            <Flame className="h-3.5 w-3.5 shrink-0 text-action" aria-hidden="true" />
            <span className="mr-1 text-[10px] font-extrabold uppercase tracking-wider text-ink-600">
              Rachas
            </span>
            {activeStreaks.map((streak) => (
              <span
                key={streak.type}
                title={`Mejor: ${streak.best_value}`}
                className="inline-flex items-center gap-1 rounded-full border border-ink-300 bg-paper px-2 py-0.5 text-[11px] font-bold text-pool-deep"
              >
                <span className="font-extrabold text-action">{streak.current_value}</span>
                <span className="font-medium text-ink-600">
                  {streakShortLabel(streak.type)}
                </span>
              </span>
            ))}
          </section>
        ) : null}

        {hasTeam ? (
          <section
            aria-labelledby="your-teams-heading"
            className="flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <h2
                id="your-teams-heading"
                className="text-eyebrow text-ink-600"
              >
                Tus equipos
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                {teamBreakdown.length}
              </span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {teamBreakdown.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/team/${t.id}` as Route}
                    className="group flex items-center gap-3 rounded-md border border-ink-300 bg-paper-card p-2.5 shadow-elev-1 transition-colors hover:border-pool-blue"
                  >
                    <PictogramBadge pictogram={Equipo} color={t.color} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-extrabold text-pool-deep">
                        {t.label}
                      </p>
                      {t.next_match ? (
                        <p className="line-clamp-1 text-[11px] text-ink-600">
                          <span className="font-bold text-pool-deep">vs {t.next_match.opponent}</span>
                          {" · "}
                          {formatRelativeShort(t.next_match.scheduled_at, now)}
                        </p>
                      ) : t.next_training ? (
                        <p className="line-clamp-1 text-[11px] text-ink-600">
                          <span className="font-bold text-pool-blue">Entreno</span>
                          {" · "}
                          {formatRelativeShort(t.next_training.scheduled_at, now)}
                        </p>
                      ) : (
                        <p className="text-[11px] text-ink-400">Sin eventos próximos</p>
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
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-pool-deep" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {nextEvent ? (
          <section aria-labelledby="next-event-heading" className="flex flex-col gap-2">
            <h2 id="next-event-heading" className="text-eyebrow text-ink-600">
              Próximo evento
            </h2>
            <NextEventCard event={nextEvent} now={now} />
          </section>
        ) : null}

        {stats ? (
          <section
            aria-labelledby="your-season-heading"
            className="flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <h2 id="your-season-heading" className="text-eyebrow text-ink-600">
                Tu temporada
              </h2>
              <Link
                href={"/rankings" as Route}
                className="inline-flex items-center gap-0.5 text-[11px] font-bold text-pool-blue hover:underline"
              >
                Ver ranking
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile
                icon={<Target className="h-3.5 w-3.5" aria-hidden="true" />}
                label="Goles"
                value={stats.goals}
                color="var(--success)"
              />
              <StatTile
                icon={<Trophy className="h-3.5 w-3.5" aria-hidden="true" />}
                label="MVP"
                value={stats.mvp_count}
                color="var(--ball-gold)"
              />
              <StatTile
                icon={<ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />}
                label="Excl."
                value={stats.exclusions}
                color="var(--goggle-red)"
              />
              <StatTile
                icon={<Activity className="h-3.5 w-3.5" aria-hidden="true" />}
                label="Asist."
                value={`${stats.attendance_pct ?? 0}%`}
                color="var(--pool-blue)"
              />
            </div>
          </section>
        ) : null}

        {isAdmin ? (
          <Link
            href={"/admin" as Route}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-pool-deep bg-pool-deep px-4 text-sm font-bold text-paper shadow-elev-1 transition-colors hover:bg-ink-900"
        >
          Panel admin
          <ChevronRight className="h-4 w-4" />
        </Link>
        ) : null}
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded border border-ink-300 bg-paper px-2.5 py-2">
      <div
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
        style={{ color }}
      >
        {icon}
        {label}
      </div>
      <p className="font-mono text-xl font-extrabold tabular-nums text-pool-deep">
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

function formatRelativeShort(iso: string, now: Date): string {
  const d = new Date(iso);
  const dayMs = 1000 * 60 * 60 * 24;
  const diff = Math.round((d.getTime() - now.getTime()) / dayMs);
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  if (diff > 1 && diff < 7) return `en ${diff} días`;
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}
