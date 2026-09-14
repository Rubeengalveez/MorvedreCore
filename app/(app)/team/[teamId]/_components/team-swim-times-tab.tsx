import type { Route } from "next";
import Link from "next/link";
import { ChevronRight, Plus, Timer, Waves } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { formatSwimTime } from "@/lib/domain/swim-times";
import { getSwimTimeEntries } from "@/server/queries/swim-times";

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
  teamLabel: string;
  teamColor: string;
  isCoach: boolean;
  roster: RosterPlayer[];
}

export async function TeamSwimTimesTab({
  teamId,
  teamLabel,
  teamColor,
  isCoach,
  roster,
}: TeamSwimTimesTabProps) {
  const entries = await getSwimTimeEntries({ teamId });

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
          href={`/team/${teamId}/swim-times` as Route}
          className="bg-pool-deep text-paper hover:bg-pool-blue flex min-h-16 touch-manipulation items-center justify-between gap-3 rounded-2xl p-4 font-extrabold shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="bg-pool-foam/20 text-paper flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
              <Timer className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <span className="block text-base sm:text-lg">Añadir tiempos de nado</span>
              <span className="text-paper/80 block text-xs sm:text-sm font-semibold">
                Tiempos de 50 m o 100 m para {teamLabel}
              </span>
            </div>
          </div>
          <span className="bg-paper text-pool-deep flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold">
            <Plus className="h-5 w-5" aria-hidden="true" />
          </span>
        </Link>
      ) : null}

      {playersWithTimes.length === 0 ? (
        <div className="border-ink-200 bg-paper-card text-ink-500 flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed px-5 text-center text-sm">
          <Waves className="mb-2 h-7 w-7 text-ink-400" aria-hidden="true" />
          <p className="font-bold text-ink-700 text-base">Sin tiempos registrados aún</p>
          <p className="mt-1 text-ink-500 max-w-xs">
            {isCoach
              ? "Usa el botón de arriba para registrar las primeras marcas del equipo."
              : "El entrenador aún no ha registrado controles de natación para este equipo."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-pool-deep font-extrabold text-sm uppercase tracking-wider">
              Tiempos del equipo ({playersWithTimes.length})
            </h3>
          </div>

          <div className="border-ink-200 bg-paper-card divide-ink-200 flex flex-col divide-y rounded-2xl border shadow-sm">
            {playersWithTimes.map((player) => {
              const data = latestByPlayer.get(player.player_id);
              const number = player.cap_number ?? player.squad_number;
              return (
                <Link
                  key={player.player_id}
                  href={`/players/${player.player_id}/swim-times?from=team&teamId=${teamId}` as Route}
                  className="hover:bg-pool-foam/30 flex min-h-16 items-center justify-between gap-3 p-3.5 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      src={player.photo_url}
                      name={player.full_name}
                      size={44}
                      teamColor={teamColor}
                    />
                    <div className="min-w-0">
                      <p className="text-ink-900 truncate font-extrabold text-base">
                        {player.full_name}
                      </p>
                      {number != null ? (
                        <p className="text-ink-500 text-xs font-semibold">Gorro #{number}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-0.5 text-right">
                      {data?.time50 != null ? (
                        <span className="text-pool-deep font-black text-sm sm:text-base tabular-nums">
                          50m: <span className="text-ink-900">{formatSwimTime(data.time50)}</span>
                        </span>
                      ) : null}
                      {data?.time100 != null ? (
                        <span className="text-pool-deep font-black text-sm sm:text-base tabular-nums">
                          100m: <span className="text-ink-900">{formatSwimTime(data.time100)}</span>
                        </span>
                      ) : null}
                    </div>
                    <ChevronRight className="h-5 w-5 text-ink-400" aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>

          {playersWithoutTimes.length > 0 ? (
            <div className="mt-2 px-1">
              <p className="text-ink-500 text-xs font-bold">
                Sin tiempos registrados ({playersWithoutTimes.length}):{" "}
                <span className="font-normal">
                  {playersWithoutTimes.map((p) => p.full_name).join(", ")}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
