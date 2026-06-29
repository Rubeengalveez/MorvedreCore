import { redirect } from "next/navigation";
import { Flame } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getDashboardData, type DashboardWeekEvent } from "@/server/queries/dashboard";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import { getStreaksForPlayer } from "@/server/queries/streaks";
import { LanePattern } from "@/components/ui/lane-pattern";

import { DashboardHero, NextEventCard } from "@/components/dashboard/dashboard-blocks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inicio — Morvedre Core",
  description: "Tu resumen del día en el Waterpolo Morvedre.",
};

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

  const [dashboardData, streaks] = await Promise.all([
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
  ]);

  const upcomingWeekEvents = dashboardData.weekEvents.filter(
    (e) => !e.cancelled && new Date(e.scheduled_at).getTime() >= now.getTime() - 1000 * 60 * 60 * 6,
  );
  const nextEvent: DashboardWeekEvent | null = upcomingWeekEvents[0] ?? null;
  const teamColor = activeProfile.team_color ?? "var(--pool-blue)";

  const activeStreaks = streaks.filter((s) => s.current_value > 0);

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <DashboardHero
          profile={{
            full_name: activeProfile.full_name,
            team_color: teamColor,
          }}
          hasTeam={hasTeam}
          capNumber={activeProfile.cap_number}
        />

        {activeStreaks.length > 0 ? (
          <div
            data-streak-strip
            className="flex flex-wrap items-center gap-1.5 rounded-md border border-action/30 bg-action/5 px-3 py-2"
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

        <section aria-labelledby="next-event-heading">
          <h2 id="next-event-heading" className="sr-only">
            Próximo evento
          </h2>
          <NextEventCard event={nextEvent} now={now} />
        </section>
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
