import { UsersRound, MapPin } from "lucide-react";
import type { Team } from "@/server/queries/teams";
import { teamCategoryLabel, matchesTeamSearch } from "@/lib/domain/team-presentation";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
export interface TeamHeroProps {
  team: Team;
  homePool?: string | null;
  playerCount?: number;
  staff?: Array<{ role: string; full_name: string }>;
}
export function TeamHero({ team, homePool, playerCount = 0, staff = [] }: TeamHeroProps) {
  const coach = staff
    .filter((member) => member.role === "head_coach")
    .map((member) => member.full_name)
    .join(", ");
  const delegate = staff
    .filter((member) => member.role === "delegate")
    .map((member) => member.full_name)
    .join(", ");
  return (
    <header className="border-pool-deep/65 text-pool-deep overflow-hidden rounded-2xl border-2 bg-white">
      <div className="bg-pool-deep px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <UsersRound className="h-6 w-6 shrink-0" aria-hidden="true" />
          <h1 className="min-w-0 flex-1 text-2xl leading-tight font-extrabold">{team.label}</h1>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-2xl leading-none font-extrabold tabular-nums">
            <span className="sr-only">Jugadores: </span>
            {playerCount}
            <UsersRound className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        {!matchesTeamSearch(team.label, teamCategoryLabel(team.category_code)) ? (
          <p className="mt-1 text-sm font-semibold text-white">
            {teamCategoryLabel(team.category_code)}
          </p>
        ) : null}
      </div>
      <dl className="space-y-2 px-4 py-3 text-sm">
        {[
          ["Entrenador", coach],
          ["Delegado", delegate],
        ].map(([label, name]) => (
          <div key={label} className="flex items-center gap-3">
            <dt className="w-20 shrink-0 font-semibold">{label}</dt>
            <dd className="min-w-0 flex-1 font-bold">
              <AdaptivePlayerName name={name || "Sin asignar"} />
            </dd>
          </div>
        ))}
      </dl>
      {homePool ? (
        <p className="flex items-center gap-2 px-4 pb-3 text-sm font-semibold">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          {homePool}
        </p>
      ) : null}
    </header>
  );
}
