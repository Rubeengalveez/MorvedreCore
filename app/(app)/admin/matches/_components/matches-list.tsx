"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  MapPin,
  Pencil,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { isSafeMapsUrl } from "@/lib/domain/maps";
import {
  matchCompetitionLabels,
  matchListTab,
  matchStatusLabels,
  normalizeMatchSearch,
  type MatchListTab,
} from "@/lib/domain/admin-matches";
import type { Team } from "@/server/actions/admin";
import { matchActionClass, matchSecondaryClass, matchControlClass } from "./match-editor-fields";

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
  teams: Array<Team & { season_label: string }>;
  matches: MatchRow[];
  defaultTeamId: string | null;
  editableTeamIds?: string[];
}

const states: { id: MatchListTab; label: string }[] = [
  { id: "upcoming", label: "Por jugar" },
  { id: "played", label: "Jugados" },
  { id: "cancelled", label: "Cancelados" },
];
const matchDate = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Madrid",
});
const matchTime = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});
const monthDate = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});
const statusClass: Record<string, string> = {
  scheduled: "border-pool-deep/50 bg-blue-50 text-pool-deep",
  in_progress: "border-pool-deep bg-ball-gold text-pool-deep",
  played: "border-emerald-800 bg-emerald-50 text-emerald-900",
  cancelled: "border-red-800 bg-red-50 text-red-900",
  postponed: "border-amber-800 bg-amber-50 text-amber-900",
};

