import type { Route } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { EmptyTeamState } from "@/components/team/empty-team-state";
import { TeamStaffList } from "@/components/team/team-staff-list";
import { Avatar } from "@/components/ui/avatar";
import { CATEGORY_LABELS, safeInferCategory, type CategoryCode } from "@/lib/domain/categories";
import type { getTeamStaff } from "@/server/queries/teams";

interface RosterPlayer {
  player_id: string;
  full_name: string;
  photo_url: string | null;
  birth_year: number | null;
  cap_number: number | null;
  squad_number: number | null;
}

const COMPETITIVE_CATEGORIES: readonly CategoryCode[] = [
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "absoluto",
];

function isValidReinforcement(playerCategory: CategoryCode | null, teamCategory: CategoryCode) {
  if (!playerCategory || playerCategory === "escuela" || teamCategory === "escuela") return false;
  const playerIndex = COMPETITIVE_CATEGORIES.indexOf(playerCategory);
  const teamIndex = COMPETITIVE_CATEGORIES.indexOf(teamCategory);
  return teamIndex - playerIndex === 1;
}

export interface TeamPlayersTabProps {
  teamId: string;
  roster: RosterPlayer[];
  teamColor: string;
  teamCategory: CategoryCode;
  categoryYear: number;
  staff: Awaited<ReturnType<typeof getTeamStaff>>;
}

export function TeamPlayersTab({
  teamId,
  roster,
  teamColor,
  teamCategory,
  categoryYear,
  staff,
}: TeamPlayersTabProps) {
  const ownCategory = roster.filter((player) => {
    if (teamCategory === "escuela") return true;
    return (
      player.birth_year == null ||
      safeInferCategory(player.birth_year, categoryYear) === teamCategory
    );
  });
  const reinforcements = roster.filter(
    (player) =>
      player.birth_year != null &&
      isValidReinforcement(safeInferCategory(player.birth_year, categoryYear), teamCategory),
  );

  return (
    <div className="flex flex-col gap-7">
      {staff.length > 0 ? <TeamStaffList staff={staff} teamColor={teamColor} /> : null}

      <section aria-labelledby="team-roster-heading">
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
              Equipo
            </p>
            <h2
              id="team-roster-heading"
              className="font-display text-pool-deep text-xl font-extrabold"
            >
              Plantilla
            </h2>
          </div>
          <span className="text-ink-500 text-sm font-semibold tabular-nums">{roster.length}</span>
        </div>

        {roster.length === 0 ? (
          <EmptyTeamState
            title="Aún no hay plantilla"
            description="Los jugadores aparecerán aquí cuando se incorporen al equipo."
          />
        ) : (
          <div className="flex flex-col gap-5">
            <PlayerList
              players={ownCategory}
              teamId={teamId}
              teamColor={teamColor}
              categoryYear={categoryYear}
            />
            {reinforcements.length > 0 ? (
              <section aria-labelledby="reinforcements-heading">
                <div className="mb-2 px-1">
                  <h3 id="reinforcements-heading" className="text-pool-deep text-sm font-extrabold">
                    Refuerzos de categorías inferiores
                  </h3>
                  <p className="text-ink-500 mt-0.5 text-xs">
                    Pueden jugar con este equipo, pero pertenecen a su categoría de origen.
                  </p>
                </div>
                <PlayerList
                  players={reinforcements}
                  teamId={teamId}
                  teamColor={teamColor}
                  categoryYear={categoryYear}
                  showCategory
                />
              </section>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function PlayerList({
  players,
  teamId,
  teamColor,
  categoryYear,
  showCategory = false,
}: {
  players: RosterPlayer[];
  teamId: string;
  teamColor: string;
  categoryYear: number;
  showCategory?: boolean;
}) {
  return (
    <ul className="border-ink-200 bg-paper-card divide-ink-200 divide-y overflow-hidden rounded-2xl border shadow-sm">
      {players.map((player) => {
        const category =
          player.birth_year == null ? null : safeInferCategory(player.birth_year, categoryYear);
        return (
          <li key={player.player_id}>
            <Link
              href={`/team/${teamId}/players/${player.player_id}` as Route}
              className="group hover:bg-pool-foam/45 focus-visible:ring-pool-blue flex min-h-[72px] touch-manipulation items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
            >
              <Avatar
                src={player.photo_url}
                name={player.full_name}
                size={48}
                teamColor={teamColor}
                className="border-ink-200"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-pool-deep truncate text-base font-extrabold">
                  {player.full_name}
                </p>
                {showCategory && category ? (
                  <p className="text-pool-blue mt-0.5 text-xs font-bold">
                    {CATEGORY_LABELS[category]}
                  </p>
                ) : null}
              </div>
              <ChevronRight
                className="text-ink-400 group-hover:text-pool-blue h-5 w-5 shrink-0 transition-colors"
                aria-hidden="true"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
