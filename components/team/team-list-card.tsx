import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils/cn";
import { ChevronRight } from "lucide-react";

import { CapTile } from "@/components/ui/cap-tile";
import { CategoryBadge } from "@/components/team/category-badge";
import type { TeamListItem } from "@/server/queries/teams";

export interface TeamListCardProps {
  team: TeamListItem;
  isMyTeam?: boolean;
  coachCapNumber?: number | null;
  variant?: "default" | "featured";
}

export function TeamListCard({
  team,
  isMyTeam = false,
  coachCapNumber = null,
}: TeamListCardProps) {
  const href = `/team/${team.id}` as Route;
  const featuredCap = team.featured_player_cap ?? 1;
  const featuredLabel = team.featured_player_name ?? null;
  void featuredCap;
  void featuredLabel;
  void coachCapNumber;

  return (
    <Link
      href={href}
      data-team-card
      data-my-team={isMyTeam}
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-md border bg-paper-card px-4 py-3.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2",
        isMyTeam
          ? "hover:shadow-md"
          : "border-ink-200 hover:border-pool-blue hover:shadow-sm",
      )}
      style={{
        borderColor: isMyTeam ? team.color : undefined,
        borderLeftWidth: isMyTeam ? "3px" : undefined,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <CategoryBadge code={team.category_code} />
          {isMyTeam ? (
            <span
              className="text-eyebrow inline-flex items-center rounded-sm px-1.5 py-0.5 text-paper"
              style={{ backgroundColor: team.color }}
            >
              Mi equipo
            </span>
          ) : null}
          {team.team_type === "school" ? (
            <span className="text-eyebrow inline-flex items-center rounded-sm border border-ink-200 px-1.5 py-0.5 text-ink-600">
              Escuela
            </span>
          ) : null}
        </div>
        <p className="font-display text-base font-extrabold leading-tight text-pool-deep line-clamp-1">
          {team.label}
        </p>
        <p className="mt-0.5 text-xs text-ink-500">
          {team.player_count} {team.player_count === 1 ? "jugador" : "jugadores"}
          {team.coach_name ? <> · {team.coach_name}</> : null}
        </p>
      </div>
      {featuredLabel ? (
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <CapTile number={featuredCap} teamColor={team.color} size="sm" />
          <span className="text-ink-600 line-clamp-1 max-w-[60px] text-center text-[10px] font-medium">
            {featuredLabel.split(" ")[0]}
          </span>
        </div>
      ) : coachCapNumber != null ? (
        <CapTile number={coachCapNumber} teamColor={team.color} size="sm" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5" />
      )}
    </Link>
  );
}
