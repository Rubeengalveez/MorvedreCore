import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { TeamStaffList } from "@/components/team/team-staff-list";
import { EmptyTeamState } from "@/components/team/empty-team-state";
import type { getTeamStaff } from "@/server/queries/teams";

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
  staff: Awaited<ReturnType<typeof getTeamStaff>>;
}

export function TeamPlayersTab({ teamId, roster, teamColor, staff }: TeamPlayersTabProps) {
  const currentYear = new Date().getFullYear();

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
          <ul className="border-ink-200 bg-paper-card divide-ink-200 divide-y overflow-hidden rounded-2xl border shadow-sm">
            {roster.map((player) => {
              const age = player.birth_year != null ? currentYear - player.birth_year : null;
              const number = player.squad_number ?? player.cap_number;
              return (
                <li key={player.player_id}>
                  <Link
                    href={`/team/${teamId}/players/${player.player_id}` as Route}
                    className="group hover:bg-pool-foam/45 focus-visible:ring-pool-blue flex min-h-[76px] touch-manipulation items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
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
                      <p className="text-ink-500 mt-0.5 text-xs">
                        {age != null ? `${age} años` : "Edad no disponible"}
                      </p>
                    </div>
                    {number != null ? (
                      <span className="bg-pool-deep text-paper flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl px-2 font-mono text-lg font-extrabold tabular-nums">
                        {number}
                      </span>
                    ) : null}
                    <ChevronRight
                      className="text-ink-400 group-hover:text-pool-blue h-5 w-5 shrink-0 transition-colors"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
