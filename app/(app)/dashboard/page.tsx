import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Flame } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getDashboardData, type DashboardWeekEvent } from "@/server/queries/dashboard";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import { getStreaksForPlayer } from "@/server/queries/streaks";
import { LanePattern } from "@/components/ui/lane-pattern";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Silbato } from "@/components/brand/pictograms";

import { DashboardHero, NextEventCard, TeamCard } from "@/components/dashboard/dashboard-blocks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inicio — Morvedre Core",
  description: "Tu resumen del día en el Waterpolo Morvedre.",
};

type AppRole = "admin" | "coach" | "delegate" | "directiva" | "parent" | "player";

async function userHasRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  role: AppRole,
): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId)
    .eq("role", role)
    .is("scope_team_id", null)
    .maybeSingle();
  return data != null;
}

const isUserAdmin = (supabase: Awaited<ReturnType<typeof createClient>>, profileId: string) =>
  userHasRole(supabase, profileId, "admin");
void isUserAdmin;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { activeProfile } = ctx;

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

  const [dashboardData, streaks, { data: unread }] = await Promise.all([
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
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", activeProfile.id)
      .is("read_at", null),
  ]);

  const upcomingWeekEvents = dashboardData.weekEvents.filter(
    (e) => !e.cancelled && new Date(e.scheduled_at).getTime() >= now.getTime() - 1000 * 60 * 60 * 6,
  );
  const nextEvent: DashboardWeekEvent | null = upcomingWeekEvents[0] ?? null;
  const teamColor = dashboardData.teamInfo?.color ?? activeProfile.team_color ?? "var(--pool-blue)";

  const activeStreaks = streaks.filter((s) => s.current_value > 0);

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" strong />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
        <DashboardHero
          profile={{
            full_name: activeProfile.full_name,
            team_color: teamColor,
          }}
          unreadNotifications={unread?.length ?? 0}
          hasTeam={hasTeam}
          capNumber={activeProfile.cap_number}
        />

        {activeStreaks.length > 0 ? (
          <div
            data-streak-strip
            className="flex flex-wrap items-center gap-1.5 rounded-md border border-action/30 bg-action/5 px-3 py-2.5"
          >
            <Flame className="h-3.5 w-3.5 shrink-0 text-action" aria-hidden="true" />
            <span className="mr-1 text-[10px] font-extrabold uppercase tracking-wider text-ink-600">
              Rachas
            </span>
            {activeStreaks.map((streak) => {
              return (
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
              );
            })}
          </div>
        ) : null}

        {hasTeam && dashboardData.teamInfo ? (
          <section aria-labelledby="your-team-heading" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 id="your-team-heading" className="text-eyebrow text-ink-600">
                Tu equipo
              </h2>
              <Link
                href={"/team" as Route}
                className="text-xs font-bold text-pool-blue hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <TeamCard team={dashboardData.teamInfo} />
          </section>
        ) : !hasTeam ? (
          <section
            aria-labelledby="no-team-heading"
            className="rounded-md border-2 border-dashed border-ink-300 bg-paper p-6 text-center"
          >
            <PictogramBadge pictogram={Silbato} color="var(--ink-400)" size="lg" />
            <h2
              id="no-team-heading"
              className="mt-3 font-display text-lg font-extrabold text-pool-deep"
            >
              Aún no formas parte de un equipo
            </h2>
            <p className="mt-1 text-sm text-ink-600">
              Cuando el admin te asigne a un equipo esta temporada, tus entrenos y
              partidos aparecerán aquí.
            </p>
          </section>
        ) : null}

        {hasTeam ? (
          <section aria-labelledby="next-event-heading" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 id="next-event-heading" className="text-eyebrow text-ink-600">
                Próximo evento
              </h2>
              <Link
                href={"/calendar" as Route}
                className="text-xs font-bold text-pool-blue hover:underline"
              >
                Calendario
              </Link>
            </div>
            <NextEventCard event={nextEvent} now={now} />
          </section>
        ) : null}
      </div>
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
