import Link from "next/link";
import type { Route } from "next";

import { cn } from "@/lib/utils/cn";
import { ChevronDerecha } from "@/components/brand/pictograms";
import { CapTile } from "@/components/ui/cap-tile";
import { CategoryBadge } from "@/components/team/category-badge";
import type { TeamListItem } from "@/server/queries/teams";

export interface TeamListCardProps {
  team: TeamListItem;
  isMyTeam?: boolean;
}

export function TeamListCard({ team, isMyTeam = false }: TeamListCardProps) {
  const href = `/team/${team.id}` as Route;
  const featuredCap = team.featured_player_cap ?? 1;
  const featuredLabel = team.featured_player_name ?? null;

  return (
    <Link
      href={href}
      data-team-card
      data-my-team={isMyTeam}
      className={cn(
        "group bg-paper-card shadow-elev-1 focus-visible:ring-pool-blue relative flex min-h-[84px] items-center gap-3 overflow-hidden rounded-md border p-3 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        isMyTeam
          ? "shadow-elev-2 hover:shadow-elev-3"
          : "border-ink-300 hover:border-pool-blue hover:shadow-elev-2",
      )}
      style={{
        borderColor: isMyTeam ? team.color : undefined,
        borderLeftWidth: isMyTeam ? "4px" : undefined,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <CategoryBadge code={team.category_code} />
          {isMyTeam ? (
            <span
              className="text-paper inline-flex min-h-6 items-center rounded-sm px-2 text-xs font-extrabold tracking-[0.08em] uppercase"
              style={{ backgroundColor: team.color }}
            >
              Mi equipo
            </span>
          ) : null}
          {team.team_type === "school" ? (
            <span className="border-ink-300 text-ink-600 inline-flex min-h-6 items-center rounded-sm border px-2 text-xs font-extrabold tracking-[0.08em] uppercase">
              Escuela
            </span>
          ) : null}
        </div>
        <p className="font-display text-pool-deep line-clamp-1 text-lg leading-tight font-extrabold">
          {team.label}
        </p>
        <p className="text-ink-600 mt-1 line-clamp-1 text-sm font-medium">
          {team.player_count} {team.player_count === 1 ? "jugador" : "jugadores"}
          {team.coach_name ? <> / {team.coach_name}</> : null}
        </p>
      </div>
      {featuredLabel ? (
        <div className="bg-paper-sunk flex shrink-0 items-center gap-2 rounded-sm px-2 py-1.5">
          <CapTile number={featuredCap} teamColor={team.color} size="sm" />
          <span className="text-ink-700 hidden max-w-[72px] truncate text-sm font-bold min-[360px]:block">
            {featuredLabel.split(" ")[0]}
          </span>
        </div>
      ) : (
        <ChevronDerecha
          className="text-ink-300 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5"
          accent="currentColor"
        />
      )}
    </Link>
  );
}
