"use client";

import { useRef, useState } from "react";
import { Check, CircleAlert, Moon, Play } from "lucide-react";
import { ActaGuardSheet } from "./acta-guard-sheet";
import { ActaFlowSheet } from "./acta-flow-sheet";
import { ActaPlayerName } from "./acta-player-name";
import { ActaQuarterMarks } from "./acta-quarter-marks";
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
  const canComplete = lineups.every((l) => Boolean(l.keeper)) && structures.length === 0;
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
        warnings.length || structures.length
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
  if (confirming)
    return (
      <ActaGuardSheet
        open
        onOpenChange={(open) => !open && setConfirming(false)}
        context={`Cuarto ${request.period}`}
        title={keeperWarning && !warnings.length ? "Corregir portero" : "Revisa la rotación"}
        icon="warning"
        pending={busy}
        stickyActions
        error={error}
        body={
          <div className="space-y-3">
            <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold text-amber-950">
              Avísalo al entrenador o al árbitro antes de continuar.
            </p>
            {(["Morvedre", "Rival"] as const).map((team) => {
              const messages = warnings.filter((text) => text.startsWith(`${team} · `));
              return messages.length ? (
                <section key={team} aria-label={`Avisos de ${team}`} className="space-y-2">
                  <h3
                    className={`rounded-lg px-3 py-2 text-sm font-extrabold ${team === "Morvedre" ? "bg-pool-deep text-white" : "bg-ball-gold text-pool-deep"}`}
                  >
                    {team}
                  </h3>
                  {messages.map((text) => {
                    const content = text.slice(team.length + 3);
                    const split = content.indexOf(": ");
                    return (
                      <div
                        key={text}
                        className="flex items-start gap-2 rounded-lg bg-white px-2 py-1.5 text-sm"
                      >
                        <CircleAlert
                          size={18}
                          className="mt-0.5 shrink-0 text-red-800"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <strong className="block">
                            <ActaPlayerName name={content.slice(0, split)} />
                          </strong>
                          <p className="mt-0.5 leading-snug text-slate-700">
                            {content.slice(split + 2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </section>
              ) : null;
            })}
            {keeperWarning && (
              <p className="text-pool-deep text-sm font-semibold">{keeperWarning}</p>
            )}
          </div>
        }
        actions={[
          { label: "Volver a revisar", tone: "primary", onClick: () => setConfirming(false) },
          {
            label:
              request.mode === "start"
                ? "Registrar así y empezar"
                : keeperWarning && !warnings.length
                  ? "Sí, corregir portero"
                  : "Guardar con incidencia",
            tone: "secondary",
            onClick: commit,
          },
        ]}
      />
    );
  const activeAdvice = advice.filter((a) => a.kind !== "missing" && fixed[side] !== a.key);
  function playerButton(p: (typeof options)[number], keeper: boolean) {
    const selected = keeper ? selection.keeper === p.key : selection.field.includes(p.key);
    const hint = activeAdvice.find((a) => a.key === p.key);
    const totals = playerTotals(sheet, side, p.cap);
    const out = totals.red || totals.exclusions >= rules.exclusionLimit;
    const history = playedPeriods(sheet, side, p.key, request.period);
    return (
      <button
        key={p.key}
        type="button"
        aria-label={side === "us" ? `${p.cap} ${p.name}` : String(p.cap)}
        aria-pressed={selected}
        onClick={() => select(p.key, keeper)}
        className={`flex h-14 min-w-0 items-center gap-2 rounded-xl border-2 px-2 text-left transition-colors motion-reduce:transition-none ${selected ? "border-pool-blue text-pool-deep bg-blue-50" : "border-pool-blue/70 text-pool-deep bg-white"} ${side === "them" ? "h-20 flex-col justify-center gap-1" : ""}`}
      >
        <span
          className={`flex shrink-0 items-center gap-1 ${side === "them" ? "w-full justify-between" : ""}`}
        >
          <strong
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg font-extrabold ${selected ? "bg-pool-deep text-white" : "text-pool-deep bg-slate-100"}`}
          >
            {p.cap}
          </strong>
          {side === "them" && selected && (
            <Check size={18} className="text-pool-blue shrink-0" aria-hidden="true" />
          )}
          {(hint || out) && (
            <span
              title={out ? "Expulsado" : hint?.kind === "rest" ? "Debe descansar" : "Debe jugar"}
              className={hint?.kind === "rest" || out ? "text-red-800" : "text-amber-900"}
            >
              {out ? (
                <CircleAlert size={16} aria-hidden="true" />
              ) : hint?.kind === "rest" ? (
                <Moon size={16} aria-hidden="true" />
              ) : (
                <Play size={16} aria-hidden="true" />
              )}
              <span className="sr-only">
                {out ? "Expulsado" : hint?.kind === "rest" ? "Debe descansar" : "Debe jugar"}
              </span>
            </span>
          )}
        </span>
        {side === "us" && (
          <span className="min-w-0 flex-1 text-sm font-bold">
            <ActaPlayerName name={p.name} />
          </span>
        )}
        {request.period > 1 && (
          <ActaQuarterMarks
            played={history}
            period={request.period}
            current={selected}
            small={side === "them"}
          />
        )}
        <span
          aria-hidden="true"
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${selected ? "bg-pool-blue text-white" : "border-2 border-slate-400"} ${side === "them" ? "sr-only absolute" : ""}`}
        >
          {selected && <Check size={14} />}
        </span>
      </button>
    );
  }
  function advance() {
    if (side === "us" && (request.mode === "start" || !draft.them.keeper)) {
      if (!selection.keeper || selection.field.length !== rules.fieldPlayers) {
        setError(`Elige un portero y ${rules.fieldPlayers} jugadores de campo.`);
        return;
      }
      void update({ ...draftRef.current, step: "them" });
    } else {
      if (!canComplete) {
        setError(structures[0] ?? "Elige los porteros de ambos equipos.");
        return;
      }
      if (warnings.length || keeperWarning) setConfirming(true);
      else void commit();
    }
  }
  return (
    <ActaFlowSheet
      onClose={onClose}
      onBack={side === "them" ? () => void update({ ...draftRef.current, step: "us" }) : undefined}
      context={`Cuarto ${request.period} · ${request.mode === "start" ? "Quién juega" : "Corregir selección"}`}
      title={`${side === "us" ? "Morvedre" : "Rival"} · Cuarto ${request.period}`}
      pending={busy}
      error={error}
      controls={
        <div className="space-y-2">
          {request.mode === "start" && (
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              {(["us", "them"] as const).map((team) => (
                <span
                  key={team}
                  className={`rounded-md px-3 py-1.5 ${side === team ? "bg-pool-deep text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {team === "us" ? "1. Morvedre" : "2. Rival"}
                </span>
              ))}
            </div>
          )}
          {request.suggested && (
            <p className="text-sm font-semibold">
              Comprueba si está jugando el gorro {request.suggested}.
            </p>
          )}
          {activeAdvice.length > 0 && (
            <div
              role="status"
              className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-snug font-semibold text-amber-950"
            >
              {(["rest", "play"] as const).map((kind) => {
                const list = options.filter((p) =>
                  activeAdvice.some((a) => a.key === p.key && a.kind === kind),
                );
                return list.length ? (
                  <p key={kind} className="flex items-start gap-2">
                    {kind === "rest" ? (
                      <Moon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Play size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>
                      {kind === "rest" ? "Deben descansar" : "Deben jugar"}:{" "}
                      <strong>{list.map((p) => p.cap).join(", ")}</strong>
                    </span>
                  </p>
                ) : null;
              })}
            </div>
          )}
        </div>
      }
      footer={
        <button
          type="button"
          disabled={busy}
          onClick={advance}
          className="bg-pool-deep min-h-14 w-full rounded-xl px-4 text-base font-extrabold text-white disabled:opacity-50"
        >
          {side === "us" && (request.mode === "start" || !draft.them.keeper)
            ? "Continuar con Rival"
            : request.mode === "start"
              ? "Listo, empezar cuarto"
              : "Guardar selección"}
        </button>
      }
    >
      <div className="space-y-4">
        <section aria-label="Portero del cuarto" className="space-y-2">
          <div className="flex items-center justify-between text-sm font-extrabold">
            <h3>Portero</h3>
            <span className={selection.keeper ? "text-pool-blue" : "text-slate-600"}>
              {selection.keeper ? "1 de 1" : "Elige uno"}
            </span>
          </div>
          <div className={side === "us" ? "grid gap-1.5" : "grid grid-cols-2 gap-2"}>
            {keepers.map((p) => playerButton(p, true))}
          </div>
          {rules.singleKeeper && keepers.length === 1 && request.period === 1 && (
            <label className="flex min-h-12 items-center gap-3 rounded-lg bg-blue-50 px-3 text-sm font-semibold">
              <input
                type="checkbox"
                className="accent-pool-deep h-5 w-5 shrink-0"
                checked={fixed[side] === keepers[0].key}
                onChange={(e) => {
                  const next = { ...fixed, [side]: e.target.checked ? keepers[0].key : null };
                  setFixed(next);
                  void update({ ...draftRef.current, fixedKeepers: next });
                }}
              />
              Único portero para los cuatro cuartos
            </label>
          )}
        </section>
        <section aria-label="Jugadores de campo" className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-sm font-extrabold">
            <h3>Jugadores de campo</h3>
            <span role="status" className="bg-pool-deep rounded-lg px-2 py-1 text-white">
              {selection.field.length} de {rules.fieldPlayers}
            </span>
          </div>
          <div className={side === "us" ? "grid gap-1.5" : "grid grid-cols-3 gap-2"}>
            {options.filter((p) => ![1, 13].includes(p.cap)).map((p) => playerButton(p, false))}
          </div>
        </section>
      </div>
    </ActaFlowSheet>
  );
}
