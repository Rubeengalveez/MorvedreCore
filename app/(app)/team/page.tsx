import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Equipo, Silbato } from "@/components/brand/pictograms";
import { Eyebrow } from "@/components/ui/eyebrow";
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
        <LanePattern className="border-ink-300 bg-paper rounded-md border p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Silbato className="h-12 w-12" accent="var(--pool-teal)" />
            <h1 className="font-display text-pool-deep text-2xl font-extrabold">Equipos</h1>
            <p className="text-ink-600 text-sm">La temporada activa aún no está configurada.</p>
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
      <LanePattern as="div" className="bg-paper" strong>
        <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Equipo className="h-6 w-6" accent="var(--pool-deep)" />
            <h1 className="font-display text-pool-deep text-[28px] leading-[1.1] font-extrabold tracking-tight sm:text-[32px]">
              Equipos
            </h1>
          </div>
          <p className="text-ink-600 mt-1 text-sm leading-relaxed">
            {myPrimary
              ? `Hola, ${firstName}. Tu equipo está arriba. El resto de la familia, debajo.`
              : `Hola, ${firstName}. Estos son los ${allTeams.length} equipos del club esta temporada.`}
          </p>
        </div>
      </LanePattern>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-4">
        {allTeams.length === 0 ? (
          <div className="border-ink-300 bg-paper rounded-md border-2 border-dashed p-6 text-center">
            <Silbato className="mx-auto h-10 w-10" accent="var(--pool-teal)" />
            <p className="text-ink-600 mt-3 text-sm">
              Todavía no hay equipos configurados en la temporada activa.
            </p>
          </div>
        ) : (
          <>
            {myPrimary ? (
              <section aria-labelledby="my-team-heading" className="flex flex-col gap-2">
                <Eyebrow as="h2" id="my-team-heading">
                  Tu equipo
                </Eyebrow>
                <TeamListCard team={myPrimary} isMyTeam />
              </section>
            ) : null}

            {otherTeams.length > 0 ? (
              <section aria-labelledby="other-teams-heading" className="flex flex-col gap-2">
                <Eyebrow as="h2" id="other-teams-heading">
                  {myPrimary ? "Resto de equipos" : "Equipos"}
                </Eyebrow>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {otherTeams.map((team) => (
                    <TeamListCard key={team.id} team={team} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
