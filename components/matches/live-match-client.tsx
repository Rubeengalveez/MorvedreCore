"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  X,
  History,
  Share2,
  Undo2,
  ChevronRight,
  Clock,
  Play,
  UserCheck,
} from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"us" | "them" | "keepers">("us");
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
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(40);
      } catch {}
    }
    if (await patch({ ...s, events })) {
      const targetLabel = bench
        ? side === "us"
          ? "Morvedre"
          : "Rival"
        : `${side === "us" ? "Morvedre" : "Rival"} #${cap}`;
      setNotice(`${actionLabels[kind]} (${targetLabel}) registrado`);
    }
  }

  async function remove(event: MatchEvent) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(50);
      } catch {}
    }
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
      ? `Elige gorro · ${side === "us" ? "Morvedre" : "Rival"}`
      : panel === "bench"
        ? "Tiempo muerto / Banquillo"
        : panel === "bench-actions"
          ? `${side === "us" ? "Morvedre" : "Rival"} · Banquillo`
          : panel === "periods"
            ? closed
              ? "Resultado final del partido"
              : `Control del Cuarto ${s.period}`
            : panel === "history"
              ? "Historial de jugadas"
              : panel === "keeper"
                ? "Seleccionar portero en juego"
                : panel === "share"
                  ? "Compartir acta oficial"
                  : panel === "takeover"
                    ? "Tomar el relevo en este móvil"
                    : `${side === "us" ? "Morvedre" : "Rival"} · Gorro #${cap}${side === "us" && currentPlayer ? ` ${currentPlayer.name}` : ""}`;

  function renderPlayerRow(which: Side, n: number, name?: string) {
    const t = playerTotals(s!, which, n);
    const out = t.red || t.exclusions >= 3;
    const inDanger = t.exclusions === 2 && !out;
    const isKeeper = which === "us" && (n === 1 || n === 13 || s!.keeper === n);

    return (
      <button
        key={n}
        type="button"
        className={`${styles.playerCard} ${out ? styles.cardOut : inDanger ? styles.cardWarning : ""}`}
        disabled={!playing}
        onClick={() => {
          setEditing(null);
          openPlayer(which, n);
        }}
        aria-label={`${which === "us" ? "Morvedre" : "Rival"}, gorro ${n}${name ? `, ${name}` : ""}, ${t.goals} goles, ${t.exclusions} de 3 expulsiones${out ? ", fuera" : ""}`}
      >
        <span
          className={`${styles.capBadge} ${which === "them" ? styles.rivalCapBadge : ""}`}
          aria-hidden="true"
        >
          {n}
          {isKeeper && <span className={styles.capKeeperIcon}>🧤</span>}
        </span>
        <div className={styles.playerInfo}>
          <span className={styles.playerName}>
            {which === "us" ? (name ?? `Gorro #${n}`) : `Rival #${n}`}
          </span>
          <div className={styles.playerStatsRow}>
            <span className={`${styles.goalsBadge} ${t.goals > 0 ? styles.goalsActive : ""}`}>
              ⚽ <strong>{t.goals}</strong>
            </span>
            <span
              className={`${styles.exclusionBadge} ${out ? styles.exclusionOut : inDanger ? styles.exclusionWarning : ""}`}
            >
              {out ? (
                <>🚫 FUERA</>
              ) : inDanger ? (
                <>⚠️ 2/3 riesgo</>
              ) : (
                <>{t.exclusions}/3 faltas</>
              )}
              {t.yellow ? " · 🟨" : ""}
            </span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <main id="main-content" className={styles.root}>
      {/* ─── CABECERA FIJA SUPERIOR ─── */}
      <header className={styles.header}>
        <div className={styles.topline}>
          <a href={`/matches/${record.matchId}`} aria-label="Volver al partido">
            <ArrowLeft size={22} />
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

        {/* MARCADOR GIGANTE */}
        <div className={styles.scoreboard}>
          <div>
            <span>Morvedre</span>
            <strong>{score(s, "us")}</strong>
          </div>
          <span className={styles.dash} aria-hidden="true">
            —
          </span>
          <div>
            <span title={record.opponent}>{record.opponent}</span>
            <strong>{score(s, "them")}</strong>
          </div>
        </div>

        {/* BARRA DE CONTROL DE PERIODO */}
        <div className={styles.periodBar}>
          <div className={styles.periodTracker}>
            <div className={styles.periodDots} aria-label="Progreso de periodos">
              {Array.from({ length: s.periods }, (_, i) => {
                const pNum = i + 1;
                const isCurrent = s.period === pNum && !closed;
                const isDone = s.period > pNum || closed;
                return (
                  <span
                    key={pNum}
                    className={`${styles.periodDot} ${isCurrent ? styles.periodDotCurrent : isDone ? styles.periodDotDone : ""}`}
                    title={`Cuarto ${pNum}`}
                  >
                    {isDone ? "✓" : pNum}
                  </span>
                );
              })}
            </div>
            <div className={styles.periodInfo}>
              <span className={styles.periodBadge}>
                {closed
                  ? "Partido finalizado"
                  : `Cuarto ${s.period} de ${s.periods}${s.phase === "break" ? " · Descanso" : ""}`}
              </span>
              <span className={styles.partialBadge}>
                Parcial este cuarto: <strong>{score(s, "us", s.period)} – {score(s, "them", s.period)}</strong>
              </span>
            </div>
          </div>

          {s.phase === "playing" && (
            <button
              type="button"
              className={styles.periodActionBtn}
              onClick={() => setPanel("periods")}
              aria-label={`Finalizar periodo ${s.period}`}
            >
              <Clock size={18} aria-hidden="true" />
              <span>{s.period === s.periods ? "🏁 Finalizar Partido" : `⏱️ Finalizar Cuarto ${s.period}`}</span>
            </button>
          )}

          {s.phase === "break" && (
            <button
              type="button"
              className={`${styles.periodActionBtn} ${styles.periodActionBtnBreak}`}
              disabled={!enabled}
              onClick={() => void change({ ...s, phase: "playing", period: s.period + 1 })}
              aria-label={`Empezar periodo ${s.period + 1}`}
            >
              <Play size={18} aria-hidden="true" />
              <span>▶ Empezar Cuarto {s.period + 1}</span>
            </button>
          )}

          {closed && <span className={styles.periodFinishedBadge}>🏆 Fin del encuentro</span>}
        </div>
      </header>

      {/* MODO CONSULTA / TAKEOVER BANNER */}
      {!writable && record.canEdit && !closed && (
        <div className={styles.takeoverBanner}>
          <div className={styles.takeoverText}>
            <strong>✋ Modo consulta activo (bloqueado para edición)</strong>
            <span>Para registrar jugadas y el acta desde este móvil:</span>
          </div>
          <button
            type="button"
            className={styles.takeoverBtn}
            disabled={busy || !online || record.dirty}
            onClick={() => void takeover()}
          >
            Activar este móvil
          </button>
        </div>
      )}

      {/* BANNER DE DESCANSO */}
      {s.phase === "break" && (
        <div className={styles.breakBanner}>
          <div className={styles.breakBannerText}>
            <strong>⏸️ En descanso entre Cuartos</strong>
            <span>Parcial Cuarto {s.period}: {score(s, "us", s.period)} - {score(s, "them", s.period)}</span>
          </div>
          <button
            type="button"
            className={styles.breakBannerBtn}
            disabled={!enabled}
            onClick={() => void change({ ...s, phase: "playing", period: s.period + 1 })}
          >
            ▶ ¡Balón al agua! Empezar Cuarto {s.period + 1}
          </button>
        </div>
      )}

      {/* ESTADO DE CONEXIÓN */}
      <div className={styles.status} role="status">
        <span
          className={
            !online ? styles.offlineDot : record.dirty ? styles.pendingDot : styles.savedDot
          }
        />
        {!online
          ? `Sin conexión${record.dirty ? " · Guardado seguro en este móvil" : ""}`
          : record.dirty
            ? "Guardado en este móvil · Sincronizando…"
            : "Todo sincronizado"}
        {!writable && !closed && <span>(Modo consulta)</span>}
      </div>

      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void retry()}>
            Reintentar envío
          </button>
        </div>
      )}

      {/* PREPARACIÓN INICIAL (ANTES DE EMPEZAR) */}
      {s.phase === "ready" && (
        <section className={styles.preparation}>
          <h2>⚙️ Configuración previa al partido</h2>
          <p>Comprueba los periodos, los gorros y designa quién empieza en portería.</p>
          <div className={styles.setupGrid}>
            <label>
              Periodos del partido
              <select
                value={s.periods}
                disabled={!enabled}
                onChange={(e) => void change({ ...s, periods: Number(e.target.value) })}
              >
                {[4, 6, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} periodos ({n <= 4 ? "Cadete a Absoluto" : "Infantil y Escuela"})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Gorros del rival
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
                    {n} gorros rivales
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            className={styles.setupKeeperBtn}
            onClick={() => setPanel("keeper")}
            disabled={!enabled}
          >
            <UserCheck size={18} />
            {s.keeper
              ? `Portero titular: #${s.keeper} ${s.players.find((p) => p.cap === s.keeper)?.name ?? ""}`
              : "Seleccionar portero titular"}
          </button>
          <button
            type="button"
            className={styles.start}
            disabled={!enabled || !s.keeper}
            onClick={() => void change({ ...s, phase: "playing" })}
          >
            Empezar partido
          </button>
        </section>
      )}

      {/* ─── PESTAÑAS PRINCIPALES DE LA MESA (TABS) ─── */}
      <nav className={styles.tableTabs} aria-label="Secciones de la mesa">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "us" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("us")}
        >
          <span>🔵 Morvedre</span>
          <span className={styles.tabCount}>{s.players.length} jugadores</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "them" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("them")}
        >
          <span>⚪ Rival</span>
          <span className={styles.tabCount}>{s.opponentCaps.length} gorros</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "keepers" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("keepers")}
        >
          <span>🧤 Portería</span>
          <span className={styles.tabCount}>#{s.keeper ?? "—"} en juego</span>
        </button>
      </nav>

      {/* CONTENIDO DE LA PESTAÑA MORVEDRE */}
      {activeTab === "us" && (
        <section className={styles.playersList} aria-label="Jugadores de Morvedre">
          {s.players.map((p) => renderPlayerRow("us", p.cap, p.name))}
        </section>
      )}

      {/* CONTENIDO DE LA PESTAÑA RIVAL */}
      {activeTab === "them" && (
        <section className={styles.rivalGrid} aria-label="Gorros del Rival">
          {s.opponentCaps.map((n) => {
            const t = playerTotals(s, "them", n);
            const out = t.red || t.exclusions >= 3;
            const inDanger = t.exclusions === 2 && !out;
            return (
              <button
                key={n}
                type="button"
                className={`${styles.rivalCard} ${out ? styles.cardOut : inDanger ? styles.cardWarning : ""}`}
                disabled={!playing}
                onClick={() => {
                  setEditing(null);
                  openPlayer("them", n);
                }}
                aria-label={`Rival, gorro ${n}, ${t.goals} goles, ${t.exclusions} de 3 expulsiones${out ? ", fuera" : ""}`}
              >
                <span className={styles.rivalCapCircle}>{n}</span>
                <div className={styles.rivalStats}>
                  <span className={`${styles.rivalGoals} ${t.goals > 0 ? styles.goalsActive : ""}`}>
                    ⚽ {t.goals}
                  </span>
                  <span
                    className={`${styles.rivalFouls} ${out ? styles.exclusionOut : inDanger ? styles.exclusionWarning : ""}`}
                  >
                    {out ? "🚫" : inDanger ? "⚠️ 2/3" : `${t.exclusions}/3`}
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      )}

      {/* CONTENIDO DE LA PESTAÑA PORTERÍA */}
      {activeTab === "keepers" && (
        <section className={styles.keepersTab} aria-label="Portería de Morvedre">
          {(() => {
            const currentKp = s.players.find((p) => p.cap === s.keeper);
            const currentTotals = s.keeper ? playerTotals(s, "us", s.keeper) : null;
            const pct =
              currentTotals && currentTotals.received > 0
                ? Math.round((currentTotals.saves / currentTotals.received) * 100)
                : 0;

            return (
              <>
                <div className={styles.heroKeeperCard}>
                  <div className={styles.heroKeeperBadge}>
                    <span className={styles.heroKeeperGlove}>🧤</span>
                    <div>
                      <span className={styles.heroKeeperSub}>Portero titular en juego</span>
                      <strong className={styles.heroKeeperName}>
                        #{s.keeper ?? "—"} {currentKp?.name ?? "No seleccionado"}
                      </strong>
                    </div>
                  </div>

                  {currentTotals && (
                    <div className={styles.heroKeeperStats}>
                      <div className={styles.heroStatBox}>
                        <strong>{currentTotals.saves}</strong>
                        <span>Paradas</span>
                      </div>
                      <div className={styles.heroStatBox}>
                        <strong>{currentTotals.conceded}</strong>
                        <span>Encajados</span>
                      </div>
                      <div className={styles.heroStatBox}>
                        <strong>{currentTotals.received}</strong>
                        <span>Tiros a puerta</span>
                      </div>
                      <div className={styles.heroStatBox}>
                        <strong style={{ color: "#16a34a" }}>{pct}%</strong>
                        <span>Efectividad</span>
                      </div>
                    </div>
                  )}

                  {playing && s.keeper && (
                    <div className={styles.heroKeeperActions}>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.btnKeeper}`}
                        style={{ minHeight: "54px" }}
                        onClick={() => {
                          setSide("us");
                          setCap(s.keeper);
                          void add("save");
                        }}
                      >
                        <span>🧤 +1 Parada</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.btnKeeper}`}
                        style={{ minHeight: "54px" }}
                        onClick={() => {
                          setSide("us");
                          setCap(s.keeper);
                          void add("penalty_save");
                        }}
                      >
                        <span>🛡️ +1 Penalti parado</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.otherKeepersSection}>
                  <h3>Otros porteros convocados</h3>
                  <div className={styles.otherKeepersList}>
                    {s.players
                      .filter((p) => p.cap === 1 || p.cap === 13 || p.cap === s.keeper)
                      .map((p) => {
                        const isCurrent = s.keeper === p.cap;
                        const t = playerTotals(s, "us", p.cap);
                        return (
                          <div key={p.id} className={styles.otherKeeperRow}>
                            <span className={styles.capBadge}>#{p.cap}</span>
                            <div className={styles.otherKeeperInfo}>
                              <strong>{p.name}</strong>
                              <span>
                                {t.saves} paradas · {t.conceded} encajados
                              </span>
                            </div>
                            {isCurrent ? (
                              <span className={styles.inGamePill}>✓ En juego</span>
                            ) : (
                              <button
                                type="button"
                                className={styles.setKeeperBtn}
                                disabled={!enabled}
                                onClick={() => void patch({ ...s, keeper: p.cap })}
                              >
                                Poner en juego
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            );
          })()}
        </section>
      )}

      {/* ─── BARRA FIJA INFERIOR (BOTTOM DOCK) ─── */}
      <footer className={styles.controls}>
        {notice && (
          <div className={styles.notice} role="status">
            <span>{notice}</span>
            {last && enabled && (
              <button
                type="button"
                onClick={() => void remove(last)}
                aria-label="Deshacer última jugada"
              >
                <Undo2 size={16} />
                Deshacer
              </button>
            )}
          </div>
        )}

        {s.phase === "break" ? (
          <button
            type="button"
            className={styles.start}
            disabled={!enabled}
            onClick={() => void change({ ...s, phase: "playing", period: s.period + 1 })}
          >
            ▶ Empezar Cuarto {s.period + 1}
          </button>
        ) : closed ? (
          <button
            type="button"
            className={styles.start}
            onClick={() => setPanel("share")}
          >
            Ver y compartir acta final
          </button>
        ) : s.phase === "playing" ? (
          <>
            <div className={styles.teamButtons}>
              <button
                type="button"
                className={`${styles.teamActionBtn} ${styles.teamBtnUs}`}
                disabled={!playing}
                onClick={() => {
                  setSide("us");
                  setEditing(null);
                  setPanel("players");
                }}
              >
                🔵 Morvedre
              </button>
              <button
                type="button"
                className={`${styles.teamActionBtn} ${styles.teamBtnThem}`}
                disabled={!playing}
                onClick={() => {
                  setSide("them");
                  setEditing(null);
                  setPanel("players");
                }}
              >
                ⚪ Rival
              </button>
            </div>
            <div className={styles.secondaryButtons}>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={!playing}
                onClick={() => setPanel("bench")}
              >
                ⏱️ Tiempo muerto / Banquillo
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={!enabled}
                onClick={() => setPanel("keeper")}
              >
                🧤 Portero: #{s.keeper ?? "Elegir"}
              </button>
            </div>
          </>
        ) : null}

        {!writable && record.canEdit && !closed && (
          <button
            type="button"
            className={styles.takeover}
            disabled={busy || !online || record.dirty}
            onClick={() => setPanel("takeover")}
          >
            Tomar el relevo en este móvil
          </button>
        )}
      </footer>

      {/* ─── MODAL ACCESIBLE RADIX DIALOG ─── */}
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
                <X size={20} />
              </Dialog.Close>
            </div>

            <Dialog.Description id="acta-panel-description" className="sr-only">
              {editing
                ? "Corrige la jugada seleccionada; los totales se recalculan automáticamente."
                : panel === "players"
                  ? "Toca el gorro del jugador al que deseas anotar."
                  : panel === "actions"
                    ? "Selecciona la acción realizada por el jugador."
                    : panel === "periods"
                      ? "Control y paso de cuarto del partido."
                      : ""}
            </Dialog.Description>

            <div className={styles.panelBody}>
              {/* EDICIÓN DE PERIODO EN HISTORIAL */}
              {editing && (
                <label className={styles.setupGrid}>
                  Periodo de la jugada
                  <select
                    value={editing.period}
                    onChange={(e) => setEditing({ ...editing, period: Number(e.target.value) })}
                  >
                    {Array.from({ length: s.period }, (_, i) => (
                      <option key={i} value={i + 1}>
                        Cuarto {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* 1. SELECCIÓN DE JUGADOR / GORRO */}
              {panel === "players" && (
                <div className={styles.playerModalGrid}>
                  {(side === "us"
                    ? s.players.map((p) => ({ cap: p.cap, name: p.name }))
                    : s.opponentCaps.map((n) => ({ cap: n, name: `Rival #${n}` }))
                  ).map((p) => {
                    const t = playerTotals(s, side, p.cap);
                    const isOut = t.red || t.exclusions >= 3;
                    return (
                      <button
                        key={p.cap}
                        type="button"
                        className={styles.playerModalBtn}
                        style={isOut ? { background: "#fee2e2", borderColor: "#ef4444" } : {}}
                        onClick={() => openPlayer(side, p.cap)}
                      >
                        <strong>{p.cap}</strong>
                        <span>{p.name}</span>
                        <small>
                          {isOut
                            ? "FUERA"
                            : `${t.exclusions}/3 faltas${t.goals > 0 ? ` · ${t.goals}g` : ""}`}
                        </small>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. ACCIONES EN 2 CLICS (RIVAL) */}
              {panel === "actions" && side === "them" && (
                <div className={styles.actionStack}>
                  <div className={styles.rivalModalHeader}>
                    <span className={styles.rivalCapCircle}>{cap}</span>
                    <div>
                      <strong>Gorro Rival #{cap}</strong>
                      <p>
                        Goles: {playerTotals(s, "them", cap!).goals} · Faltas:{" "}
                        {playerTotals(s, "them", cap!).exclusions}/3
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.btnGoal}`}
                    style={{ minHeight: "72px", fontSize: "20px" }}
                    onClick={() => void add("goal")}
                  >
                    <span>⚽ Gol del Rival</span>
                    <ChevronRight size={24} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.btnExclusion}`}
                    style={{ minHeight: "72px", fontSize: "20px" }}
                    onClick={() => void add("exclusion")}
                  >
                    <span>⚠️ Expulsión del Rival</span>
                    <ChevronRight size={24} />
                  </button>

                  <div className={styles.actionGrid2}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => void add("penalty")}
                    >
                      <span>🛑 Penalti cometido</span>
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => void add("goal_penalty")}
                    >
                      <span>🎯 Gol de penalti</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.periodCancelBtn}
                    onClick={() => setPanel("players")}
                  >
                    ← Elegir otro gorro rival
                  </button>
                </div>
              )}

              {/* 2. ACCIONES EN 2 CLICS (MORVEDRE) */}
              {panel === "actions" && side === "us" && (
                <>
                  {outWarning ? (
                    <div className={styles.warning}>
                      <p>
                        ⚠️ <strong>Este jugador tiene 3 faltas o tarjeta roja y está fuera.</strong>
                      </p>
                      <p>¿Estás registrando una jugada anterior que se te pasó apuntar?</p>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => setOutWarning(false)}
                      >
                        Sí, registrar jugada anterior
                      </button>
                      <button
                        type="button"
                        className={styles.periodCancelBtn}
                        onClick={() => setPanel("players")}
                      >
                        Cancelar y elegir otro jugador
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* GRUPO GOLES */}
                      <div className={styles.actionGroup}>
                        <span className={styles.actionGroupTitle}>⚽ Goles de Morvedre</span>
                        <div className={styles.actionStack}>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.btnGoal}`}
                            onClick={() => void add("goal")}
                          >
                            <span>⚽ Gol normal</span>
                            <ChevronRight size={18} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.btnGoal}`}
                            onClick={() => void add("goal_extra")}
                          >
                            <span>➕ Gol en superioridad (1+)</span>
                            <ChevronRight size={18} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.btnGoal}`}
                            onClick={() => void add("goal_penalty")}
                          >
                            <span>🎯 Gol de penalti</span>
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>

                      {/* GRUPO SANCIONES */}
                      <div className={styles.actionGroup}>
                        <span className={styles.actionGroupTitle}>⚠️ Sanciones y faltas</span>
                        <div className={styles.actionStack}>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.btnExclusion}`}
                            onClick={() => void add("exclusion")}
                          >
                            <span>⚠️ Expulsión ordinaria (20s)</span>
                            <ChevronRight size={18} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.btnExclusion}`}
                            onClick={() => void add("penalty")}
                          >
                            <span>🛑 Penalti cometido · +1 falta</span>
                            <ChevronRight size={18} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.btnRed}`}
                            onClick={() => void add("red")}
                          >
                            <span>🟥 Tarjeta roja directa (Fuera)</span>
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>

                      {/* GRUPO PORTERÍA (SI ES PORTERO O ESTÁ EN JUEGO) */}
                      {(cap === 1 || cap === 13 || cap === s.keeper) && (
                        <div className={styles.actionGroup}>
                          <span className={styles.actionGroupTitle}>🧤 Acciones de portero</span>
                          <div className={styles.actionGrid2}>
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.btnKeeper}`}
                              onClick={() => void add("save")}
                            >
                              <span>🧤 Parada</span>
                              <ChevronRight size={18} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.btnKeeper}`}
                              onClick={() => void add("penalty_save")}
                            >
                              <span>🛡️ Penalti parado</span>
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* GRUPO TIROS SIN GOL */}
                      <div className={styles.actionGroup}>
                        <span className={styles.actionGroupTitle}>🎯 Otros lanzamientos</span>
                        <div className={styles.actionGrid2}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => void add("shot_out")}
                          >
                            <span>Fuera / palo</span>
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => void add("shot_saved")}
                          >
                            <span>Parada del rival</span>
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => void add("shot_blocked")}
                          >
                            <span>Bloqueado</span>
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => void add("penalty_missed")}
                          >
                            <span>Penalti fallado</span>
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.periodCancelBtn}
                        onClick={() => setPanel("players")}
                      >
                        ← Elegir otro jugador de Morvedre
                      </button>
                    </>
                  )}
                </>
              )}

              {/* 3. TIEMPOS MUERTOS Y BANQUILLO */}
              {panel === "bench" && (
                <div className={styles.actionStack}>
                  <div className={styles.actionGroup}>
                    <span className={styles.actionGroupTitle}>⏱️ Tiempos muertos pedidos</span>
                    <div className={styles.actionStack}>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.btnGoal}`}
                        onClick={() => {
                          setSide("us");
                          void add("timeout");
                        }}
                      >
                        <span>🔵 Tiempo muerto Morvedre</span>
                        <span>
                          {active.filter((e) => e.side === "us" && e.kind === "timeout").length} en
                          total
                        </span>
                      </button>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => {
                          setSide("them");
                          void add("timeout");
                        }}
                      >
                        <span>⚪ Tiempo muerto Rival</span>
                        <span>
                          {active.filter((e) => e.side === "them" && e.kind === "timeout").length} en
                          total
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className={styles.actionGroup}>
                    <span className={styles.actionGroupTitle}>Tarjetas al banquillo</span>
                    <div className={styles.actionStack}>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.btnExclusion}`}
                        onClick={() => {
                          setSide("us");
                          void add("coach_yellow");
                        }}
                      >
                        <span>🟨 Amarilla al entrenador Morvedre</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.btnRed}`}
                        onClick={() => {
                          setSide("us");
                          void add("coach_red");
                        }}
                      >
                        <span>🟥 Roja al entrenador Morvedre</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.btnExclusion}`}
                        onClick={() => {
                          setSide("them");
                          void add("coach_yellow");
                        }}
                      >
                        <span>🟨 Amarilla al entrenador Rival</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.btnRed}`}
                        onClick={() => {
                          setSide("them");
                          void add("coach_red");
                        }}
                      >
                        <span>🟥 Roja al entrenador Rival</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. MODAL CLARO DE FINALIZAR CUARTO */}
              {panel === "periods" && (
                <div className={styles.actionStack}>
                  <div className={styles.periodModalCard}>
                    <span className={styles.periodModalPartial}>
                      Resultado del Cuarto {s.period}:
                      <strong>
                        Morvedre {score(s, "us", s.period)} — {score(s, "them", s.period)} Rival
                      </strong>
                    </span>

                    <span className={styles.periodModalGlobal}>
                      Marcador Global Acumulado:
                      <strong>
                        Morvedre {score(s, "us")} — {score(s, "them")} Rival
                      </strong>
                    </span>
                  </div>

                  {playing && (
                    <>
                      {s.period < s.periods ? (
                        <>
                          <button
                            type="button"
                            className={styles.periodConfirmBtn}
                            onClick={() =>
                              void patch({
                                ...s,
                                period: s.period + 1,
                                phase: "playing",
                              })
                            }
                          >
                            ▶ Comenzar Cuarto {s.period + 1} Ahora
                          </button>

                          <button
                            type="button"
                            className={styles.periodBreakBtn}
                            onClick={() =>
                              void patch({
                                ...s,
                                phase: "break",
                              })
                            }
                          >
                            ⏸️ Poner en pausa (Descanso 2 min)
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={`${styles.periodConfirmBtn} ${styles.periodFinishBtn}`}
                          onClick={() =>
                            void patch({
                              ...s,
                              phase: "finished",
                            })
                          }
                        >
                          🏆 Confirmar y Finalizar Partido
                        </button>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    className={styles.periodCancelBtn}
                    onClick={() => closePanel()}
                  >
                    ↩️ Seguir jugando este cuarto (pulsado por error)
                  </button>
                </div>
              )}

              {/* 5. SELECCIÓN DE PORTERO */}
              {panel === "keeper" && (
                <div className={styles.playerModalGrid}>
                  {s.players.map((p) => (
                    <button
                      key={p.cap}
                      type="button"
                      className={styles.playerModalBtn}
                      style={s.keeper === p.cap ? { borderColor: "#0284c7", background: "#f0f9ff" } : {}}
                      disabled={!enabled}
                      onClick={() => void patch({ ...s, keeper: p.cap })}
                    >
                      <strong>#{p.cap}</strong>
                      <span>{p.name}</span>
                      {s.keeper === p.cap && <small style={{ color: "#0284c7" }}>En juego</small>}
                    </button>
                  ))}
                </div>
              )}

              {/* 6. HISTORIAL DE JUGADAS */}
              {panel === "history" && (
                <>
                  {active.length === 0 ? (
                    <p>Todavía no se ha registrado ninguna jugada en este partido.</p>
                  ) : (
                    <ul className={styles.historyList}>
                      {[...active].reverse().map((e) => (
                        <li key={e.id} className={styles.historyItem}>
                          <div className={styles.historyItemHeader}>
                            <span>Cuarto {e.period}</span>
                            <span>{e.side === "us" ? "Morvedre" : "Rival"}</span>
                          </div>
                          <div className={styles.historyItemText}>{describeEvent(e, s)}</div>
                          {enabled && (
                            <div className={styles.historyItemActions}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditing(e);
                                  setSide(e.side);
                                  setCap(e.cap);
                                  setOutWarning(false);
                                  setPanel(e.cap === null ? "bench" : "actions");
                                }}
                              >
                                Corregir
                              </button>
                              <button type="button" onClick={() => void remove(e)}>
                                Anular jugada
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {/* 7. COMPARTIR ACTA OFICIAL */}
              {panel === "share" && (
                <div className={styles.actionStack}>
                  <p>
                    <strong>{closed ? "Acta Oficial Terminada" : "Acta Provisional"}</strong> ·{" "}
                    {record.team} contra {record.opponent}
                  </p>
                  <p>
                    El documento PDF oficial incluye el resultado, los parciales de cada cuarto,
                    goleadores, sanciones y la cronología completa del partido.
                  </p>
                  {record.dirty && (
                    <p style={{ color: "#b45309" }}>
                      ⚠️ Tienes cambios guardados solo en este móvil. El PDF incluirá todos los datos.
                    </p>
                  )}
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.btnGoal}`}
                    style={{ justifyContent: "center" }}
                    onClick={() => void share()}
                  >
                    Compartir o descargar PDF
                  </button>
                  {shareError && <p role="alert">{shareError}</p>}
                </div>
              )}

              {/* 8. RELEVO DE DISPOSITIVO */}
              {panel === "takeover" && (
                <div className={styles.actionStack}>
                  <p>
                    Confirma con el otro delegado o entrenador que ha enviado sus jugadas. Al tomar
                    el relevo, este móvil pasará a ser el dispositivo oficial que anota el partido.
                  </p>
                  <button
                    type="button"
                    className={styles.periodConfirmBtn}
                    onClick={() => void takeover()}
                  >
                    Confirmar relevo en este móvil
                  </button>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

