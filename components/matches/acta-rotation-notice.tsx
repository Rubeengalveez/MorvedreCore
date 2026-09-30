"use client";

import { Moon, Play } from "lucide-react";
import { participants, rotationAdvice } from "@/lib/domain/live-match-participation";
import type { LiveSheet } from "@/lib/domain/live-match";

export function ActaRotationNotice({ sheet }: { sheet: LiveSheet }) {
  return (
    <section
      aria-label="Avisos antes del cuarto 4"
      className="border-pool-deep text-pool-deep relative z-20 m-3 overflow-hidden rounded-xl border-2 bg-white"
    >
      <div className="bg-pool-deep px-3 py-3 text-white">
        <h2 className="text-lg font-extrabold">Antes del cuarto 4</h2>
        <p className="mt-1 text-sm text-blue-50">
          Último cuarto para que todos jueguen y descansen.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-2">
        {(["us", "them"] as const).map((side) => {
          const advice = rotationAdvice(sheet, side, 4);
          const players = participants(sheet, side).sort((a, b) => a.cap - b.cap);
          return (
            <div
              key={side}
              className="border-pool-deep row-span-3 grid min-w-0 grid-rows-subgrid gap-2 overflow-hidden rounded-lg border bg-white pb-2"
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
                return (
                  <div
                    key={kind}
                    className={`mx-2 rounded-lg border p-2 ${kind === "rest" ? "border-red-800 bg-red-50 text-red-900" : "border-emerald-800 bg-emerald-50 text-emerald-900"}`}
                  >
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
                          className="grid h-8 w-8 place-items-center rounded-md border border-current bg-white text-base font-extrabold"
                        >
                          {p.cap}
                          <span className="sr-only">: {p.name}</span>
                        </span>
                      ))}
                      {!list.length && (
                        <span className="text-sm font-semibold">
                          {advice.some((a) => a.kind === "missing") ? "Faltan datos" : "Ninguno"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
