"use client";

import { ActaGuardSheet } from "./acta-guard-sheet";
import {
  lineupFor,
  participants,
  playedPeriods,
  rotationAdvice,
} from "@/lib/domain/live-match-participation";
import type { LiveSheet } from "@/lib/domain/live-match";
import type { Participation } from "@/lib/domain/live-match-rules";

export function ActaParticipationReview({
  sheet,
  onClose,
  onCorrect,
  onInjury,
  onReplacement,
  onRoster,
}: {
  sheet: LiveSheet;
  onClose: () => void;
  onCorrect: (period: number) => void;
  onInjury: () => void;
  onReplacement: (change: Participation["changes"][number]) => void;
  onRoster: () => void;
}) {
  return (
    <ActaGuardSheet
      open
      onOpenChange={(open) => !open && onClose()}
      context="Participación"
      title="Cuartos jugados"
      icon="saved"
      body={
        <div className="space-y-4">
          {(["us", "them"] as const).map((side) => (
            <section key={side} className="space-y-2">
              <h3 className="text-pool-deep text-lg font-extrabold">
                {side === "us" ? "Morvedre" : "Rival"}
              </h3>
              <div className="text-pool-deep grid grid-cols-[minmax(0,1fr)_repeat(4,1.5rem)] items-center gap-x-2 gap-y-2 text-sm">
                <strong>Jugador</strong>
                {[1, 2, 3, 4].map((p) => (
                  <strong key={p} className="text-center">
                    {p}
                  </strong>
                ))}
                {participants(sheet, side).map((player) => (
                  <div key={player.key} className="contents">
                    <span className="min-w-0 font-semibold">
                      {player.cap} · {side === "us" ? player.name : "Rival"}
                    </span>
                    {[1, 2, 3, 4].map((period) => (
                      <span
                        key={period}
                        className="text-center font-bold"
                        aria-label={
                          !lineupFor(sheet, side, period)
                            ? "Sin datos"
                            : playedPeriods(sheet, side, player.key).includes(period)
                              ? "Jugó"
                              : "Descansó"
                        }
                      >
                        {!lineupFor(sheet, side, period)
                          ? "?"
                          : playedPeriods(sheet, side, player.key).includes(period)
                            ? "✓"
                            : "—"}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              {sheet.period === 3 &&
                sheet.phase === "break" &&
                rotationAdvice(sheet, side, 4)
                  .filter((a) => a.kind !== "missing")
                  .map((a) => (
                    <p
                      key={a.key}
                      className="rounded-xl border-2 border-amber-700 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                    >
                      <strong>{a.name}</strong> · {a.message}
                    </p>
                  ))}
            </section>
          ))}
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4]
              .filter((p) => p <= sheet.period)
              .map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => onCorrect(period)}
                  className="border-pool-deep text-pool-deep min-h-12 rounded-xl border-2 bg-white px-3 py-2 text-sm font-bold"
                >
                  Corregir cuarto {period}
                </button>
              ))}
          </div>
          {sheet.participation?.changes.map((change) => {
            const options = participants(sheet, change.side);
            return (
              <button
                key={change.id}
                type="button"
                onClick={() => onReplacement(change)}
                className="border-pool-deep text-pool-deep min-h-12 w-full rounded-xl border-2 bg-white p-3 text-left text-sm font-bold"
              >
                Cuarto {change.period} · {change.side === "us" ? "Morvedre" : "Rival"}
                <br />
                {options.find((p) => p.key === change.outgoing)?.name} →{" "}
                {options.find((p) => p.key === change.incoming)?.name}
                <span className="text-pool-blue mt-1 block">Corregir sustitución</span>
              </button>
            );
          })}
        </div>
      }
      actions={[
        { label: "Revisar gorros del rival", tone: "secondary", onClick: onRoster },
        ...(sheet.phase === "playing" && sheet.period <= 4
          ? [
              {
                label: "Registrar sustitución por lesión",
                tone: "secondary" as const,
                onClick: onInjury,
              },
            ]
          : []),
        { label: "Volver al acta", tone: "primary", onClick: onClose },
      ]}
    />
  );
}
