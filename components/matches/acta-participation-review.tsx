"use client";

import { useState } from "react";
import { Check, Moon, Pencil } from "lucide-react";
import { ActaFlowSheet } from "./acta-flow-sheet";
import { ActaPlayerName } from "./acta-player-name";
import {
  lineupFor,
  participants,
  playedPeriods,
  participantIsPlaying,
  rotationAdvice,
} from "@/lib/domain/live-match-participation";
import type { LiveSheet, Side } from "@/lib/domain/live-match";
import type { Participation } from "@/lib/domain/live-match-rules";

export function ActaParticipationReview({
  sheet,
  onClose,
  onCorrect,
  onReplacement,
  onRoster,
}: {
  sheet: LiveSheet;
  onClose: () => void;
  onCorrect: (period: number) => void;
  onReplacement: (change: Participation["changes"][number]) => void;
  onRoster: () => void;
}) {
  const [side, setSide] = useState<Side>("us");
  const advice =
    sheet.period === 3 && sheet.phase === "break" ? rotationAdvice(sheet, side, 4) : [];
  return (
    <ActaFlowSheet
      scrollKey={side}
      onClose={onClose}
      context="Participación"
      title="Cuartos jugados"
      controls={
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Equipo que revisas">
            {(["us", "them"] as const).map((team) => (
              <button
                key={team}
                type="button"
                aria-pressed={side === team}
                onClick={() => setSide(team)}
                className={`min-h-12 rounded-xl border-2 text-base font-bold ${side === team ? (team === "us" ? "border-pool-deep bg-pool-deep text-white" : "border-pool-deep bg-ball-gold text-pool-deep") : team === "them" ? "border-pool-deep text-pool-deep bg-amber-50" : "border-pool-deep text-pool-deep bg-white"}`}
              >
                {team === "us" ? "Morvedre" : "Rival"}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 text-base font-bold">
            <span className="shrink-0">Corregir</span>
            <div className="grid w-full grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((quarter) => (
                <button
                  key={quarter}
                  type="button"
                  disabled={quarter > sheet.period}
                  aria-label={`Corregir cuarto ${quarter}`}
                  onClick={() => onCorrect(quarter)}
                  className="border-pool-deep text-pool-deep flex min-h-12 items-center justify-center gap-1 rounded-lg border bg-white font-bold disabled:opacity-40"
                >
                  {quarter}
                  <Pencil size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      }
      footer={
        side === "them" ? (
          <button
            type="button"
            onClick={onRoster}
            className="border-pool-deep text-pool-deep min-h-12 w-full rounded-xl border-2 bg-amber-50 px-3 text-base font-bold"
          >
            Revisar gorros del rival
          </button>
        ) : undefined
      }
    >
      <div className="border-pool-deep overflow-hidden rounded-xl border-2">
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-base"
          aria-label={`Participación de ${side === "us" ? "Morvedre" : "Rival"}`}
        >
          <colgroup>
            <col className="w-9" />
            {side === "us" && <col />}
            {[1, 2, 3, 4].map((p) => (
              <col key={p} className={side === "us" ? "w-8" : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr
              className={side === "us" ? "bg-pool-deep text-white" : "bg-ball-gold text-pool-deep"}
            >
              <th scope="col" className="rounded-tl-lg py-3">
                Nº
              </th>
              {side === "us" && (
                <th scope="col" className="text-left">
                  Jugador
                </th>
              )}
              {[1, 2, 3, 4].map((p) => (
                <th key={p} scope="col" className="py-3 last:rounded-tr-lg">
                  {p}º
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participants(sheet, side)
              .sort((a, b) => a.cap - b.cap)
              .map((player, index) => {
                const hint = advice.find((a) => a.key === player.key);
                return (
                  <tr
                    key={player.key}
                    className={`[&>*]:border-pool-deep [&>*]:border-t ${index % 2 ? (side === "us" ? "bg-blue-50" : "bg-amber-50") : "bg-white"}`}
                  >
                    <th
                      scope="row"
                      className="text-pool-deep h-14 text-center font-extrabold"
                      title={hint?.message}
                    >
                      {player.cap}
                    </th>
                    {side === "us" && (
                      <td className="min-w-0 pr-2 font-semibold">
                        <ActaPlayerName name={player.name} />
                      </td>
                    )}
                    {[1, 2, 3, 4].map((period) => {
                      const known = Boolean(lineupFor(sheet, side, period));
                      const played = playedPeriods(sheet, side, player.key).includes(period);
                      const current =
                        sheet.period <= 4 &&
                        sheet.period === period &&
                        sheet.phase === "playing" &&
                        participantIsPlaying(sheet, side, player.cap);
                      return (
                        <td
                          key={period}
                          className="text-center"
                          aria-label={`Cuarto ${period}: ${current ? "Jugando ahora" : known ? (played ? "Jugó" : "Descansó") : "Sin datos"}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`mx-auto grid h-7 w-7 place-items-center rounded-md border ${current ? "border-pool-blue bg-pool-blue text-white" : !known ? "border-transparent text-slate-600" : played ? "border-slate-500 bg-slate-200 text-slate-800" : "border-transparent bg-white text-slate-600"}`}
                          >
                            {!known ? "·" : played ? <Check size={20} /> : <Moon size={18} />}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {advice
        .filter((a) => a.kind === "missing")
        .map((a) => (
          <p
            key={a.key}
            className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-950"
          >
            {a.message}
          </p>
        ))}
      {sheet.participation?.changes
        .filter((c) => c.side === side)
        .map((change) => {
          const options = participants(sheet, change.side);
          return (
            <button
              key={change.id}
              type="button"
              onClick={() => onReplacement(change)}
              className="border-pool-blue/70 mt-3 flex min-h-12 w-full items-center gap-3 rounded-xl border bg-white p-3 text-left text-sm"
            >
              <span className="min-w-0 flex-1">
                <strong className="block">Sustitución · cuarto {change.period}</strong>
                <ActaPlayerName
                  name={`${options.find((p) => p.key === change.outgoing)?.name ?? "Jugador"} → ${options.find((p) => p.key === change.incoming)?.name ?? "Jugador"}`}
                />
              </span>
              <Pencil size={18} className="shrink-0" aria-hidden="true" />
            </button>
          );
        })}
    </ActaFlowSheet>
  );
}
