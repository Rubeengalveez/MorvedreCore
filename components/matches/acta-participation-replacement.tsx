"use client";

import { useRef, useState } from "react";
import { ArrowDown, ChevronRight, CircleAlert } from "lucide-react";
import { ActaGuardSheet } from "./acta-guard-sheet";
import { ActaPlayerName } from "./acta-player-name";
import {
  currentParticipants,
  currentKeeperKey,
  participants,
  playedPeriods,
  replaceParticipant,
  replacementCandidates,
  reviseReplacement,
  soleKeeper,
  type outstandingReplacement,
} from "@/lib/domain/live-match-participation";
import { type Participation } from "@/lib/domain/live-match-rules";
import { type LiveSheet, type Side } from "@/lib/domain/live-match";
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
  const keeper = currentKeeperKey(before, side, period) === outgoing;
  const candidates = replacementCandidates(before, side, outgoing, period);
  const played = incoming ? playedPeriods(sheet, side, incoming, period) : [];
  const emergencyKeeper = keeper && to && ![1, 13].includes(to.cap);
  const needsRest = !emergencyKeeper && incoming !== soleKeeper(sheet, side) && played.length >= 3;
  const willNeedRest =
    !emergencyKeeper && period === 3 && played.length === 2 && incoming !== soleKeeper(sheet, side);
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
  return (
    <ActaGuardSheet
      open
      onOpenChange={(open) => !open && !required && onClose()}
      dismissible={!required}
      tall
      stickyActions={confirming}
      context={`Cuarto ${period} · ${side === "us" ? "Morvedre" : "Rival"}`}
      title={
        confirming
          ? "Confirmar sustitución"
          : correction
            ? "Corregir sustitución"
            : required
              ? keeper
                ? "Elige quién se pone de portero"
                : "Elige un sustituto"
              : "Sustitución por lesión"
      }
      icon="warning"
      description={
        required ? "Elige y confirma un sustituto para continuar el partido." : undefined
      }
      pending={busy}
      error={error}
      body={
        <div className="text-pool-deep space-y-4">
          {from && (required || correction || confirming) ? (
            <section
              aria-label="Jugador que sale"
              className={`border-pool-deep flex items-center gap-3 rounded-xl border-2 p-3 ${required ? "bg-[#fff7f7]" : "bg-white"}`}
            >
              <strong
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border text-xl font-extrabold ${required ? "border-red-800 bg-red-50 text-red-900" : side === "us" ? "border-pool-deep bg-pool-deep text-white" : "border-pool-deep bg-ball-gold text-pool-deep"}`}
              >
                {from.cap}
              </strong>
              <div className="min-w-0 flex-1">
                <p
                  className={`mb-0.5 flex items-center gap-1.5 text-sm font-bold ${required ? "text-red-900" : "text-pool-blue"}`}
                >
                  {required && <CircleAlert size={16} aria-hidden="true" />}
                  {required ? "Fuera del partido" : "Sale"}
                </p>
                <div className="text-base font-extrabold">
                  <ActaPlayerName name={from.name} />
                </div>
              </div>
            </section>
          ) : null}
          {!required && !confirming && (
            <p className="text-base leading-snug font-medium">
              {correction
                ? "Corrige quién entró o anula la sustitución si se apuntó por error."
                : "Registra el cambio indicado por el árbitro. Ambos jugadores cuentan en este cuarto."}
            </p>
          )}
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
            incoming && to ? (
              <div className="space-y-3">
                <div className="text-pool-blue flex items-center justify-center gap-2 text-sm font-bold">
                  <ArrowDown size={18} aria-hidden="true" />
                  {keeper ? "Se pone de portero" : "Entra en su lugar"}
                </div>
                <section
                  aria-label="Jugador que entra"
                  className="border-pool-deep flex items-center gap-3 rounded-xl border-2 bg-blue-50 p-3"
                >
                  <strong
                    className={`border-pool-deep grid h-10 w-10 shrink-0 place-items-center rounded-lg border text-xl font-extrabold ${side === "us" ? "bg-pool-deep text-white" : "bg-ball-gold text-pool-deep"}`}
                  >
                    {to.cap}
                  </strong>
                  <div className="min-w-0 flex-1 text-base font-extrabold">
                    <ActaPlayerName name={to.name} />
                  </div>
                </section>
              </div>
            ) : (
              <p className="border-pool-deep rounded-xl border-2 bg-white p-3 font-bold">
                Se anulará esta sustitución.
              </p>
            )
          ) : (
            outgoing && (
              <section aria-label="Sustitutos disponibles" className="space-y-2">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-base font-extrabold">¿Quién entra?</h3>
                  <span className="border-pool-deep rounded-lg border bg-white px-2 py-1 text-sm font-bold">
                    {candidates.length} disponibles
                  </span>
                </div>
                {candidates.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    disabled={busy}
                    aria-label={`${side === "us" ? `${p.cap} ${p.name}` : `Gorro ${p.cap}`}${keeper ? " · Portero sustituto" : playedPeriods(sheet, side, p.key, period).length >= 3 ? " · Ya jugó 3 cuartos" : " · Disponible"}`}
                    onClick={() => {
                      setIncoming(p.key);
                      setConfirming(true);
                    }}
                    className="border-pool-deep/70 text-pool-deep flex h-16 w-full items-center gap-3 rounded-xl border-2 bg-white px-3 text-left transition-colors active:bg-blue-50 disabled:opacity-50 motion-reduce:transition-none"
                  >
                    <strong
                      className={`border-pool-deep grid h-10 w-10 shrink-0 place-items-center rounded-lg border text-xl font-extrabold ${side === "us" ? "bg-pool-deep text-white" : "bg-ball-gold text-pool-deep"}`}
                    >
                      {p.cap}
                    </strong>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-extrabold">
                        {side === "us" ? <ActaPlayerName name={p.name} /> : "Gorro " + p.cap}
                      </span>
                      {!keeper && playedPeriods(sheet, side, p.key, period).length >= 3 ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 rounded-md border border-amber-800 bg-amber-100 px-1.5 text-sm font-bold text-amber-950">
                          <CircleAlert size={14} aria-hidden="true" />
                          Ya jugó 3 cuartos
                        </span>
                      ) : (
                        <span className="text-pool-blue mt-0.5 block text-sm font-medium">
                          {keeper
                            ? current?.has(p.key)
                              ? "Pasa del campo a portería"
                              : "Se pone en portería"
                            : "Puede entrar"}
                        </span>
                      )}
                    </span>
                    <ChevronRight
                      size={20}
                      className="text-pool-blue shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </section>
            )
          )}
          {outgoing && !candidates.length && !confirming && (
            <p className="rounded-xl border-2 border-amber-700 bg-amber-50 p-3 font-semibold text-amber-950">
              No hay sustitutos disponibles. Avísalo al árbitro y revisa la convocatoria.
            </p>
          )}
          {confirming && (needsRest || willNeedRest) && (
            <p className="rounded-xl border-2 border-amber-700 bg-amber-50 p-3 font-semibold text-amber-950">
              {willNeedRest
                ? "Si entra ahora, habrá jugado los cuartos 1, 2 y 3. Deberá descansar el cuarto 4. Avísalo al entrenador."
                : "Ya jugó los cuartos 1, 2 y 3 y debe descansar este cuarto 4. Revisa esta sustitución con el árbitro antes de confirmarla. Desde el cuarto 5 podrá volver a jugar si no está expulsado."}
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
              ...(!required
                ? [
                    {
                      label: "Cancelar",
                      tone: "secondary",
                      onClick: onClose,
                    } as const,
                  ]
                : []),
            ]
      }
    />
  );
}
