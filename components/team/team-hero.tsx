import { CategoryBadge } from "@/components/team/category-badge";
import { GenderBadge } from "@/components/team/gender-badge";
import type { Team } from "@/server/queries/teams";

export interface TeamHeroProps {
  team: Team;
  seasonLabel?: string | null;
  homePool?: string | null;
}

export function TeamHero({ team, seasonLabel, homePool }: TeamHeroProps) {
  return (
    <header
      className="overflow-hidden rounded-md border border-ink-200 bg-paper-card"
      style={{ borderTopWidth: "3px", borderTopColor: team.color }}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge code={team.category_code} tone="solid" />
          <GenderBadge gender={team.gender} />
          {team.team_type === "school" ? (
            <span className="text-eyebrow inline-flex items-center rounded-sm border border-ink-200 px-1.5 py-0.5 text-ink-600">
              Escuela
            </span>
          ) : null}
        </div>
        <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-pool-deep sm:text-3xl">
          {team.label}
        </h1>
        {(seasonLabel || homePool) ? (
          <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-500">
            {seasonLabel ? (
              <div className="flex items-center gap-1">
                <dt className="font-semibold text-ink-700">Temporada:</dt>
                <dd className="font-mono">{seasonLabel}</dd>
              </div>
            ) : null}
            {homePool ? (
              <div className="flex items-center gap-1">
                <dt className="font-semibold text-ink-700">Piscina:</dt>
                <dd>{homePool}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </header>
  );
}
