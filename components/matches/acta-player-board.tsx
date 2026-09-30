"use client";

import { ActaPlayerName } from "./acta-player-name";
import { ActaQuarterMarks } from "./acta-quarter-marks";
import { actaSanctionStyle } from "./acta-sanction-style";
import { playerTotals, type LiveSheet, type Side } from "@/lib/domain/live-match";
import { exclusionLimit } from "@/lib/domain/live-match-rules";
import {
  controlsParticipation,
  participantKey,
  playedPeriods,
  participantIsPlaying,
} from "@/lib/domain/live-match-participation";
import { validCapNumber } from "@/lib/domain/cap-number";

function CoachCard({ sheet, side }: { sheet: LiveSheet; side: Side }) {
  const cards = sheet.events.filter(
    (event) => !event.deleted && event.side === side && event.kind.startsWith("coach_"),
  );
  if (!cards.length) return null;
  const red = cards.some((event) => event.kind === "coach_red");
  const label = `Entrenador ${side === "us" ? "Morvedre" : "rival"}: ${red ? "roja, fuera" : "amarilla"}`;
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1 text-sm font-medium"
    >
      <span
        aria-hidden="true"
        className={`h-3.5 w-2.5 rounded-sm ${red ? "bg-red-600" : "bg-amber-400"}`}
      />
      Entr.
    </span>
  );
}

