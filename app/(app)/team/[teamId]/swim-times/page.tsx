import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import { Waves } from "lucide-react";

import { PageBackLink } from "@/components/ui/page-back-link";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { SwimTimeEntryList } from "@/components/swim-times/swim-time-entry-list";
import { clampDateToSeason, madridToday } from "@/lib/domain/swim-times";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getTeamById, getTeamRoster } from "@/server/queries/teams";
import { getSwimCoachTeamIds, getSwimTimeEntries } from "@/server/queries/swim-times";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamSwimTimesPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { teamId } = await params;
  const supabase = await createClient();
  const [team, roster, coachTeamIds, { data: teamSeason }] = await Promise.all([
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
  if (!coachTeamIds.includes(teamId)) redirect(`/team/${teamId}`);
  const season = Array.isArray(teamSeason?.seasons) ? teamSeason.seasons[0] : teamSeason?.seasons;
  const today = season ? clampDateToSeason(madridToday(), season) : madridToday();
  const entries = (await getSwimTimeEntries({ teamId })).filter(
    (entry) => entry.test_date === today,
  );

  return (
    <PageShell width="md" className="gap-3 pb-4">
      <PageBackLink href={`/team/${teamId}?tab=tiempos` as Route}>Volver a {team.label}</PageBackLink>
      <PageHeader
        eyebrow={team.label}
        title="Registrar tiempos"
        description="Elige jugador, distancia (50 m o 100 m) y anota el tiempo."
        icon={<Waves className="h-5 w-5" aria-hidden="true" />}
        teamColor={team.color}
      />
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
