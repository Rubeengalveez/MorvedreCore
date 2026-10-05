import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, MapPin } from "lucide-react";
import type { getTeamMatches } from "@/server/queries/teams";
import { getTeamMatchHref } from "@/lib/domain/match-navigation";

export type TeamMatch = Awaited<ReturnType<typeof getTeamMatches>>[number];

export function TeamMatchCard({
  match,
  teamId,
  tab,
  list,
  visibleCount,
  context,
}: {
  match: TeamMatch;
  teamId: string;
  tab: "principal" | "partidos";
  list?: "upcoming" | "played";
  visibleCount?: number;
  context?: string;
}) {
  const played = match.status === "played";
  const home = match.is_home ? "Morvedre" : match.opponent;
  const away = match.is_home ? match.opponent : "Morvedre";
  const us = match.final_score_us;
  const them = match.final_score_them;
  const result =
    us == null || them == null ? null : us > them ? "Victoria" : us < them ? "Derrota" : "Empate";
  const date = new Date(match.scheduled_at);
  const dateText = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(date);
  const timeText = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(date);
  const competition =
    (
      { league: "Liga", cup: "Copa", tournament: "Torneo", friendly: "Amistoso" } as Record<
        string,
        string
      >
    )[match.competition_type] ?? "Partido";
  return (
    <Link
      href={getTeamMatchHref(match.id, teamId, tab, list, visibleCount, context) as Route}
      className="border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue block overflow-hidden rounded-2xl border-2 bg-white focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <div className="bg-pool-deep flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-bold text-white">
        <time dateTime={match.scheduled_at}>{dateText}</time>
        {played ? (
          <span
            className={`shrink-0 rounded-lg border px-2 py-1 ${result === "Victoria" ? "border-emerald-900 bg-emerald-100 text-emerald-950" : result === "Derrota" ? "border-red-900 bg-red-50 text-red-950" : "text-pool-deep border-white bg-blue-50"}`}
          >
            {result ?? "Finalizado"}
          </span>
        ) : (
          <span className="shrink-0 text-base tabular-nums">{timeText}</span>
        )}
      </div>
      <div className="px-3 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-center">
          <div className="min-w-0">
            <p
              className="flex min-h-10 items-center justify-center text-base leading-5 font-extrabold"
              title={home}
            >
              <span className="line-clamp-2">{home}</span>
            </p>
            {played ? (
              <p className="mt-1 text-3xl font-extrabold tabular-nums">
                {match.is_home ? (us ?? "—") : (them ?? "—")}
              </p>
            ) : null}
          </div>
          <span className="font-bold text-slate-700" aria-hidden="true">
            {played ? "–" : "vs"}
          </span>
          <div className="min-w-0">
            <p
              className="flex min-h-10 items-center justify-center text-base leading-5 font-extrabold"
              title={away}
            >
              <span className="line-clamp-2">{away}</span>
            </p>
            {played ? (
              <p className="mt-1 text-3xl font-extrabold tabular-nums">
                {match.is_home ? (them ?? "—") : (us ?? "—")}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <span className="border-pool-deep/65 shrink-0 rounded-md border bg-blue-50 px-2 py-1">
            {competition}
          </span>
          {match.location ? (
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{match.location}</span>
            </span>
          ) : (
            <span className="flex-1">{match.is_home ? "En casa" : "Fuera de casa"}</span>
          )}
          <ChevronRight className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
