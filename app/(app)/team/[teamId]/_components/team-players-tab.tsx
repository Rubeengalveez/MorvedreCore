"use client";
import { useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";

import { EmptyTeamState } from "@/components/team/empty-team-state";
import { TeamStaffList } from "@/components/team/team-staff-list";
import { CategoryBadge } from "@/components/team/category-badge";
import { Avatar } from "@/components/ui/avatar";
import {
  CATEGORY_COLORS,
  CATEGORY_SURFACE_COLORS,
  safeInferCategory,
  type CategoryCode,
} from "@/lib/domain/categories";
import type { getTeamStaff } from "@/server/queries/teams";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { matchesTeamSearch, splitTeamRoster } from "@/lib/domain/team-presentation";
import { TeamEmpty, teamControl } from "@/components/team/team-ui";
import { validCapNumber } from "@/lib/domain/cap-number";
import { teamNestedOrigin } from "@/lib/domain/team-navigation-origin";

interface RosterPlayer {
  player_id: string;
  full_name: string;
  photo_url: string | null;
  birth_year: number | null;
  cap_number: number | null;
  squad_number: number | null;
}

export interface TeamPlayersTabProps {
  teamId: string;
  roster: RosterPlayer[];
  teamColor: string;
  teamCategory: CategoryCode;
  categoryYear: number;
  context?: string;
  categoryColors?: Partial<Record<CategoryCode, string>>;
  staff: Awaited<ReturnType<typeof getTeamStaff>>;
}

export function TeamPlayersTab({
  teamId,
  roster,
  teamColor,
  teamCategory,
  categoryYear,
  staff,
  categoryColors = {},
  context,
}: TeamPlayersTabProps) {
  const [query, setQuery] = useState("");
  const visible = roster.filter((player) => matchesTeamSearch(player.full_name, query));
  const { own: ownCategory, reinforcements } = splitTeamRoster(visible, teamCategory, categoryYear);

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="team-roster-heading">
        <div className="bg-pool-deep border-pool-deep mb-3 flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-white">
          <div>
            <h2 id="team-roster-heading" className="text-xl font-extrabold">
              Plantilla
            </h2>
          </div>
          <span className="border-pool-deep/65 text-pool-deep rounded-lg border bg-white px-2.5 py-1 text-sm font-bold tabular-nums">
            {query ? `${visible.length} de ${roster.length}` : roster.length}
          </span>
        </div>

        {roster.length > 0 ? (
          <label className="relative mb-4 block">
            <span className="sr-only">Buscar jugador en la plantilla</span>
            <Search
              className="text-pool-deep pointer-events-none absolute top-4 left-3 h-5 w-5"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Buscar jugador…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${teamControl} pl-10`}
            />
          </label>
        ) : null}
        {roster.length === 0 ? (
          <EmptyTeamState
            title="Aún no hay plantilla"
            description="Los jugadores aparecerán aquí cuando se incorporen al equipo."
          />
        ) : visible.length === 0 ? (
          <TeamEmpty
            title="No encontramos a ese jugador"
            description="Prueba otro nombre o borra la búsqueda."
          />
        ) : (
          <div className="flex flex-col gap-5">
            <PlayerList
              players={ownCategory}
              teamId={teamId}
              teamColor={teamColor}
              categoryYear={categoryYear}
              categoryColors={categoryColors}
              context={context}
            />
            {reinforcements.length > 0 ? (
              <section aria-labelledby="reinforcements-heading">
                <div className="border-pool-deep/65 mb-3 rounded-xl border-2 bg-blue-50 p-3">
                  <h3 id="reinforcements-heading" className="text-pool-deep text-lg font-extrabold">
                    Refuerzos de categorías inferiores
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    Pueden jugar con este equipo, pero pertenecen a su categoría de origen.
                  </p>
                </div>
                <PlayerList
                  players={reinforcements}
                  teamId={teamId}
                  teamColor={teamColor}
                  categoryYear={categoryYear}
                  categoryColors={categoryColors}
                  context={context}
                  showCategory
                />
              </section>
            ) : null}
          </div>
        )}
      </section>
      {staff.length > 0 ? <TeamStaffList staff={staff} teamColor={teamColor} /> : null}
    </div>
  );
}

function PlayerList({
  players,
  teamId,
  teamColor,
  categoryYear,
  showCategory = false,
  categoryColors,
  context,
}: {
  players: RosterPlayer[];
  teamId: string;
  teamColor: string;
  categoryYear: number;
  showCategory?: boolean;
  context?: string;
  categoryColors: Partial<Record<CategoryCode, string>>;
}) {
  return (
    <ul className="space-y-2">
      {players.map((player) => {
        const category =
          player.birth_year == null ? null : safeInferCategory(player.birth_year, categoryYear);
        const originColor =
          showCategory && category
            ? (categoryColors[category] ?? CATEGORY_COLORS[category])
            : teamColor;
        return (
          <li key={player.player_id}>
            <Link
              href={
                `/team/${teamId}/players/${player.player_id}${context ? `?${teamNestedOrigin(context)}` : ""}` as Route
              }
              className="group border-pool-deep/65 focus-visible:ring-pool-blue flex min-h-[80px] touch-manipulation items-center gap-3 rounded-xl border-2 bg-white px-3 py-3 transition-colors hover:bg-blue-50 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
            >
              <Avatar
                src={player.photo_url}
                name={player.full_name}
                size={48}
                teamColor={originColor}
                style={
                  category
                    ? { backgroundColor: CATEGORY_SURFACE_COLORS[category], color: "#0A2E5C" }
                    : undefined
                }
                className="border-pool-deep/65"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-pool-deep text-base font-extrabold">
                  <AdaptivePlayerName name={player.full_name} />
                </p>
                {showCategory && category ? (
                  <div className="mt-1">
                    <CategoryBadge category={category} color={originColor} />
                  </div>
                ) : null}
              </div>
              {validCapNumber(player.squad_number ?? player.cap_number) != null ? (
                <span className="border-pool-deep bg-pool-deep rounded-lg border px-2.5 py-2 text-base font-extrabold text-white">
                  <span className="sr-only">Gorro </span>
                  {validCapNumber(player.squad_number ?? player.cap_number)}
                </span>
              ) : null}
              <ChevronRight className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
