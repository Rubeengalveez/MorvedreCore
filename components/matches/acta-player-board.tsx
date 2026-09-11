"use client";

import { ActaPlayerName } from "./acta-player-name";
import { playerTotals, type LiveSheet, type Side } from "@/lib/domain/live-match";

function sanctionStyle(count: number, red: boolean) {
  if (red || count >= 3) return "bg-red-100 text-red-950";
  if (count === 2) return "bg-orange-100 text-orange-950";
  if (count === 1) return "bg-amber-50 text-amber-950";
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
}: {
  sheet: LiveSheet;
  playing: boolean;
  onPlayer: (side: Side, cap: number) => void;
}) {
  const own = [...sheet.players].sort((a, b) => a.cap - b.cap);
  const rival = [...sheet.opponentCaps].sort((a, b) => a - b);
  return (
    <section aria-label="Goles y expulsiones por jugador" className="bg-white px-2 py-3 sm:px-3">
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-x-px overflow-hidden rounded-xl border border-[#062048] bg-[#062048]">
        {(["us", "them"] as const).map((side) => (
          <div
            key={side}
            className={`flex min-h-11 flex-wrap items-center justify-center gap-x-2 px-1 py-2 ${side === "us" ? "bg-[#062048] text-white" : "bg-[#f4c430] text-[#062048]"}`}
          >
            <h2 className="text-base font-bold">{side === "us" ? "Morvedre" : "Rival"}</h2>
            <CoachCard sheet={sheet} side={side} />
          </div>
        ))}
        {Array.from({ length: Math.max(own.length, rival.length) }, (_, index) =>
          (["us", "them"] as const).map((side) => {
            const cap = side === "us" ? own[index]?.cap : rival[index];
            if (cap === undefined) return <div key={`${side}-${index}`} />;
            const player = side === "us" ? own[index] : undefined;
            const totals = playerTotals(sheet, side, cap);
            const keeper = side === "us" && (cap === 1 || cap === 13 || cap === sheet.keeper);
            const out = totals.red || totals.exclusions >= 3;
            return (
              <button
                key={`${side}-${cap}`}
                type="button"
                disabled={!playing}
                onClick={() => onPlayer(side, cap)}
                className={`min-h-[76px] min-w-0 gap-1 ${side === "them" ? "flex flex-row items-center justify-center" : "grid grid-cols-[32px_minmax(0,1fr)] items-center"} border-t border-[#062048] px-2 py-1 text-left enabled:active:brightness-95 ${sanctionStyle(totals.exclusions, totals.red)}`}
                aria-label={`${keeper ? "Portero de " : ""}${side === "us" ? "Morvedre" : "Rival"}, gorro ${cap}${player ? `, ${player.name}` : ""}, ${keeper ? `${totals.saves} paradas, ${totals.conceded} goles encajados` : `${totals.goals} goles`}, ${totals.exclusions} de 3 expulsiones${totals.red ? ", roja" : ""}${out ? ", fuera" : ""}${keeper && cap === sheet.keeper ? ", portero en juego" : ""}`}
              >
                <span
                  className={`${side === "them" ? "flex items-center justify-center" : "contents"}`}
                >
                  <strong
                    className={`grid shrink-0 place-items-center rounded-md tabular-nums ${side === "us" ? "col-start-1 row-start-1 row-span-2 h-10 min-w-8 border border-[#062048] bg-[#062048] text-2xl font-black text-white" : "h-10 min-w-8 border border-[#062048] bg-[#f4c430] text-2xl font-black text-[#062048]"}`}
                  >
                    {cap}
                  </strong>
                  {player && (
                    <span className="col-start-2 row-start-1 min-w-0 overflow-hidden pl-1 text-sm leading-tight font-semibold">
                      <ActaPlayerName name={player.name} />
                      {keeper && cap === sheet.keeper && (
                        <span
                          className="ml-1 inline-block h-2 w-2 rounded-full bg-blue-600"
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
                    aria-label={`${totals.exclusions} de 3 expulsiones`}
                  >
                    <span className="flex h-5 items-center justify-center gap-1" aria-hidden="true">
                      {[1, 2, 3].map((n) => (
                        <span
                          key={n}
                          className={`h-2.5 w-2.5 rounded-full border ${n <= totals.exclusions ? "border-current bg-current" : "border-slate-400 bg-white"}`}
                        />
                      ))}
                    </span>
                    <span className="min-w-0 text-xs leading-tight font-semibold text-center">
                      <span className="whitespace-nowrap">{totals.exclusions}/3</span>{out ? <span className="block">Fuera</span> : side === "us" ? " exp." : ""}
                    </span>
                  </span>
                </span>
              </button>
            );
          }),
        )}
      </div>
    </section>
  );
}
