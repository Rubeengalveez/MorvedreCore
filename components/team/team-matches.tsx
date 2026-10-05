"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TeamMatchCard, type TeamMatch } from "./team-match-card";
import { TeamCount, teamSecondary } from "./team-ui";

export function TeamMatches({
  teamId,
  upcoming,
  played,
  initialList,
  initialCount = 5,
  context,
}: {
  teamId: string;
  upcoming: TeamMatch[];
  played: TeamMatch[];
  initialList?: string;
  initialCount?: number;
  context?: string;
}) {
  return (
    <div className="space-y-4">
      <MatchGroup
        key={`upcoming-${initialList}-${initialCount}`}
        teamId={teamId}
        context={context}
        title="Por jugar"
        matches={upcoming}
        list="upcoming"
        defaultOpen={initialList !== "played"}
        initialCount={initialList === "upcoming" ? initialCount : 5}
      />
      <MatchGroup
        key={`played-${initialList}-${initialCount}`}
        teamId={teamId}
        context={context}
        title="Resultados"
        matches={played}
        list="played"
        defaultOpen={initialList === "played"}
        initialCount={initialList === "played" ? initialCount : 5}
      />
    </div>
  );
}

function MatchGroup({
  teamId,
  title,
  matches,
  list,
  defaultOpen,
  initialCount,
  context,
}: {
  teamId: string;
  title: string;
  matches: TeamMatch[];
  list: "upcoming" | "played";
  defaultOpen: boolean;
  initialCount: number;
  context?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [limit, setLimit] = useState(initialCount);
  const id = `team-matches-${list}`;
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className="bg-pool-deep border-pool-deep focus-visible:outline-pool-blue flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 text-left text-xl font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span className="flex-1">{title}</span>
          <TeamCount>{matches.length}</TeamCount>
          <ChevronDown aria-hidden="true" className={`h-5 w-5 ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      <div id={id} hidden={!open} className="mt-3 space-y-3">
        {matches.length ? (
          <ul className="space-y-3">
            {matches.slice(0, limit).map((match) => (
              <li key={match.id}>
                <TeamMatchCard
                  match={match}
                  teamId={teamId}
                  context={context}
                  tab="partidos"
                  list={list}
                  visibleCount={limit}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-pool-deep/65 text-pool-deep rounded-xl border-2 bg-white p-4 font-semibold">
            {list === "upcoming" ? "No hay partidos programados." : "Todavía no hay resultados."}
          </p>
        )}
        {matches.length > limit ? (
          <button
            type="button"
            className={`${teamSecondary} w-full`}
            onClick={() => setLimit(limit + 5)}
          >
            Ver {Math.min(5, matches.length - limit)} más · {matches.length - limit} restantes
          </button>
        ) : null}
        {limit > 5 ? (
          <button type="button" className={`${teamSecondary} w-full`} onClick={() => setLimit(5)}>
            Mostrar solo los primeros 5
          </button>
        ) : null}
      </div>
    </section>
  );
}
