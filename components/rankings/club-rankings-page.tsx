import { redirect } from "next/navigation";
import { Crown, Flame, Trophy } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getDashboardAudience } from "@/server/queries/dashboard";
import { getClubRankingsData } from "@/server/queries/club-rankings";
import type { RankingsView } from "@/lib/domain/club-rankings";
import { RankingsSectionNav } from "./rankings-section-nav";
import { ClubRankingsExplorer } from "./club-rankings-explorer";

export async function ClubRankingsPage({ view }: { view: RankingsView }) {
  const [ctx, season] = await Promise.all([getActiveProfileContext(), getCurrentSeason()]);
  if (!ctx) redirect("/login");
  const title = view === "season" ? "Rankings" : view === "streaks" ? "Rachas" : "Leyendas";
  const Icon = view === "season" ? Trophy : view === "streaks" ? Flame : Crown;
  const audience = season ? await getDashboardAudience(ctx.ownProfile.id, season.id) : null;
  const canViewAttendance = audience?.can_manage_attendance ?? false;
  const data = season ? await getClubRankingsData(season, view, canViewAttendance) : null;
  return (
    <PageShell width="md" className="gap-3 py-3 pb-8 sm:py-4">
      <header className="text-pool-deep flex min-h-12 items-center gap-3 px-1">
        <span className="bg-pool-deep text-ball-gold flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="flex-1 text-2xl font-extrabold">{title}</h1>
        <span className="border-pool-deep/65 shrink-0 rounded-lg border bg-white px-2 py-1 text-xs font-bold">
          {view === "legends" ? "Histórico" : (season?.label ?? "Club")}
        </span>
      </header>
      <RankingsSectionNav active={view} />
      {data ? (
        <ClubRankingsExplorer
          data={data}
          view={view}
          myId={ctx.activeProfile.id}
          canViewAttendance={canViewAttendance}
        />
      ) : (
        <section className="text-pool-deep border-pool-deep/65 rounded-2xl border-2 bg-white p-6 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10" aria-hidden="true" />
          <h2 className="text-lg font-extrabold">Todavía no hay una temporada disponible</h2>
          <p className="mt-2 text-sm font-semibold">
            Los datos aparecerán al registrar los primeros partidos.
          </p>
        </section>
      )}
    </PageShell>
  );
}
