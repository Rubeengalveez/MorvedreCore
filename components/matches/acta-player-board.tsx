"use client";

import { ActaPlayerName } from "./acta-player-name";
import { ActaQuarterMarks } from "./acta-quarter-marks";
import { playerTotals, type LiveSheet, type Side } from "@/lib/domain/live-match";
import { exclusionLimit } from "@/lib/domain/live-match-rules";
import {
  controlsParticipation,
  participantKey,
  playedPeriods,
  participantIsPlaying,
} from "@/lib/domain/live-match-participation";
import { validCapNumber } from "@/lib/domain/cap-number";

function sanctionStyle(count: number, red: boolean, limit: number) {
  if (red || count >= limit) return "bg-red-100 text-red-950";
  if (count === limit - 1) return "bg-orange-100 text-orange-950";
  if (count === 1) return "border border-[#a77600] bg-[#fff0bd] text-[#4e3600]";
  return "bg-white text-[#062048]";
}

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
      className="inline-flex items-center gap-1 text-xs font-medium"
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
        className={`grid ${isAway ? "grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]" : "grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"} gap-x-px overflow-hidden rounded-xl border border-[#062048] bg-[#062048]`}
      >
        {sides.map((side) => (
          <div
            key={side}
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
            return (
              <button
                data-acta-board-player
                key={`${side}-${cap}`}
                type="button"
                disabled={!playing}
                onClick={() => onPlayer(side, cap)}
                className={`h-[76px] min-w-0 gap-1 ${side === "them" ? "flex flex-row items-center justify-center" : "grid grid-cols-[32px_minmax(0,1fr)] items-center"} border-t border-[#062048] px-2 py-1 text-left enabled:active:brightness-95 ${sanctionStyle(totals.exclusions, totals.red, exclusionLimit(sheet))}`}
                aria-label={`${keeper ? "Portero de " : ""}${side === "us" ? "Morvedre" : "Rival"}, ${validCapNumber(cap) == null ? "sin gorro" : `gorro ${cap}`}${player ? `, ${player.name}` : ""}, ${keeper ? `${totals.saves} paradas, ${totals.conceded} goles encajados` : `${totals.goals} goles`}, ${totals.exclusions} de ${exclusionLimit(sheet)} expulsiones${totals.red ? ", roja" : ""}${out ? ", fuera" : ""}${keeper && cap === sheet.keeper ? ", portero en juego" : ""}`}
              >
                <span
                  className={`${side === "them" ? "flex items-center justify-center" : "contents"}`}
                >
                  <span
                    className={`flex shrink-0 flex-col items-center gap-1 ${side === "us" ? "col-start-1 row-span-2 row-start-1" : ""}`}
                  >
                    <strong
                      className={`relative grid shrink-0 place-items-center rounded-md border border-[#062048] tabular-nums ${controlsParticipation(sheet) ? "h-8 min-w-8 text-xl" : "h-10 min-w-8 text-2xl"} ${side === "us" ? "bg-[#062048] font-black text-white" : "bg-[#f4c430] font-black text-[#062048]"}`}
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
                    {controlsParticipation(sheet) && (
                      <ActaQuarterMarks
                        compact
                        played={playedPeriods(sheet, side, participantKey(sheet, side, cap))}
                        period={sheet.period}
                        current={
                          sheet.phase === "playing" && participantIsPlaying(sheet, side, cap)
                        }
                      />
                    )}
                  </span>
                  {player && (
                    <span className="relative col-start-2 row-start-1 min-w-0 overflow-hidden pr-3 pl-1 text-sm leading-tight font-semibold">
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
                    className={`flex min-w-0 flex-wrap items-center justify-center gap-1 text-center ${side === "them" ? "flex-row" : "flex-col"}`}
                  >
                    <strong className="text-xl leading-none font-bold tabular-nums">
                      {keeper ? `${totals.saves} / ${totals.conceded}` : totals.goals}
                    </strong>
                    <span className="text-xs leading-tight font-bold">
                      {keeper ? "Par. / Enc." : "Goles"}
                    </span>
                  </span>
                  <span
                    className={`flex min-w-0 flex-wrap items-center justify-center gap-1 text-center ${side === "them" ? "flex-row" : "flex-col"}`}
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
                    <span className="min-w-0 text-center text-xs leading-tight font-semibold">
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
