import { notFound, redirect } from "next/navigation";
import type { Route } from "next";

import { PageBackLink } from "@/components/ui/page-back-link";
import { PageShell } from "@/components/ui/page-shell";
import { TeamHeading } from "@/components/team/team-ui";
import { SwimTimeEntryList } from "@/components/swim-times/swim-time-entry-list";
import { clampDateToSeason, madridToday } from "@/lib/domain/swim-times";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getTeamById, getTeamRoster } from "@/server/queries/teams";
import { getSwimCoachTeamIds, getSwimTimeEntries } from "@/server/queries/swim-times";
import { teamAdminOrigin } from "@/lib/domain/team-navigation-origin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamSwimTimesPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ from?: string; adminTab?: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { teamId } = await params;
  const { from, adminTab } = await searchParams;
  const origin = teamAdminOrigin(teamId, from, adminTab);
  const backHref =
    `/team/${teamId}?tab=tiempos${origin.context ? `&${origin.context}` : ""}` as Route;
  const supabase = await createClient();
  const [team, roster, coachTeamIds, { data: teamSeason, error: seasonError }] = await Promise.all([
    getTeamById(teamId),
    getTeamRoster(teamId),
    getSwimCoachTeamIds(ctx.ownProfile.id),
    supabase
      .from("teams")
      .select("season_id, seasons!teams_season_id_fkey(start_date, end_date)")
      .eq("id", teamId)
      .maybeSingle(),
  ]);
  if (!team) notFound();
  if (!coachTeamIds.includes(teamId)) redirect(backHref);
  if (seasonError) throw new Error("No pudimos cargar la temporada del equipo.");
  const season = Array.isArray(teamSeason?.seasons) ? teamSeason.seasons[0] : teamSeason?.seasons;
  if (!season) throw new Error("No pudimos cargar la temporada del equipo.");
  const today = clampDateToSeason(madridToday(), season);
  const entries = (await getSwimTimeEntries({ teamId })).filter(
    (entry) => entry.test_date === today,
  );

  return (
    <PageShell width="md" className="gap-3 pb-4">
      <PageBackLink href={backHref}>Volver a {team.label}</PageBackLink>
      <TeamHeading title="Registrar tiempos" subtitle={team.label} />
      <SwimTimeEntryList
        teamId={team.id}
        teamColor={team.color}
        players={roster}
        today={today}
        existingEntries={entries.map((entry) => ({
          id: entry.id,
          revision: entry.revision,
          player_id: entry.player_id,
          test_date: entry.test_date,
          time_50_cs: entry.time_50_cs,
          time_100_cs: entry.time_100_cs,
        }))}
      />
    </PageShell>
  );
}
