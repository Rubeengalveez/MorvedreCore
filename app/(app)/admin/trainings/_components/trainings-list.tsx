"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

import { TrainingBlockCard, type TrainingBlockCardProps } from "./training-block-card";
import { TrainingBlockFormSheet } from "./training-block-form-sheet";
import { TrainingScheduleFormSheet } from "./training-schedule-form-sheet";
import type { Season, Team, TrainingBlockRow, TrainingSessionRow } from "@/server/actions/admin";
import type { AttendancePlayer } from "./attendance-sheet";
import { MdEdit, MdSports } from "react-icons/md";

type TeamOption = Team & { season_label: string };

export interface TrainingsListProps {
  seasons: Season[];
  teams: TeamOption[];
  currentSeasonId: string | null;
  defaultTeamId: string | null;
  blocks: TrainingBlockRow[];
  sessionsByBlock: Record<string, TrainingSessionRow[]>;
  rosterByTeam: Record<string, AttendancePlayer[]>;
  attendanceBySession: Record<string, Record<string, { present: boolean; reason: string | null }>>;
}

export function TrainingsList({
  seasons,
  teams,
  currentSeasonId,
  defaultTeamId,
  blocks,
  sessionsByBlock,
  rosterByTeam,
  attendanceBySession,
}: TrainingsListProps) {
  const [filter, setFilter] = useState<string>(defaultTeamId ?? "");

  const filteredBlocks = useMemo(() => {
    if (!filter) return blocks;
    return blocks.filter((b) => b.team_id === filter);
  }, [blocks, filter]);

  const teamById = useMemo(() => {
    const map = new Map<string, TeamOption>();
    for (const t of teams) map.set(t.id, t);
    return map;
  }, [teams]);
  const nextSessions = useMemo(
    () => Object.values(sessionsByBlock).reduce((total, sessions) => total + sessions.length, 0),
    [sessionsByBlock],
  );
  const currentSeason = seasons.find((season) => season.id === currentSeasonId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <section className="bg-pool-deep text-paper relative overflow-hidden rounded-2xl p-4 shadow-elev-1">
        <span className="lane-pattern absolute inset-0 opacity-15" aria-hidden="true" />
        <div className="relative flex flex-col gap-4">
          <div>
            <p className="text-ball-gold text-xs font-extrabold tracking-[0.12em] uppercase">
              {currentSeason?.label ?? "Temporada actual"}
            </p>
            <h2 className="mt-1 text-xl font-extrabold">Planificación de entrenamientos</h2>
            <p className="text-paper/75 mt-1 text-sm">Aquí solo se trabaja con los equipos activos esta temporada.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="border-paper/15 bg-paper/10 rounded-xl border p-3">
              <p className="text-paper/70 text-xs font-bold">Horarios activos</p>
              <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums">{blocks.length}</p>
            </div>
            <div className="border-paper/15 bg-paper/10 rounded-xl border p-3">
              <p className="text-paper/70 text-xs font-bold">Próximas sesiones</p>
              <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums">{nextSessions}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-ink-200 bg-paper-card flex flex-col gap-2 rounded-2xl border p-3 shadow-elev-1">
        <label htmlFor="team-filter" className="text-pool-deep text-sm font-extrabold">
          Ver planificación de
        </label>
        <Select id="team-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todos los equipos activos</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.label}
            </option>
          ))}
        </Select>
        <p className="text-ink-500 text-xs font-semibold">No se muestran equipos de temporadas anteriores.</p>
      </div>

      {filteredBlocks.length === 0 ? (
        <div className="border-ink-300 bg-paper flex flex-col items-center gap-4 rounded-md border border-dashed p-8 text-center">
          <MdSports aria-hidden="true" className="text-pool-blue h-12 w-12" />
          <div className="flex flex-col gap-1">
            <p className="text-pool-deep text-base font-semibold">
              {filter ? "No hay bloques para este equipo." : "La piscina está tranquila."}
            </p>
            <p className="text-ink-600 text-sm">
              {filter
                ? "Crea un bloque de entrenamientos con el botón de arriba."
                : "Crea el primer bloque de entrenamientos para tu equipo."}
            </p>
          </div>
          <TrainingScheduleFormSheet
            seasons={seasons}
            teams={teams}
            defaultTeamId={defaultTeamId}
            defaultSeasonId={currentSeasonId}
            trigger={
              <Button size="md">
                <span className="hidden sm:inline">Crear horario semanal</span>
                <span className="sm:hidden">Crear horario</span>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredBlocks.map((b) => {
            const team = teamById.get(b.team_id);
            if (!team) return null;
            const cardProps: TrainingBlockCardProps = {
              block: {
                id: b.id,
                label: b.label,
                weekdays: b.weekdays,
                start_date: b.start_date,
                end_date: b.end_date,
                start_time: b.start_time,
                end_time: b.end_time,
                location: b.location,
                kind: b.kind,
              },
              team: { id: team.id, label: team.label, color: team.color },
              sessions: sessionsByBlock[b.id] ?? [],
              roster: rosterByTeam[b.team_id] ?? [],
              attendanceBySession: attendanceBySession,
              editAction: (
                <TrainingBlockFormSheet
                  teams={teams}
                  defaultTeamId={b.team_id}
                  defaultSeasonId={currentSeasonId}
                  initial={b}
                  trigger={
                    <Button type="button" variant="secondary" size="sm">
                      <MdEdit className="h-4 w-4" aria-hidden="true" />
                      Editar horario
                    </Button>
                  }
                />
              ),
            };
            return <TrainingBlockCard key={b.id} {...cardProps} />;
          })}
        </div>
      )}
    </div>
  );
}
