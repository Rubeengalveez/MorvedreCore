import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Equipo } from "@/components/brand/pictograms";
import { EmptyTeamState } from "@/components/team/empty-team-state";
import { TeamHero } from "@/components/team/team-hero";
import { TeamRosterList } from "@/components/team/team-roster-list";
import { TeamStaffList } from "@/components/team/team-staff-list";
import { WaterDivider } from "@/components/ui/water-divider";
import { getCurrentSeason } from "@/server/queries/seasons";
import {
  getTeamById,
  getTeamRoster,
  getTeamStaff,
} from "@/server/queries/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>;
}): Promise<Metadata> {
  const { teamId } = await params;
  const team = await getTeamById(teamId);
  if (!team) {
    return { title: "Equipo — Morvedre Core" };
  }
  return {
    title: `${team.label} — Morvedre Core`,
    description: `Plantilla y cuerpo técnico de ${team.label}.`,
  };
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const team = await getTeamById(teamId);
  if (!team) notFound();

  const [roster, staff, season] = await Promise.all([
    getTeamRoster(team.id),
    getTeamStaff(team.id),
    getCurrentSeason(),
  ]);

  const currentYear = new Date().getFullYear();
  const inSeason = season
    ? team.season_id === season.id
    : false;
  const seasonLabel = inSeason ? season?.label ?? null : null;

  return (
    <div className="flex w-full flex-col">
      <div className="mx-auto w-full max-w-2xl px-4 pb-6 pt-6">
        <TeamHero
          team={team}
          seasonLabel={seasonLabel}
          homePool={team.home_pool}
        />
      </div>

      <WaterDivider fill="var(--brand-foam)" height={40} />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <TeamStaffList staff={staff} teamColor={team.color} />
      </div>

      <WaterDivider fill="var(--brand-foam)" height={40} />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        {roster.length === 0 ? (
          <EmptyTeamState
            pictogram={
              <Equipo className="h-12 w-12" accent="var(--brand-aqua)" />
            }
            title="Aún no hay plantilla"
            description="Cuando el admin dé de alta a los jugadores de este equipo, aparecerán aquí con su dorsal."
          />
        ) : (
          <TeamRosterList
            players={roster}
            teamColor={team.color}
            currentYear={currentYear}
          />
        )}
      </div>
    </div>
  );
}
