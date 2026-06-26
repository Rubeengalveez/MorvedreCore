import Link from "next/link";
import type { Route } from "next";

import { ChevronDerecha } from "@/components/brand/pictograms";
import { CategoryBadge } from "@/components/team/category-badge";
import type { TeamSummary } from "@/server/queries/teams";

export interface TeamListCardProps {
  team: TeamSummary;
}

export function TeamListCard({ team }: TeamListCardProps) {
  const href = `/team/${team.id}` as Route;
  return (
    <Link
      href={href}
      className="flex items-center gap-3 overflow-hidden rounded-md border border-ink-300 bg-paper transition-colors hover:bg-brand-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <div
        aria-hidden="true"
        className="block h-full w-1.5 shrink-0 self-stretch"
        style={{ backgroundColor: team.color }}
      />
      <div className="flex flex-1 flex-col gap-1 py-3 pr-1">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge code={team.category_code} />
          {team.team_type === "school" ? (
            <span className="inline-flex items-center rounded-full border border-ink-300 bg-paper px-2.5 py-1 text-xs font-semibold leading-none text-ink-600">
              Escuela
            </span>
          ) : null}
        </div>
        <span className="font-display text-xl font-extrabold leading-tight text-brand-deep">
          {team.label}
        </span>
        <span className="text-sm text-ink-600">
          {team.player_count} {team.player_count === 1 ? "jugador" : "jugadores"}
        </span>
      </div>
      <ChevronDerecha
        className="mr-3 h-5 w-5 shrink-0 text-ink-600"
      />
    </Link>
  );
}
