import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Equipo, Silbato } from "@/components/brand/pictograms";
import { EmptyTeamState } from "@/components/team/empty-team-state";
import { TeamListCard } from "@/components/team/team-list-card";
import { WaterDivider } from "@/components/ui/water-divider";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Tu equipo — Morvedre Core",
  description: "Tu plantilla, tus convocatorias y tu gente.",
};

export default async function TeamPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { activeProfile } = ctx;
  const season = await getCurrentSeason();

  if (!season) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-deep">
            Tu equipo
          </h1>
          <p className="text-sm leading-relaxed text-ink-600">
            La temporada activa aún no está configurada.
          </p>
        </header>
      </div>
    );
  }

  const teams = await getTeamsForProfileInSeason(activeProfile.id, season.id);
  const firstName = activeProfile.full_name.split(" ")[0] ?? activeProfile.full_name;

  return (
    <div className="flex w-full flex-col">
      <div className="mx-auto w-full max-w-2xl px-4 pb-3 pt-4">
        <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-tight text-brand-deep">
          Tu equipo
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">
          Hola, {firstName}. Aquí verás la plantilla y el cuerpo técnico de tu
          equipo esta temporada.
        </p>
      </div>

      <WaterDivider fill="var(--brand-foam)" height={24} />

      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        {teams.length === 0 ? (
          <EmptyTeamState
            pictogram={
              <Silbato className="h-12 w-12" accent="var(--brand-aqua)" />
            }
            title="Pronto verás aquí la plantilla de tu equipo"
            description="Cuando el admin te asigne a un equipo esta temporada, aparecerá con sus jugadores y cuerpo técnico."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <Equipo className="h-5 w-5" accent="var(--brand-deep)" />
              <h2 className="font-display text-lg font-bold text-brand-deep">
                {teams.length === 1
                  ? "Tu equipo esta temporada"
                  : `Tus ${teams.length} equipos esta temporada`}
              </h2>
            </div>
            <ul className="flex flex-col gap-3">
              {teams.map((team) => (
                <li key={team.id}>
                  <TeamListCard team={team} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
