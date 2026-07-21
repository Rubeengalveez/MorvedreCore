import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { TeamListItem } from "@/server/queries/teams";

export interface TeamListCardProps {
  team: TeamListItem;
  relationship?: "player" | "coach" | "both" | null;
  familyPlayerNames?: string[];
}

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  mixed: "Mixto",
};

function formatFamilyPlayers(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

export function TeamListCard({
  team,
  relationship = null,
  familyPlayerNames = [],
}: TeamListCardProps) {
  const href = `/team/${team.id}` as Route;
  const showsFamily = familyPlayerNames.length > 0;

  return (
    <Link
      href={href}
      data-team-card
      data-team-relationship={relationship ?? "none"}
      className={cn(
        "group border-ink-200 bg-paper-card focus-visible:ring-pool-blue hover:border-pool-blue/40 hover:shadow-elev-2 relative flex min-h-24 w-full touch-manipulation items-center gap-4 overflow-hidden rounded-2xl border px-4 py-3.5 shadow-sm transition-[border-color,box-shadow,transform] duration-200 [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none",
        relationship === "player" &&
          "border-pool-blue bg-pool-ice shadow-elev-2 ring-pool-blue/10 ring-1",
        relationship === "coach" && "border-pool-deep/45 shadow-elev-2",
        relationship === "both" &&
          "border-ball-gold bg-pool-ice shadow-elev-2 ring-ball-gold/20 ring-1",
        showsFamily &&
          relationship !== "player" &&
          relationship !== "both" &&
          "border-pool-blue/30 bg-pool-ice/40 shadow-sm",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-3 left-0 w-[3px] rounded-r-full"
        style={{ backgroundColor: team.color }}
      />

      <div className="min-w-0 flex-1 pl-1">
        {relationship || showsFamily ? (
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {relationship === "player" || relationship === "both" ? (
              <span className="text-pool-blue inline-flex items-center gap-1.5 text-xs leading-tight font-extrabold tracking-[0.07em] uppercase">
                <span className="bg-pool-blue h-1.5 w-1.5 rounded-full" aria-hidden="true" />
                Tu equipo
              </span>
            ) : showsFamily ? (
              <span className="text-pool-blue inline-flex items-center gap-1.5 text-xs leading-tight font-extrabold tracking-[0.07em] uppercase">
                <span className="bg-pool-blue h-1.5 w-1.5 rounded-full" aria-hidden="true" />
                Aquí juega {formatFamilyPlayers(familyPlayerNames)}
              </span>
            ) : null}
            {relationship === "coach" || relationship === "both" ? (
              <span className="bg-pool-deep text-paper rounded-full px-2 py-0.5 text-xs leading-tight font-extrabold">
                Entrenador titular
              </span>
            ) : null}
          </div>
        ) : null}
        <h3 className="font-display text-pool-deep truncate text-lg leading-tight font-extrabold">
          {team.label}
        </h3>
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
