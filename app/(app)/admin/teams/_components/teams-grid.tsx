"use client";

import { useMemo, useState } from "react";
import { MdSearch } from "react-icons/md";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Select } from "@/components/ui/select";
import { Equipo } from "@/components/brand/pictograms";
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
  const [search, setSearch] = useState("");

  const teams = useMemo(() => {
    const base = teamsBySeason.get(filter) ?? [];
    const q = search.toLowerCase().trim();
    if (!q) return base;
    return base.filter(
      (t) => t.label.toLowerCase().includes(q) || (t.coachName ?? "").toLowerCase().includes(q),
    );
  }, [teamsBySeason, filter, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="season-filter" className="text-eyebrow text-ink-600">
            Temporada
          </label>
          <Select id="season-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
                {s.is_current ? " (actual)" : ""}
                {s.archived_at ? " (archivada)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="team-search" className="text-eyebrow text-ink-600">
            Buscar
          </label>
          <div className="relative">
            <MdSearch
              className="text-ink-600 pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="team-search"
              type="search"
              placeholder="Por nombre o entrenador"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="border-ink-300 bg-paper-card flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center">
          <PictogramBadge pictogram={Equipo} color="var(--pool-blue)" size="lg" />
          <p className="font-display text-pool-deep text-base font-extrabold">
            No hay equipos en esta temporada.
          </p>
          <p className="text-ink-600 max-w-sm text-sm">
            Crea el primer equipo para empezar a asignar jugadores.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <li key={t.id}>
              <a
                href={`/admin/teams/${t.id}`}
                data-team-card={t.id}
                className="group border-ink-300 bg-paper-card shadow-elev-1 hover:border-pool-blue hover:shadow-elev-3 focus-visible:ring-pool-blue focus-visible:ring-offset-paper flex h-full flex-col overflow-hidden rounded-md border transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <div
                  aria-hidden="true"
                  className="h-1.5 w-full"
                  style={{ backgroundColor: t.color }}
                />
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <PictogramBadge pictogram={Equipo} color={t.color} size="md" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <h3 className="font-display text-pool-deep line-clamp-2 text-lg leading-tight font-extrabold">
                        {t.label}
                      </h3>
                      <span className="text-eyebrow text-ink-600">{t.categoryLabel}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="border-ink-300 bg-paper-card text-eyebrow text-ink-700 inline-flex h-6 items-center rounded-sm border px-2">
                      {t.genderLabel}
                    </span>
                    {t.team_type === "school" ? (
                      <span className="bg-pool-foam text-eyebrow text-pool-deep inline-flex h-6 items-center rounded-sm px-2">
                        Escuela
                      </span>
                    ) : null}
                    <span className="bg-ink-300/30 text-eyebrow text-ink-900 inline-flex h-6 items-center rounded-sm px-2">
                      <span className="text-mono-num">{t.playerCount}</span>
                      <span className="tracking-flat text-ink-600 ml-1 normal-case">jugadores</span>
                    </span>
                  </div>
                  <div className="border-ink-300 text-ink-600 border-t pt-3 text-xs">
                    <Eyebrow as="span" className="text-ink-400">
                      Entrenador
                    </Eyebrow>
                    <p
                      className={
                        "mt-0.5 font-semibold" +
                        (t.coachName ? " text-pool-deep" : " text-ink-600 italic")
                      }
                    >
                      {t.coachName ?? "Sin asignar"}
                    </p>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
