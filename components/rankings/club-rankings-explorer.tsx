"use client";

import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  LocateFixed,
  Search,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { ClubRankingEntry, ClubRankingPodium } from "./club-ranking-entries";
import {
  clubRankingMetrics,
  emptyRankingStats,
  rankClubStats,
  type ClubRankingRow,
  type RankingSubject,
  type RankingsView,
} from "@/lib/domain/club-rankings";
import { CATEGORY_LABELS, CATEGORY_COLORS, type CategoryCode } from "@/lib/domain/categories";
import {
  computeSwimLegends,
  computeSwimRanking,
  formatSwimTime,
  normalizeSearchTerm,
} from "@/lib/domain/swim-times";
import type { ClubRankingsData } from "@/server/queries/club-rankings";
import { cn } from "@/lib/utils/cn";

const control =
  "border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue min-h-12 w-full min-w-0 rounded-xl border-2 bg-white px-3 text-sm font-extrabold focus-visible:outline-2";
const categories: CategoryCode[] = [
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "absoluto",
  "escuela",
];
const paths = { season: "/rankings", streaks: "/streaks", legends: "/legends" };

export function ClubRankingsExplorer({
  data,
  view,
  myId,
  canViewAttendance = false,
}: {
  data: ClubRankingsData;
  view: RankingsView;
  myId: string;
  canViewAttendance?: boolean;
}) {
  const params = useSearchParams();
  const subject: RankingSubject =
    view !== "legends" && params.get("subject") === "teams" ? "teams" : "players";
  const metrics = useMemo(
    () => clubRankingMetrics(view, subject, canViewAttendance),
    [view, subject, canViewAttendance],
  );
  const legacyMetric =
    params.get("type") === "goals_consec"
      ? "goalRun"
      : params.get("type") === "mvp_consec"
        ? "mvpRun"
        : params.get("metric") === "goal_contributions"
          ? "contributions"
          : params.get("metric") === "swim"
            ? params.get("distance") === "100"
              ? "swim100"
              : "swim50"
            : params.get("metric") === "mvp_count"
              ? "mvp"
              : params.get("metric") === "matches_played"
                ? "matches"
                : params.get("metric");
  const active = metrics.find((m) => m.id === legacyMetric) ?? metrics[0]!;
  const scope = params.get("scope") ?? "all";
  const category = scope.startsWith("category:") ? scope.slice(9) : "";
  const team = view !== "legends" && scope.startsWith("team:") ? scope.slice(5) : "";
  const scopeLabel = category
    ? (CATEGORY_LABELS[category as CategoryCode] ?? "Club")
    : team
      ? (data.teams.find((t) => t.id === team)?.name ?? "Club")
      : "Club";
  const order = params.get("order") === "best" ? "best" : "current";
  const swimMode = view === "legends" || params.get("mode") === "best" ? "best" : "latest";
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClubRankingRow | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [jumpId, setJumpId] = useState<string | null>(null);
  const rankings = useMemo(() => {
    const people =
      subject === "teams" ? data.teams : team ? (data.playersByTeam[team] ?? []) : data.players;
    const entries: Record<string, ClubRankingRow[]> = {};
    for (const metric of metrics) {
      if (metric.id.startsWith("swim")) {
        const distance = metric.id === "swim100" ? 100 : 50;
        const swim =
          view === "legends"
            ? computeSwimLegends({
                entries: data.swim,
                distance,
                category: (category as CategoryCode) || null,
              })
            : computeSwimRanking({
                entries: data.swim,
                distance,
                mode: swimMode,
                teamId: team || null,
              });
        const byId = new Map(data.players.map((p) => [p.id, p]));
        let previous: number | null = null;
        let position = 0;
        entries[metric.id] = swim
          .map((row) => {
            const identity =
              byId.get(row.player_id) ??
              emptyRankingStats({
                id: row.player_id,
                name: row.full_name,
                photo: row.photo_url,
                category: row.category_code,
                color: row.category_code ? CATEGORY_COLORS[row.category_code] : "#1657a8",
                teamIds: [row.team_id],
              });
            const person =
              view === "legends"
                ? {
                    ...identity,
                    category: row.category_code,
                    color: row.category_code ? CATEGORY_COLORS[row.category_code] : "#1657a8",
                  }
                : identity;
            return { row, person };
          })
          .filter(({ person }) => !category || person.category === category)
          .map(({ row, person }, index) => {
            if (previous !== row.time_cs) position = index + 1;
            previous = row.time_cs;
            return {
              id: view === "legends" ? `swim-${row.id}` : row.player_id,
              person,
              position,
              value: row.time_cs,
              display: formatSwimTime(row.time_cs),
              unit: metric.unit,
              details: [
                new Intl.DateTimeFormat("es-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(new Date(`${row.test_date}T12:00:00Z`)),
                view === "legends"
                  ? row.season_label
                  : swimMode === "best"
                    ? "Mejor marca"
                    : "Última marca",
              ],
            };
          });
      } else
        entries[metric.id] = rankClubStats(people, metric, {
          subject,
          view,
          order,
          category,
          team,
        });
    }
    return entries;
  }, [data, view, subject, category, team, order, swimMode, metrics]);
  const allRows = rankings[active.id] ?? [];
  const term = normalizeSearchTerm(search);
  const rows = term
    ? allRows.filter((r) =>
        normalizeSearchTerm(
          `${r.person.name} ${r.person.category ? CATEGORY_LABELS[r.person.category] : ""}`,
        ).includes(term),
      )
    : allRows;
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const requestedPage = Number(params.get("page"));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, totalPages)
      : 1;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const previousPage = useRef(page);
  const podium =
    page === 1 && !term && pageRows.slice(0, 3).every((r) => r.value > 0) && pageRows.length >= 3
      ? pageRows.slice(0, 3)
      : [];
  const list = pageRows.slice(podium.length);
  const me = subject === "players" ? allRows.find((r) => r.person.id === myId) : undefined;
  function change(values: Record<string, string>, reset = true) {
    const next = new URLSearchParams(params.toString());
    if (reset) {
      next.delete("page");
      setSearch("");
    }
    next.delete("type");
    next.delete("distance");
    next.set("metric", active.id);
    for (const [key, value] of Object.entries(values)) next.set(key, value);
    window.history.replaceState(null, "", `${paths[view]}?${next.toString()}`);
  }
  function changePage(nextPage: number) {
    change({ page: String(nextPage) }, false);
  }
  useEffect(() => {
    if (previousPage.current !== page)
      document
        .getElementById("ranking-list-start")
        ?.scrollIntoView({ block: "start", behavior: "instant" });
    previousPage.current = page;
  }, [page]);
  useEffect(() => {
    if (!jumpId) return;
    const node = document.getElementById(`ranking-player-${jumpId}`);
    if (node) {
      node.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      node.focus({ preventScroll: true });
    }
  }, [jumpId, page]);
  const summaryRows = selected
    ? metrics.flatMap((metric) => {
        const row = rankings[metric.id]?.find((r) => r.person.id === selected.person.id);
        return row ? [{ metric, row }] : [];
      })
    : [];
  return (
    <div className="flex flex-col gap-3">
      {view !== "legends" && (
        <div role="group" aria-label="Jugadores o equipos" className="grid grid-cols-2 gap-2">
          {(["players", "teams"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={subject === value}
              onClick={() =>
                change({
                  subject: value,
                  metric: clubRankingMetrics(view, value, canViewAttendance)[0]!.id,
                })
              }
              className={cn(
                control,
                "flex items-center justify-center gap-2",
                subject === value && "border-pool-deep bg-pool-deep text-white",
              )}
            >
              {value === "players" ? (
                <Trophy className="h-4 w-4" aria-hidden="true" />
              ) : (
                <UsersRound className="h-4 w-4" aria-hidden="true" />
              )}
              {value === "players" ? "Jugadores" : "Equipos"}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_9rem] gap-2">
        <label className="text-pool-deep flex min-w-0 flex-col gap-1 text-xs font-bold">
          {view === "streaks" ? "Tipo de racha" : "Clasificación"}
          <select
            value={active.id}
            onChange={(e) => change({ metric: e.target.value })}
            className={control}
          >
            {metrics.map((m) => (
              <option key={m.id} value={m.id}>
                {(
                  {
                    attendance: "Asistencia",
                    trainingRun: "Asistencia seguida",
                    winPercent: "% de victorias",
                    goalsAverage: "Goles / partido",
                    contributions: "Goles + asist.",
                    swim50: "Nado · 50 m",
                    swim100: "Nado · 100 m",
                    goalDifference: "Balance de goles",
                    goalRun: "Marcando",
                    assistRun: "Asistiendo",
                    mvpRun: "Como MVP",
                    braceRun: "2 goles o más",
                    contributionRun: "Goles o asist.",
                    saveRun: "Con paradas",
                  } as Record<string, string>
                )[m.id] ?? m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-pool-deep flex min-w-0 flex-col gap-1 text-xs font-bold">
          Categoría
          <select
            value={team ? scope : category ? `category:${category}` : "all"}
            onChange={(e) => change({ scope: e.target.value })}
            className={control}
          >
            <option value="all">Todo el club</option>
            {categories
              .filter(
                (c) =>
                  data.players.some((p) => p.category === c) ||
                  data.teams.some((t) => t.category === c),
              )
              .map((c) => (
                <option value={`category:${c}`} key={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            {team && <option value={scope}>{scopeLabel}</option>}
          </select>
        </label>
      </div>
      {view === "streaks" && (
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Orden de las rachas">
          {(["current", "best"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={order === value}
              onClick={() => change({ order: value })}
              className={cn(control, order === value && "border-pool-blue bg-blue-50")}
            >
              {value === "current" ? "Racha actual" : "Mejor racha"}
            </button>
          ))}
        </div>
      )}
      {active.id.startsWith("swim") && view !== "legends" && (
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Marca de nado">
          {(["best", "latest"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={swimMode === value}
              onClick={() => change({ mode: value })}
              className={cn(control, swimMode === value && "border-pool-blue bg-blue-50")}
            >
              {value === "best" ? "Mejor marca" : "Última marca"}
            </button>
          ))}
        </div>
      )}
      {me && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            change(
              {
                page: String(
                  Math.floor(allRows.findIndex((r) => r.person.id === myId) / pageSize) + 1,
                ),
              },
              false,
            );
            setJumpId(null);
            requestAnimationFrame(() => setJumpId(me.id));
          }}
          className="border-pool-deep text-pool-deep focus-visible:outline-pool-blue flex min-h-14 items-center gap-3 rounded-xl border-2 bg-amber-50 px-3 text-left focus-visible:outline-2"
        >
          <LocateFixed className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-sm font-extrabold">
            Tu puesto <span className="ml-1 text-lg tabular-nums">{me.position}.</span>
          </span>
          <span className="text-sm font-extrabold tabular-nums">
            {me.display} <span className="text-xs">{me.unit}</span>
          </span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-pool-deep min-w-0 text-lg font-extrabold">{active.label}</h2>
        <button
          type="button"
          aria-label="Cómo se calcula esta clasificación"
          onClick={() => setInfoOpen(true)}
          className="text-pool-blue border-pool-deep/65 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white focus-visible:outline-2"
        >
          <Info className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {podium.length > 0 && (
        <ClubRankingPodium
          rows={podium}
          myId={myId}
          team={subject === "teams"}
          onOpen={setSelected}
        />
      )}
      <label
        id="ranking-list-start"
        className="border-pool-deep/65 text-pool-deep focus-within:ring-pool-blue flex min-h-12 scroll-mt-24 items-center gap-2 rounded-xl border-2 bg-white px-3 focus-within:ring-2 focus-within:ring-offset-2"
      >
        <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="sr-only">{subject === "teams" ? "Buscar equipo" : "Buscar jugador"}</span>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            change({ page: "1" }, false);
          }}
          placeholder={subject === "teams" ? "Buscar categoría o equipo" : "Buscar jugador"}
          className="min-h-12 min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
        />
        {search && (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            onClick={() => setSearch("")}
            className="-mr-2 flex h-12 w-12 items-center justify-center rounded-lg focus-visible:outline-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </label>
      <div className="text-pool-deep flex items-center justify-between gap-2 px-1 text-sm font-bold">
        <span>
          {rows.length}{" "}
          {subject === "teams"
            ? "equipos"
            : view === "legends" && active.id.startsWith("swim")
              ? "marcas"
              : "jugadores"}
        </span>
        <span className="border-pool-deep/65 rounded-lg border bg-white px-2 py-1">
          {scopeLabel}
        </span>
      </div>
      {list.length > 0 && (
        <ol className="flex flex-col gap-2.5" aria-label="Clasificación completa">
          {list.map((row) => (
            <li key={row.id}>
              <ClubRankingEntry
                row={row}
                team={subject === "teams"}
                isMe={row.person.id === myId}
                onOpen={() => setSelected(row)}
              />
            </li>
          ))}
        </ol>
      )}
      {rows.length === 0 && (
        <section className="border-pool-deep/65 text-pool-deep rounded-2xl border-2 bg-white p-6 text-center">
          <Trophy className="text-pool-blue mx-auto mb-3 h-9 w-9" aria-hidden="true" />
          <h3 className="text-lg font-extrabold">
            {search ? "No encontramos ese nombre" : "Todavía no hay datos suficientes"}
          </h3>
          <p className="mt-2 text-sm font-semibold">
            {search ? "Prueba con su nombre o apellido." : active.explanation}
          </p>
        </section>
      )}
      {totalPages > 1 && (
        <nav
          aria-label="Páginas de la clasificación"
          className="grid grid-cols-2 items-center gap-2"
        >
          <span
            role="status"
            className="text-pool-deep col-span-2 text-center text-sm font-extrabold"
          >
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            aria-label="Página anterior"
            disabled={page === 1}
            onClick={() => changePage(page - 1)}
            className="text-pool-deep border-pool-deep/65 flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 bg-white px-3 font-extrabold focus-visible:outline-2 disabled:bg-slate-100 disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            Anterior
          </button>
          <button
            type="button"
            aria-label="Página siguiente"
            disabled={page === totalPages}
            onClick={() => changePage(page + 1)}
            className="border-pool-deep bg-pool-deep disabled:text-pool-deep flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 px-3 font-extrabold text-white focus-visible:outline-2 disabled:bg-slate-100 disabled:opacity-50"
          >
            Siguiente
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      )}
      <ActaGuardSheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        context={`${scopeLabel} · ${view === "legends" ? "Histórico" : data.season.label}`}
        title={selected?.person.name ?? "Resumen"}
        description="Puestos y estadísticas de esta clasificación."
        icon="saved"
        actions={[]}
        tall
        body={
          selected && (
            <div className="text-pool-deep flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {subject === "players" ? (
                  <Avatar
                    src={selected.person.photo}
                    name={selected.person.name}
                    size={64}
                    teamColor={selected.person.color}
                    style={{ backgroundColor: "#eff6ff", color: "#0A2E5C" }}
                  />
                ) : (
                  <UsersRound className="h-10 w-10" aria-hidden="true" />
                )}
                <div>
                  <span className="border-pool-deep/65 rounded-lg border bg-blue-50 px-2 py-1 text-sm font-extrabold">
                    {selected.person.category ? CATEGORY_LABELS[selected.person.category] : "Club"}
                  </span>
                  <p className="mt-2 text-sm font-semibold">
                    {subject === "teams"
                      ? `${selected.person.wins} V · ${selected.person.draws} E · ${selected.person.losses} D`
                      : `${selected.person.matches} partidos con registro`}
                  </p>
                </div>
              </div>
              <div className="border-pool-deep/65 grid grid-cols-2 gap-2 rounded-xl border bg-blue-50 p-3 text-center text-sm font-semibold">
                {selected.details.map((detail, index) => (
                  <span key={index}>{detail}</span>
                ))}
              </div>
              <h3 className="text-base font-extrabold">
                {view === "streaks"
                  ? "Todas sus rachas"
                  : view === "legends"
                    ? "Sus mejores puestos"
                    : "Sus puestos"}
              </h3>
              <div className="flex flex-col gap-2">
                {summaryRows.map(({ metric, row }) => (
                  <button
                    type="button"
                    key={metric.id}
                    aria-label={`${metric.label}: puesto ${row.position}, ${row.display} ${row.unit}`}
                    onClick={() => {
                      setSelected(null);
                      change({ metric: metric.id });
                    }}
                    className="border-pool-deep/65 focus-visible:outline-pool-blue flex min-h-14 items-center gap-3 rounded-xl border-2 bg-white px-3 text-left focus-visible:outline-2"
                  >
                    <strong className="min-w-10 shrink-0 text-center text-lg tabular-nums">
                      {row.position}.
                    </strong>
                    <span className="min-w-0 flex-1 text-sm font-bold">
                      {metric.id === "attendance" ? "Asistencia" : metric.label}
                    </span>
                    <span className="shrink-0 text-lg font-extrabold tabular-nums">
                      {row.display}
                      {["shooting", "winPercent", "attendance"].includes(metric.id) ? " %" : ""}
                    </span>
                    <ChevronRight className="text-pool-blue h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
              {selected.person.teamIds[0] && subject === "players" && (
                <Link
                  href={
                    `/team/${selected.person.teamIds[0]}/players/${selected.person.id}?from=rankings&returnTo=${encodeURIComponent(`${paths[view]}?${params.toString()}`)}` as Route
                  }
                  className="bg-pool-deep border-pool-deep focus-visible:outline-pool-blue flex min-h-14 items-center justify-center rounded-xl border-2 px-3 text-base font-extrabold text-white focus-visible:outline-2"
                >
                  Ver ficha deportiva
                </Link>
              )}
            </div>
          )
        }
      />
      <ActaGuardSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        context="Cómo se calcula"
        title={active.label}
        description="Origen de los datos y reglas de clasificación."
        icon="saved"
        actions={[]}
        body={
          <div className="text-pool-deep grid gap-3">
            <p className="border-pool-deep/65 rounded-xl border-2 bg-white p-3 font-semibold">
              {active.explanation}
            </p>
            <p className="border-pool-deep/65 rounded-xl border bg-blue-50 p-3 text-sm font-semibold">
              La búsqueda conserva los puestos originales; los filtros de categoría recalculan la
              clasificación.
            </p>
            <p className="text-sm font-semibold">
              PJ: partidos jugados. G/P: goles por partido. A/P: asistencias por partido.
            </p>
            <div className="border-pool-deep/65 rounded-xl border bg-blue-50 p-3 text-sm font-semibold">
              <p>
                {data.actaCount} partidos con registro completo · {data.legacyCount} partidos con
                estadísticas anteriores
              </p>
              {view === "legends" && (
                <p className="mt-2">
                  {data.archivedSeasons} temporadas archivadas + temporada actual
                </p>
              )}
              {!active.id.startsWith("swim") && (
                <p className="mt-2">
                  Los partidos en curso no cuentan. La tanda de penaltis suma goles, tiros y
                  paradas. Los promedios usan los partidos en los que el jugador figura en el
                  registro.
                </p>
              )}
              {view === "streaks" && (
                <p className="mt-2">
                  Racha actual: hasta su último partido o entrenamiento registrado. Mejor racha: la
                  mayor secuencia de la temporada.
                </p>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}
