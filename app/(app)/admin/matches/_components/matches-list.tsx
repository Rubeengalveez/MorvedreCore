"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Calendar, MapPin } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { isSafeMapsUrl } from "@/lib/domain/maps";
import { formatLongDate, formatShortDate, formatTime } from "@/lib/utils/format";
import type { Season, Team } from "@/server/actions/admin";

export interface MatchRow {
  id: string;
  team_id: string;
  team_label: string;
  team_color: string;
  opponent: string;
  competition_type: string;
  is_home: boolean;
  location: string | null;
  pool_name: string | null;
  maps_url: string | null;
  scheduled_at: string;
  status: string;
  final_score_us: number | null;
  final_score_them: number | null;
}

export interface MatchesListProps {
  seasons: Season[];
  teams: Array<Team & { season_label: string }>;
  matches: MatchRow[];
  defaultTeamId: string | null;
}

const COMPETITION_LABELS: Record<string, string> = {
  league: "Liga",
  cup: "Copa",
  tournament: "Torneo",
  friendly: "Amistoso",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Programado",
  in_progress: "En juego",
  played: "Jugado",
  cancelled: "Cancelado",
  postponed: "Aplazado",
};

const STATUS_BADGE_VARIANT: Record<string, "info" | "warning" | "success" | "danger" | "neutral"> =
  {
    scheduled: "info",
    in_progress: "warning",
    played: "success",
    cancelled: "danger",
    postponed: "neutral",
  };

type TabValue = "all" | "scheduled" | "played" | "cancelled";

const TABS: Array<{ value: TabValue; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "scheduled", label: "Programados" },
  { value: "played", label: "Jugados" },
  { value: "cancelled", label: "Cancelados" },
];

function scoreLabel(m: MatchRow): string {
  if (m.final_score_us == null || m.final_score_them == null) return "—";
  return `${m.final_score_us} - ${m.final_score_them}`;
}

export function MatchesList({ seasons, teams, matches, defaultTeamId }: MatchesListProps) {
  const [teamFilter, setTeamFilter] = useState<string>(defaultTeamId ?? "");
  const [competitionFilter, setCompetitionFilter] = useState<string>("");
  const [tab, setTab] = useState<TabValue>("all");

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (teamFilter && m.team_id !== teamFilter) return false;
      if (competitionFilter && m.competition_type !== competitionFilter) {
        return false;
      }
      if (tab === "all") return true;
      if (tab === "scheduled") {
        return m.status === "scheduled" || m.status === "in_progress" || m.status === "postponed";
      }
      if (tab === "played") return m.status === "played";
      if (tab === "cancelled") return m.status === "cancelled";
      return true;
    });
  }, [matches, teamFilter, competitionFilter, tab]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [filtered],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="match-team-filter" className="text-ink-600 text-sm font-semibold">
            Filtrar por equipo
          </label>
          <Select
            id="match-team-filter"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          >
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
        <div className="flex flex-col gap-2">
          <label htmlFor="match-comp-filter" className="text-ink-600 text-sm font-semibold">
            Competición
          </label>
          <Select
            id="match-comp-filter"
            value={competitionFilter}
            onChange={(e) => setCompetitionFilter(e.target.value)}
          >
            <option value="">Todas</option>
            {Object.entries(COMPETITION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Estado del partido"
        className="border-ink-300 flex gap-1 overflow-x-auto border-b"
      >
        {TABS.map((t) => {
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.value)}
              className={cn(
                "font-display focus-visible:ring-pool-blue focus-visible:ring-offset-paper relative h-12 shrink-0 px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                isActive ? "text-pool-blue" : "text-ink-600 hover:text-pool-deep",
              )}
            >
              {t.label}
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="bg-pool-blue absolute inset-x-3 bottom-0 h-[3px] rounded-full"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" aria-hidden="true" />}
          title="Calendario vacío"
          description="No hay partidos con estos filtros. Cuando el club programe uno, aparecerá aquí."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((m) => {
            const safeMaps = isSafeMapsUrl(m.maps_url);
            const statusVariant = STATUS_BADGE_VARIANT[m.status] ?? "neutral";
            return (
              <li key={m.id}>
                <Card variant="interactive" accentColor={m.team_color} className="group relative">
                  <div className="flex flex-col gap-2 p-4">
                    <div className="text-ink-600 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-pool-deep font-mono font-semibold">
                        {formatLongDate(m.scheduled_at).split(",")[0]}
                      </span>
                      <span>·</span>
                      <span className="font-mono font-semibold">{formatTime(m.scheduled_at)}</span>
                      <div className="ml-auto">
                        <StatusBadge variant={statusVariant} size="sm">
                          {STATUS_LABELS[m.status] ?? m.status}
                        </StatusBadge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-pool-deep text-xl leading-tight font-extrabold">
                        <Link
                          href={`/admin/matches/${m.id}` as Route}
                          className="focus-visible:ring-pool-blue before:absolute before:inset-0 before:rounded-2xl before:content-[''] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                          {m.is_home
                            ? `${m.team_label} vs ${m.opponent}`
                            : `${m.opponent} vs ${m.team_label}`}
                        </Link>
                      </h3>
                      {m.status === "played" ? (
                        <span className="text-pool-deep font-mono text-lg font-extrabold">
                          {scoreLabel(m)}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge variant="neutral" size="sm">
                        {COMPETITION_LABELS[m.competition_type] ?? m.competition_type}
                      </StatusBadge>
                      <StatusBadge variant={m.is_home ? "brand" : "neutral"} size="sm">
                        {m.is_home ? "Local" : "Visitante"}
                      </StatusBadge>
                      {m.pool_name ? (
                        <span className="text-ink-600 text-xs">{m.pool_name}</span>
                      ) : null}
                      {m.location ? (
                        <span className="text-ink-600 text-xs">· {m.location}</span>
                      ) : null}
                      {safeMaps ? (
                        <a
                          href={m.maps_url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Abrir ${m.location ?? m.pool_name ?? "la ubicación"} en Google Maps`}
                          className="text-pool-blue hover:text-pool-deep bg-pool-foam relative z-10 inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-extrabold transition-colors"
                        >
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          Mapa
                        </a>
                      ) : null}
                    </div>
                    <p className="sr-only">{formatShortDate(m.scheduled_at)}</p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
