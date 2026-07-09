import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Equipo, Silbato } from "@/components/brand/pictograms";
import { LanePattern } from "@/components/ui/lane-pattern";
import { PageHeader, PageShell, SectionHeader } from "@/components/ui/page-shell";
import { TeamListCard } from "@/components/team/team-list-card";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getAllTeamsInSeason, getTeamsForProfileInSeason } from "@/server/queries/teams";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Equipos - Morvedre Core",
  description: "Todos los equipos del club esta temporada.",
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

export default async function TeamPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { activeProfile } = ctx;
  const season = await getCurrentSeason();

  if (!season) {
    return (
      <PageShell>
        <LanePattern className="border-ink-300 bg-paper rounded-md border p-6">
          <div className="relative z-[1] flex flex-col items-center gap-3 text-center">
            <Silbato className="h-12 w-12" accent="var(--pool-teal)" />
            <h1 className="font-display text-pool-deep text-2xl font-extrabold">Equipos</h1>
            <p className="text-ink-600 text-sm">La temporada activa aun no esta configurada.</p>
          </div>
        </LanePattern>
      </PageShell>
    );
  }

  const [allTeams, myTeams] = await Promise.all([
    getAllTeamsInSeason(season.id),
    getTeamsForProfileInSeason(activeProfile.id, season.id),
  ]);

  const myTeamIds = new Set(myTeams.map((t) => t.id));
  const myCategories = new Set(myTeams.map((t) => t.category_code as CategoryCode));
  const myPrimaryCategory =
    CATEGORY_ORDER.find((code) => myCategories.has(code)) ??
    (myTeams[0]?.category_code as CategoryCode | undefined);
  const firstName = activeProfile.full_name.split(" ")[0] ?? activeProfile.full_name;
  const visibleCategories = CATEGORY_ORDER.map((code) => ({
    code,
    label: CATEGORY_LABELS[code] ?? code,
    teams: allTeams.filter((team) => team.category_code === code),
    isMine: myCategories.has(code),
  })).filter((category) => category.teams.length > 0);
  const orderedCategories = [
    ...visibleCategories.filter((category) => category.code === myPrimaryCategory),
    ...visibleCategories.filter((category) => category.code !== myPrimaryCategory),
  ];

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0 opacity-70" />
      <PageShell className="gap-3">
        <PageHeader
          eyebrow="Plantilla"
          title="Equipos"
          description={
            myPrimaryCategory
              ? `Hola, ${firstName}. Tu categoria esta arriba; el resto del club queda debajo.`
              : `Hola, ${firstName}. Estos son los ${allTeams.length} equipos del club esta temporada.`
          }
          icon={<Equipo className="h-9 w-9 shrink-0" accent="var(--pool-deep)" />}
          teamColor={myTeams[0]?.color ?? "var(--pool-deep)"}
        />

        {allTeams.length === 0 ? (
          <div className="border-ink-300 bg-paper rounded-md border-2 border-dashed p-6 text-center">
            <Silbato className="mx-auto h-10 w-10" accent="var(--pool-teal)" />
            <p className="text-ink-600 mt-3 text-sm">
              Todavia no hay equipos configurados en la temporada activa.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {orderedCategories.map((category) => (
                <section
                  key={category.code}
                  className={
                    category.isMine
                      ? "border-pool-blue/25 bg-pool-foam/55 shadow-elev-1 rounded-md border p-2.5"
                      : "flex flex-col gap-2"
                  }
                  aria-label={category.label}
                >
                  <SectionHeader
                    title={category.isMine ? `Tu categoria: ${category.label}` : category.label}
                    action={
                      <span className="text-ink-600 text-sm font-extrabold">
                        {category.teams.length}
                      </span>
                    }
                  />
                  <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
                    {category.teams.map((team) => (
                      <TeamListCard key={team.id} team={team} isMyTeam={myTeamIds.has(team.id)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </PageShell>
    </div>
  );
}