export function ActaPlayerBoard({
  sheet,
  playing,
  onPlayer,
  isAway = false,
  children,
}: {
  sheet: LiveSheet;
  playing: boolean;
  onPlayer: (side: Side, cap: number) => void;
  isAway?: boolean;
  children?: React.ReactNode;
}) {
  const own = sheet.players.filter((p) => !p.retired).sort((a, b) => a.cap - b.cap);
  const rival = [...sheet.opponentCaps].sort((a, b) => a - b);
  const sides = isAway ? (["them", "us"] as const) : (["us", "them"] as const);
  return (
    <section
      aria-label="Jugadores y estadísticas del partido"
      className="bg-white px-2 py-3 sm:px-3"
    >
      <div
        data-acta-board-grid
        className={`grid ${isAway ? "grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]" : "grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"} gap-x-px overflow-hidden rounded-xl border border-[#062048] bg-[#062048]`}
      >
        {sides.map((side) => (
          <div
            key={side}
            data-acta-board-heading
            className={`flex min-h-11 flex-wrap items-center justify-center gap-x-2 px-1 py-2 ${side === "us" ? "bg-[#062048] text-white" : "bg-[#f4c430] text-[#062048]"}`}
          >
            <h2 className="text-base font-bold">{side === "us" ? "Morvedre" : "Rival"}</h2>
            <CoachCard sheet={sheet} side={side} />
          </div>
        ))}
        {Array.from({ length: Math.max(own.length, rival.length) }, (_, index) =>
          sides.map((side) => {
            const cap = side === "us" ? own[index]?.cap : rival[index];
            if (cap === undefined) return <div key={`${side}-${index}`} />;
            const player = side === "us" ? own[index] : undefined;
            const totals = playerTotals(sheet, side, cap);
            const keeper = side === "us" && (cap === 1 || cap === 13 || cap === sheet.keeper);
            const out = totals.red || totals.exclusions >= exclusionLimit(sheet);
            const sanction = actaSanctionStyle(
              totals.exclusions,
              totals.red,
              exclusionLimit(sheet),
            );
            return (
              <button
                data-acta-board-player
                key={`${side}-${cap}`}
                type="button"
                disabled={!playing}
                onClick={() => onPlayer(side, cap)}
                className={`relative h-20 min-w-0 gap-1 ${side === "them" ? "flex flex-row flex-wrap items-center justify-center" : "grid grid-cols-[2rem_minmax(0,1fr)] items-center"} border-t border-[#062048] px-1.5 py-1 text-left ${controlsParticipation(sheet) ? (side === sides[0] ? "pl-5" : "pr-5") : ""} enabled:active:brightness-95`}
                style={{ backgroundColor: sanction.backgroundColor, color: sanction.color }}
                aria-label={`${keeper ? "Portero de " : ""}${side === "us" ? "Morvedre" : "Rival"}, ${validCapNumber(cap) == null ? "sin gorro" : `gorro ${cap}`}${player ? `, ${player.name}` : ""}, ${keeper ? `${totals.saves} paradas, ${totals.conceded} goles encajados` : `${totals.goals} goles`}, ${totals.exclusions} de ${exclusionLimit(sheet)} expulsiones${totals.red ? ", roja" : ""}${out ? ", fuera" : ""}${keeper && cap === sheet.keeper ? ", portero en juego" : ""}`}
              >
                {controlsParticipation(sheet) && (
                  <span
                    data-acta-quarter-rail
                    className={`absolute top-1/2 -translate-y-1/2 ${side === sides[0] ? "left-0" : "right-0"}`}
                  >
                    <ActaQuarterMarks
                      edge
                      played={playedPeriods(sheet, side, participantKey(sheet, side, cap))}
                      period={sheet.period}
                      current={sheet.phase === "playing" && participantIsPlaying(sheet, side, cap)}
                    />
                  </span>
                )}
                <span
                  data-acta-player-team
                  aria-hidden="true"
                  className={`hidden ${side === "us" ? "bg-pool-deep text-white" : "bg-ball-gold text-pool-deep"}`}
                >
                  {side === "us" ? "Morvedre" : "Rival"}
                </span>
                <span
                  className={`${side === "them" ? "flex items-center justify-center" : "contents"}`}
                >
                  <span
                    className={`flex shrink-0 flex-col items-center gap-0.5 ${side === "us" ? "col-start-1 row-span-2 row-start-1" : ""}`}
                  >
                    <strong
                      className={`relative grid h-10 min-w-8 shrink-0 place-items-center rounded-md border border-[#062048] text-2xl tabular-nums ${side === "us" ? "bg-[#062048] font-black text-white" : "bg-[#f4c430] font-black text-[#062048]"}`}
                    >
                      {validCapNumber(cap) ?? "—"}
                      {out && (
                        <span
                          className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-xs"
                          title={
                            totals.red
                              ? "Expulsado por tarjeta roja"
                              : `Fuera por ${exclusionLimit(sheet)} expulsiones`
                          }
                        >
                          <span aria-hidden="true">✕</span>
                          <span className="sr-only">Fuera</span>
                        </span>
                      )}
                    </strong>
                  </span>
                  {player && (
                    <span
                      className={`relative col-start-2 row-start-1 min-w-0 overflow-hidden pl-1 text-sm leading-tight font-semibold ${keeper && cap === sheet.keeper ? "pr-3" : ""}`}
                    >
                      <ActaPlayerName name={player.name} />
                      {keeper && cap === sheet.keeper && (
                        <span
                          className="absolute top-1/2 right-0 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-600"
                          title="En juego"
                        >
                          <span className="sr-only">En juego</span>
                        </span>
                      )}
                    </span>
                  )}
                </span>
                <span
                  className={`grid items-center gap-1 ${side === "them" ? "min-w-0 flex-1 grid-cols-1" : "col-start-2 row-start-2 min-w-0 grid-cols-2"}`}
                >
                  <span
                    className={`flex min-w-0 items-center justify-center gap-1 text-center ${side === "them" ? "flex-row" : "flex-col"}`}
                  >
                    <strong className="text-xl leading-none font-bold tabular-nums">
                      {keeper ? `${totals.saves} / ${totals.conceded}` : totals.goals}
                    </strong>
                    <span className="text-sm leading-tight font-bold whitespace-nowrap">
                      {keeper ? "Par/Enc" : "Goles"}
                    </span>
                  </span>
                  <span
                    className={`flex min-w-0 flex-col items-center justify-center text-center ${side === "them" ? "gap-0" : "gap-1"}`}
                    aria-label={`${totals.exclusions} de ${exclusionLimit(sheet)} expulsiones`}
                  >
                    <span className="flex h-5 items-center justify-center gap-1" aria-hidden="true">
                      {Array.from({ length: exclusionLimit(sheet) }, (_, i) => i + 1).map((n) => (
                        <span
                          key={n}
                          className={`h-2.5 w-2.5 rounded-full border ${n <= totals.exclusions ? "border-current bg-current" : "border-slate-400 bg-white"}`}
                        />
                      ))}
                    </span>
                    <span className="min-w-0 text-center text-sm leading-tight font-semibold">
                      <span className="whitespace-nowrap">
                        {totals.exclusions}/{exclusionLimit(sheet)}
                        {side === "us" ? " exp." : ""}
                      </span>
                    </span>
                  </span>
                </span>
              </button>
            );
          }),
        )}
      </div>
      {children}
    </section>
  );
}
