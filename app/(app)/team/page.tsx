import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";

import { PageShell } from "@/components/ui/page-shell";
import { TeamListCard } from "@/components/team/team-list-card";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getAllTeamsInSeason } from "@/server/queries/teams";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
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

  const supabase = await createClient();
  const [allTeams, rosterResult, staffResult] = await Promise.all([
    getAllTeamsInSeason(season.id),
    supabase
      .from("team_rosters")
      .select("team_id, teams!team_rosters_team_id_fkey(season_id)")
      .eq("player_id", ctx.activeProfile.id)
      .is("left_at", null),
    supabase
      .from("team_staff")
      .select("team_id, teams!team_staff_team_id_fkey(season_id)")
      .eq("profile_id", ctx.activeProfile.id)
      .eq("role", "head_coach"),
  ]);

  const playerTeamIds = new Set(
    (rosterResult.data ?? [])
      .filter((item) => item.teams?.season_id === season.id)
      .map((item) => item.team_id),
  );
  const coachTeamIds = new Set(
    (staffResult.data ?? [])
      .filter((item) => item.teams?.season_id === season.id)
      .map((item) => item.team_id),
  );
  const categories = CATEGORY_ORDER.map((code) => ({
    code,
    label: CATEGORY_LABELS[code] ?? code,
    teams: allTeams.filter((team) => team.category_code === code),
  })).filter((category) => category.teams.length > 0);

  return (
    <PageShell width="md" className="gap-6 pb-6">
      <header className="border-ink-300 flex items-start justify-between gap-4 border-b pb-4">
        <div className="min-w-0">
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.16em] uppercase">
            Temporada {season.label}
          </p>
          <h1 className="font-display text-pool-deep mt-1 text-2xl leading-none font-extrabold tracking-tight text-balance sm:text-3xl">
            Equipos
          </h1>
          <p className="text-ink-600 mt-2 max-w-md text-sm leading-relaxed">
            De Escuela a Absoluto, con tus equipos señalados.
          </p>
        </div>
        <span className="bg-pool-foam text-pool-deep flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <UsersRound className="h-5 w-5" aria-hidden="true" />
        </span>
      </header>

      {allTeams.length === 0 ? (
        <EmptyTeams
          title="Todavía no hay equipos"
          description="Los equipos de la temporada aparecerán aquí cuando estén configurados."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {categories.map((category) => (
            <section
              key={category.code}
              id={`team-category-${category.code}`}
              aria-labelledby={`team-category-${category.code}-title`}
              className="scroll-mt-28"
            >
              <div className="mb-3 flex items-end justify-between gap-3 px-1">
                <div className="min-w-0">
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
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
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