function MatchManagementCard({
  match,
  editable,
  returnTo,
}: {
  match: MatchRow;
  editable: boolean;
  returnTo: string;
}) {
  const date = new Date(match.scheduled_at);
  const home = match.is_home ? "Morvedre" : match.opponent;
  const away = match.is_home ? match.opponent : "Morvedre";
  const scored = match.final_score_us !== null && match.final_score_them !== null;
  const scoreHome = match.is_home ? match.final_score_us : match.final_score_them;
  const scoreAway = match.is_home ? match.final_score_them : match.final_score_us;
  const venue = match.location || match.pool_name;
  const played = match.status === "played";
  const cancelled = match.status === "cancelled";
  return (
    <article
      className="border-pool-deep/65 text-pool-deep overflow-hidden rounded-2xl border-2 bg-white shadow-sm"
      aria-label={`${match.team_label} contra ${match.opponent}`}
    >
      <header className="bg-pool-deep flex items-center justify-between gap-2 px-4 py-3 text-white">
        <time dateTime={match.scheduled_at} className="min-w-0 text-sm font-bold capitalize">
          {matchDate.format(date)}{" "}
          <span className="whitespace-nowrap">· {matchTime.format(date)}</span>
        </time>
        <span
          className={`shrink-0 rounded-lg border px-2 py-1 text-sm font-extrabold ${statusClass[match.status] ?? statusClass.scheduled}`}
        >
          {matchStatusLabels[match.status as keyof typeof matchStatusLabels] ?? "Programado"}
        </span>
      </header>
      <div className="grid gap-3 p-4">
        <div className="flex items-center justify-between gap-2 text-sm font-bold">
          <span className="border-pool-deep/55 rounded-lg border bg-blue-50 px-2 py-1">
            {match.team_label}
          </span>
          <span>
            {matchCompetitionLabels[
              match.competition_type as keyof typeof matchCompetitionLabels
            ] ?? match.competition_type}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-x-3 gap-y-1 text-center">
          <div className="min-w-0">
            <p
              aria-label={`Local: ${home}`}
              className="text-base leading-snug font-extrabold break-words"
            >
              {home}
            </p>
          </div>
          <span aria-hidden="true" className="self-center text-sm font-bold text-slate-500">
            {scored ? "" : "vs"}
          </span>
          <div className="min-w-0">
            <p
              aria-label={`Visitante: ${away}`}
              className="text-base leading-snug font-extrabold break-words"
            >
              {away}
            </p>
          </div>
          {scored && (
            <>
              <p
                aria-label={`Goles local: ${scoreHome}`}
                className="col-start-1 row-start-2 text-3xl font-extrabold tabular-nums"
              >
                {scoreHome}
              </p>
              <span
                aria-hidden="true"
                className="col-start-2 row-start-2 self-center text-slate-500"
              >
                –
              </span>
              <p
                aria-label={`Goles visitante: ${scoreAway}`}
                className="col-start-3 row-start-2 text-3xl font-extrabold tabular-nums"
              >
                {scoreAway}
              </p>
            </>
          )}
        </div>
        {venue &&
          (isSafeMapsUrl(match.maps_url) ? (
            <a
              href={match.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir ${venue} en Google Maps`}
              className="border-pool-deep/55 focus-visible:outline-pool-blue flex min-h-12 items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{venue}</span>
              <ChevronRight className="ml-auto h-5 w-5 shrink-0" aria-hidden="true" />
            </a>
          ) : (
            <p className="border-pool-deep/55 flex min-h-12 items-center gap-2 rounded-xl border bg-slate-100 px-3 py-2 text-sm font-semibold">
              <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="break-words">{venue}</span>
            </p>
          ))}
        <div className="flex items-stretch gap-2">
          <Link
            href={
              played || cancelled
                ? (`/matches/${match.id}` as Route)
                : (`/admin/matches/${match.id}?from=admin` as Route)
            }
            className={`${matchActionClass} min-h-12 flex-1 py-2`}
            aria-label={`${played || cancelled ? "Ver partido" : "Convocatoria"}: ${match.team_label} contra ${match.opponent}`}
          >
            <span>{played || cancelled ? "Ver partido" : "Convocatoria"}</span>
            <ChevronRight className="ml-auto h-5 w-5" aria-hidden="true" />
          </Link>
          {editable && (
            <Link
              href={
                `/admin/matches/${match.id}/editar?${new URLSearchParams({ from: "admin", returnTo })}` as Route
              }
              className={`${matchSecondaryClass} min-w-12 px-3`}
              aria-label={`Editar partido: ${match.team_label} contra ${match.opponent}`}
            >
              <Pencil className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only min-[360px]:not-sr-only">Editar</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function MatchesList({ teams, matches, editableTeamIds = [] }: MatchesListProps) {
  const params = useSearchParams();
  const requested = params.get("tab");
  const active = states.find((state) => state.id === requested)?.id ?? "all";
  const team = params.get("team") ?? "";
  const competition = params.get("competition") ?? "";
  const query = params.get("q") ?? "";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(12);
  const id = useId();
  const filterCount = Number(active !== "all") + Number(!!team) + Number(!!competition);
  function filter(key: string, value: string) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.history.replaceState(null, "", url);
    setLimit(12);
  }
  function clearFilters(includeSearch = false) {
    const url = new URL(window.location.href);
    ["tab", "team", "competition", ...(includeSearch ? ["q"] : [])].forEach((key) =>
      url.searchParams.delete(key),
    );
    window.history.replaceState(null, "", url);
    setLimit(12);
  }
  const terms = normalizeMatchSearch(query).split(/\s+/).filter(Boolean);
  const sorted = matches
    .filter((match) => {
      const searchable = normalizeMatchSearch(
        [
          "Morvedre",
          match.opponent,
          match.team_label,
          teams.find((item) => item.id === match.team_id)?.category_code ?? "",
          matchCompetitionLabels[match.competition_type as keyof typeof matchCompetitionLabels] ??
            "",
          matchStatusLabels[match.status as keyof typeof matchStatusLabels] ?? "",
          match.location ?? match.pool_name ?? "",
        ].join(" "),
      );
      return (
        (!team || match.team_id === team) &&
        (!competition || match.competition_type === competition) &&
        (active === "all" || matchListTab(match.status) === active) &&
        terms.every((term) => searchable.includes(term))
      );
    })
    .sort((a, b) =>
      active === "upcoming"
        ? Number(b.status === "in_progress") - Number(a.status === "in_progress") ||
          a.scheduled_at.localeCompare(b.scheduled_at)
        : b.scheduled_at.localeCompare(a.scheduled_at),
    );
  const grouped = new Map<string, MatchRow[]>();
  sorted.slice(0, limit).forEach((match) => {
    const month = monthDate.format(new Date(match.scheduled_at));
    grouped.set(month, [...(grouped.get(month) ?? []), match]);
  });
  return (
    <section className="grid gap-4" aria-label="Gestión de partidos">
      <div className="flex items-start gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={`${id}-search`} className="sr-only">
            Buscar partidos
          </label>
          <Search
            className="pointer-events-none absolute top-4 left-3 h-5 w-5 text-slate-600"
            aria-hidden="true"
          />
          <Input
            id={`${id}-search`}
            type="search"
            maxLength={100}
            placeholder="Rival, categoría…"
            value={query}
            onChange={(event) => filter("q", event.target.value)}
            className={`${matchControlClass} pr-12 pl-10 [&::-webkit-search-cancel-button]:appearance-none`}
          />
          {query && (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              onClick={() => filter("q", "")}
              className="text-pool-deep focus-visible:outline-pool-blue absolute top-1 right-0 flex h-12 w-12 items-center justify-center rounded-xl focus-visible:outline-2"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls={`${id}-filters`}
          aria-label={filterCount ? `Filtros: ${filterCount} activos` : "Filtros"}
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`focus-visible:outline-pool-blue flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-xl border-2 px-3 text-base font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 ${filterCount ? "border-pool-deep bg-pool-deep text-white" : filtersOpen ? "border-pool-deep text-pool-deep bg-blue-100" : "border-pool-deep/60 text-pool-deep bg-white"}`}
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          Filtros
          {filterCount > 0 && (
            <span
              aria-hidden="true"
              className="bg-ball-gold text-pool-deep flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-sm"
            >
              {filterCount}
            </span>
          )}
        </button>
      </div>
      <div
        id={`${id}-filters`}
        hidden={!filtersOpen}
        className="border-pool-deep/60 grid gap-3 rounded-2xl border-2 bg-white p-4"
      >
        <h2 className="text-pool-deep text-lg font-extrabold">Filtrar partidos</h2>
        <div>
          <label htmlFor={`${id}-status`} className="text-pool-deep mb-1.5 block text-sm font-bold">
            Estado
          </label>
          <Select
            id={`${id}-status`}
            value={active}
            onChange={(event) =>
              filter("tab", event.target.value === "all" ? "" : event.target.value)
            }
            className={matchControlClass}
          >
            <option value="all">Todos los partidos</option>
            {states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor={`${id}-team`} className="text-pool-deep mb-1.5 block text-sm font-bold">
            Equipo
          </label>
          <Select
            id={`${id}-team`}
            value={team}
            onChange={(event) => filter("team", event.target.value)}
            className={matchControlClass}
          >
            <option value="">Todos los equipos</option>
            {teams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label
            htmlFor={`${id}-competition`}
            className="text-pool-deep mb-1.5 block text-sm font-bold"
          >
            Competición
          </label>
          <Select
            id={`${id}-competition`}
            value={competition}
            onChange={(event) => filter("competition", event.target.value)}
            className={matchControlClass}
          >
            <option value="">Todas las competiciones</option>
            {Object.entries(matchCompetitionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {filterCount > 0 && (
          <button
            type="button"
            className={`${matchSecondaryClass} w-full`}
            onClick={() => clearFilters()}
          >
            Quitar filtros
          </button>
        )}
      </div>
      <p className="sr-only" role="status">
        {sorted.length} {sorted.length === 1 ? "partido encontrado" : "partidos encontrados"}
      </p>
      <div className="grid gap-4" aria-label="Partidos encontrados">
        {sorted.length === 0 ? (
          <div className="border-pool-deep/60 grid justify-items-center gap-3 rounded-2xl border-2 bg-white px-5 py-7 text-center">
            <CalendarDays className="text-pool-blue h-8 w-8" aria-hidden="true" />
            <h2 className="text-pool-deep text-xl font-extrabold">No encontramos partidos</h2>
            <p className="text-base text-slate-700">
              {query || filterCount
                ? "Prueba con otra búsqueda o cambia los filtros."
                : "Añade el próximo encuentro con Nuevo partido."}
            </p>
            {(query || filterCount > 0) && (
              <button
                type="button"
                className={matchSecondaryClass}
                onClick={() => clearFilters(true)}
              >
                Mostrar todos los partidos
              </button>
            )}
          </div>
        ) : (
          Array.from(grouped, ([month, rows]) => (
            <section key={month} className="grid gap-3">
              <h2 className="text-pool-deep text-base font-extrabold capitalize">{month}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {rows.map((match) => (
                  <li key={match.id}>
                    <MatchManagementCard
                      match={match}
                      editable={editableTeamIds.includes(match.team_id)}
                      returnTo={`/admin/matches${params.size ? `?${params}` : ""}`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        {sorted.length > limit && (
          <button
            type="button"
            className={`${matchSecondaryClass} w-full`}
            onClick={() => setLimit(limit + 12)}
          >
            Ver más partidos · {sorted.length - limit} pendientes de mostrar
          </button>
        )}
      </div>
    </section>
  );
}
