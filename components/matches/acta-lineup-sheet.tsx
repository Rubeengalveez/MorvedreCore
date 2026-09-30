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
  const [warningTeam, setWarningTeam] = useState<Side>("us");
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
      .map((p) => ({
        ...p,
        side: lineup.side,
        kind: "out" as const,
        message: "Ha quedado expulsado.",
      }));
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
        .map((a) => ({ ...a, side: lineup.side })),
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
        scrollKey={warningTeam}
        error={error}
        body={
          <div className="space-y-3">
            <p className="border-pool-deep text-pool-deep rounded-xl border bg-amber-100 px-3 py-2 text-base font-semibold">
              Revisa estos cambios con el entrenador o el árbitro.
            </p>
            {warnings.some((warning) => warning.side === "us") &&
              warnings.some((warning) => warning.side === "them") && (
                <div
                  role="group"
                  aria-label="Avisos de cada equipo"
                  className="sticky top-0 z-10 grid grid-cols-2 gap-2 bg-white py-1"
                >
                  {(["us", "them"] as const).map((team) => (
                    <button
                      key={team}
                      type="button"
                      aria-pressed={warningTeam === team}
                      onClick={() => setWarningTeam(team)}
                      className={`border-pool-deep flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 text-base font-extrabold ${team === "them" ? (warningTeam === team ? "bg-ball-gold text-pool-deep" : "text-pool-deep bg-amber-50") : warningTeam === team ? "bg-pool-deep text-white" : "text-pool-deep bg-white"}`}
                    >
                      {team === "us" ? "Morvedre" : "Rival"} ·{" "}
                      {warnings.filter((warning) => warning.side === team).length}
                      {warningTeam === team && <Check size={20} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              )}
            {(["Morvedre", "Rival"] as const).map((team) => {
              const messages = warnings.filter(
                (warning) => warning.side === (team === "Morvedre" ? "us" : "them"),
              );
              const bothTeams =
                warnings.some((warning) => warning.side === "us") &&
                warnings.some((warning) => warning.side === "them");
              return messages.length ? (
                <section
                  key={team}
                  aria-label={`Avisos de ${team}`}
                  hidden={bothTeams && warningTeam !== (team === "Morvedre" ? "us" : "them")}
                  className="border-pool-deep overflow-hidden rounded-xl border-2 bg-white"
                >
                  <h3
                    className={`px-3 py-2 text-base font-extrabold ${team === "Morvedre" ? "bg-pool-deep text-white" : "bg-ball-gold text-pool-deep"}`}
                  >
                    {team}
                  </h3>
                  <div className="space-y-3 p-3">
                    {(["rest", "play", "out", "missing"] as const).map((kind) => {
                      const list = messages.filter((warning) => warning.kind === kind);
                      if (!list.length) return null;
                      return (
                        <div
                          key={kind}
                          className="border-pool-deep rounded-lg border bg-amber-50 p-2.5"
                        >
                          <h4 className="text-pool-deep mb-2 flex items-center gap-2 text-base font-extrabold">
                            {kind === "rest" ? (
                              <Moon size={20} aria-hidden="true" />
                            ) : kind === "play" ? (
                              <Play size={20} aria-hidden="true" />
                            ) : (
                              <CircleAlert size={20} aria-hidden="true" />
                            )}
                            {kind === "rest"
                              ? "Deben descansar"
                              : kind === "play"
                                ? "Faltan por jugar"
                                : kind === "out"
                                  ? "Expulsados"
                                  : "Faltan datos"}
                          </h4>
                          <div
                            className={team === "Rival" ? "flex flex-wrap gap-2" : "space-y-1.5"}
                          >
                            {list.map((warning) => {
                              const player = participants(sheet, warning.side).find(
                                (p) => p.key === warning.key,
                              );
                              return player ? (
                                <div
                                  key={warning.key}
                                  className="text-pool-deep flex min-h-9 items-center gap-2 rounded-md bg-white px-2 py-1 text-base font-bold"
                                >
                                  <span
                                    className={`grid h-7 min-w-7 shrink-0 place-items-center rounded-md ${team === "Morvedre" ? "bg-pool-deep text-white" : "border-pool-deep bg-ball-gold text-pool-deep border"}`}
                                  >
                                    {player.cap}
                                  </span>
                                  {team === "Morvedre" ? (
                                    <span className="min-w-0 flex-1">
                                      <ActaPlayerName name={player.name} />
                                    </span>
                                  ) : (
                                    <span className="sr-only">Gorro {player.cap}</span>
                                  )}
                                </div>
                              ) : (
                                <p
                                  key={warning.key}
                                  className="text-pool-deep text-base leading-snug"
                                >
                                  {warning.message}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
        className={`flex h-16 min-w-0 items-center gap-2 rounded-xl border-2 px-2 text-left transition-colors motion-reduce:transition-none ${selected ? "border-pool-blue text-pool-deep bg-blue-50" : "border-pool-deep/70 text-pool-deep bg-white"} ${side === "them" ? "h-24 flex-col justify-center gap-2" : ""}`}
      >
        <span
          className={`flex shrink-0 items-center gap-0.5 ${side === "them" ? "w-full justify-between" : "flex-col"}`}
        >
          <strong
            className={`grid shrink-0 place-items-center rounded-lg text-xl font-extrabold ${side === "us" ? "h-8 w-8" : "h-9 w-9"} ${selected ? "bg-pool-deep text-white" : "text-pool-deep bg-slate-100"}`}
          >
            {p.cap}
          </strong>
          {side === "them" && selected && (
            <Check size={18} className="text-pool-blue shrink-0" aria-hidden="true" />
          )}
          {(hint || out) && (
            <span
              title={out ? "Expulsado" : hint?.kind === "rest" ? "Debe descansar" : "Debe jugar"}
              className={`grid place-items-center rounded-md ${side === "us" ? "h-5 w-5" : "h-7 w-7"} ${out ? "border border-red-800 bg-red-50 text-red-800" : "border-pool-deep text-pool-deep border bg-amber-100"}`}
            >
              {out ? (
                <CircleAlert size={side === "us" ? 16 : 20} aria-hidden="true" />
              ) : hint?.kind === "rest" ? (
                <Moon size={side === "us" ? 16 : 20} aria-hidden="true" />
              ) : (
                <Play size={side === "us" ? 16 : 20} aria-hidden="true" />
              )}
              <span className="sr-only">
                {out ? "Expulsado" : hint?.kind === "rest" ? "Debe descansar" : "Debe jugar"}
              </span>
            </span>
          )}
        </span>
        {side === "us" && (
          <span className="min-w-0 flex-1 text-base font-bold">
            <ActaPlayerName name={p.name} />
          </span>
        )}
        {request.period > 1 && (
          <ActaQuarterMarks
            played={history}
            period={request.period}
            current={selected}
            compact={side === "us"}
            small={side === "them"}
          />
        )}
        <span
          aria-hidden="true"
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${selected ? "bg-pool-blue text-white" : "border-2 border-slate-500"} ${side === "them" ? "sr-only absolute" : ""}`}
        >
          {selected && <Check size={18} />}
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
      if (warnings.length || keeperWarning) {
        setWarningTeam(warnings[0]?.side ?? "us");
        setConfirming(true);
      } else void commit();
    }
  }
  return (
    <ActaFlowSheet
      scrollKey={side}
      onClose={onClose}
      onBack={side === "them" ? () => void update({ ...draftRef.current, step: "us" }) : undefined}
      context={`Cuarto ${request.period} · ${request.mode === "start" ? "Quién juega" : "Corregir selección"}`}
      title={`${side === "us" ? "Morvedre" : "Rival"} · Cuarto ${request.period}`}
      pending={busy}
      error={error}
      controls={
        <div className="space-y-2">
          {request.mode === "start" && (
            <div className="grid grid-cols-2 gap-2 text-base font-bold">
              {(["us", "them"] as const).map((team) => (
                <span
                  key={team}
                  className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 ${side === team ? "border-pool-deep bg-pool-deep text-white" : "border-slate-500 bg-slate-100 text-slate-700"}`}
                >
                  {team === "us" ? "1. Morvedre" : "2. Rival"}
                  {side === team && (
                    <Check size={18} aria-hidden="true" className="ml-auto shrink-0" />
                  )}
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
              className="border-pool-deep text-pool-deep space-y-1 rounded-lg border bg-amber-100 px-3 py-2 text-base leading-snug font-semibold"
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
          <div className="flex items-center justify-between text-base font-extrabold">
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
          <div className="flex items-center justify-between gap-2 text-base font-extrabold">
            <h3>Jugadores de campo</h3>
            <span role="status" className="bg-pool-deep rounded-lg px-2 py-1 text-white">
              {selection.field.length} de {rules.fieldPlayers}
            </span>
          </div>
          <div
            className={
              side === "us" ? "grid gap-1.5" : "grid grid-cols-2 gap-2 min-[390px]:grid-cols-3"
            }
          >
            {options.filter((p) => ![1, 13].includes(p.cap)).map((p) => playerButton(p, false))}
          </div>
        </section>
      </div>
    </ActaFlowSheet>
  );
}
