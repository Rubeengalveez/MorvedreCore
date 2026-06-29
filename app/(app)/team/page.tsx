import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Equipo, Silbato } from "@/components/brand/pictograms";
import { LanePattern } from "@/components/ui/lane-pattern";
import { TeamListCard } from "@/components/team/team-list-card";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getAllTeamsInSeason, getTeamsForProfileInSeason } from "@/server/queries/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Equipos — Morvedre Core",
  description: "Todos los equipos del club esta temporada.",
};

export default async function TeamPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { activeProfile } = ctx;
  const season = await getCurrentSeason();

  if (!season) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        <LanePattern className="rounded-md border border-ink-300 bg-paper p-6">
          <div className="relative z-[1] flex flex-col items-center gap-3 text-center">
            <Silbato className="h-12 w-12" accent="var(--pool-teal)" />
            <h1 className="font-display text-2xl font-extrabold text-pool-deep">Equipos</h1>
            <p className="text-sm text-ink-600">La temporada activa aún no está configurada.</p>
          </div>
        </LanePattern>
      </div>
    );
  }

  const [allTeams, myTeams] = await Promise.all([
    getAllTeamsInSeason(season.id),
    getTeamsForProfileInSeason(activeProfile.id, season.id),
  ]);

  const myTeamIds = new Set(myTeams.map((t) => t.id));
  const myPrimary = allTeams.find((t) => myTeamIds.has(t.id)) ?? null;
  const otherTeams = allTeams.filter((t) => !myTeamIds.has(t.id));
  const firstName = activeProfile.full_name.split(" ")[0] ?? activeProfile.full_name;

  return (
    <div className="flex w-full flex-col">
      <LanePattern as="div" className="bg-paper">
        <div className="relative z-[1] mx-auto w-full max-w-2xl px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Equipo className="h-6 w-6" accent="var(--pool-deep)" />
            <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-tight text-pool-deep sm:text-[32px]">
              Equipos
            </h1>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            {myPrimary
              ? `Hola, ${firstName}. Tu equipo está arriba. El resto de la familia, debajo.`
              : `Hola, ${firstName}. Estos son los ${allTeams.length} equipos del club esta temporada.`}
          </p>
        </div>
      </LanePattern>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
        {allTeams.length === 0 ? (
          <div className="rounded-md border-2 border-dashed border-ink-300 bg-paper p-6 text-center">
            <Silbato className="mx-auto h-10 w-10" accent="var(--pool-teal)" />
            <p className="mt-3 text-sm text-ink-600">
              Todavía no hay equipos configurados en la temporada activa.
            </p>
          </div>
        ) : (
          <>
            {myPrimary ? (
              <TeamListCard team={myPrimary} isMyTeam />
            ) : null}

            {otherTeams.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {otherTeams.map((team) => (
                  <TeamListCard key={team.id} team={team} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
