"use client";

import { useState } from "react";
import { Star, Shield, Award, Calendar, CircleDot, Flame } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { CapTile } from "@/components/ui/cap-tile";
import { TeamStaffList } from "@/components/team/team-staff-list";
import { EmptyTeamState } from "@/components/team/empty-team-state";
import { Balon } from "@/components/brand/pictograms";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { getTeamStaff } from "@/server/queries/teams";

interface RosterPlayer {
  player_id: string;
  full_name: string;
  photo_url: string | null;
  birth_year: number | null;
  cap_number: number | null;
  squad_number: number | null;
}

interface PlayerSnapshot {
  player_id: string;
  matches_played: number;
  matches_called: number;
  goals: number;
  exclusions: number;
  mvp_count: number;
  trainings_attended: number;
  trainings_total: number;
  attendance_pct: number;
  attendance_streak: number;
}

export interface TeamPlayersTabProps {
  roster: RosterPlayer[];
  teamColor: string;
  staff: Awaited<ReturnType<typeof getTeamStaff>>;
  snapshots: PlayerSnapshot[];
}

export function TeamPlayersTab({ roster, teamColor, staff, snapshots }: TeamPlayersTabProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<RosterPlayer | null>(null);
  const currentYear = new Date().getFullYear();

  const selectedStats = selectedPlayer
    ? snapshots.find((s) => s.player_id === selectedPlayer.player_id)
    : null;

  return (
    <>
      {staff.length > 0 ? <TeamStaffList staff={staff} teamColor={teamColor} /> : null}

      {roster.length === 0 ? (
        <EmptyTeamState
          title="Aún no hay plantilla"
          description="Cuando el admin dé de alta a los jugadores de este equipo, aparecerán aquí con su dorsal."
        />
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <Balon className="h-5 w-5" accent={teamColor} />
            <h2 className="font-display text-pool-deep text-lg font-extrabold">Plantilla</h2>
            <span className="text-ink-600 font-mono text-sm font-semibold">{roster.length}</span>
          </div>

          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {roster.map((player) => {
              const age = player.birth_year != null ? currentYear - player.birth_year : null;
              return (
                <li key={player.player_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlayer(player)}
                    className="border-ink-300 bg-paper hover:border-pool-blue hover:shadow-elev-2 focus-visible:ring-pool-blue flex w-full items-center gap-3 rounded-md border p-3 text-left transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]"
                  >
                    <Avatar src={player.photo_url} name={player.full_name} size={56} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-display text-pool-deep line-clamp-1 text-base font-extrabold">
                        {player.full_name}
                      </span>
                      <span className="text-ink-600 text-xs">
                        {age != null ? `${age} años` : "—"}
                      </span>
                    </div>
                    {player.squad_number != null ? (
                      <CapTile number={player.squad_number} teamColor={teamColor} size="md" />
                    ) : player.cap_number != null ? (
                      <CapTile number={player.cap_number} teamColor={teamColor} size="md" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Sheet Ficha de Jugador */}
      <Sheet
        open={selectedPlayer !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPlayer(null);
        }}
      >
        <SheetContent size="md" className="gap-0">
          {selectedPlayer ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedPlayer.photo_url}
                    name={selectedPlayer.full_name}
                    size={64}
                  />
                  <div className="flex flex-col">
                    <SheetTitle>{selectedPlayer.full_name}</SheetTitle>
                    <SheetDescription>Ficha Oficial de Jugador</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <SheetBody>
                <div className="flex flex-col gap-5">
                  {/* Datos Básicos */}
                  <div className="border-ink-300 bg-paper-card grid grid-cols-2 gap-3 rounded-md border p-4">
                    <div>
                      <span className="text-eyebrow text-ink-600">Dorsal</span>
                      <p className="font-display text-pool-deep mt-1 flex items-center gap-2 text-base font-extrabold">
                        <CapTile
                          number={selectedPlayer.squad_number ?? selectedPlayer.cap_number ?? 0}
                          teamColor={teamColor}
                          size="sm"
                        />
                        {selectedPlayer.squad_number ?? selectedPlayer.cap_number ?? "Sin asignar"}
                      </p>
                    </div>
                    <div>
                      <span className="text-eyebrow text-ink-600">Año de Nacimiento</span>
                      <p className="font-display text-pool-deep mt-1 text-base font-extrabold">
                        {selectedPlayer.birth_year ?? "—"}
                        {selectedPlayer.birth_year
                          ? ` (${currentYear - selectedPlayer.birth_year} años)`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {/* Estadísticas de Temporada */}
                  <div className="flex flex-col gap-2">
                    <h3 className="font-display text-ink-600 text-sm font-extrabold tracking-wider uppercase">
                      Rendimiento esta Temporada
                    </h3>
                    {selectedStats ? (
                      <div className="grid grid-cols-2 gap-2">
                        <StatBox
                          icon={Calendar}
                          label="Partidos"
                          value={`${selectedStats.matches_played} jugados`}
                          subValue={`Convocado: ${selectedStats.matches_called}`}
                        />
                        <StatBox
                          icon={CircleDot}
                          label="Goles"
                          value={selectedStats.goals}
                          subValue="Goles anotados"
                          valueColor="text-action"
                        />
                        <StatBox
                          icon={Shield}
                          label="Exclusiones"
                          value={selectedStats.exclusions}
                          subValue="Exclusiones totales"
                          valueColor="text-goggle-red"
                        />
                        <StatBox
                          icon={Award}
                          label="MVPs"
                          value={selectedStats.mvp_count}
                          subValue="Veces MVP del partido"
                          valueColor="text-brand-ball"
                        />
                        <StatBox
                          icon={Star}
                          label="Asistencia a Entrenos"
                          value={`${selectedStats.attendance_pct}%`}
                          subValue={`${selectedStats.trainings_attended} de ${selectedStats.trainings_total} entrenos`}
                        />
                        <StatBox
                          icon={Flame}
                          label="Racha actual"
                          value={`${selectedStats.attendance_streak}`}
                          subValue="Entrenamientos seguidos"
                          valueColor="text-action"
                        />
                      </div>
                    ) : (
                      <div className="border-ink-300 bg-paper-card text-ink-500 rounded border p-4 text-center text-xs italic">
                        Aún no se han registrado estadísticas esta temporada.
                      </div>
                    )}
                  </div>
                </div>
              </SheetBody>
              <SheetFooter className="flex-row gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setSelectedPlayer(null)}
                  className="w-full"
                >
                  Cerrar Ficha
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  subValue,
  valueColor = "text-pool-deep",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subValue: string;
  valueColor?: string;
}) {
  return (
    <div className="border-ink-300 bg-paper flex flex-col rounded border p-3 shadow-sm">
      <div className="text-ink-600 flex items-center gap-1.5">
        <Icon className="h-4 w-4" />
        <span className="text-eyebrow">{label}</span>
      </div>
      <p className={cn("font-display mt-1.5 text-xl leading-none font-extrabold", valueColor)}>
        {value}
      </p>
      <p className="text-ink-600 mt-1 text-[10px] leading-tight">{subValue}</p>
    </div>
  );
}
