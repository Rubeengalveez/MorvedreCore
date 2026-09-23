"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, RotateCcw, Shield, Target, X } from "lucide-react";

import {
  playerTotals,
  shootoutOutcomeLabels,
  shootoutState,
  type LiveRecord,
  type LiveSheet,
  type Shootout,
} from "@/lib/domain/live-match";
import { generateUuid } from "@/lib/utils/uuid";
import styles from "./live-match.module.css";
import { ActaPlayerName } from "./acta-player-name";

const outcomeTone: Record<Shootout["shots"][number]["outcome"], string> = {
  goal: "bg-emerald-500 text-white",
  save: "bg-red-500 text-white",
  out: "bg-red-500 text-white",
  post: "bg-red-500 text-white",
};

export function ActaShootout({
  record,
  enabled,
  change,
  onShare,
}: {
  record: LiveRecord;
  enabled: boolean;
  change: (sheet: LiveSheet) => Promise<boolean>;
  onShare: () => void;
}) {
  const [cap, setCap] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  const [choosingKeeper, setChoosingKeeper] = useState(false);
  const recording = useRef(false);
  const s = record.sheet;
  const tanda = s.shootout!;
  const state = shootoutState(tanda);
  const sides = record.homeAway === "away" ? (["them", "us"] as const) : (["us", "them"] as const);
  const availablePlayers = s.players
    .filter((player) => {
      const totals = playerTotals(s, "us", player.cap);
      return !player.retired && !totals.red && totals.exclusions < 3;
    })
    .sort((a, b) => a.cap - b.cap);
  const availableKeepers = availablePlayers.filter(
    (player) => player.cap === 1 || player.cap === 13,
  );
  const candidates =
    state.nextSide === "us"
      ? availablePlayers.map((player) => ({ cap: player.cap, name: player.name }))
      : [...s.opponentCaps]
          .sort((a, b) => a - b)
          .filter((number) => {
            const totals = playerTotals(s, "them", number);
            return !totals.red && totals.exclusions < 3;
          })
          .map((number) => ({ cap: number, name: `Gorro ${number}` }));
  const keeper = availableKeepers.find((player) => player.cap === s.keeper);
  const label = (side: "us" | "them") => (side === "us" ? "Morvedre" : record.opponent);
  const turnIsUs = state.nextSide === "us";
  const selectedLauncher = cap === null ? null : candidates.find((player) => player.cap === cap);
  const sideShots = tanda.shots.filter((shot) => shot.side === state.nextSide);
  const alreadyShot = new Set(sideShots.map((shot) => shot.cap));
  const potential = (outcome: "goal" | "out") =>
    shootoutState({
      ...tanda,
      shots: [
        ...tanda.shots,
        { id: "preview", side: state.nextSide, cap: cap ?? 1, keeper: null, outcome },
      ],
    }).winner;
  const statusMessage = state.winner
    ? `Tanda terminada · gana ${label(state.winner)}`
    : potential("goal") === "us"
      ? "Morvedre, a un gol de ganar"
      : potential("out") === "them"
        ? "Morvedre, a un fallo de perder"
        : potential("goal") === "them"
          ? "Rival, a un gol de ganar"
          : potential("out") === "us"
            ? "Rival, a un fallo de perder"
            : tanda.shots.length >= 10
              ? `Muerte súbita · ronda ${Math.floor(tanda.shots.length / 2) - 4}`
              : `Ronda ${Math.floor(tanda.shots.length / 2) + 1} de 5`;

  async function recordShot(outcome: Shootout["shots"][number]["outcome"]) {
    if (
      cap === null ||
      !enabled ||
      state.winner ||
      (state.nextSide === "them" && !keeper) ||
      recording.current
    )
      return;
    recording.current = true;
    try {
      const saved = await change({
        ...s,
        shootout: {
          ...tanda,
          shots: [
            ...tanda.shots,
            {
              id: generateUuid(),
              side: state.nextSide,
              cap,
              keeper: state.nextSide === "them" ? s.keeper : null,
              outcome,
            },
          ],
        },
      });
      if (saved) {
        setCap(null);
        setMissed(false);
      } else {
        recording.current = false;
      }
    } catch {
      recording.current = false;
    }
  }

  return (
    <section className="bg-[#edf3f8] text-[#062048]" aria-label="Tanda de penaltis">
      <div className="p-3 pb-0">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c7d6e4]">
          <div className="flex min-h-10 items-center bg-[#062048] px-3 text-white">
            <p className="text-sm font-extrabold tracking-wide uppercase">Tanda de penaltis</p>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1 px-3 py-2.5 text-center">
            {sides.map((side, index) => (
              <div
                key={side}
                className={`${index === 0 ? "col-start-1" : "col-start-3"} row-start-1 min-w-0 self-start`}
              >
                <p className="line-clamp-2 flex min-h-9 items-end justify-center text-sm leading-tight font-extrabold text-[#062048] min-[390px]:text-base">
                  {label(side)}
                </p>
              </div>
            ))}
            <span className="col-start-1 row-start-2 font-mono text-6xl leading-none font-black text-[#062048] tabular-nums">
              {sides[0] === "us" ? state.goalsUs : state.goalsThem}
            </span>
            <span className="col-start-2 row-start-2 text-xl font-bold text-slate-400">–</span>
            <span className="col-start-3 row-start-2 font-mono text-6xl leading-none font-black text-[#062048] tabular-nums">
              {sides[1] === "us" ? state.goalsUs : state.goalsThem}
            </span>
          </div>

          <p
            role="status"
            aria-live="polite"
            className="border-t border-[#c7d6e4] bg-[#e8f1fc] px-3 py-2 text-center text-base font-extrabold text-[#062048]"
          >
            {statusMessage}
          </p>
          {tanda.shots.length > 0 && (
            <div className="grid grid-cols-2 divide-x divide-[#c7d6e4] border-t border-slate-100 bg-[#f6f9fc] px-2 py-2.5">
              {sides.map((side) => (
                <div key={side} className="flex min-h-6 flex-wrap justify-center gap-1 px-1">
                  {tanda.shots
                    .filter((shot) => shot.side === side)
                    .map((shot) => (
                      <span
                        key={shot.id}
                        title={`#${shot.cap} · ${shootoutOutcomeLabels[shot.outcome]}`}
                        className={`flex min-h-10 max-w-full items-center gap-1 rounded-lg border border-current px-2 text-sm font-extrabold ${outcomeTone[shot.outcome]}`}
                      >
                        <span className="shrink-0">#{shot.cap}</span>
                        {side === "us" && (
                          <span className="max-w-20 min-w-0 text-xs">
                            <ActaPlayerName
                              name={
                                s.players.find((player) => player.cap === shot.cap)?.name ??
                                `Gorro ${shot.cap}`
                              }
                            />
                          </span>
                        )}
                        {shot.outcome === "goal" ? (
                          <Check size={14} strokeWidth={3} aria-hidden="true" />
                        ) : (
                          <X size={14} strokeWidth={3} aria-hidden="true" />
                        )}
                        <span className="sr-only">{shootoutOutcomeLabels[shot.outcome]}</span>
                      </span>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(s.phase === "shootout" || s.phase === "finished") && (
        <div className="space-y-3 p-3">
          {s.phase === "shootout" && (
            <section className="overflow-hidden rounded-2xl border border-[#b8cada] bg-white shadow-sm">
              <button
                type="button"
                disabled={!enabled}
                onClick={() => setChoosingKeeper((open) => !open)}
                className="flex min-h-16 w-full items-center gap-3 px-4 text-left active:bg-blue-50 disabled:opacity-50"
                aria-expanded={choosingKeeper}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e8f1fc] text-[#0b4d86]">
                  <Shield size={24} strokeWidth={2.4} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold tracking-wide text-slate-500 uppercase">
                    Portero de Morvedre
                  </span>
                  <span className="flex min-w-0 gap-1 text-base font-extrabold">
                    {keeper ? (
                      <>
                        <span className="shrink-0">#{keeper.cap} ·</span>
                        <ActaPlayerName name={keeper.name} />
                      </>
                    ) : (
                      "Elige portero"
                    )}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-sm font-bold text-[#0b4d86]">
                  Cambiar
                  <ChevronDown
                    size={18}
                    className={choosingKeeper ? "rotate-180" : ""}
                    aria-hidden="true"
                  />
                </span>
              </button>
              {choosingKeeper && (
                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-[#f4f8fb] p-3">
                  {availableKeepers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      disabled={!enabled}
                      onClick={async () => {
                        if (await change({ ...s, keeper: player.cap })) setChoosingKeeper(false);
                      }}
                      className={`flex min-h-14 items-center gap-2 rounded-xl border-2 px-2 text-left font-bold ${player.cap === s.keeper ? "border-[#1657a8] bg-[#1657a8] text-white" : "border-[#b8cada] bg-white"}`}
                    >
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg font-mono text-lg font-black ${player.cap === s.keeper ? "bg-white/15" : "bg-[#062048] text-white"}`}
                      >
                        {player.cap}
                      </span>
                      <span className="min-w-0 flex-1 text-sm leading-tight">
                        <ActaPlayerName name={player.name} />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {state.winner || s.phase === "finished" ? (
            <section className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-[#b8cada]">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check size={28} strokeWidth={3} aria-hidden="true" />
              </div>
              <p className="mt-2 text-xl font-black">
                {state.winner ? `Gana ${label(state.winner)}` : "Partido terminado"}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {s.phase === "finished" ? "Partido terminado" : "La tanda ya tiene un ganador."}
              </p>
              <button
                className="mt-4 min-h-14 w-full rounded-xl bg-[#062048] px-4 text-lg font-bold text-white disabled:opacity-40"
                type="button"
                disabled={s.phase !== "finished" && !enabled}
                onClick={() =>
                  s.phase === "finished" ? onShare() : void change({ ...s, phase: "finished" })
                }
              >
                {s.phase === "finished" ? "Ver y compartir acta" : "Terminar partido"}
              </button>
            </section>
          ) : (
            <section
              className={`overflow-hidden rounded-2xl shadow-sm ring-1 ${turnIsUs ? "bg-white ring-[#b8cada]" : "bg-[#fff8d8] ring-[#e4c45c]"}`}
            >
              <div
                className={`flex items-center gap-3 px-4 py-3 ${turnIsUs ? "bg-[#062048] text-white" : "bg-[#f4c430] text-[#062048]"}`}
              >
                <Target size={25} strokeWidth={2.5} aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold tracking-wide uppercase">Ahora lanza</p>
                  <p className="text-lg font-black">{label(state.nextSide)}</p>
                </div>
                <span className="ml-auto text-sm font-bold">
                  {tanda.shots.length >= 10 ? "Muerte súbita" : "5 por equipo"}
                </span>
              </div>

              <div className="p-3">
                {cap === null ? (
                  <>
                    <p className="mb-3 text-base font-extrabold">Elige al lanzador</p>
                    <div className="grid grid-cols-2 gap-2">
                      {candidates.map((player) => (
                        <button
                          key={player.cap}
                          type="button"
                          disabled={!enabled}
                          onClick={() => {
                            setCap(player.cap);
                            setMissed(false);
                          }}
                          className="flex min-h-16 items-center gap-3 rounded-xl border-2 border-[#b8cada] bg-white px-3 text-left active:border-[#1657a8] active:bg-blue-50 disabled:opacity-40"
                        >
                          <span
                            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-mono text-xl font-black ${turnIsUs ? "bg-[#062048] text-white" : "bg-[#f4c430] text-[#062048]"}`}
                          >
                            {player.cap}
                          </span>
                          <span className="min-w-0 flex-1 text-sm leading-tight font-extrabold">
                            <ActaPlayerName name={player.name} />
                            {alreadyShot.has(player.cap) && (
                              <span className="block text-xs font-semibold text-slate-600">
                                Ya lanzó
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="mb-3 flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-[#062048] bg-[#e8f1fc] px-3 text-left"
                      aria-label={`Cambiar lanzador, gorro ${cap}`}
                      onClick={() => setCap(null)}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#062048] font-mono text-lg font-black text-white">
                        {cap}
                      </span>
                      <span className="min-w-0 flex-1 font-extrabold">
                        {turnIsUs && selectedLauncher ? (
                          <ActaPlayerName name={selectedLauncher.name} />
                        ) : (
                          "Gorro rival"
                        )}
                      </span>
                      <span className="ml-auto shrink-0 text-sm font-bold text-[#0b4d86]">
                        Cambiar
                      </span>
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      {!missed && (
                        <>
                          <button
                            type="button"
                            className={`${styles.action} ${styles.actionGoal}`}
                            disabled={!enabled}
                            onClick={() => void recordShot("goal")}
                          >
                            Gol
                          </button>
                          <button
                            type="button"
                            className={`${styles.action} ${styles.actionShotMissed} !border-2 !border-[#b91c1c] !bg-white !text-[#991b1b]`}
                            disabled={!enabled}
                            onClick={() => setMissed(true)}
                          >
                            Fallado
                          </button>
                        </>
                      )}
                      {missed && (
                        <>
                          <p
                            role="status"
                            className="col-span-2 text-base font-extrabold text-[#062048]"
                          >
                            ¿Cómo ha fallado? Elige una opción.
                          </p>
                          <button
                            type="button"
                            className={`${styles.action} ${styles.actionShotOut} !border-[#062048] !bg-[#f4c430] !text-[#062048]`}
                            disabled={!enabled}
                            onClick={() => void recordShot("out")}
                          >
                            Fuera / palo
                          </button>
                          <button
                            type="button"
                            className={`${styles.action} ${styles.actionSave} !border-[#062048] !bg-[#062048] !text-white`}
                            disabled={!enabled}
                            onClick={() => void recordShot("save")}
                          >
                            Parada del portero
                          </button>
                          <button
                            type="button"
                            className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#b8cada] bg-white px-3 text-sm font-bold text-[#062048] active:bg-[#e8f1fc]"
                            onClick={() => setMissed(false)}
                          >
                            <ArrowLeft size={18} aria-hidden="true" />
                            Volver a Gol / Fallado
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {s.phase === "shootout" && tanda.shots.length > 0 && (
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#8aa6bf] bg-white px-4 font-bold text-[#0b4d86] disabled:opacity-40"
              disabled={!enabled}
              onClick={async () => {
                if (
                  await change({
                    ...s,
                    shootout: { ...tanda, shots: tanda.shots.slice(0, -1) },
                  })
                ) {
                  setCap(null);
                  setMissed(false);
                }
              }}
            >
              <RotateCcw size={18} aria-hidden="true" />
              Deshacer último penalti
            </button>
          )}
        </div>
      )}
    </section>
  );
}
