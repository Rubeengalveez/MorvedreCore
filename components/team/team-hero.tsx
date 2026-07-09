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
      className="border-ink-200 bg-paper-card overflow-hidden rounded-md border"
      style={{ borderTopWidth: "3px", borderTopColor: team.color }}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge code={team.category_code} tone="solid" />
          <GenderBadge gender={team.gender} />
          {team.team_type === "school" ? (
            <span className="text-eyebrow border-ink-200 text-ink-600 inline-flex items-center rounded-sm border px-1.5 py-0.5">
              Escuela
            </span>
          ) : null}
        </div>
        <h1 className="font-display text-pool-deep text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
          {team.label}
        </h1>
        {seasonLabel || homePool ? (
          <dl className="text-ink-500 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
            {seasonLabel ? (
              <div className="flex items-center gap-1">
                <dt className="text-ink-700 font-semibold">Temporada:</dt>
                <dd className="font-mono">{seasonLabel}</dd>
              </div>
            ) : null}
            {homePool ? (
              <div className="flex items-center gap-1">
                <dt className="text-ink-700 font-semibold">Piscina:</dt>
                <dd>{homePool}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </header>
  );
}
