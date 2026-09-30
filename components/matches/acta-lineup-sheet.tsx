"use client";

import { useRef, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { ActaGuardSheet } from "./acta-guard-sheet";
import {
  participants,
  lineupFor,
  lineupIssues,
  playedPeriods,
  rotationAdvice,
  saveLineups,
} from "@/lib/domain/live-match-participation";
import { matchRules, type LineupDraft, type PeriodLineup } from "@/lib/domain/live-match-rules";
import { playerTotals, type LiveSheet, type Side } from "@/lib/domain/live-match";
import type { StoredMatch } from "@/lib/pwa/live-match-store";

export interface LineupRequest {
  period: number;
  mode: "start" | "correct";
  side?: Side;
  suggested?: number;
}

export function ActaLineupSheet({
  record,
  request,
  onClose,
  onSaved,
  change,
  saveDraft,
  busy,
}: {
  record: StoredMatch;
  request: LineupRequest;
  onClose: () => void;
  onSaved: (sheet: LiveSheet) => void;
  change: (sheet: LiveSheet) => Promise<boolean>;
  saveDraft: (draft: LineupDraft) => Promise<boolean>;
  busy: boolean;
}) {
  const sheet = record.sheet;
  const saved = record.lineupDraft;
  const initial = (side: Side) => {
    const lineup = lineupFor(sheet, side, request.period);
    return {
      keeper: lineup?.keeper ?? sheet.participation?.fixedKeepers[side] ?? null,
      field: lineup?.field ?? [],
    };
  };
  const [draft, setDraft] = useState<LineupDraft>(() =>
    saved &&
    saved.baseMutation === record.mutation &&
    saved.period === request.period &&
    saved.mode === request.mode
      ? saved
      : {
          period: request.period,
          mode: request.mode,
          step: request.side ?? "us",
          baseMutation: record.mutation,
          us: initial("us"),
          them: initial("them"),
        },
  );
  const draftRef = useRef(draft);
  const saving = useRef(false);
  const draftQueue = useRef(Promise.resolve(true));
  const [confirming, setConfirming] = useState(false);
  const [incident, setIncident] = useState(draft.incident ?? false);
  const [error, setError] = useState("");
  const [fixed, setFixed] = useState(draft.fixedKeepers ?? sheet.participation!.fixedKeepers);
  const side = draft.step;
  const selection = draft[side];
  const options = participants(sheet, side).sort((a, b) => a.cap - b.cap);
  const keepers = options.filter((p) => p.cap === 1 || p.cap === 13);
  const rules = matchRules(sheet.category);
  const lineups: PeriodLineup[] = ["us", "them"].map((which) => ({
    period: request.period,
    side: which as Side,
    keeper: draft[which as Side].keeper ?? "",
    field: draft[which as Side].field,
  }));
  const warnings = lineups.flatMap((lineup) => {
    const selected = new Set([lineup.keeper, ...lineup.field]);
    const unavailable = participants(sheet, lineup.side)
      .filter(
        (p) =>
          selected.has(p.key) &&
          request.mode === "start" &&
          (playerTotals(sheet, lineup.side, p.cap).red ||
            playerTotals(sheet, lineup.side, p.cap).exclusions >= rules.exclusionLimit),
      )
      .map(
        (p) =>
          `${lineup.side === "us" ? "Morvedre" : "Rival"} · ${p.name}: ha quedado expulsado. Avísalo al árbitro.`,
      );
    return [
      ...unavailable,
      ...rotationAdvice(
        { ...sheet, participation: { ...sheet.participation!, fixedKeepers: fixed } },
        lineup.side,
        request.period,
        lineup,
      )
        .filter(
          (a) =>
            a.kind === "missing" ||
            (a.kind === "rest" ? selected.has(a.key) : !selected.has(a.key)),
        )
        .map((a) => `${lineup.side === "us" ? "Morvedre" : "Rival"} · ${a.name}: ${a.message}`),
    ];
  });
  const structures = lineups.flatMap((l) => lineupIssues(sheet, l));
  const own = lineups.find((l) => l.side === "us")!;
  const previousKeeper = sheet.keeperStints?.find((stint) => stint.period === request.period)?.cap;
  const keeperChanged =
    request.mode === "correct" &&
    own.keeper &&
    previousKeeper !== undefined &&
    sheet.players.find((p) => p.id === own.keeper)?.cap !== previousKeeper;
  const keeperWarning =
    keeperChanged &&
    sheet.events.some(
      (e) =>
        !e.deleted &&
        e.period === request.period &&
        ((e.side === "them" && e.keeper === previousKeeper) ||
          (e.side === "us" &&
            e.cap === previousKeeper &&
            ["save", "penalty_save", "keeper_out"].includes(e.kind))),
    )
      ? "Al corregir el portero, sus paradas y goles recibidos de ese tramo pasarán al portero elegido."
      : "";
  const advice = rotationAdvice(sheet, side, request.period);
  const canComplete =
    lineups.every((l) => Boolean(l.keeper)) && (incident || structures.length === 0);
  async function update(next: LineupDraft) {
    draftRef.current = next;
    setDraft(next);
    setError("");
    draftQueue.current = draftQueue.current.catch(() => false).then(() => saveDraft(next));
    if (!(await draftQueue.current))
      setError("No se ha guardado la selección en este móvil. Vuelve a intentarlo.");
  }
  function select(key: string, keeper: boolean) {
    const latest = draftRef.current;
    const chosen = latest[side];
    if (!keeper && !chosen.field.includes(key) && chosen.field.length >= rules.fieldPlayers) {
      setError(`Ya has elegido ${rules.fieldPlayers}. Toca un jugador para quitarlo y elige otro.`);
      return;
    }
    void update({
      ...latest,
      [side]: keeper
        ? { ...chosen, keeper: key }
        : {
            ...chosen,
            field: chosen.field.includes(key)
              ? chosen.field.filter((k) => k !== key)
              : [...chosen.field, key],
          },
    });
  }
  async function commit() {
    if (saving.current) return;
    saving.current = true;
    try {
      if (!(await draftQueue.current))
        throw new Error("Vuelve a elegir los jugadores para guardar la selección.");
      const prepared = {
        ...sheet,
        participation: { ...sheet.participation!, fixedKeepers: fixed },
      };
      const next = saveLineups(
        prepared,
        lineups,
        request.mode,
        warnings.length || structures.length || incident
          ? "Incidencia revisada con el entrenador o árbitro"
          : undefined,
      );
      if (await change(next)) onSaved(next);
      else
        setError("No se ha guardado la selección. Revisa el aviso del acta y vuelve a intentarlo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar la alineación.");
    } finally {
      saving.current = false;
    }
  }
  const title = confirming
    ? keeperWarning && !warnings.length && !structures.length
      ? "Corregir portero"
      : "Revisa la rotación"
    : `${side === "us" ? "Morvedre" : "Rival"} · Cuarto ${request.period}`;
  const buttonClass =
    "focus-visible:ring-pool-blue min-h-14 rounded-xl border-2 px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";
  return (
    <ActaGuardSheet
      open
      onOpenChange={(open) => !open && onClose()}
      context={request.mode === "start" ? "Quién juega este cuarto" : "Corregir quién jugó"}
      title={title}
      icon="warning"
      pending={busy}
      stickyActions
      error={error}
      body={
        confirming ? (
          <div className="space-y-3">
            <p className="text-pool-deep text-base font-bold">
              Avísalo al entrenador o al árbitro antes de continuar.
            </p>
            {[...structures, ...warnings, ...(keeperWarning ? [keeperWarning] : [])].map(
              (text, i) => (
                <p
                  key={i}
                  className="flex gap-2 rounded-xl border-2 border-amber-700 bg-amber-50 p-3 text-sm font-semibold text-amber-950"
                >
                  <CircleAlert size={20} className="shrink-0" aria-hidden="true" />
                  {text}
                </p>
              ),
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-ink-700 text-sm">
              {request.suggested
                ? `Revisa si el gorro ${request.suggested} está jugando. Corrige la selección.`
                : "Toca los que juegan este cuarto."}
            </p>
            <section aria-label="Portero del cuarto" className="space-y-2">
              <h3 className="text-pool-deep text-base font-extrabold">Portero</h3>
              <div className="grid grid-cols-2 gap-2">
                {keepers.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={selection.keeper === p.key}
                    onClick={() => select(p.key, true)}
                    className={`${buttonClass} ${selection.keeper === p.key ? "border-pool-deep bg-pool-deep text-white" : "border-pool-deep text-pool-deep bg-white"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <strong className="text-xl">{p.cap}</strong>
                      {selection.keeper === p.key && <Check size={20} aria-hidden="true" />}
                    </span>
                    {side === "us" && (
                      <span className="mt-1 block text-sm font-bold">{p.name}</span>
                    )}
                    {advice.some((a) => a.key === p.key && a.kind === "rest") &&
                      fixed[side] !== p.key && (
                        <span className="mt-1 block rounded-md bg-red-50 px-2 py-1 text-xs font-extrabold text-red-900">
                          Debe descansar
                        </span>
                      )}
                    {advice.some((a) => a.key === p.key && a.kind === "play") && (
                      <span className="mt-1 block rounded-md bg-amber-50 px-2 py-1 text-xs font-extrabold text-amber-950">
                        Debe jugar
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {rules.singleKeeper && keepers.length === 1 && request.period === 1 && (
                <label className="border-pool-deep text-pool-deep flex min-h-12 items-center gap-3 rounded-xl border-2 bg-white p-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="accent-pool-deep h-6 w-6 shrink-0"
                    checked={fixed[side] === keepers[0].key}
                    onChange={(e) => {
                      const next = { ...fixed, [side]: e.target.checked ? keepers[0].key : null };
                      setFixed(next);
                      void update({ ...draftRef.current, fixedKeepers: next });
                    }}
                  />
                  Mantener este portero los cuatro primeros cuartos
                </label>
              )}
            </section>
            <section aria-label="Jugadores de campo" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-pool-deep text-base font-extrabold">Jugadores de campo</h3>
                <span
                  role="status"
                  className="bg-pool-deep rounded-lg px-3 py-1 text-sm font-bold text-white"
                >
                  {selection.field.length} de {rules.fieldPlayers}
                </span>
              </div>
              <div className={`grid ${side === "us" ? "grid-cols-2" : "grid-cols-4"} gap-2`}>
                {options
                  .filter((p) => ![1, 13].includes(p.cap))
                  .map((p) => {
                    const selected = selection.field.includes(p.key);
                    const hint = advice.find((a) => a.key === p.key);
                    const totals = playerTotals(sheet, side, p.cap);
                    const out = totals.red || totals.exclusions >= rules.exclusionLimit;
                    const periods = playedPeriods(sheet, side, p.key, request.period);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => select(p.key, false)}
                        className={`${buttonClass} ${selected ? "border-pool-deep bg-pool-deep text-white" : "border-pool-deep text-pool-deep bg-white"}`}
                      >
                        <span className="flex items-center justify-between gap-1">
                          <strong className="text-xl">{p.cap}</strong>
                          {selected && <Check size={18} aria-hidden="true" />}
                        </span>
                        {side === "us" && (
                          <span className="mt-1 block text-sm leading-snug font-bold">
                            {p.name}
                          </span>
                        )}
                        {periods.length > 0 && (
                          <span className="mt-1 block text-xs font-semibold">
                            Jugó {periods.join(" · ")}
                          </span>
                        )}
                        {(hint || out) && (
                          <span
                            className={`mt-1 block rounded-md px-1.5 py-1 text-xs font-extrabold ${hint?.kind === "rest" || out ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-950"}`}
                          >
                            {out
                              ? "Expulsado"
                              : hint?.kind === "rest"
                                ? "Debe descansar"
                                : "Debe jugar"}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </section>
            {advice.some((a) => a.kind === "rest" || a.kind === "play") && (
              <p
                role="status"
                className="rounded-xl border-2 border-amber-700 bg-amber-50 p-3 text-sm font-semibold text-amber-950"
              >
                Comprueba los jugadores marcados. Avísalo al entrenador o al árbitro si no pueden
                cumplir la rotación.
              </p>
            )}
            {selection.field.length < rules.fieldPlayers && (
              <label className="text-pool-deep flex min-h-12 items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="accent-pool-deep h-6 w-6"
                  checked={incident}
                  onChange={(e) => {
                    setIncident(e.target.checked);
                    void update({ ...draftRef.current, incident: e.target.checked });
                  }}
                />
                Faltan jugadores: registrar incidencia
              </label>
            )}
          </div>
        )
      }
      actions={
        confirming
          ? [
              { label: "Volver a revisar", tone: "primary", onClick: () => setConfirming(false) },
              {
                label:
                  request.mode === "start"
                    ? "Registrar así y empezar"
                    : keeperWarning && !warnings.length && !structures.length
                      ? "Sí, corregir portero"
                      : "Guardar con incidencia",
                tone: "secondary",
                onClick: commit,
              },
            ]
          : [
              ...(side === "us" && (request.mode === "start" || !draft.them.keeper)
                ? [
                    {
                      label: "Continuar con Rival",
                      tone: "primary" as const,
                      onClick: () => {
                        if (
                          !selection.keeper ||
                          (!incident && selection.field.length !== rules.fieldPlayers)
                        ) {
                          setError(`Elige un portero y ${rules.fieldPlayers} jugadores de campo.`);
                          return;
                        }
                        void update({ ...draftRef.current, step: "them" });
                      },
                    },
                  ]
                : [
                    {
                      label:
                        request.mode === "start" ? "Listo, empezar cuarto" : "Guardar selección",
                      tone: "primary" as const,
                      onClick: () => {
                        if (!canComplete) {
                          setError(structures[0] ?? "Elige los porteros de ambos equipos.");
                          return;
                        }
                        if (warnings.length || structures.length || keeperWarning)
                          setConfirming(true);
                        else void commit();
                      },
                    },
                  ]),
              ...(side === "them"
                ? [
                    {
                      label: "Revisar Morvedre",
                      tone: "secondary" as const,
                      onClick: () => void update({ ...draftRef.current, step: "us" }),
                    },
                  ]
                : []),
            ]
      }
    />
  );
}
