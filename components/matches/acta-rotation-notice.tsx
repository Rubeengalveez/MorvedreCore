"use client";

import { Moon, Play } from "lucide-react";
import { participants, rotationAdvice } from "@/lib/domain/live-match-participation";
import type { LiveSheet } from "@/lib/domain/live-match";

export function ActaRotationNotice({
  sheet,
  onStart,
  onReview,
}: {
  sheet: LiveSheet;
  onStart: () => void;
  onReview: () => void;
}) {
  return (
    <section
      aria-label="Avisos antes del cuarto 4"
      className="border-pool-deep/40 relative z-20 m-3 rounded-xl border bg-white p-3"
    >
      <h2 className="text-base font-extrabold">Antes del cuarto 4</h2>
      <p className="mt-1 text-sm text-slate-700">
        Último cuarto para que todos jueguen y descansen.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {(["us", "them"] as const).map((side) => {
          const advice = rotationAdvice(sheet, side, 4);
          const players = participants(sheet, side).sort((a, b) => a.cap - b.cap);
          return (
            <div key={side} className="min-w-0 space-y-2">
              <h3
                className={`rounded-md px-2 py-1 text-sm font-extrabold ${side === "us" ? "bg-pool-deep text-white" : "bg-ball-gold text-pool-deep"}`}
              >
                {side === "us" ? "Morvedre" : "Rival"}
              </h3>
              {(["rest", "play"] as const).map((kind) => {
                const list = players.filter((p) =>
                  advice.some((a) => a.key === p.key && a.kind === kind),
                );
                return list.length ? (
                  <div key={kind} className={kind === "rest" ? "text-red-900" : "text-amber-950"}>
                    <p className="flex items-center gap-1 text-xs font-extrabold">
                      {kind === "rest" ? (
                        <Moon size={14} aria-hidden="true" />
                      ) : (
                        <Play size={14} aria-hidden="true" />
                      )}
                      {kind === "rest" ? "Deben descansar" : "Deben jugar"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {list.map((p) => (
                        <span
                          key={p.key}
                          title={p.name}
                          className={`grid h-6 w-6 place-items-center rounded-md text-xs font-extrabold ${kind === "rest" ? "bg-red-100" : "bg-amber-100"}`}
                        >
                          {p.cap}
                          <span className="sr-only">: {p.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })}
              {advice.some((a) => a.kind === "missing") && (
                <p className="text-xs font-semibold text-amber-950">
                  Faltan datos de cuartos anteriores.
                </p>
              )}
              {!advice.length && (
                <p className="text-sm font-semibold text-emerald-800">Rotación al día</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onReview}
          className="border-pool-deep min-h-12 rounded-xl border-2 bg-white px-3 text-sm font-bold"
        >
          Ver nombres
        </button>
        <button
          type="button"
          onClick={onStart}
          className="bg-pool-deep min-h-12 min-w-0 flex-1 rounded-xl px-3 text-sm font-bold text-white"
        >
          Elegir jugadores del cuarto 4
        </button>
      </div>
    </section>
  );
}
