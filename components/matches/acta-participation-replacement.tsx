"use client";

import { useRef, useState } from "react";
import { ActaGuardSheet } from "./acta-guard-sheet";
import { ActaSelectionSheet } from "./acta-flow-sheet";
import { ActaPlayerName } from "./acta-player-name";
import {
  currentParticipants,
  participants,
  playedPeriods,
  replaceParticipant,
  reviseReplacement,
  type outstandingReplacement,
} from "@/lib/domain/live-match-participation";
import { matchRules, type Participation } from "@/lib/domain/live-match-rules";
import { playerTotals, type LiveSheet, type Side } from "@/lib/domain/live-match";
import { generateUuid } from "@/lib/utils/uuid";

export function ActaParticipationReplacement({
  sheet,
  required,
  change,
  onClose,
  busy,
  correction,
}: {
  sheet: LiveSheet;
  required: ReturnType<typeof outstandingReplacement>;
  change: (sheet: LiveSheet) => Promise<boolean>;
  onClose: () => void;
  busy: boolean;
  correction?: Participation["changes"][number];
}) {
  const [side, setSide] = useState<Side>(correction?.side ?? required?.side ?? "us");
  const [outgoing, setOutgoing] = useState(correction?.outgoing ?? required?.key ?? "");
  const [incoming, setIncoming] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const recording = useRef(false);
  const options = participants(sheet, side);
  const period = correction?.period ?? sheet.period;
  const before = correction
    ? {
        ...sheet,
        participation: {
          ...sheet.participation!,
          changes: sheet.participation!.changes.slice(
            0,
            sheet.participation!.changes.findIndex((c) => c.id === correction.id),
          ),
        },
      }
    : sheet;
  const current = currentParticipants(before, side, period);
  const from = options.find((p) => p.key === outgoing);
  const to = options.find((p) => p.key === incoming);
  const keeper = from && [1, 13].includes(from.cap);
  const candidates = options.filter(
    (p) =>
      !current?.has(p.key) &&
      Boolean([1, 13].includes(p.cap)) === Boolean(keeper) &&
      !playerTotals(sheet, side, p.cap).red &&
      playerTotals(sheet, side, p.cap).exclusions < matchRules(sheet.category).exclusionLimit,
  );
  const fourth = incoming && playedPeriods(sheet, side, incoming, period).length >= 3;
  async function save() {
    if (recording.current) return;
    recording.current = true;
    try {
      const next = correction
        ? reviseReplacement(sheet, correction.id, incoming || null)
        : replaceParticipant(sheet, {
            id: generateUuid(),
            period: sheet.period,
            side,
            incoming,
            outgoing,
            reason: required ? "sanction" : "injury",
            eventId: required?.eventId,
          });
      if (await change(next)) onClose();
      else setError("No se ha guardado la sustitución. Revisa el aviso del acta.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar la sustitución.");
    } finally {
      recording.current = false;
    }
  }
  const Sheet = confirming ? ActaGuardSheet : ActaSelectionSheet;
  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      context="Participación"
      title={
        confirming
          ? "Confirmar sustitución"
          : correction
            ? "Corregir sustitución"
            : required
              ? "Elige quién entra"
              : "Sustitución por lesión"
      }
      icon="warning"
      pending={busy}
      error={error}
      body={
        <div className="space-y-3">
          <p className="text-pool-deep text-base font-semibold">
            {correction
              ? `Cuarto ${period} · ${from?.name}. Corrige quién entró o anula un cambio apuntado por error.`
              : required
                ? `${side === "us" ? "Morvedre" : "Rival"} · ${from?.name ?? `Gorro ${required.cap}`} ha quedado fuera. Registra quién lo sustituye.`
                : "Registra el cambio indicado por el árbitro. Ambos jugadores cuentan en este cuarto."}
          </p>
          {!required && !correction && !confirming && (
            <>
              <label className="text-pool-deep block font-bold">
                Equipo
                <select
                  value={side}
                  onChange={(e) => {
                    setSide(e.target.value as Side);
                    setOutgoing("");
                    setIncoming("");
                  }}
                  className="border-pool-deep mt-1 block min-h-12 w-full rounded-xl border-2 bg-white px-3"
                >
                  {" "}
                  <option value="us">Morvedre</option>
                  <option value="them">Rival</option>
                </select>
              </label>
              <label className="text-pool-deep block font-bold">
                Quién sale
                <select
                  value={outgoing}
                  onChange={(e) => {
                    setOutgoing(e.target.value);
                    setIncoming("");
                  }}
                  className="border-pool-deep mt-1 block min-h-12 w-full rounded-xl border-2 bg-white px-3"
                >
                  <option value="">Elige jugador</option>
                  {options
                    .filter((p) => current?.has(p.key))
                    .map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.cap} · {p.name}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}
          {confirming ? (
            <p className="border-pool-deep text-pool-deep rounded-xl border-2 bg-white p-3 font-bold">
              {incoming ? `${from?.name} → ${to?.name}` : "Se anulará esta sustitución."}
            </p>
          ) : (
            outgoing && (
              <div className="grid grid-cols-2 gap-2">
                {candidates.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setIncoming(p.key);
                      setConfirming(true);
                    }}
                    className="border-pool-deep text-pool-deep min-h-14 rounded-xl border-2 bg-white p-3 text-left font-bold"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <strong className="shrink-0">{p.cap}</strong>
                      <span className="min-w-0 flex-1">
                        <ActaPlayerName name={p.name} />
                      </span>
                    </span>
                    {playedPeriods(sheet, side, p.key, period).length >= 3 && (
                      <span className="mt-1 block text-sm text-red-900">Ya jugó 3 cuartos</span>
                    )}
                  </button>
                ))}
              </div>
            )
          )}
          {outgoing && !candidates.length && !confirming && (
            <p className="rounded-xl border-2 border-amber-700 bg-amber-50 p-3 font-semibold text-amber-950">
              No hay sustitutos disponibles. Avísalo al árbitro y revisa la convocatoria.
            </p>
          )}
          {confirming && fourth && (
            <p className="rounded-xl border-2 border-amber-700 bg-amber-50 p-3 font-semibold text-amber-950">
              {matchRules(sheet.category).compulsoryReplacement && required
                ? "Si juega los cuatro primeros cuartos, deberá descansar todo el quinto. Avísalo al entrenador."
                : "Ya jugó tres cuartos. Avísalo al árbitro antes de registrar este cambio."}
            </p>
          )}
        </div>
      }
      actions={
        confirming
          ? [
              {
                label: correction ? "Confirmar corrección" : "Confirmar sustitución",
                tone: "primary",
                onClick: save,
              },
              {
                label: "Elegir otro jugador",
                tone: "secondary",
                onClick: () => setConfirming(false),
              },
            ]
          : [
              ...(correction
                ? [
                    {
                      label: "Anular sustitución",
                      tone: "danger" as const,
                      onClick: () => {
                        setIncoming("");
                        setConfirming(true);
                      },
                    },
                  ]
                : []),
              {
                label: required ? "Volver al acta · queda pendiente" : "Cancelar",
                tone: "secondary",
                onClick: onClose,
              },
            ]
      }
    />
  );
}
