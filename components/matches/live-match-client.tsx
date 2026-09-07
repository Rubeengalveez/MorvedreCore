"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, X, History, Share2, Undo2, ChevronRight } from "lucide-react";
import {
  actionLabels,
  describeEvent,
  isGoal,
  playerTotals,
  score,
  type ActionKind,
  type LiveSheet,
  type MatchEvent,
  type Side,
} from "@/lib/domain/live-match";
import { useLiveMatch } from "./use-live-match";
import styles from "./live-match.module.css";

type Panel =
  | "players"
  | "actions"
  | "goal"
  | "shot"
  | "sanction"
  | "bench"
  | "bench-actions"
  | "periods"
  | "history"
  | "keeper"
  | "share"
  | "takeover"
  | null;
export function LiveMatchClient() {
  const { record, error, busy, writable, online, change, retry, takeover } = useLiveMatch();
  const [panel, setPanel] = useState<Panel>(null);
  const [side, setSide] = useState<Side>("us");
  const [cap, setCap] = useState<number | null>(null);
  const [editing, setEditing] = useState<MatchEvent | null>(null);
  const [notice, setNotice] = useState("");
  const [shareError, setShareError] = useState("");
  const [outWarning, setOutWarning] = useState(false);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const s = record?.sheet;
  const closed = s?.phase === "finished";
  const enabled = writable && !closed && !busy;
  const playing = enabled && s?.phase === "playing";

  if (!record || !s)
    return (
      <main id="main-content" className={styles.root}>
        <div className={styles.empty}>
          <h1>Acta en directo</h1>
          <p role={error ? "alert" : "status"}>{error || "Preparando el partido…"}</p>
          <Link href="/admin/matches">Volver a partidos</Link>
        </div>
      </main>
    );
  const currentPlayer = s.players.find((p) => p.cap === cap);
  const last = s.events.findLast((e) => !e.deleted);
  const active = s.events.filter((e) => !e.deleted);
  function openPlayer(which: Side, n: number) {
    setSide(which);
    setCap(n);
    setPanel("actions");
    const totals = playerTotals(s!, which, n);
    setOutWarning(totals.red || totals.exclusions >= 3);
  }
  function closePanel() {
    setPanel(null);
    setEditing(null);
    setOutWarning(false);
  }
  async function patch(next: LiveSheet) {
    const ok = await change(next);
    if (ok) closePanel();
    return ok;
  }
  async function add(kind: ActionKind) {
    if (!s || (!playing && !editing)) return;
    const bench = kind === "timeout" || kind.startsWith("coach_");
    const event: MatchEvent = {
      id: editing?.id ?? crypto.randomUUID(),
      side,
      cap: bench ? null : cap,
      kind,
      period: editing?.period ?? s.period,
      keeper: side === "them" && isGoal(kind) ? (editing?.keeper ?? s.keeper) : null,
      deleted: false,
    };
    const events = editing
      ? s.events.map((e) => (e.id === editing.id ? event : e))
      : [...s.events, event];
    if (await patch({ ...s, events })) setNotice(`${actionLabels[kind]} registrado`);
  }
  async function remove(event: MatchEvent) {
    await patch({
      ...s!,
      events: s!.events.map((e) => (e.id === event.id ? { ...e, deleted: true } : e)),
    });
    setNotice("Jugada anulada");
  }
  async function share() {
    setShareError("");
    try {
      const { createActaPdf } = await import("@/lib/domain/acta-pdf");
      const file = createActaPdf(record!);
      if (navigator.canShare?.({ files: [file] }))
        await navigator.share({ files: [file], title: "Acta · Morvedre Core" });
      else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setShareError("No pudimos compartir el PDF. Vuelve a intentarlo.");
    }
  }
  const title =
    panel === "players"
      ? `Elige un gorro · ${side === "us" ? "Morvedre" : "Rival"}`
      : panel === "bench"
        ? "Tiempo muerto / entrenador"
        : panel === "bench-actions"
          ? `${side === "us" ? "Morvedre" : "Rival"} · Banquillo`
          : panel === "periods"
            ? "Periodos del partido"
            : panel === "history"
              ? "Jugadas del partido"
              : panel === "keeper"
                ? "Portero en juego"
                : panel === "share"
                  ? "Compartir acta"
                  : panel === "takeover"
                    ? "Tomar el relevo"
                    : `${side === "us" ? "Morvedre" : "Rival"} · #${cap}${side === "us" && currentPlayer ? ` ${currentPlayer.name}` : ""}`;
  const button = (label: string, onClick: () => void, extra = "") => (
    <button type="button" className={`${styles.action} ${extra}`} disabled={busy} onClick={onClick}>
      {label}
      <ChevronRight size={20} aria-hidden="true" />
    </button>
  );
  function playerRow(which: Side, n: number, name?: string) {
    const t = playerTotals(s!, which, n);
    const out = t.red || t.exclusions >= 3;
    return (
      <button
        key={n}
        type="button"
        className={`${styles.player} ${out ? styles.out : t.exclusions === 2 ? styles.danger : ""}`}
        disabled={!playing}
        onClick={() => {
          setEditing(null);
          openPlayer(which, n);
        }}
        aria-label={`${which === "us" ? "Morvedre" : "Rival"}, gorro ${n}${name ? `, ${name}` : ""}, ${t.goals} goles, ${t.exclusions} de 3 expulsiones${out ? ", fuera" : ""}`}
      >
        <span className={styles.identity}>
          <span className={`${styles.cap} ${which === "them" ? styles.rivalCap : ""}`}>{n}</span>
          {name && <span className={styles.name}>{name.split(" ")[0]}</span>}
        </span>
        <span className={`${styles.goals} ${t.goals === 0 ? styles.zero : ""}`}>{t.goals}</span>
        <span className={styles.exclusions}>
          <span className={styles.slots} aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= t.exclusions ? styles.filled : ""} />
            ))}
          </span>
          <span>
            {out ? "Fuera" : `${t.exclusions}/3`}
            {t.yellow ? " · A" : ""}
          </span>
        </span>
      </button>
    );
  }
  return (
    <main id="main-content" className={styles.root}>
      <header className={styles.header}>
        <div className={styles.topline}>
          <a href={`/matches/${record.matchId}`} aria-label="Volver al partido">
            <ArrowLeft size={20} />
          </a>
          <h1>
            Acta <span>en directo</span>
          </h1>
          <button type="button" onClick={() => setPanel("share")} aria-label="Compartir acta">
            <Share2 size={20} />
          </button>
          <button type="button" onClick={() => setPanel("history")} aria-label="Ver jugadas">
            <History size={20} />
          </button>
        </div>
        <div className={styles.scoreboard}>
          <div>
            <span>Morvedre</span>
            <strong>{score(s, "us")}</strong>
          </div>
          <span className={styles.dash}>—</span>
          <div>
            <span title={record.opponent}>{record.opponent}</span>
            <strong>{score(s, "them")}</strong>
          </div>
        </div>
        <button type="button" className={styles.periodLine} onClick={() => setPanel("periods")}>
          {closed
            ? "Partido terminado"
            : `Periodo ${s.period}/${s.periods}${s.phase === "break" ? " · Descanso" : ""}`}
          <span>
            Parcial {score(s, "us", s.period)}–{score(s, "them", s.period)}
          </span>
          <ChevronRight size={16} />
        </button>
      </header>
      <div className={styles.status} role="status">
        <span className={record.dirty ? styles.pendingDot : styles.savedDot} />
        {!online
          ? `Sin conexión${record.dirty ? " · Guardado en este móvil" : ""}`
          : record.dirty
            ? "Guardado en el móvil · Enviando…"
            : "Todo sincronizado"}
        {!writable && !closed && <span>Solo consulta</span>}
      </div>
      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void retry()}>
            Reintentar envío
          </button>
        </div>
      )}
      {s.phase === "ready" && (
        <section className={styles.preparation}>
          <h2>Todo listo antes del primer balón</h2>
          <p>Revisa los gorros y elige quién empieza en portería.</p>
          <div className={styles.setup}>
            <label>
              Periodos
              <select
                value={s.periods}
                disabled={!enabled}
                onChange={(e) => void change({ ...s, periods: Number(e.target.value) })}
              >
                {[4, 6, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} periodos
                  </option>
                ))}
              </select>
            </label>
            <label>
              Gorros rivales
              <select
                value={s.opponentCaps.length}
                disabled={!enabled}
                onChange={(e) =>
                  void change({
                    ...s,
                    opponentCaps: Array.from({ length: Number(e.target.value) }, (_, i) => i + 1),
                  })
                }
              >
                {[13, 14, 15, 16, 20].map((n) => (
                  <option key={n} value={n}>
                    {n} gorros
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className={styles.setupKeeper}
            onClick={() => setPanel("keeper")}
            disabled={!enabled}
          >
            Portero inicial:{" "}
            {s.keeper
              ? `#${s.keeper} ${s.players.find((p) => p.cap === s.keeper)?.name ?? ""}`
              : "Elegir portero"}
          </button>
          {(s.baseline.some((p) => p.goals || p.exclusions) || s.baselineThem > 0) && (
            <p>
              Conservamos los totales anteriores. No se asignarán a un periodo ni a un tipo de
              jugada.
            </p>
          )}
        </section>
      )}
      <section className={styles.tables} aria-label="Goles y expulsiones por gorro">
        {(["us", "them"] as const).map((which) => (
          <div key={which} className={styles.teamTable}>
            <h2 className={which === "them" ? styles.rivalTitle : ""}>
              {which === "us" ? "Morvedre" : "Rival"}
            </h2>
            <div className={styles.columnTitles}>
              <span>Gorro</span>
              <span>Goles</span>
              <span>Exp.</span>
            </div>
            {which === "us"
              ? s.players.map((p) => playerRow(which, p.cap, p.name))
              : s.opponentCaps.map((n) => playerRow(which, n))}
            <div className={styles.benchSummary}>
              <strong>
                T. muertos: {active.filter((e) => e.side === which && e.kind === "timeout").length}
              </strong>
              <span>
                Entrenador:{" "}
                {active.some((e) => e.side === which && e.kind === "coach_red")
                  ? "Roja"
                  : active.some((e) => e.side === which && e.kind === "coach_yellow")
                    ? "Amarilla"
                    : "sin tarjetas"}
              </span>
            </div>
          </div>
        ))}
      </section>
      <div className={styles.legend}>
        Goles por jugador · Expulsiones: <span>2/3 en riesgo</span> ·{" "}
        <strong>3/3 o roja: fuera</strong>
      </div>
      <section className={styles.keepers}>
        <h2>Portería Morvedre</h2>
        {s.players
          .filter((p) => p.cap === 1 || p.cap === 13 || p.cap === s.keeper)
          .map((p) => {
            const t = playerTotals(s, "us", p.cap);
            return (
              <div key={p.id}>
                <strong>
                  #{p.cap} {p.name}
                  {s.keeper === p.cap ? " · En juego" : ""}
                </strong>
                <span>
                  {t.saves} paradas · {t.conceded} encajados · {t.received} recibidos a puerta
                </span>
              </div>
            );
          })}
      </section>
      <footer className={styles.controls}>
        {notice && (
          <div className={styles.notice} role="status">
            {notice}
            {last && enabled && (
              <button onClick={() => void remove(last)} aria-label="Deshacer última jugada">
                <Undo2 size={16} />
                Deshacer
              </button>
            )}
          </div>
        )}
        {s.phase === "ready" ? (
          <button
            className={styles.start}
            disabled={!enabled || !s.keeper}
            onClick={() => void change({ ...s, phase: "playing" })}
          >
            Empezar partido
          </button>
        ) : s.phase === "break" ? (
          <button
            className={styles.start}
            disabled={!enabled}
            onClick={() => void change({ ...s, phase: "playing", period: s.period + 1 })}
          >
            Empezar periodo {s.period + 1}
          </button>
        ) : closed ? (
          <button className={styles.start} onClick={() => setPanel("share")}>
            Ver y compartir acta
          </button>
        ) : (
          <>
            <div className={styles.teamButtons}>
              <button
                disabled={!playing}
                onClick={() => {
                  setSide("us");
                  setEditing(null);
                  setPanel("players");
                }}
              >
                Morvedre
              </button>
              <button
                disabled={!playing}
                onClick={() => {
                  setSide("them");
                  setEditing(null);
                  setPanel("players");
                }}
              >
                Rival
              </button>
            </div>
            <div className={styles.secondaryButtons}>
              <button disabled={!playing} onClick={() => setPanel("bench")}>
                Tiempo muerto / entrenador
              </button>
              <button disabled={!enabled} onClick={() => setPanel("keeper")}>
                Portero #{s.keeper}
              </button>
            </div>
          </>
        )}
        {!writable && record.canEdit && !closed && (
          <button
            className={styles.takeover}
            disabled={busy || !online || record.dirty}
            onClick={() => setPanel("takeover")}
          >
            Tomar el relevo en este móvil
          </button>
        )}
      </footer>
      <Dialog.Root
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) closePanel();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content className={styles.panel} aria-describedby="acta-panel-description">
            <div className={styles.panelScore}>
              Morvedre{" "}
              <strong>
                {score(s, "us")} — {score(s, "them")}
              </strong>{" "}
              Rival
            </div>
            <div className={styles.panelHeading}>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Close aria-label="Cerrar panel">
                <X />
              </Dialog.Close>
            </div>
            <Dialog.Description id="acta-panel-description" className={styles.description}>
              {editing
                ? "Corrige la jugada; los totales se recalculan."
                : panel === "players"
                  ? "Toca el gorro del jugador."
                  : panel === "actions"
                    ? "Elige qué ha pasado."
                    : ""}
            </Dialog.Description>
            <div className={styles.panelBody}>
              {editing && (
                <label className={styles.editPeriod}>
                  Periodo
                  <select
                    value={editing.period}
                    onChange={(e) => setEditing({ ...editing, period: Number(e.target.value) })}
                  >
                    {Array.from({ length: s.period }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {panel === "players" && (
                <div className={styles.playerGrid}>
                  {(side === "us"
                    ? s.players.map((p) => ({ cap: p.cap, name: p.name }))
                    : s.opponentCaps.map((n) => ({ cap: n, name: "Rival" }))
                  ).map((p) => (
                    <button key={p.cap} onClick={() => openPlayer(side, p.cap)}>
                      <strong>{p.cap}</strong>
                      <span>{p.name}</span>
                      <small>{playerTotals(s, side, p.cap).exclusions}/3 expulsiones</small>
                    </button>
                  ))}
                </div>
              )}
              {panel === "actions" && (
                <>
                  {outWarning ? (
                    <div className={styles.warning}>
                      <p>
                        Este jugador está fuera por sanción. ¿Estás anotando una jugada anterior?
                      </p>
                      {button("Sí, anotar una jugada anterior", () => setOutWarning(false))}
                    </div>
                  ) : (
                    <>
                      {side === "us" && (cap === 1 || cap === 13 || cap === s.keeper) && (
                        <div className={styles.actionGrid}>
                          {button("Parada", () => void add("save"), styles.keeperAction)}
                          {button(
                            "Penalti parado",
                            () => void add("penalty_save"),
                            styles.keeperAction,
                          )}
                        </div>
                      )}
                      <div className={styles.actionGrid}>
                        {button(
                          "Gol",
                          () => (side === "them" ? void add("goal") : setPanel("goal")),
                          styles.goalAction,
                        )}
                        {side === "us" && button("Tiro", () => setPanel("shot"))}
                        {button(side === "us" ? "Sanción" : "Expulsión", () =>
                          side === "them" ? void add("exclusion") : setPanel("sanction"),
                        )}
                      </div>
                      {button("Cambiar jugador", () => setPanel("players"))}
                    </>
                  )}
                </>
              )}
              {panel === "goal" && (
                <div className={styles.actionList}>
                  {(["goal", "goal_extra", "goal_penalty"] as const).map((k) => (
                    <div key={k}>
                      {button(actionLabels[k], () => void add(k), styles.goalAction)}
                    </div>
                  ))}
                </div>
              )}
              {panel === "shot" && (
                <div className={styles.actionList}>
                  {(["shot_out", "shot_saved", "shot_blocked", "penalty_missed"] as const).map(
                    (k) => (
                      <div key={k}>{button(actionLabels[k], () => void add(k))}</div>
                    ),
                  )}
                </div>
              )}
              {panel === "sanction" && (
                <div className={styles.actionList}>
                  {(["exclusion", "penalty", "red", "yellow"] as const).map((k) => (
                    <div key={k}>
                      {button(
                        k === "penalty" ? "Penalti cometido · +1 expulsión" : actionLabels[k],
                        () => void add(k),
                        k === "red" ? styles.redAction : "",
                      )}
                    </div>
                  ))}
                </div>
              )}
              {["goal", "shot", "sanction"].includes(panel ?? "") &&
                button("Volver a las acciones", () => setPanel("actions"))}
              {panel === "bench" && (
                <div className={styles.actionGrid}>
                  {button("Morvedre", () => {
                    setSide("us");
                    setPanel("bench-actions");
                  })}
                  {button("Rival", () => {
                    setSide("them");
                    setPanel("bench-actions");
                  })}
                </div>
              )}
              {panel === "bench-actions" && (
                <div className={styles.actionList}>
                  {(["timeout", "coach_yellow", "coach_red"] as const).map((k) => (
                    <div key={k}>{button(actionLabels[k], () => void add(k))}</div>
                  ))}
                </div>
              )}
              {panel === "keeper" && (
                <div className={styles.playerGrid}>
                  {s.players.map((p) => (
                    <button
                      key={p.cap}
                      disabled={!enabled}
                      onClick={() => void patch({ ...s, keeper: p.cap })}
                    >
                      <strong>{p.cap}</strong>
                      <span>{p.name}</span>
                      {s.keeper === p.cap && <small>En juego</small>}
                    </button>
                  ))}
                </div>
              )}
              {panel === "periods" && (
                <>
                  <div className={styles.partials}>
                    {Array.from({ length: s.period }, (_, i) => (
                      <div key={i}>
                        <span>Periodo {i + 1}</span>
                        <strong>
                          {score(s, "us", i + 1)} — {score(s, "them", i + 1)}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <p className={styles.global}>
                    Global{" "}
                    <strong>
                      {score(s, "us")} — {score(s, "them")}
                    </strong>
                  </p>
                  {playing && (
                    <>
                      <p>
                        Comprueba el parcial antes de cerrar. Puedes corregir jugadas desde el
                        historial.
                      </p>
                      {button(
                        s.period === s.periods
                          ? "Confirmar y terminar partido"
                          : "Confirmar fin de periodo",
                        () =>
                          void patch({
                            ...s,
                            phase: s.period === s.periods ? "finished" : "break",
                          }),
                        styles.goalAction,
                      )}
                    </>
                  )}
                </>
              )}
              {panel === "history" && (
                <>
                  {active.length === 0 ? (
                    <p>Todavía no hay jugadas.</p>
                  ) : (
                    <ol className={styles.history}>
                      {[...active].reverse().map((e) => (
                        <li key={e.id}>
                          <small>Periodo {e.period}</small>
                          <p>{describeEvent(e, s)}</p>
                          {enabled && (
                            <div>
                              <button
                                onClick={() => {
                                  setEditing(e);
                                  setSide(e.side);
                                  setCap(e.cap);
                                  setOutWarning(false);
                                  setPanel(e.cap === null ? "bench-actions" : "actions");
                                }}
                              >
                                Corregir
                              </button>
                              <button onClick={() => void remove(e)}>Anular jugada</button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              )}
              {panel === "share" && (
                <>
                  <p>
                    {closed ? "Acta final" : "Acta provisional"} · {record.team} contra{" "}
                    {record.opponent}
                  </p>
                  <p>
                    El PDF incluye el resultado, los parciales, las estadísticas y las jugadas.
                    Puedes enviarlo por WhatsApp o descargarlo.
                  </p>
                  {record.dirty && (
                    <p>Hay cambios guardados solo en este móvil. El PDF los incluye.</p>
                  )}
                  {button("Compartir o descargar PDF", () => void share(), styles.goalAction)}
                  {shareError && <p role="alert">{shareError}</p>}
                </>
              )}
              {panel === "takeover" && (
                <>
                  <p>
                    Confirma con el otro delegado que ha enviado todas sus jugadas. Su móvil dejará
                    de poder sincronizar; conservará cualquier cambio pendiente.
                  </p>
                  {button("Confirmar relevo", () => void takeover())}
                </>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
