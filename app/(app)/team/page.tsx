import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";

import { PageShell } from "@/components/ui/page-shell";
import { TeamListCard } from "@/components/team/team-list-card";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getAllTeamsInSeason, getTeamsForProfileInSeason } from "@/server/queries/teams";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";

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

export default async function TeamPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const season = await getCurrentSeason();
  if (!season) {
    return (
      <PageShell width="md">
        <EmptyTeams
          title="Equipos"
          description="La temporada activa todavía no está configurada."
        />
      </PageShell>
    );
  }

  const [allTeams, myTeams] = await Promise.all([
    getAllTeamsInSeason(season.id),
    getTeamsForProfileInSeason(ctx.activeProfile.id, season.id),
  ]);

  const myTeamIds = new Set(myTeams.map((team) => team.id));
  const myCategories = new Set(myTeams.map((team) => team.category_code as CategoryCode));
  const categories = CATEGORY_ORDER.map((code) => ({
    code,
    label: CATEGORY_LABELS[code] ?? code,
    teams: allTeams.filter((team) => team.category_code === code),
    isMine: myCategories.has(code),
  })).filter((category) => category.teams.length > 0);
  const orderedCategories = [
    ...categories.filter((category) => category.isMine),
    ...categories.filter((category) => !category.isMine),
  ];

  return (
    <PageShell width="md" className="gap-6 pb-6">
      <header className="bg-pool-deep text-paper shadow-elev-3 relative overflow-hidden rounded-[1.75rem] px-5 py-6 sm:px-7 sm:py-8">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-2/5 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08))]"
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-paper/65 text-xs font-extrabold tracking-[0.16em] uppercase">
              Temporada {season.label}
            </p>
            <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight text-balance sm:text-4xl">
              Equipos
            </h1>
            <p className="text-paper/75 mt-3 max-w-md text-sm leading-relaxed sm:text-base">
              Plantillas, cuerpo técnico y calendario deportivo del club.
            </p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 sm:h-14 sm:w-14">
            <UsersRound className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
          </span>
        </div>
      </header>

      {allTeams.length === 0 ? (
        <EmptyTeams
          title="Todavía no hay equipos"
          description="Los equipos de la temporada aparecerán aquí cuando estén configurados."
        />
      ) : (
        <>
          <nav
            aria-label="Ir a una categoría"
            className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          >
            <div className="flex w-max gap-2">
              {orderedCategories.map((category) => (
                <a
                  key={category.code}
                  href={`#team-category-${category.code}`}
                  className={
                    category.isMine
                      ? "bg-pool-deep text-paper focus-visible:ring-pool-blue inline-flex min-h-11 touch-manipulation items-center rounded-full px-4 text-sm font-extrabold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                      : "border-ink-200 bg-paper-card text-ink-700 hover:border-pool-blue/40 hover:text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-11 touch-manipulation items-center rounded-full border px-4 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  }
                >
                  {category.label}
                </a>
              ))}
            </div>
          </nav>

          <div className="flex flex-col gap-8">
            {orderedCategories.map((category) => (
              <section
                key={category.code}
                id={`team-category-${category.code}`}
                aria-labelledby={`team-category-${category.code}-title`}
                className="scroll-mt-28"
              >
                <div className="mb-3 flex items-end justify-between gap-3 px-1">
                  <div className="min-w-0">
                    {category.isMine ? (
                      <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
                        Tu categoría
                      </p>
                    ) : null}
                    <h2
                      id={`team-category-${category.code}-title`}
                      className="font-display text-pool-deep text-xl font-extrabold tracking-tight"
                    >
                      {category.label}
                    </h2>
                  </div>
                  <span className="text-ink-500 text-sm font-semibold tabular-nums">
                    {category.teams.length} {category.teams.length === 1 ? "equipo" : "equipos"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
  );
}

function EmptyTeams({ title, description }: { title: string; description: string }) {
  return (
    <section className="border-ink-200 bg-paper-card flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center">
      <UsersRound className="text-ink-400 h-9 w-9" aria-hidden="true" />
      <h1 className="font-display text-pool-deep mt-4 text-xl font-extrabold">{title}</h1>
      <p className="text-ink-600 mt-2 max-w-sm text-sm leading-relaxed">{description}</p>
    </section>
  );
}
