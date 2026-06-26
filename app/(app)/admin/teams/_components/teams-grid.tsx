"use client";

import { useMemo, useState } from "react";

import { Select } from "@/components/ui/select";
import type { Season, Team } from "@/server/actions/admin";

export interface TeamCardData extends Team {
  playerCount: number;
  coachName: string | null;
  categoryLabel: string;
  genderLabel: string;
}

export interface TeamsGridProps {
  seasons: Season[];
  teamsBySeason: Map<string, TeamCardData[]>;
  defaultSeasonId: string;
}

export function TeamsGrid({ seasons, teamsBySeason, defaultSeasonId }: TeamsGridProps) {
  const [filter, setFilter] = useState<string>(defaultSeasonId);

  const teams = useMemo(() => {
    return teamsBySeason.get(filter) ?? [];
  }, [teamsBySeason, filter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="season-filter"
          className="text-sm font-semibold text-ink-600"
        >
          Filtrar por temporada
        </label>
        <Select
          id="season-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
              {s.is_current ? " (actual)" : ""}
              {s.archived_at ? " (archivada)" : ""}
            </option>
          ))}
        </Select>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink-300 bg-paper p-6 text-center">
          <p className="text-base font-semibold text-brand-deep">
            No hay equipos en esta temporada.
          </p>
          <p className="mt-1 text-sm text-ink-600">
            Crea el primer equipo con el botón de arriba.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {teams.map((t) => (
            <li key={t.id}>
              <a
                href={`/admin/teams/${t.id}`}
                className="group flex flex-col overflow-hidden rounded-md border border-ink-300 bg-paper transition-colors hover:border-brand-blue hover:bg-brand-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <div
                  aria-hidden="true"
                  className="h-2 w-full"
                  style={{ backgroundColor: t.color }}
                />
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-xl font-extrabold leading-tight text-brand-deep">
                      {t.label}
                    </h3>
                    <span className="rounded-full border border-ink-300 px-2 py-0.5 text-xs font-semibold text-ink-600">
                      {t.categoryLabel}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-ink-600">
                    <span className="inline-flex h-6 items-center rounded-full bg-brand-foam px-2 font-semibold text-brand-deep">
                      {t.genderLabel}
                    </span>
                    {t.team_type === "school" ? (
                      <span className="inline-flex h-6 items-center rounded-full bg-brand-foam px-2 font-semibold text-brand-deep">
                        Escuela
                      </span>
                    ) : null}
                    <span className="inline-flex h-6 items-center rounded-full bg-ink-300/40 px-2 font-mono text-ink-900">
                      {t.playerCount} jugadores
                    </span>
                  </div>
                  <p
                    className={
                      "text-sm leading-relaxed text-ink-600" +
                      (t.coachName ? "" : " italic")
                    }
                  >
                    {t.coachName
                      ? `Entrenador: ${t.coachName}`
                      : "Sin entrenador asignado"}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
