import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageShell } from "@/components/ui/page-shell";

import { TeamDirectory } from "@/components/team/team-directory";
import { TeamHeading, TeamEmpty } from "@/components/team/team-ui";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getAllTeamsInSeason } from "@/server/queries/teams";
import { TEAM_CATEGORY_ORDER } from "@/lib/domain/team-presentation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Equipos — Morvedre Core",
  description: "Equipos, plantillas y partidos del Waterpolo Morvedre.",
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export default async function TeamPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const season = await getCurrentSeason();
  if (!season) {
    return (
      <PageShell width="md" className="gap-4 pb-6">
        <TeamHeading title="Equipos" />
        <TeamEmpty
          title="Sin temporada activa"
          description="La temporada activa todavía no está configurada."
        />
      </PageShell>
    );
  }

  const supabase = await createClient();
  const familyProfiles = [ctx.ownProfile, ...ctx.linkedProfiles];
  const familyProfileIds = familyProfiles.map((profile) => profile.id);

  const [allTeams, staffResult, rostersResult] = await Promise.all([
    getAllTeamsInSeason(season.id),
    supabase
      .from("team_staff")
      .select("team_id, teams!team_staff_team_id_fkey(season_id)")
      .eq("profile_id", ctx.activeProfile.id)
      .eq("role", "head_coach"),
    familyProfileIds.length > 0
      ? supabase
          .from("team_rosters")
          .select("team_id, player_id, teams!team_rosters_team_id_fkey(season_id)")
          .in("player_id", familyProfileIds)
          .is("left_at", null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const linkedIds = new Set(ctx.linkedProfiles.map((profile) => profile.id));
  if (staffResult.error || rostersResult.error)
    throw new Error("No pudimos cargar tus equipos. Vuelve a intentarlo.");
  const playerTeamIds = new Set<string>();
  const familyPlayersByTeam = new Map<string, string[]>();
  for (const row of rostersResult.data ?? []) {
    const joined = Array.isArray(row.teams) ? row.teams[0] : row.teams;
    if (joined?.season_id !== season.id) continue;
    if (row.player_id === ctx.ownProfile.id) {
      playerTeamIds.add(row.team_id);
      continue;
    }
    if (!linkedIds.has(row.player_id)) continue;
    const profile = familyProfiles.find((item) => item.id === row.player_id);
    if (!profile) continue;
    const list = familyPlayersByTeam.get(row.team_id) ?? [];
    list.push(firstName(profile.full_name));
    familyPlayersByTeam.set(row.team_id, list);
  }
  for (const list of familyPlayersByTeam.values()) {
    list.sort((a, b) => a.localeCompare(b, "es"));
  }
  const coachTeamIds = new Set(
    (staffResult.data ?? [])
      .filter((item) => {
        const joined = Array.isArray(item.teams) ? item.teams[0] : item.teams;
        return joined?.season_id === season.id;
      })
      .map((item) => item.team_id),
  );
  const orderedTeams = TEAM_CATEGORY_ORDER.flatMap((code) =>
    allTeams.filter((team) => team.category_code === code),
  );

  return (
    <PageShell width="md" className="gap-4 pb-6">
      <TeamHeading title="Equipos" subtitle={`Temporada ${season.label}`} />

      {allTeams.length === 0 ? (
        <TeamEmpty
          title="Todavía no hay equipos"
          description="Los equipos de la temporada aparecerán aquí cuando estén configurados."
        />
      ) : (
        <TeamDirectory
          teams={orderedTeams.map((team) => ({
            ...team,
            playerCount: team.player_count,
            coachName: team.coach_name,
            relationship:
              playerTeamIds.has(team.id) && coachTeamIds.has(team.id)
                ? "both"
                : coachTeamIds.has(team.id)
                  ? "coach"
                  : playerTeamIds.has(team.id)
                    ? "player"
                    : null,
            familyPlayerNames: familyPlayersByTeam.get(team.id) ?? [],
          }))}
        />
      )}
    </PageShell>
  );
}
