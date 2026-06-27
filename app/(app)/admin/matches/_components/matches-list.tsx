"use client";

import { useMemo, useState } from "react";

import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import {
  formatLongDate,
  formatShortDate,
  formatTime,
} from "@/lib/utils/format";
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

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-brand-aqua/15 text-brand-deep",
  in_progress: "bg-warning/15 text-warning",
  played: "bg-success/15 text-success",
  cancelled: "bg-danger/15 text-danger",
  postponed: "bg-ink-300/40 text-ink-600",
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

export function MatchesList({
  seasons,
  teams,
  matches,
  defaultTeamId,
}: MatchesListProps) {
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
    () =>
      [...filtered].sort((a, b) =>
        a.scheduled_at.localeCompare(b.scheduled_at),
      ),
    [filtered],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="match-team-filter"
            className="text-sm font-semibold text-ink-600"
          >
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
                <optgroup
                  key={s.id}
                  label={`${s.label}${s.is_current ? " (actual)" : ""}`}
                >
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
          <label
            htmlFor="match-comp-filter"
            className="text-sm font-semibold text-ink-600"
          >
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
        className="flex gap-1 overflow-x-auto border-b border-ink-300"
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
                "relative h-12 shrink-0 px-4 font-display text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                isActive
                  ? "text-brand-blue"
                  : "text-ink-600 hover:text-brand-deep",
              )}
            >
              {t.label}
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-brand-blue"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink-300 bg-paper p-6 text-center">
          <p className="text-base font-semibold text-brand-deep">
            Calendario vacío.
          </p>
          <p className="mt-1 text-sm text-ink-600">
            Crea el primer partido desde la pestaña de equipos.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((m) => (
            <li key={m.id}>
              <a
                href={`/admin/matches/${m.id}`}
                className="group flex flex-col overflow-hidden rounded-md border border-ink-300 bg-paper transition-colors hover:border-brand-blue hover:bg-brand-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: m.team_color,
                }}
              >
                <div className="flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
                    <span className="font-mono font-semibold text-brand-deep">
                      {formatLongDate(m.scheduled_at).split(",")[0]}
                    </span>
                    <span>·</span>
                    <span className="font-mono font-semibold">
                      {formatTime(m.scheduled_at)}
                    </span>
                    <span
                      className={cn(
                        "ml-auto inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold",
                        STATUS_BADGE[m.status] ?? "border border-ink-300 text-ink-600",
                      )}
                    >
                      {STATUS_LABELS[m.status] ?? m.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-xl font-extrabold leading-tight text-brand-deep">
                      {m.is_home
                        ? `${m.team_label} vs ${m.opponent}`
                        : `${m.opponent} vs ${m.team_label}`}
                    </h3>
                    {m.status === "played" ? (
                      <span className="font-mono text-lg font-extrabold text-brand-deep">
                        {scoreLabel(m)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex h-6 items-center rounded-full border border-ink-300 px-2 text-[11px] font-semibold text-ink-600">
                      {COMPETITION_LABELS[m.competition_type] ?? m.competition_type}
                    </span>
                    {m.is_home ? (
                      <span className="inline-flex h-6 items-center rounded-full bg-brand-foam px-2 text-[11px] font-semibold text-brand-deep">
                        Local
                      </span>
                    ) : (
                      <span className="inline-flex h-6 items-center rounded-full bg-ink-300/40 px-2 text-[11px] font-semibold text-ink-600">
                        Visitante
                      </span>
                    )}
                    {m.pool_name ? (
                      <span className="text-xs text-ink-600">{m.pool_name}</span>
                    ) : null}
                    {m.location ? (
                      <span className="text-xs text-ink-600">· {m.location}</span>
                    ) : null}
                  </div>
                  <p className="sr-only">{formatShortDate(m.scheduled_at)}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
