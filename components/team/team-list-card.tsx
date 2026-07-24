import type { Route } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleCheckBig, UsersRound } from "lucide-react";

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
      className="group focus-visible:ring-pool-blue hover:bg-pool-foam/45 relative flex min-h-[5.5rem] w-full touch-manipulation items-center gap-3 px-4 py-3 transition-[background-color,transform] duration-200 [-webkit-tap-highlight-color:transparent] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none active:scale-[0.995] motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        className="h-11 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: team.color }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="font-display text-pool-deep truncate text-lg leading-tight font-extrabold">
            {team.label}
          </h3>
          <span className="text-ink-400 shrink-0 text-sm font-bold">
            {GENDER_LABELS[team.gender] ?? team.gender}
          </span>
        </div>
        <div className="text-ink-600 mt-1 flex min-w-0 items-center gap-1.5 text-sm">
          <UsersRound className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {team.player_count} {team.player_count === 1 ? "jugador" : "jugadores"}
            {team.coach_name ? ` · ${team.coach_name}` : ""}
          </span>
        </div>
        {relationship || showsFamily ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {relationship === "player" || relationship === "both" ? (
              <span className="bg-pool-foam text-pool-blue inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-xs font-extrabold">
                <CircleCheckBig className="h-3.5 w-3.5" aria-hidden="true" />
                Juegas aquí
              </span>
            ) : null}
            {showsFamily ? (
              <span className="bg-success/10 text-success inline-flex min-h-6 max-w-full items-center gap-1 rounded-full px-2 text-xs leading-tight font-extrabold">
                <UsersRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="line-clamp-2">
                  Aquí juega {formatFamilyPlayers(familyPlayerNames)}
                </span>
              </span>
            ) : null}
            {relationship === "coach" || relationship === "both" ? (
              <span className="bg-pool-deep text-paper inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-xs font-extrabold">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Entrenador titular
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <span className="bg-paper-sunk text-pool-blue group-hover:bg-pool-deep group-hover:text-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-[background-color,color,transform] duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none">
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </span>
    </Link>
  );
}
