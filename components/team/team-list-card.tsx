import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { TeamListItem } from "@/server/queries/teams";

export interface TeamListCardProps {
  team: TeamListItem;
  relationship?: "player" | "coach" | "both" | null;
}

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  mixed: "Mixto",
};

export function TeamListCard({ team, relationship = null }: TeamListCardProps) {
  const href = `/team/${team.id}` as Route;

  return (
    <Link
      href={href}
      data-team-card
      data-team-relationship={relationship ?? "none"}
      className={cn(
        "group border-ink-200 bg-paper-card focus-visible:ring-pool-blue hover:border-pool-blue/40 hover:shadow-elev-2 relative flex min-h-24 w-full touch-manipulation items-center gap-4 overflow-hidden rounded-2xl border px-4 py-3.5 shadow-sm transition-[border-color,box-shadow,transform] duration-200 [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none",
        relationship === "player" && "border-pool-blue/45 bg-pool-foam/35",
        relationship === "coach" && "border-pool-deep/45 shadow-elev-2",
        relationship === "both" && "border-ball-gold/65 bg-ball-gold/5 shadow-elev-2",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-3 left-0 w-[3px] rounded-r-full"
        style={{ backgroundColor: team.color }}
      />

      <div className="min-w-0 flex-1 pl-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-pool-deep truncate text-lg leading-tight font-extrabold">
            {team.label}
          </h3>
          {relationship === "player" || relationship === "both" ? (
            <span className="border-pool-blue/25 bg-pool-foam text-pool-deep rounded-full border px-2 py-0.5 text-xs font-extrabold">
              Juegas aquí
            </span>
          ) : null}
          {relationship === "coach" || relationship === "both" ? (
            <span className="bg-pool-deep text-paper rounded-full px-2 py-0.5 text-xs font-extrabold">
              Entrenador titular
            </span>
          ) : null}
        </div>
        <p className="text-ink-600 mt-1 truncate text-sm">
          {team.player_count} {team.player_count === 1 ? "jugador" : "jugadores"}
          <span aria-hidden="true"> · </span>
          {GENDER_LABELS[team.gender] ?? team.gender}
        </p>
        {team.coach_name ? (
          <p className="text-ink-500 mt-0.5 truncate text-xs">{team.coach_name}</p>
        ) : null}
      </div>

      <span className="border-ink-200 text-pool-deep group-hover:bg-pool-deep group-hover:text-paper bg-paper flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-[background-color,color,transform] duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none">
        <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
      </span>
    </Link>
  );
}
