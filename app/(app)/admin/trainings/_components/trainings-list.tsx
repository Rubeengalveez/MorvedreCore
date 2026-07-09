"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

import { TrainingBlockCard, type TrainingBlockCardProps } from "./training-block-card";
import { TrainingBlockFormSheet } from "./training-block-form-sheet";
import type { Season, Team, TrainingBlockRow, TrainingSessionRow } from "@/server/actions/admin";
import type { AttendancePlayer } from "./attendance-sheet";
import { MdSports } from "react-icons/md";

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="team-filter" className="text-ink-600 text-sm font-semibold">
          Filtrar por equipo
        </label>
        <Select id="team-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todos los equipos</option>
          {seasons.map((s) => {
            const seasonTeams = teams.filter((t) => t.season_id === s.id);
            if (seasonTeams.length === 0) return null;
            return (
              <optgroup key={s.id} label={`${s.label}${s.is_current ? " (actual)" : ""}`}>
                {seasonTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </Select>
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
          <TrainingBlockFormSheet
            seasons={seasons}
            teams={teams}
            defaultTeamId={defaultTeamId}
            defaultSeasonId={currentSeasonId}
            trigger={
              <Button size="md">
                <span className="hidden sm:inline">Nuevo bloque</span>
                <span className="sm:hidden">Nuevo</span>
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
            };
            return <TrainingBlockCard key={b.id} {...cardProps} />;
          })}
        </div>
      )}
    </div>
  );
}
