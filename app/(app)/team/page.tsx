import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";

import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamListCard } from "@/components/team/team-list-card";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getAllTeamsInSeason } from "@/server/queries/teams";
import type { CategoryCode } from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Equipos — Morvedre Core",
  description: "Equipos, plantillas y partidos del Waterpolo Morvedre.",
};

const CATEGORY_ORDER: CategoryCode[] = [
  "escuela",
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "absoluto",
];

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
        <PageHeader title="Equipos" />
        <EmptyState
          icon={<UsersRound className="h-6 w-6" aria-hidden="true" />}
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
  const orderedTeams = CATEGORY_ORDER.flatMap((code) =>
    allTeams.filter((team) => team.category_code === code),
  );

  return (
    <PageShell width="md" className="gap-4 pb-6">
      <PageHeader
        eyebrow={`Temporada ${season.label}`}
        title="Equipos"
        description="Todos los equipos del club, ordenados de Escuela a Absoluto."
        icon={<UsersRound className="h-5 w-5" aria-hidden="true" />}
      />

      {allTeams.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-6 w-6" aria-hidden="true" />}
          title="Todavía no hay equipos"
          description="Los equipos de la temporada aparecerán aquí cuando estén configurados."
        />
      ) : (
        <section aria-labelledby="team-directory-heading">
          <div className="mb-2.5 flex min-h-8 items-center justify-between gap-3 px-1">
            <h2
              id="team-directory-heading"
              className="text-pool-deep text-sm font-extrabold tracking-[0.04em] uppercase"
            >
              {orderedTeams.length} {orderedTeams.length === 1 ? "equipo" : "equipos"}
            </h2>
            <span className="text-ink-500 shrink-0 text-sm font-bold">
              De menor a mayor
            </span>
          </div>
          <Card className="divide-ink-200 divide-y">
            {orderedTeams.map((team) => (
              <TeamListCard
                key={team.id}
                team={team}
                relationship={
                  playerTeamIds.has(team.id) && coachTeamIds.has(team.id)
                    ? "both"
                    : coachTeamIds.has(team.id)
                      ? "coach"
                      : playerTeamIds.has(team.id)
                        ? "player"
                        : null
                }
                familyPlayerNames={familyPlayersByTeam.get(team.id) ?? []}
              />
            ))}
          </Card>
        </section>
      )}
    </PageShell>
  );
}
