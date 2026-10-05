import { redirect } from "next/navigation";
import { CalendarCheck2, ClipboardCheck, Timer, UsersRound } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { ActionGroup } from "@/components/profile/profile-hub";
import { getSelfProfile } from "@/server/queries/self-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import { getDashboardAudience } from "@/server/queries/dashboard";
import { CalendarSyncCard } from "@/components/profile/calendar-sync-card";
import { getActiveProfileContext } from "@/server/queries/active-profile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi actividad — Morvedre Core" };

export default async function ProfileActivityPage() {
  const [account, season, ctx] = await Promise.all([
    getSelfProfile(),
    getCurrentSeason(),
    getActiveProfileContext(),
  ]);
  if (!account) redirect("/login");
  const [teams, audience] = season
    ? await Promise.all([
        getTeamsForProfileInSeason(account.profile.id, season.id),
        getDashboardAudience(account.profile.id, season.id),
      ])
    : [[], null];
  const ownTeam = teams.find((team) => audience?.player_team_ids.includes(team.id));
  return (
    <PageShell width="md" className="gap-3 pb-5">
      <PageBackLink href="/profile">Mi perfil</PageBackLink>
      <h1 className="text-pool-deep text-3xl font-extrabold">Mi actividad</h1>
      {account.isPlayer && (
        <ActionGroup
          title="Como jugador"
          links={[
            {
              href: `/attendance/history?player=${account.profile.id}&from=profile-activity`,
              label: "Mi asistencia",
              icon: CalendarCheck2,
            },
            ...(ownTeam
              ? [
                  {
                    href: `/team/${ownTeam.id}/players/${account.profile.id}?from=profile-activity`,
                    label: "Mi ficha deportiva",
                    icon: ClipboardCheck,
                  },
                ]
              : []),
            {
              href: `/players/${account.profile.id}/swim-times?from=profile-activity`,
              label: "Mis tiempos de nado",
              icon: Timer,
            },
          ]}
        />
      )}
      {teams.length > 0 ? (
        <ActionGroup
          title="Mis equipos"
          links={teams.map((team) => ({
            href: `/team/${team.id}?from=profile`,
            label: team.label,
            icon: UsersRound,
          }))}
        />
      ) : (
        <div className="border-pool-deep/65 text-pool-deep rounded-2xl border-2 bg-white p-5">
          <h2 className="text-lg font-extrabold">Sin equipo esta temporada</h2>
          <p className="mt-1 font-medium">Tu equipo aparecerá aquí cuando el club te incorpore.</p>
        </div>
      )}
      {audience?.can_manage_attendance && (
        <ActionGroup
          title="Como entrenador"
          links={[
            {
              href: "/attendance?from=profile-activity",
              label: "Pasar lista",
              icon: CalendarCheck2,
            },
            {
              href: "/attendance/summary?from=profile-activity",
              label: "Resumen de asistencia",
              icon: ClipboardCheck,
            },
          ]}
        />
      )}
      {ctx && (
        <CalendarSyncCard
          token={ctx.ownProfile.calendar_token}
          baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
        />
      )}
    </PageShell>
  );
}
