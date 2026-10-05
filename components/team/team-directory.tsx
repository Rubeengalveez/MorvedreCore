"use client";
import { useState } from "react";
import { ArrowRight, UsersRound } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { compareTeams } from "@/lib/domain/team-presentation";
import { teamSecondary, TeamCount, TeamEmpty } from "./team-ui";
import { cn } from "@/lib/utils/cn";

export interface DirectoryTeam {
  id: string;
  label: string;
  category_code: string;
  gender: string;
  color: string;
  playerCount: number;
  coachName: string | null;
  season_id?: string;
  relationship?: "player" | "coach" | "both" | null;
  familyPlayerNames?: string[];
}

export function TeamDirectory({
  teams,
  admin = false,
  defaultSeasonId = "",
}: {
  teams: DirectoryTeam[];
  admin?: boolean;
  defaultSeasonId?: string;
}) {
  const [mine, setMine] = useState(false);
  const hasMine = teams.some((team) => team.relationship || team.familyPlayerNames?.length);
  const visible = teams
    .filter(
      (team) =>
        (!admin || team.season_id === defaultSeasonId) &&
        (!mine || team.relationship || team.familyPlayerNames?.length),
    )
    .sort(compareTeams);
  return (
    <div className="space-y-4">
      {!admin ? (
        <div role="group" aria-label="Qué equipos ver" className="grid grid-cols-2 gap-2">
          {[
            { label: "Todos", value: false },
            { label: "Mis equipos", value: true },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={mine === item.value}
              onClick={() => setMine(item.value)}
              className={cn(
                teamSecondary,
                "min-h-14",
                mine === item.value ? "bg-pool-deep border-pool-deep text-white" : "bg-white",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-pool-deep text-xl font-extrabold">
          {mine ? "Tus equipos y familia" : admin ? "Equipos de la temporada" : "Equipos del club"}
        </h2>
        <span role="status">
          <TeamCount>{visible.length}</TeamCount>
        </span>
      </div>
      {visible.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((team) => (
            <li key={team.id} className="min-w-0">
              <Link
                href={`${admin ? "/admin/teams" : "/team"}/${team.id}` as Route}
                className="border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue flex h-full flex-col overflow-hidden rounded-2xl border-2 bg-white focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <div className="bg-pool-deep flex items-center gap-2 px-4 py-3 text-white">
                  <span
                    className="h-6 w-1 shrink-0 rounded-full border border-white/65"
                    style={{ backgroundColor: team.color }}
                    aria-hidden="true"
                  />
                  <h3 className="min-w-0 flex-1 text-lg leading-tight font-extrabold">
                    {team.label}
                  </h3>
                  {!admin && (team.relationship || team.familyPlayerNames?.length) ? (
                    <span
                      className="text-pool-deep shrink-0 rounded-lg border border-white/70 bg-blue-50 px-2 py-1 text-sm font-extrabold"
                      title={team.familyPlayerNames?.join(", ")}
                    >
                      {team.relationship === "both"
                        ? "Tu equipo"
                        : team.relationship === "coach"
                          ? "Entrenas aquí"
                          : team.relationship === "player"
                            ? "Juegas aquí"
                            : "Tu familia"}
                    </span>
                  ) : null}
                  <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <span className="shrink-0 font-semibold">Entrenador</span>
                    <span className="min-w-0 flex-1 font-bold">
                      <AdaptivePlayerName name={team.coachName ?? "Sin asignar"} />
                    </span>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-extrabold">
                    <UsersRound className="h-4 w-4" aria-hidden="true" />
                    {team.playerCount}
                    <span className="sr-only"> jugadores</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <TeamEmpty
          title="No hay equipos en esta selección"
          description={
            admin
              ? "Prueba otra búsqueda o cambia los filtros."
              : hasMine
                ? "Elige Todos para ver el resto del club."
                : "Tus equipos aparecerán aquí cuando tengas uno asignado."
          }
        />
      )}
    </div>
  );
}
