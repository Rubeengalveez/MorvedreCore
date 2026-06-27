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
      className="relative overflow-hidden rounded-md border border-ink-300 bg-paper"
      style={{
        borderTopWidth: "4px",
        borderTopColor: team.color,
        borderLeftWidth: "4px",
        borderLeftColor: team.color,
      }}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge code={team.category_code} tone="solid" />
            <GenderBadge gender={team.gender} />
            {team.team_type === "school" ? (
              <span className="inline-flex items-center rounded-full border border-ink-300 bg-paper px-2.5 py-1 text-xs font-semibold leading-none text-ink-600">
                Escuela
              </span>
            ) : null}
          </div>
          <h1 className="font-display text-[32px] font-extrabold leading-[1.1] tracking-tight text-brand-deep sm:text-[40px]">
            {team.label}
          </h1>
        </div>
        {(seasonLabel || homePool) ? (
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-600">
            {seasonLabel ? (
              <div className="flex items-center gap-1.5">
                <dt className="font-medium">Temporada:</dt>
                <dd className="font-mono">{seasonLabel}</dd>
              </div>
            ) : null}
            {homePool ? (
              <div className="flex items-center gap-1.5">
                <dt className="font-medium">Piscina:</dt>
                <dd>{homePool}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </header>
  );
}
