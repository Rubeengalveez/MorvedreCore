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
      className="border-pool-deep text-pool-deep relative z-20 m-3 rounded-xl border-2 bg-white p-3"
    >
      <h2 className="text-lg font-extrabold">Antes del cuarto 4</h2>
      <p className="mt-1 text-sm text-slate-700">
        Último cuarto para que todos jueguen y descansen.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {(["us", "them"] as const).map((side) => {
          const advice = rotationAdvice(sheet, side, 4);
          const players = participants(sheet, side).sort((a, b) => a.cap - b.cap);
          return (
            <div
              key={side}
              className="border-pool-deep min-w-0 overflow-hidden rounded-lg border bg-white"
            >
              <h3
                className={`px-2 py-2 text-base font-extrabold ${side === "us" ? "bg-pool-deep text-white" : "bg-ball-gold text-pool-deep"}`}
              >
                {side === "us" ? "Morvedre" : "Rival"}
              </h3>
              {(["rest", "play"] as const).map((kind) => {
                const list = players.filter((p) =>
                  advice.some((a) => a.key === p.key && a.kind === kind),
                );
                return list.length ? (
                  <div key={kind} className="text-pool-deep m-2 rounded-md bg-amber-50 p-2">
                    <p className="flex items-start gap-1 text-sm leading-tight font-extrabold">
                      {kind === "rest" ? (
                        <Moon size={18} className="shrink-0" aria-hidden="true" />
                      ) : (
                        <Play size={18} className="shrink-0" aria-hidden="true" />
                      )}
                      {kind === "rest" ? "Deben descansar" : "Deben jugar"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {list.map((p) => (
                        <span
                          key={p.key}
                          title={p.name}
                          className={`border-pool-deep grid h-8 w-8 place-items-center rounded-md border text-base font-extrabold ${kind === "rest" ? "bg-slate-200" : "bg-ball-gold"}`}
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
                <p className="text-pool-deep p-2 text-sm font-semibold">
                  Faltan datos de cuartos anteriores.
                </p>
              )}
              {!advice.length && (
                <p className="text-pool-deep p-2 text-sm font-semibold">Rotación al día</p>
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
