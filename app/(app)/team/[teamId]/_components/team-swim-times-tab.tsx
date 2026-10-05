import type { Route } from "next";
import Link from "next/link";
import { ChevronRight, Plus, Timer } from "lucide-react";

import { TeamEmpty, TeamSection, teamPrimary } from "@/components/team/team-ui";
import { Avatar } from "@/components/ui/avatar";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { validCapNumber } from "@/lib/domain/cap-number";
import { formatSwimTime } from "@/lib/domain/swim-times";
import { getSwimTimeEntries } from "@/server/queries/swim-times";
import { teamNestedOrigin } from "@/lib/domain/team-navigation-origin";

interface RosterPlayer {
  player_id: string;
  full_name: string;
  photo_url: string | null;
  birth_year: number | null;
  cap_number: number | null;
  squad_number: number | null;
}

export interface TeamSwimTimesTabProps {
  teamId: string;
  context?: string;
  teamLabel: string;
  teamColor: string;
  isCoach: boolean;
  roster: RosterPlayer[];
}

export async function TeamSwimTimesTab({
  teamId,
  context = "",
  teamColor,
  isCoach,
  roster,
}: TeamSwimTimesTabProps) {
  const entries = await getSwimTimeEntries({ teamId });
  const historyParams = new URLSearchParams({ from: "team", teamId });
  for (const [key, value] of teamNestedOrigin(context)) historyParams.set(key, value);

  const latestByPlayer = new Map<
    string,
    { time50: number | null; time100: number | null; date: string }
  >();

  for (const entry of [...entries].sort((a, b) => b.test_date.localeCompare(a.test_date))) {
    const existing = latestByPlayer.get(entry.player_id);
    if (!existing) {
      latestByPlayer.set(entry.player_id, {
        time50: entry.time_50_cs,
        time100: entry.time_100_cs,
        date: entry.test_date,
      });
    } else {
      if (existing.time50 == null && entry.time_50_cs != null) {
        existing.time50 = entry.time_50_cs;
      }
      if (existing.time100 == null && entry.time_100_cs != null) {
        existing.time100 = entry.time_100_cs;
      }
    }
  }

  const playersWithTimes = roster.filter((p) => latestByPlayer.has(p.player_id));
  const playersWithoutTimes = roster.filter((p) => !latestByPlayer.has(p.player_id));

  return (
    <div className="flex flex-col gap-5">
      {isCoach ? (
        <Link
          href={`/team/${teamId}/swim-times${context ? `?${context}` : ""}` as Route}
          className={`${teamPrimary} justify-between p-4`}
        >
          <span className="flex items-center gap-3">
            <Timer className="h-6 w-6 shrink-0" aria-hidden="true" />
            Añadir tiempos de nado
          </span>
          <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}
      {playersWithTimes.length === 0 ? (
        <TeamEmpty
          title="Sin tiempos registrados"
          description={
            isCoach
              ? "Añade el primer control de nado del equipo."
              : "Aquí aparecerán los controles de nado del equipo."
          }
        />
      ) : (
        <TeamSection title="Últimos tiempos">
          <div className="space-y-3">
            {playersWithTimes.map((player) => {
              const data = latestByPlayer.get(player.player_id);
              const number = validCapNumber(player.squad_number ?? player.cap_number);
              return (
                <Link
                  key={player.player_id}
                  href={`/players/${player.player_id}/swim-times?${historyParams}` as Route}
                  className="border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue block rounded-xl border-2 bg-white p-3 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={player.photo_url}
                      name={player.full_name}
                      size={48}
                      teamColor={teamColor}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-base font-extrabold">
                        <AdaptivePlayerName name={player.full_name} />
                      </span>
                      <span className="text-sm font-medium">
                        {number != null ? `Gorro ${number}` : "Sin gorro"}
                      </span>
                    </div>
                    <ChevronRight className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { distance: 50, value: data?.time50 },
                      { distance: 100, value: data?.time100 },
                    ].map(({ distance, value }) => (
                      <span
                        key={distance}
                        className="border-pool-deep/65 rounded-lg border bg-blue-50 p-2 text-center text-sm font-bold tabular-nums"
                      >
                        {distance} m{" "}
                        <span className="ml-1 font-extrabold">
                          {value != null ? formatSwimTime(value) : "Sin marca"}
                        </span>
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </TeamSection>
      )}
      {playersWithoutTimes.length > 0 && playersWithTimes.length > 0 ? (
        <details className="border-pool-deep/65 text-pool-deep overflow-hidden rounded-2xl border-2 bg-white">
          <summary className="min-h-14 cursor-pointer p-4 text-base font-extrabold">
            Sin tiempos · {playersWithoutTimes.length}
          </summary>
          <ul className="space-y-2 px-4 pb-4">
            {playersWithoutTimes.map((player) => (
              <li key={player.player_id} className="rounded-lg bg-blue-50 px-3 py-2 font-semibold">
                <AdaptivePlayerName name={player.full_name} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
