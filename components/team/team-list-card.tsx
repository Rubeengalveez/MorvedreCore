import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils/cn";

import { CapTile } from "@/components/ui/cap-tile";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Equipo } from "@/components/brand/pictograms";
import { CategoryBadge } from "@/components/team/category-badge";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
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
  variant = "default",
}: TeamListCardProps) {
  const href = `/team/${team.id}` as Route;
  const isFeatured = isMyTeam || variant === "featured";
  const categoryLabel = CATEGORY_LABELS[team.category_code as CategoryCode] ?? team.category_code;
  const featuredCap = team.featured_player_cap ?? 1;
  const featuredLabel = team.featured_player_name ?? null;
  return (
    <Link
      href={href}
      data-team-card
      data-my-team={isMyTeam}
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-md p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        isMyTeam
          ? "border-2 shadow-elev-2 hover:shadow-elev-3 scale-[1.01]"
          : "border border-ink-300 bg-paper-card shadow-elev-1 hover:border-pool-blue hover:shadow-elev-2 hover:-translate-y-0.5"
      )}
      style={
        isMyTeam
          ? {
              borderColor: team.color,
              background: `radial-gradient(circle at top right, rgba(255, 107, 53, 0.1), transparent 70%), color-mix(in oklab, ${team.color} 10%, var(--paper-card))`,
            }
          : undefined
      }
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: team.color }}
      />
      <PictogramBadge pictogram={Equipo} color={team.color} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 pl-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryBadge code={team.category_code} />
          {team.team_type === "school" ? (
            <span className="border-ink-300 bg-paper text-ink-600 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] leading-none font-semibold">
              Escuela
            </span>
          ) : null}
          {isMyTeam ? (
            <span
              className="tracking-eyebrow text-paper inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-extrabold uppercase"
              style={{ backgroundColor: team.color }}
            >
              Tu equipo
            </span>
          ) : null}
        </div>
        <span className="font-display text-pool-deep line-clamp-1 text-lg leading-tight font-extrabold">
          {team.label}
        </span>
        <div className="text-ink-600 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
          <span className="text-ink-900 font-semibold">
            {team.player_count} {team.player_count === 1 ? "jugador" : "jugadores"}
          </span>
          {team.coach_name ? (
            <span>
              <span className="text-ink-400">·</span> {team.coach_name}
            </span>
          ) : null}
          {categoryLabel ? <span className="text-ink-400">· {categoryLabel}</span> : null}
        </div>
      </div>
      {featuredLabel ? (
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <CapTile number={featuredCap} teamColor={team.color} size="sm" />
          <span className="text-ink-700 line-clamp-1 max-w-[72px] text-center text-[10px] font-semibold">
            {featuredLabel.split(" ")[0]}
          </span>
        </div>
      ) : coachCapNumber != null ? (
        <CapTile number={coachCapNumber} teamColor={team.color} size="sm" />
      ) : null}
    </Link>
  );
}
