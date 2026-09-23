"use client";

import { useEffect, useRef, useState } from "react";

import { LiveMatchEntryState } from "./live-match-entry-state";

import * as Dialog from "@radix-ui/react-dialog";

import { ArrowRightLeft, ChevronLeft, Download, MessageCircle, X } from "lucide-react";

import {
  actionLabels,
  describeEvent,
  finalScore,
  findPenaltyGoalCandidate,
  isGoal,
  playerTotals,
  score,
  timeoutCount,
  type ActionKind,
  type LiveSheet,
  type MatchEvent,
  type Side,
} from "@/lib/domain/live-match";

import { useLiveMatch } from "./use-live-match";
import { generateUuid } from "@/lib/utils/uuid";

import styles from "./live-match.module.css";

import { ActaScoreboard } from "./acta-scoreboard";
import { ActaShootout } from "./acta-shootout";

import { ActaPlayerName } from "./acta-player-name";
import { ActaPlayerBoard } from "./acta-player-board";
import { ActaKeeperControl } from "./acta-keeper-control";
import { selectMatchKeeper } from "@/lib/domain/live-match-keepers";
import { ActaMatchControls } from "./acta-match-controls";

type Panel =
  | "players"
  | "actions"
  | "player-stats"
  | "goal"
  | "shot"
  | "miss-correction"
  | "sanction"
  | "bench"
  | "bench-side"
  | "bench-actions"
  | "periods"
  | "break-start"
  | "shootout-start"
  | "history"
  | "keeper"
  | "keeper-action"
  | "assist"
  | "assist-edit"
  | "penalty-shooter"
  | "penalty-result"
  | "duplicate-penalty"
  | "assist-relation"
  | "penalty-relation"
  | "delete"
  | "share"
  | "takeover"
  | null;

export function LiveMatchClient() {
  const { record, error, preparation, busy, writable, online, change, retry, takeover } =
    useLiveMatch();

  const [historySide, setHistorySide] = useState<Side>("us");
  const [panel, setPanel] = useState<Panel>(null);

  const [side, setSide] = useState<Side>("us");

  const [cap, setCap] = useState<number | null>(null);

  const [editing, setEditing] = useState<MatchEvent | null>(null);
  const [deleting, setDeleting] = useState<MatchEvent | null>(null);
  const [duplicate, setDuplicate] = useState<{
    existing: MatchEvent;
    direction: "manual_then_penalty" | "penalty_then_manual";
    shooterCap: number;
    penaltyEventId?: string;
  } | null>(null);
  const [assistRelation, setAssistRelation] = useState<{
    corrected: MatchEvent;
    assist: MatchEvent;
  } | null>(null);
  const [keeperAction, setKeeperAction] = useState<MatchEvent | null>(null);
  const [penaltyRelation, setPenaltyRelation] = useState<{
    corrected: MatchEvent;
    related: MatchEvent;
    correctedIsPenalty: boolean;
  } | null>(null);
  const localMutation = useRef(false);
  const lastAction = useRef<{ key: string; at: number } | null>(null);
  const closingPanel = useRef(false);
  const lastActivePanelRef = useRef<Exclude<Panel, null>>("players");
  if (panel !== null) {
    lastActivePanelRef.current = panel;
  }
  const activePanel = panel ?? lastActivePanelRef.current;

  useEffect(() => {
    if (panel !== null) closingPanel.current = false;
  }, [panel]);

  const [notice, setNotice] = useState("");
  const [pendingNotice, setPendingNotice] = useState("");

  const [shareError, setShareError] = useState("");
  const [preparedPdf, setPdf] = useState<{
    matchId: string;
    revision: number;
    mutation: string;
    file: File;
  } | null>(null);
  const pdf =
    preparedPdf &&
    record &&
    preparedPdf.matchId === record.matchId &&
    preparedPdf.revision === record.revision &&
    preparedPdf.mutation === record.mutation
      ? preparedPdf.file
      : null;
  useEffect(() => {
    if (panel !== "share" || !record) return;
    let cancelled = false;
    void import("@/lib/domain/acta-pdf")
      .then(({ createActaPdf }) => {
        if (!cancelled)
          setPdf({
            matchId: record.matchId,
            revision: record.revision,
            mutation: record.mutation,
            file: createActaPdf(record),
          });
      })
      .catch(() => {
        if (!cancelled)
          setShareError("No pudimos preparar el PDF. Cierra este panel y vuelve a abrirlo.");
      });
    return () => {
      cancelled = true;
    };
  }, [panel, record]);

  const [outWarning, setOutWarning] = useState(false);

  const [benchKind, setBenchKind] = useState<"timeout" | "cards">("timeout");
  const [showAllKeepers, setShowAllKeepers] = useState(false);
  const [keeperStart, setKeeperStart] = useState(false);
  const [keeperMode, setKeeperMode] = useState<"change" | "correct">("change");

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => setNotice(""), 4500);

    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!record?.sheet.pending || panel) return;
    setPanel(
      record.sheet.pending.kind === "assist"
        ? "assist"
        : record.sheet.pending.shooter_cap
          ? "penalty-result"
          : "penalty-shooter",
    );
  }, [panel, record?.sheet.pending]);

  if (!record)
    return (
      <LiveMatchEntryState
        key={preparation ? "preparation" : "loading"}
        error={error}
        preparation={preparation}
      />
    );

  const s = record.sheet;
  const pending = s.pending;
  const closed = s.phase === "finished";
  const enabled = writable && !closed && !busy;
  const playing = enabled && s.phase === "playing";
  const orderedPlayers = s.players.filter((p) => !p.retired).sort((a, b) => a.cap - b.cap);

  const currentPlayer = s.players.find((p) => p.cap === cap);

  const active = s.events.filter((e) => !e.deleted);
  const deletingHasPenaltyResult = Boolean(
    deleting?.kind === "penalty" &&
    s.events.some(
      (event) =>
        !event.deleted && event.origin === "penalty_flow" && event.related_event_id === deleting.id,
    ),
  );

  function openKeeper(start = false, mode: "change" | "correct" = "change") {
    setKeeperStart(start);
    setKeeperMode(mode);
    setShowAllKeepers(false);
    setPanel("keeper");
  }

  function openPlayer(which: Side, n: number) {
    setSide(which);

    setCap(n);

    if (editing?.kind === "assist" && which === "us") {
      setEditing({ ...editing, cap: n });
      setPanel("assist-edit");
      return;
    }

    setPanel("actions");

    const totals = playerTotals(s!, which, n);

    setOutWarning(totals.red || totals.exclusions >= 3);
  }

  function closePanel() {
    closingPanel.current = true;
    setPanel(null);
    setPendingNotice("");

    setEditing(null);

    setOutWarning(false);
    setDuplicate(null);
    setDeleting(null);
    setAssistRelation(null);
    setKeeperAction(null);
    setPenaltyRelation(null);
  }

  async function dismissPanel() {
    if (closingPanel.current) return;
    if (s.pending) {
      setPendingNotice(
        s.pending.kind === "assist"
          ? "Elige un asistente o pulsa Sin asistencia."
          : "Termina el lanzamiento antes de seguir.",
      );
      setPanel(
        s.pending.kind === "assist"
          ? "assist"
          : s.pending.shooter_cap === null
            ? "penalty-shooter"
            : "penalty-result",
      );
      return;
    }
    closingPanel.current = true;
    closePanel();
  }

  function goBack() {
    if (!panel) return;
    if (panel === "miss-correction") {
      setPanel("history");
      return;
    }
    if (
      [
        "player-stats",
        "goal",
        "shot",
        "sanction",
        "keeper-action",
        "assist-relation",
        "penalty-relation",
      ].includes(panel)
    ) {
      setPanel("actions");
      return;
    }
    if (panel === "actions") {
      setPanel(editing ? "history" : "players");
      return;
    }
    if (panel === "bench-actions") {
      setPanel("bench-side");
      return;
    }
    if (panel === "bench-side") {
      setPanel("bench");
      return;
    }
    if (panel === "penalty-result") {
      setPanel("penalty-shooter");
      return;
    }
    if (panel === "duplicate-penalty" && duplicate) {
      setPanel(duplicate.direction === "manual_then_penalty" ? "penalty-result" : "actions");
      return;
    }
    if (panel === "delete") {
      setDeleting(null);
      setPanel("history");
      return;
    }
    if (panel === "players" && editing) {
      setPanel(editing.kind === "assist" ? "assist-edit" : "actions");
      return;
    }
    if (panel === "assist-edit") {
      setPanel("history");
      return;
    }
    void dismissPanel();
  }

  async function patch(next: LiveSheet, shouldClose = true) {
    if (localMutation.current) return false;
    localMutation.current = true;
    let ok = false;
    try {
      ok = await change(next);
    } finally {
      localMutation.current = false;
    }

    if (ok) setPendingNotice("");
    if (ok && shouldClose) closePanel();

    return ok;
  }

  function acceptAction(key: string) {
    const now = Date.now();
    if (lastAction.current?.key === key && now - lastAction.current.at < 800) return false;
    lastAction.current = { key, at: now };
    return true;
  }

  async function add(kind: ActionKind, eventSide: Side = side, missOutcome?: "out" | "save") {
    if (!s || (!playing && !editing)) return;
    if (
      !acceptAction(
        `${editing?.id ?? "new"}:${s.period}:${eventSide}:${cap}:${kind}:${missOutcome ?? ""}`,
      )
    )
      return;

    if (!editing && eventSide === "them" && isGoal(kind)) {
      const currentKeeper = s.keeper === null ? null : playerTotals(s, "us", s.keeper);
      if (!currentKeeper || currentKeeper.red || currentKeeper.exclusions >= 3) {
        setNotice("Elige quién está de portero antes de apuntar el gol rival");
        setShowAllKeepers(false);
        openKeeper();
        return;
      }
    }

    const bench = kind === "timeout" || kind.startsWith("coach_");

    const keepPenaltyLink =
      editing?.origin === "penalty_flow" &&
      ["goal_penalty", "penalty_missed", "goal", "penalty_save", "keeper_out"].includes(kind);
    const keepAssistLink = editing?.kind === "assist" && kind === "assist";
    const event: MatchEvent = {
      id: editing?.id ?? generateUuid(),

      side: eventSide,

      cap: bench ? null : cap,

      kind,
      missOutcome: kind === "penalty_missed" ? missOutcome : undefined,

      period: editing?.period ?? s.period,

      keeper: eventSide === "them" && isGoal(kind) ? (editing?.keeper ?? s.keeper) : null,

      deleted: false,
      related_event_id: keepPenaltyLink || keepAssistLink ? editing?.related_event_id : null,
      origin: keepPenaltyLink ? "penalty_flow" : keepAssistLink ? editing?.origin : "manual",
    };

    const linkedAssist = editing
      ? s.events.find(
          (candidate) =>
            !candidate.deleted &&
            candidate.kind === "assist" &&
            candidate.related_event_id === editing.id,
        )
      : undefined;
    if (
      linkedAssist &&
      (!["goal", "goal_extra"].includes(kind) ||
        linkedAssist.cap === event.cap ||
        linkedAssist.period !== event.period)
    ) {
      setAssistRelation({ corrected: event, assist: linkedAssist });
      setPanel("assist-relation");
      return;
    }

    const linkedPenaltyResult = editing
      ? s.events.find(
          (candidate) =>
            !candidate.deleted &&
            candidate.origin === "penalty_flow" &&
            candidate.related_event_id === editing.id,
        )
      : undefined;
    const parentPenalty =
      editing?.origin === "penalty_flow" && editing.related_event_id
        ? s.events.find(
            (candidate) => !candidate.deleted && candidate.id === editing.related_event_id,
          )
        : undefined;
    if (
      linkedPenaltyResult &&
      (event.kind !== "penalty" || linkedPenaltyResult.period !== event.period)
    ) {
      setPenaltyRelation({
        corrected: event,
        related: linkedPenaltyResult,
        correctedIsPenalty: true,
      });
      setPanel("penalty-relation");
      return;
    }
    if (parentPenalty && keepPenaltyLink && parentPenalty.period !== event.period) {
      setPenaltyRelation({
        corrected: event,
        related: parentPenalty,
        correctedIsPenalty: false,
      });
      setPanel("penalty-relation");
      return;
    }

    if (
      !editing &&
      eventSide === "us" &&
      (kind === "save" || kind === "penalty_save" || kind === "keeper_out") &&
      cap !== s.keeper
    ) {
      setKeeperAction(event);
      setPanel("keeper-action");
      return;
    }

    const events = editing
      ? s.events.map((e) => (e.id === editing.id ? event : e))
      : [...s.events, event];

    if (!editing && eventSide === "us" && kind === "goal_penalty") {
      const candidate = findPenaltyGoalCandidate(s, "penalty_then_manual", cap!);
      if (candidate) {
        setDuplicate({
          existing: candidate,
          direction: "penalty_then_manual",
          shooterCap: cap!,
        });
        setPanel("duplicate-penalty");
        return;
      }
    }

    if (!editing && eventSide === "us" && (kind === "goal" || kind === "goal_extra")) {
      const next = { ...s, events, pending: { kind: "assist" as const, goal_event_id: event.id } };
      if (await patch(next, false)) {
        setNotice(`${actionLabels[kind]} registrado`);
        setPanel("assist");
      }
      return;
    }

    const keeperMustChange =
      !editing &&
      eventSide === "us" &&
      cap !== null &&
      cap === s.keeper &&
      (kind === "red" ||
        ((kind === "exclusion" || kind === "penalty") &&
          playerTotals(s, "us", cap).exclusions + 1 >= 3));
    if (keeperMustChange) {
      if (await patch({ ...s, events }, false)) {
        setNotice(`${actionLabels[kind]} registrado · Elige nuevo portero`);
        setShowAllKeepers(false);
        openKeeper();
      }
      return;
    }
    if (await patch({ ...s, events })) {
      setNotice(
        kind === "timeout"
          ? `Tiempo muerto de ${eventSide === "us" ? "Morvedre" : "Rival"} guardado · lleva ${timeoutCount(s, eventSide) + 1}`
          : `${actionLabels[kind]} registrado`,
      );
    }
  }

  async function addRivalPenalty(penaltySide: Side = "them") {
    if (!acceptAction(`penalty:${s.period}:${penaltySide}:${cap}`)) return;
    const penalty: MatchEvent = {
      id: editing?.id ?? generateUuid(),
      side: penaltySide,
      cap,
      kind: "penalty",
      period: editing?.period ?? s.period,
      keeper: null,
      deleted: false,
      related_event_id: null,
      origin: "manual",
    };
    if (editing) {
      await add("penalty", penaltySide);
      return;
    }
    const next = {
      ...s,
      events: [...s.events, penalty],
      pending: {
        kind: "penalty_shot" as const,
        penalty_event_id: penalty.id,
        shooter_cap: null,
      },
    };
    if (await patch(next, false)) {
      setNotice(`Penalti de ${penaltySide === "us" ? "Morvedre" : "rival"} #${cap} guardado`);
      setPanel("penalty-shooter");
    }
  }

  async function choosePenaltyShooter(shooterCap: number) {
    if (s.pending?.kind !== "penalty_shot") return;
    if (await patch({ ...s, pending: { ...s.pending, shooter_cap: shooterCap } }, false)) {
      setPanel("penalty-result");
    }
  }

  async function finishPenaltyShot(result: "goal" | "save" | "out") {
    if (s.pending?.kind !== "penalty_shot" || s.pending.shooter_cap === null) return;
    const shooterCap = s.pending.shooter_cap;
    const penaltyEventId = s.pending.penalty_event_id;
    const penalty = s.events.find((event) => event.id === penaltyEventId && !event.deleted);
    if (!penalty) {
      setNotice("El penalti ya no está disponible. Revisa las jugadas.");
      return;
    }
    if (penalty.side === "us") {
      const keeper = s.keeper === null ? null : playerTotals(s, "us", s.keeper);
      if (!keeper || keeper.red || keeper.exclusions >= 3) {
        setNotice("Elige un portero disponible antes de registrar el lanzamiento.");
        openKeeper();
        return;
      }
      const event: MatchEvent = {
        id: generateUuid(),
        side: result === "goal" ? "them" : "us",
        cap: result === "goal" ? shooterCap : s.keeper,
        kind: result === "goal" ? "goal" : result === "save" ? "penalty_save" : "keeper_out",
        period: penalty.period,
        keeper: s.keeper,
        deleted: false,
        related_event_id: penalty.id,
        origin: "penalty_flow",
      };
      if (await patch({ ...s, events: [...s.events, event], pending: null }))
        setNotice(
          result === "goal"
            ? "Gol de penalti rival registrado"
            : result === "save"
              ? "Penalti parado registrado"
              : "Penalti fuera registrado",
        );
      return;
    }
    if (result === "goal") {
      const candidate = findPenaltyGoalCandidate(
        s,
        "manual_then_penalty",
        shooterCap,
        penaltyEventId,
      );
      if (candidate) {
        setDuplicate({
          existing: candidate,
          direction: "manual_then_penalty",
          shooterCap,
          penaltyEventId: s.pending.penalty_event_id,
        });
        setPanel("duplicate-penalty");
        return;
      }
    }
    const event: MatchEvent = {
      id: generateUuid(),
      side: "us",
      cap: shooterCap,
      kind: result === "goal" ? "goal_penalty" : "penalty_missed",
      missOutcome: result === "goal" ? undefined : result,
      period: penalty.period,
      keeper: null,
      deleted: false,
      related_event_id: penaltyEventId,
      origin: "penalty_flow",
    };
    if (await patch({ ...s, events: [...s.events, event], pending: null })) {
      setNotice(result === "goal" ? "Gol de penalti registrado" : "Penalti fallado registrado");
    }
  }

  async function resolveDuplicate(isSame: boolean) {
    if (!duplicate) return;
    const currentExisting = s.events.find(
      (event) => event.id === duplicate.existing.id && !event.deleted,
    );
    if (!currentExisting) {
      setDuplicate(null);
      setNotice("La jugada candidata ha cambiado. Revisa el penalti antes de continuar.");
      setPanel(duplicate.direction === "manual_then_penalty" ? "penalty-result" : "actions");
      return;
    }
    if (isSame) {
      if (duplicate.direction === "manual_then_penalty" && duplicate.penaltyEventId) {
        const events = s.events.map((event) =>
          event.id === duplicate.existing.id
            ? {
                ...event,
                related_event_id: duplicate.penaltyEventId,
                origin: "penalty_flow" as const,
              }
            : event,
        );
        if (await patch({ ...s, events, pending: null })) {
          setNotice("Gol existente vinculado al penalti");
        }
      } else {
        closePanel();
        setNotice("El gol ya estaba apuntado");
      }
      setDuplicate(null);
      return;
    }
    const event: MatchEvent = {
      id: generateUuid(),
      side: "us",
      cap: duplicate.shooterCap,
      kind: "goal_penalty",
      period:
        duplicate.direction === "manual_then_penalty"
          ? (s.events.find((candidate) => candidate.id === duplicate.penaltyEventId)?.period ??
            s.period)
          : s.period,
      keeper: null,
      deleted: false,
      related_event_id:
        duplicate.direction === "manual_then_penalty" ? duplicate.penaltyEventId : null,
      origin: duplicate.direction === "manual_then_penalty" ? "penalty_flow" : "manual",
    };
    setDuplicate(null);
    if (
      await patch({
        ...s,
        events: [...s.events, event],
        pending: duplicate.direction === "manual_then_penalty" ? null : s.pending,
      })
    ) {
      setNotice("Nuevo gol de penalti registrado");
    }
  }

  async function saveAssistRelation(mode: "remove" | "independent", newAssistCap?: number) {
    if (!assistRelation) return;
    const events = s.events.map((event) => {
      if (event.id === assistRelation.corrected.id) return assistRelation.corrected;
      if (event.id !== assistRelation.assist.id) return event;
      if (typeof newAssistCap === "number") {
        return { ...event, cap: newAssistCap, period: assistRelation.corrected.period };
      }
      if (mode === "remove") return { ...event, deleted: true };
      return { ...event, related_event_id: null, origin: "manual" as const };
    });
    if (await patch({ ...s, events })) {
      setNotice("Jugada y asistencia corregidas");
    }
  }

  async function savePenaltyRelation(keepLinked: boolean) {
    if (!penaltyRelation) return;
    const events = s.events.map((event) => {
      if (event.id === penaltyRelation.corrected.id) return penaltyRelation.corrected;
      if (event.id !== penaltyRelation.related.id) return event;
      if (!keepLinked) {
        return { ...event, related_event_id: null, origin: "manual" as const };
      }
      return { ...event, period: penaltyRelation.corrected.period };
    });
    if (await patch({ ...s, events })) {
      setNotice(keepLinked ? "Jugada vinculada corregida" : "Jugada corregida y desvinculada");
    }
  }

  async function saveKeeperAction(changeKeeper: boolean) {
    if (!keeperAction || keeperAction.cap === null) return;
    if (
      await patch({
        ...s,
        ...(changeKeeper ? selectMatchKeeper(s, keeperAction.cap, "change") : s),
        events: [...s.events, keeperAction],
      })
    ) {
      setNotice(
        changeKeeper
          ? `${actionLabels[keeperAction.kind]} registrada · portero actualizado`
          : `${actionLabels[keeperAction.kind]} registrada como jugada anterior`,
      );
    }
  }

  async function remove(event: MatchEvent, cascade = true) {
    const linkedIds = new Set(
      s!.events
        .filter((candidate) => candidate.related_event_id === event.id)
        .map((candidate) => candidate.id),
    );
    const saved = await patch({
      ...s!,
      events: s!.events.map((candidate) =>
        candidate.id === event.id
          ? { ...candidate, deleted: true }
          : linkedIds.has(candidate.id)
            ? cascade
              ? { ...candidate, deleted: true }
              : { ...candidate, related_event_id: null, origin: "manual" as const }
            : candidate,
      ),
      pending: null,
    });

    if (saved) setNotice("Jugada anulada");
    setDeleting(null);
  }

  function downloadPdf(targetFile?: File) {
    const file = targetFile ?? pdf;
    if (!file) return;
    setShareError("");
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch {
      setShareError("No se pudo descargar el PDF en este dispositivo.");
    }
  }

  async function share() {
    if (!record) return;
    setShareError("");

    let file = pdf;
    if (!file) {
      try {
        const { createActaPdf } = await import("@/lib/domain/acta-pdf");
        file = createActaPdf(record);
        setPdf({
          matchId: record.matchId,
          revision: record.revision,
          mutation: record.mutation,
          file,
        });
      } catch {
        setShareError("No pudimos preparar el PDF para compartir.");
        return;
      }
    }

    const shareData = { files: [file] };

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          return;
        }
      }
    }

    try {
      downloadPdf(file);
      const summary = `*Acta oficial Morvedre Core*\n${record.team} vs ${record.opponent}\nResultado: ${score(record.sheet, "us")}–${score(record.sheet, "them")}\n(Se ha descargado el PDF en tu dispositivo para adjuntarlo)`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(summary)}`;
      window.open(waUrl, "_blank");
    } catch {
      setShareError(
        "No pudimos abrir WhatsApp directamente. El PDF se ha descargado en tu dispositivo.",
      );
    }
  }

  const titles: Partial<Record<Exclude<Panel, null>, string>> = {
    players: side === "us" ? "Seleccionar jugador · Morvedre" : "Seleccionar gorro · Rival",
    bench: "Entrenador",
    "bench-side":
      benchKind === "timeout" ? "¿Quién pide tiempo muerto?" : "¿Qué entrenador recibe la tarjeta?",
    "bench-actions": `${side === "us" ? "Morvedre" : "Rival"} · Entrenador`,
    periods: s.phase === "playing" ? `Terminar cuarto ${s.period}` : "Cuartos del partido",
    "break-start": `Empezar cuarto ${s.period + 1}`,
    "shootout-start": "¿Quién lanza primero?",
    history: "Corregir una jugada",
    "player-stats": "Estadísticas del jugador",
    keeper: keeperStart
      ? `Portero del cuarto ${s.period + 1}`
      : keeperMode === "correct"
        ? "Corregir portero"
        : "Portero en juego",
    "keeper-action": "¿Quién estaba en portería?",
    assist: "¿Quién dio la asistencia?",
    "assist-edit": "Corregir asistencia",
    "penalty-shooter": "¿Quién tira el penalti?",
    "penalty-result": "Resultado del penalti",
    "duplicate-penalty": "¿Es el mismo gol de penalti?",
    "assist-relation": "Resolver la asistencia",
    "penalty-relation": "Resolver el penalti vinculado",
    delete: "Anular jugada",
    share: "Compartir acta",
    takeover: "Tomar el relevo",
    actions: "¿Qué ha pasado?",
    goal: "¿Qué tipo de gol?",
    shot: "¿Cómo termina el tiro?",
    "miss-correction": "Corregir penalti fallado",
    sanction: "¿Qué sanción ha sido?",
  };
  const title =
    activePanel === "keeper" && keeperStart
      ? `Empezar cuarto ${s.period + 1}`
      : activePanel === "keeper" && keeperMode === "correct"
        ? "Corregir portero"
        : activePanel
          ? (titles[activePanel] ?? "Acta")
          : "Acta";

  const button = (label: string, onClick: () => void, extra = "") => (
    <button type="button" className={`${styles.action} ${extra}`} disabled={busy} onClick={onClick}>
      {label}
    </button>
  );

  const status = !online
    ? `Sin conexión${record.dirty ? " · Guardado en este móvil" : ""}`
    : record.dirty
      ? "Guardado · Enviando…"
      : notice || (!writable && !closed ? "Solo consulta" : "Guardado");
  const panelContext =
    activePanel === "break-start" || (activePanel === "keeper" && keeperStart)
      ? `Cuarto ${s.period + 1}`
      : editing
        ? `Corrigiendo · Cuarto ${editing.period}`
        : activePanel === "share"
          ? closed
            ? "Acta final"
            : "Acta"
          : `Cuarto ${s.period}`;

  const isKeeperCap = side === "us" && (cap === 1 || cap === 13 || cap === s.keeper);
  const showPlayerBanner =
    cap !== null &&
    ["actions", "goal", "shot", "sanction", "miss-correction"].includes(activePanel);

  const panelHeightClass = (() => {
    if (activePanel === "keeper") {
      return showAllKeepers ? styles.panelPlayers : styles.panelKeeper;
    }
    if (activePanel === "share") return styles.panelShare;
    if (activePanel === "takeover") return styles.panelTakeover;
    if (
      [
        "players",
        "history",
        "player-stats",
        "assist",
        "assist-edit",
        "assist-relation",
        "penalty-shooter",
      ].includes(activePanel)
    ) {
      return styles.panelPlayers;
    }
    if (activePanel === "actions") {
      return isKeeperCap ? styles.panelActionsKeeper : styles.panelActionsField;
    }
    if (activePanel === "goal") {
      return styles.panelGoal;
    }
    if (activePanel === "shot" || activePanel === "miss-correction") {
      return styles.panelShot;
    }
    if (activePanel === "sanction") {
      return styles.panelSanction;
    }
    if (activePanel === "bench" || activePanel === "bench-side") {
      return styles.panelBench;
    }
    if (activePanel === "bench-actions") {
      return styles.panelBenchActions;
    }
    if (activePanel === "periods") {
      return styles.panelPeriods;
    }
    if (
      activePanel === "shootout-start" ||
      activePanel === "break-start" ||
      activePanel === "keeper-action"
    ) {
      return styles.panelChoice;
    }
    if (activePanel === "penalty-result" || activePanel === "duplicate-penalty") {
      return styles.panelPenaltyResult;
    }
    if (activePanel === "delete") {
      return styles.panelDelete;
    }
    return styles.panelDefault;
  })();

  return (
    <main
      id="main-content"
      className={`${styles.root} mx-auto flex h-dvh max-w-3xl flex-col overflow-hidden bg-[#f4f8fb] text-[#062048]`}
    >
      <ActaScoreboard record={record} status={status} onShare={() => setPanel("share")} />

      <div
        data-acta-body
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
        data-acta-scroll
      >
        {error && (
          <div className={`${styles.error} relative z-20`} role="alert">
            <p>{error}</p>

            <button type="button" onClick={() => void retry()}>
              Reintentar envío
            </button>
          </div>
        )}

        {s.phase === "break" && (
          <div
            className="m-3 rounded-2xl border-2 border-[#e4b520] bg-[#fff6cd] p-4 text-center text-[#062048]"
            role="status"
          >
            <p className="text-lg font-black">Descanso · cuarto {s.period + 1} pendiente</p>
            <p className="mt-1 text-base font-semibold">
              Toca la pantalla o el botón inferior para empezar.
            </p>
          </div>
        )}

        {s.phase === "ready" && (
          <section className={styles.preparation}>
            <h2>Todo listo antes del primer balón</h2>

            <p>Revisa los gorros y elige quién empieza en portería.</p>

            <div className={styles.setup}>
              <label>
                Cuartos
                <select
                  value={s.periods}

                  disabled={!enabled}

                  onChange={(e) => void change({ ...s, periods: Number(e.target.value) })}
                >
                  {[2, 4, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} cuartos
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-1">
                <span className="text-sm font-bold">Jugadores rivales</span>
                <div className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2">
                  <button
                    type="button"
                    aria-label="Quitar un jugador rival"
                    className="min-h-12 rounded-lg border border-slate-400 bg-white text-2xl font-bold"
                    disabled={!enabled || s.opponentCaps.length <= 5}
                    onClick={() => void change({ ...s, opponentCaps: s.opponentCaps.slice(0, -1) })}
                  >
                    −
                  </button>
                  <strong className="text-center text-xl tabular-nums">
                    {s.opponentCaps.length}
                  </strong>
                  <button
                    type="button"
                    aria-label="Añadir un jugador rival"
                    className="min-h-12 rounded-lg border border-slate-400 bg-white text-2xl font-bold"
                    disabled={!enabled || s.opponentCaps.length >= 15}
                    onClick={() => {
                      const nextCap = Array.from({ length: 99 }, (_, index) => index + 1).find(
                        (candidate) => !s.opponentCaps.includes(candidate),
                      );
                      if (nextCap)
                        void change({ ...s, opponentCaps: [...s.opponentCaps, nextCap] });
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              className={styles.setupKeeper}

              onClick={() => openKeeper()}

              disabled={!enabled}
            >
              <span className={styles.setupKeeperLabel}>Portero inicial</span>
              <span className={styles.setupKeeperValue}>
                <span className={styles.setupKeeperCap}>{s.keeper ?? "—"}</span>
                <span className={styles.setupKeeperName}>
                  {s.keeper ? (
                    <ActaPlayerName
                      name={s.players.find((p) => p.cap === s.keeper)?.name ?? "Sin nombre"}
                    />
                  ) : (
                    "Elegir portero"
                  )}
                </span>
              </span>
              <span className={styles.setupKeeperAction}>{s.keeper ? "Cambiar" : "Elegir"}</span>
            </button>

            {(s.baseline.some((p) => p.goals || p.exclusions) || s.baselineThem > 0) && (
              <p>
                Conservamos los totales anteriores. No se asignarán a un periodo ni a un tipo de
                jugada.
              </p>
            )}
          </section>
        )}

        {s.shootout ? (
          <ActaShootout
            key={`${record.matchId}-${s.shootout.shots.length}`}
            record={record}
            enabled={enabled}
            change={change}
            onShare={() => setPanel("share")}
          />
        ) : (
          <ActaPlayerBoard
            sheet={s}
            isAway={record.homeAway === "away"}
            playing={playing}
            onPlayer={(which, n) => {
              setEditing(null);
              openPlayer(which, n);
            }}
          >
            {s.phase !== "ready" && !s.shootout && (
              <ActaKeeperControl
                sheet={s}
                disabled={!enabled}
                onChange={() => {
                  setShowAllKeepers(false);
                  openKeeper();
                }}
              />
            )}
          </ActaPlayerBoard>
        )}
        {s.phase === "break" && enabled && (
          <button
            type="button"
            aria-label={`Abrir inicio del cuarto ${s.period + 1}`}
            className="absolute inset-0 z-10 h-full w-full bg-transparent focus-visible:-outline-offset-4 focus-visible:outline-[#1657a8]"
            onClick={() => setPanel("break-start")}
          />
        )}
      </div>

      {s.phase !== "shootout" && !(s.shootout && closed) && (
        <footer className="relative shrink-0 border-t border-[#062048] bg-[#062048] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {s.phase === "ready" ? (
            <button
              className={styles.start}

              disabled={!enabled || !s.keeper}

              onClick={() =>
                s.keeper !== null && void change(selectMatchKeeper(s, s.keeper, "start"))
              }
            >
              Empezar partido
            </button>
          ) : s.phase === "break" ? (
            <button
              className={styles.start}

              disabled={!enabled}

              onClick={() => setPanel("break-start")}
            >
              Toca aquí para empezar el cuarto {s.period + 1}
            </button>
          ) : closed ? (
            <button className={styles.start} onClick={() => setPanel("share")}>
              Ver y compartir acta
            </button>
          ) : (
            <>
              <ActaMatchControls
                sheet={s}
                isAway={record.homeAway === "away"}
                playing={playing}
                onTeam={(nextSide) => {
                  setSide(nextSide);
                  setEditing(null);
                  setPanel("players");
                }}
                onBench={() => {
                  setBenchKind("timeout");
                  setPanel("bench");
                }}
                onHistory={() => setPanel("history")}
                onPeriods={() => setPanel("periods")}
              />
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
      )}

      <Dialog.Root
        open={panel !== null}

        onOpenChange={(open) => {
          if (!open) void dismissPanel();
        }}
      >
        <>
          <Dialog.Overlay className={styles.overlay} />

          <Dialog.Content
            className={`${styles.panel} ${panelHeightClass}`}
            aria-describedby="acta-panel-description"
          >
            <div className={styles.panelHeaderContainer}>
              <div className={styles.panelNavBar}>
                <button
                  type="button"
                  onClick={goBack}
                  className={styles.panelNavigation}
                  aria-label="Atrás"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                  <span>Atrás</span>
                </button>

                <div className={styles.panelContextBadge}>{panelContext}</div>

                <button
                  type="button"
                  onClick={() => void dismissPanel()}
                  className={styles.panelNavigation}
                  aria-label="Cerrar"
                >
                  <span>Cerrar</span>
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              <div className={styles.panelTitleBlock}>
                {showPlayerBanner ? (
                  <div className={styles.playerBanner}>
                    <span
                      className={`${styles.playerBannerCap} ${
                        side === "us" ? styles.playerBannerCapUs : styles.playerBannerCapThem
                      }`}
                    >
                      {cap}
                    </span>
                    <div className={styles.playerBannerInfo}>
                      <Dialog.Title className={styles.playerBannerName}>
                        {side === "us" && currentPlayer ? (
                          <ActaPlayerName name={currentPlayer.name} />
                        ) : (
                          `Gorro #${cap}`
                        )}
                      </Dialog.Title>
                      <p className={styles.playerBannerSubtitle}>
                        {side === "us" ? "Morvedre" : "Rival"} · {title}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Dialog.Title className={styles.panelTitle}>{title}</Dialog.Title>
                  </>
                )}
                <Dialog.Description
                  id="acta-panel-description"
                  className={showPlayerBanner ? "sr-only" : styles.description}
                >
                  {editing
                    ? "Corrige la jugada; los totales se recalculan."
                    : showPlayerBanner
                      ? "Elige una opción para este jugador."
                      : activePanel === "players"
                        ? side === "us"
                          ? "Toca el jugador o su gorro para registrar la acción."
                          : "Toca el gorro del rival."
                        : activePanel === "delete"
                          ? "Revisa la jugada antes de anularla."
                          : ""}
                </Dialog.Description>
              </div>
            </div>

            <div className={styles.panelBody}>
              {pendingNotice && s.pending && (
                <p
                  role="alert"
                  className="mb-3 rounded-xl border-2 border-[#e4b520] bg-[#fff7d6] p-3 text-base font-bold text-[#062048]"
                >
                  {pendingNotice}
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
                >
                  {error}
                </p>
              )}
              {editing && activePanel !== "delete" && (
                <label className={styles.editPeriod}>
                  Cuarto
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

              {activePanel !== "delete" && editing?.side === "them" && isGoal(editing.kind) && (
                <label className="mb-3 block text-base font-bold">
                  Portero que recibió el gol
                  <select
                    value={editing.keeper ?? ""}
                    onChange={(event) =>
                      setEditing({ ...editing, keeper: Number(event.target.value) })
                    }
                    className="mt-1 min-h-12 w-full rounded-lg border-2 border-slate-400 bg-white px-3 text-base"
                  >
                    {orderedPlayers.map((player) => (
                      <option key={player.cap} value={player.cap}>
                        #{player.cap} {player.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {activePanel === "players" &&
                (side === "us" ? (
                  <div className={styles.rivalGrid}>
                    {orderedPlayers.map((p) => {
                      const totals = playerTotals(s, "us", p.cap);
                      const isOut = totals.red || totals.exclusions >= 3;
                      return (
                        <button
                          key={p.cap}
                          type="button"
                          className={`${styles.rivalCard} ${styles.ownSelectionCard} ${isOut ? styles.playerCardOut : ""}`}
                          onClick={() => openPlayer("us", p.cap)}
                          aria-label={`Morvedre, gorro ${p.cap}, ${p.name}, ${totals.goals} goles, ${totals.exclusions} de 3 expulsiones${isOut ? ", fuera" : ""}`}
                        >
                          <span className={styles.rivalCapBadge}>{p.cap}</span>
                          <div className={styles.rivalStatsCol}>
                            <span
                              className={
                                totals.goals > 0
                                  ? styles.rivalGoalsBadge
                                  : styles.rivalGoalsBadgeZero
                              }
                            >
                              {totals.goals} {totals.goals === 1 ? "gol" : "goles"}
                            </span>
                            <span
                              className={`${styles.rivalFoulsBar} ${isOut ? styles.foulsOut : totals.exclusions === 2 ? styles.foulsWarning2 : totals.exclusions === 1 ? styles.foulsWarning1 : styles.foulsClean}`}
                            >
                              {isOut ? "FUERA" : `${totals.exclusions}/3 exp.`}
                            </span>
                          </div>
                          <span className={styles.ownSelectionName}>
                            <ActaPlayerName name={p.name} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.rivalGrid}>
                    {s.opponentCaps.map((capNumber) => {
                      const totals = playerTotals(s, "them", capNumber);
                      const isOut = totals.red || totals.exclusions >= 3;
                      return (
                        <button
                          key={capNumber}
                          type="button"
                          className={`${styles.rivalCard} ${isOut ? styles.playerCardOut : ""}`}
                          onClick={() => openPlayer("them", capNumber)}
                          aria-label={`Rival, gorro ${capNumber}, ${totals.goals} goles, ${totals.exclusions} de 3 expulsiones${isOut ? ", fuera" : ""}`}
                        >
                          <span className={styles.rivalCapBadge}>{capNumber}</span>
                          <div className={styles.rivalStatsCol}>
                            <span
                              className={
                                totals.goals > 0
                                  ? styles.rivalGoalsBadge
                                  : styles.rivalGoalsBadgeZero
                              }
                            >
                              {totals.goals} {totals.goals === 1 ? "gol" : "goles"}
                            </span>
                            <span
                              className={`${styles.rivalFoulsBar} ${
                                isOut
                                  ? styles.foulsOut
                                  : totals.exclusions === 2
                                    ? styles.foulsWarning2
                                    : totals.exclusions === 1
                                      ? styles.foulsWarning1
                                      : styles.foulsClean
                              }`}
                            >
                              {isOut
                                ? totals.red
                                  ? "Roja · FUERA"
                                  : "3/3 · FUERA"
                                : totals.exclusions === 2
                                  ? "2/3 exp."
                                  : totals.exclusions === 1
                                    ? "1/3 exp."
                                    : "0/3 exp."}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}

              {activePanel === "player-stats" &&
                cap !== null &&
                (() => {
                  const totals = playerTotals(s, side, cap);
                  const entries = [
                    ["Goles", totals.goals],
                    ["Tiros totales", totals.shots],
                    ["Tiros fallados", totals.missedShots],
                    ["Tiros fuera", totals.shotsOut],
                    ["Tiros bloqueados", totals.shotsBlocked],
                    ["Tiros a córner", totals.shotsCorner],
                    ["Penaltis fallados", totals.penaltiesMissed],
                    ["Asistencias", totals.assists],
                    ["Expulsiones", totals.exclusions],
                    ...(isKeeperCap
                      ? [
                          ["Tiros recibidos", totals.received],
                          ["Tiros rivales fuera", totals.receivedOut],
                          ["Paradas", totals.saves],
                          ["Goles encajados", totals.conceded],
                        ]
                      : []),
                  ];
                  return (
                    <section>
                      <h3 className="mb-4 text-lg font-bold">
                        #{cap} · {currentPlayer?.name}
                      </h3>
                      <dl className="divide-y divide-slate-200">
                        {entries.map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-4 py-3">
                            <dt className="text-base">{label}</dt>
                            <dd className="text-xl font-bold tabular-nums">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  );
                })()}
              {activePanel === "actions" && (
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
                          {button("Parada", () => void add("save"), styles.actionSave)}
                          {button(
                            "Tiro recibido",
                            () => void add("keeper_out"),
                            styles.actionPenaltySave,
                          )}
                        </div>
                      )}

                      <div
                        className={`${styles.actionGrid} ${side === "them" ? styles.rivalActionGrid : ""}`}
                      >
                        {button(
                          "Gol",
                          () => (side === "them" ? void add("goal") : setPanel("goal")),
                          styles.actionGoal,
                        )}

                        {side === "us" && button("Tiro", () => setPanel("shot"), styles.actionShot)}

                        {side === "us" &&
                          button("Asistencia", () => void add("assist"), styles.actionAssist)}

                        {button(
                          side === "us" ? "Expulsión / tarjeta" : "Expulsión",
                          () => (side === "them" ? void add("exclusion") : setPanel("sanction")),
                          styles.actionSanction,
                        )}

                        {side === "them" &&
                          button("Penalti", () => void addRivalPenalty(), styles.actionPenalty)}
                        {side === "them" &&
                          button("Tarjeta roja", () => void add("red"), styles.actionSanctionRed)}
                      </div>

                      {side === "us" && (cap === 1 || cap === 13 || cap === s.keeper) && (
                        <button
                          className="my-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 active:bg-slate-100"
                          disabled={!enabled}
                          onClick={() => {
                            setShowAllKeepers(false);
                            openKeeper();
                          }}
                        >
                          Cambiar portero · Ahora juega el #{s.keeper}
                        </button>
                      )}

                      {side === "us" &&
                        !editing &&
                        button("Ver estadísticas del jugador", () => setPanel("player-stats"))}
                      {editing && button("Cambiar jugador", () => setPanel("players"))}
                    </>
                  )}
                </>
              )}

              {activePanel === "goal" && (
                <div className={styles.actionList}>
                  {button(actionLabels["goal"], () => void add("goal"), styles.actionGoal)}
                  {button(
                    actionLabels["goal_extra"],
                    () => void add("goal_extra"),
                    styles.actionGoalExtra,
                  )}
                  {button(
                    actionLabels["goal_penalty"],
                    () => void add("goal_penalty"),
                    styles.actionGoalPenalty,
                  )}
                </div>
              )}

              {activePanel === "shot" && (
                <div className={styles.actionGrid}>
                  {button(
                    actionLabels["shot_out"],
                    () => void add("shot_out"),
                    styles.actionShotOut,
                  )}
                  {button(
                    actionLabels["shot_blocked"],
                    () => void add("shot_blocked"),
                    styles.actionShotBlocked,
                  )}
                </div>
              )}

              {activePanel === "miss-correction" && editing?.kind === "penalty_missed" && (
                <div className={styles.actionGrid}>
                  {button(
                    "Fuera / palo",
                    () => void add("penalty_missed", editing.side, "out"),
                    styles.actionShotOut,
                  )}
                  {button(
                    "Parada del portero",
                    () => void add("penalty_missed", editing.side, "save"),
                    styles.actionSave,
                  )}
                </div>
              )}

              {activePanel === "sanction" && (
                <div className={styles.actionGrid}>
                  {button(
                    actionLabels["exclusion"],
                    () => void add("exclusion"),
                    styles.actionSanctionExclusion,
                  )}
                  {button(
                    "Penalti",
                    () => void addRivalPenalty("us"),
                    styles.actionSanctionPenalty,
                  )}
                  {button(
                    actionLabels["yellow"],
                    () => void add("yellow"),
                    styles.actionSanctionYellow,
                  )}
                  {button(actionLabels["red"], () => void add("red"), styles.actionSanctionRed)}
                </div>
              )}

              {activePanel === "bench" && (
                <div className={styles.actionList}>
                  {button(
                    "Tiempo muerto",
                    () => {
                      setBenchKind("timeout");
                      setPanel("bench-side");
                    },
                    styles.actionShot,
                  )}
                  {button(
                    "Tarjeta al entrenador",
                    () => {
                      setBenchKind("cards");
                      setPanel("bench-side");
                    },
                    styles.actionSanction,
                  )}
                  <p className="text-center text-base font-semibold text-slate-700">
                    Tiempos pedidos · Morvedre {timeoutCount(s, "us")} · Rival{" "}
                    {timeoutCount(s, "them")}
                  </p>
                </div>
              )}

              {activePanel === "bench-side" && (
                <div className={styles.actionGrid}>
                  {(["us", "them"] as const).map((team) => (
                    <button
                      key={team}
                      type="button"
                      disabled={!enabled}
                      className={
                        styles.action +
                        " " +
                        (team === "us" ? styles.actionGoal : styles.actionAssist)
                      }
                      onClick={() => {
                        setSide(team);
                        if (benchKind === "timeout") void add("timeout", team);
                        else setPanel("bench-actions");
                      }}
                    >
                      <span>
                        <strong className="block text-lg">
                          {team === "us" ? "Morvedre" : "Rival"}
                        </strong>
                        {benchKind === "timeout" && (
                          <span className="mt-1 block text-sm">
                            {timeoutCount(s, team)} pedidos
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {activePanel === "bench-actions" && (
                <div className={styles.actionList}>
                  {(benchKind === "timeout"
                    ? (["timeout"] as const)
                    : (["coach_yellow", "coach_red"] as const)
                  ).map((k) => (
                    <div key={k}>
                      {button(
                        actionLabels[k],
                        () => void add(k),
                        k === "timeout"
                          ? styles.actionShot
                          : k === "coach_red"
                            ? styles.actionSanctionRed
                            : styles.actionSanctionYellow,
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activePanel === "assist" && pending?.kind === "assist" && (
                <div className="space-y-3">
                  <div className="rounded-xl border-l-4 border-emerald-400 bg-[#062048] px-4 py-3 text-white shadow-sm">
                    <p className="text-sm font-black tracking-wide text-emerald-300 uppercase">
                      Gol guardado
                    </p>
                    <p className="mt-0.5 text-base font-bold">Elige quién dio la asistencia.</p>
                  </div>
                  <div className={styles.playerList}>
                    {orderedPlayers
                      .filter(
                        (player) =>
                          player.cap !==
                          s.events.find((event) => event.id === pending.goal_event_id)?.cap,
                      )
                      .map((player) => (
                        <button
                          key={player.cap}
                          type="button"
                          className={styles.playerCard}
                          onClick={async () => {
                            const assist: MatchEvent = {
                              id: generateUuid(),
                              side: "us",
                              cap: player.cap,
                              kind: "assist",
                              period: s.period,
                              keeper: null,
                              deleted: false,
                              related_event_id: pending.goal_event_id,
                              origin: "goal_flow",
                            };
                            if (
                              await patch({
                                ...s,
                                events: [...s.events, assist],
                                pending: null,
                              })
                            ) {
                              setNotice(`Asistencia de #${player.cap} registrada`);
                            }
                          }}
                        >
                          <div className={styles.cardTopRow}>
                            <div className={styles.cardCapGroup}>
                              <span className={styles.capBadge}>{player.cap}</span>
                              {player.cap === s.keeper && (
                                <span className={styles.keeperTag}>POR</span>
                              )}
                            </div>
                            <span className={styles.cardGoalsZero}>Asistencia</span>
                          </div>
                          <div className={styles.cardNameRow}>
                            <span className={styles.cardPlayerName}>
                              <ActaPlayerName name={player.name} />
                            </span>
                          </div>
                          <div className={`${styles.cardFoulsBar} ${styles.foulsAssistAction}`}>
                            Elegir asistente
                          </div>
                        </button>
                      ))}
                  </div>
                  <button
                    type="button"
                    className={`${styles.action} ${styles.actionSecondary}`}
                    onClick={() => void patch({ ...s, pending: null })}
                  >
                    Seguir sin asistencia
                  </button>
                </div>
              )}

              {activePanel === "penalty-shooter" && pending?.kind === "penalty_shot" && (
                <div className="space-y-3">
                  <p className={styles.penaltyNotice}>
                    La sanción ya está guardada. Elige quién lanza.
                  </p>
                  {s.events.find((event) => event.id === pending.penalty_event_id)?.side ===
                  "us" ? (
                    <div className={styles.rivalGrid}>
                      {s.opponentCaps.map((number) => (
                        <button
                          key={number}
                          type="button"
                          className={styles.action}
                          disabled={
                            !enabled ||
                            playerTotals(s, "them", number).red ||
                            playerTotals(s, "them", number).exclusions >= 3
                          }
                          onClick={() => void choosePenaltyShooter(number)}
                        >
                          #{number}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.playerList}>
                      {orderedPlayers.map((player) => {
                        const totals = playerTotals(s, "us", player.cap);
                        const out = totals.red || totals.exclusions >= 3;
                        return (
                          <button
                            key={player.cap}
                            type="button"
                            disabled={!enabled || out}
                            className={`${styles.playerCard} ${out ? styles.playerCardOut : ""}`}
                            onClick={() => void choosePenaltyShooter(player.cap)}
                          >
                            <div className={styles.cardTopRow}>
                              <div className={styles.cardCapGroup}>
                                <span className={styles.capBadge}>{player.cap}</span>
                                {player.cap === s.keeper && (
                                  <span className={styles.keeperTag}>POR</span>
                                )}
                              </div>
                              <span
                                className={
                                  totals.goals > 0 ? styles.cardGoals : styles.cardGoalsZero
                                }
                              >
                                {totals.goals} {totals.goals === 1 ? "gol" : "goles"}
                              </span>
                            </div>
                            <div className={styles.cardNameRow}>
                              <span className={styles.cardPlayerName}>
                                <ActaPlayerName name={player.name} />
                              </span>
                            </div>
                            <div
                              className={`${styles.cardFoulsBar} ${
                                out ? styles.foulsOut : styles.foulsClean
                              }`}
                            >
                              {out ? "FUERA" : "Elegir lanzador"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activePanel === "penalty-result" && pending?.kind === "penalty_shot" && (
                <div className="space-y-3">
                  <p className="text-center text-lg font-bold">
                    Lanza el #{pending.shooter_cap}{" "}
                    {s.events.find((event) => event.id === pending.penalty_event_id)?.side ===
                    "them"
                      ? s.players.find((player) => player.cap === pending.shooter_cap)?.name
                      : "· Rival"}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      className={`${styles.action} ${styles.penaltyOutcome} ${styles.penaltyGoal}`}
                      onClick={() => void finishPenaltyShot("goal")}
                    >
                      Gol
                    </button>
                    <button
                      type="button"
                      className={`${styles.action} ${styles.actionSave} ${styles.penaltyOutcome} ${styles.penaltySave}`}
                      onClick={() => void finishPenaltyShot("save")}
                    >
                      Parada
                    </button>
                    <button
                      type="button"
                      className={`${styles.action} ${styles.actionShot} ${styles.penaltyOutcome}`}
                      onClick={() => void finishPenaltyShot("out")}
                    >
                      Fuera / palo
                    </button>
                  </div>
                  <button
                    type="button"
                    className={`${styles.action} ${styles.actionSecondary}`}
                    onClick={() => setPanel("penalty-shooter")}
                  >
                    Cambiar lanzador
                  </button>
                </div>
              )}

              {activePanel === "duplicate-penalty" && duplicate && (
                <div className="space-y-4">
                  <p className="text-lg leading-relaxed text-pretty">
                    Acabas de apuntar un gol de penalti del #{duplicate.shooterCap}. ¿Es el mismo
                    gol?
                  </p>
                  <button
                    type="button"
                    className={`${styles.action} ${styles.actionGoal}`}
                    onClick={() => void resolveDuplicate(true)}
                  >
                    Sí, ya está apuntado
                  </button>
                  <button
                    type="button"
                    className={`${styles.action} ${styles.actionSecondary}`}
                    onClick={() => void resolveDuplicate(false)}
                  >
                    No, es otro gol
                  </button>
                </div>
              )}

              {activePanel === "assist-edit" && editing?.kind === "assist" && (
                <div className="space-y-3">
                  <p className="rounded-xl border border-[#062048] bg-white p-3 text-base leading-relaxed text-[#062048]">
                    Asistencia de <strong>#{editing.cap}</strong>. Puedes vincularla a un gol o
                    conservarla como estadística independiente.
                  </p>
                  <button
                    type="button"
                    className={`${styles.action} ${styles.actionSecondary}`}
                    onClick={() => {
                      setSide("us");
                      setPanel("players");
                    }}
                  >
                    Cambiar jugador
                  </button>
                  <div className="space-y-2">
                    {active
                      .filter(
                        (goal) =>
                          goal.side === "us" &&
                          ["goal", "goal_extra"].includes(goal.kind) &&
                          goal.cap !== editing.cap &&
                          !active.some(
                            (candidate) =>
                              candidate.kind === "assist" &&
                              candidate.id !== editing.id &&
                              candidate.related_event_id === goal.id,
                          ),
                      )
                      .map((goal) => (
                        <button
                          key={goal.id}
                          type="button"
                          className={`${styles.action} ${styles.actionGoalExtra}`}
                          onClick={() =>
                            void patch({
                              ...s,
                              events: s.events.map((event) =>
                                event.id === editing.id
                                  ? {
                                      ...event,
                                      cap: editing.cap,
                                      related_event_id: goal.id,
                                      origin: "manual" as const,
                                    }
                                  : event,
                              ),
                            })
                          }
                        >
                          Vincular al gol de #{goal.cap} · Cuarto {goal.period}
                        </button>
                      ))}
                  </div>
                  <button
                    type="button"
                    className={`${styles.action} ${styles.actionGoal}`}
                    onClick={() =>
                      void patch({
                        ...s,
                        events: s.events.map((event) =>
                          event.id === editing.id
                            ? {
                                ...event,
                                cap: editing.cap,
                                related_event_id: null,
                                origin: "manual" as const,
                              }
                            : event,
                        ),
                      })
                    }
                  >
                    Guardar sin vincular
                  </button>
                </div>
              )}

              {activePanel === "assist-relation" && assistRelation && (
                <div className="space-y-3">
                  <p className="rounded-xl bg-amber-50 p-3 text-base leading-relaxed text-amber-950">
                    Esta jugada tiene una asistencia vinculada. Elige cómo resolverla antes de
                    guardar la corrección.
                  </p>
                  {["goal", "goal_extra"].includes(assistRelation.corrected.kind) && (
                    <div className={styles.playerList}>
                      {orderedPlayers
                        .filter((player) => player.cap !== assistRelation.corrected.cap)
                        .map((player) => (
                          <button
                            key={player.cap}
                            type="button"
                            className={styles.playerCard}
                            aria-label={`Nueva asistencia de ${player.name}, gorro ${player.cap}`}
                            onClick={() => void saveAssistRelation("independent", player.cap)}
                          >
                            <div className={styles.cardTopRow}>
                              <div className={styles.cardCapGroup}>
                                <span className={styles.capBadge}>{player.cap}</span>
                                {player.cap === s.keeper && (
                                  <span className={styles.keeperTag}>POR</span>
                                )}
                              </div>
                              <span className={styles.cardGoalsZero}>Asistencia</span>
                            </div>
                            <div className={styles.cardNameRow}>
                              <span className={styles.cardPlayerName}>
                                <ActaPlayerName name={player.name} />
                              </span>
                            </div>
                            <div className={`${styles.cardFoulsBar} ${styles.foulsAssistAction}`}>
                              Nueva asistencia
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className={`${styles.action} ${styles.actionDangerOutline}`}
                    onClick={() => void saveAssistRelation("remove")}
                  >
                    Quitar la asistencia y guardar
                  </button>
                  <button
                    type="button"
                    className={`${styles.action} ${styles.actionSecondary}`}
                    onClick={() => void saveAssistRelation("independent")}
                  >
                    Dejarla como asistencia independiente
                  </button>
                </div>
              )}

              {activePanel === "penalty-relation" && penaltyRelation && (
                <div className="space-y-3">
                  <p className="rounded-xl bg-amber-50 p-3 text-base leading-relaxed text-amber-950">
                    La sanción rival y su lanzamiento están vinculados. Decide si deben seguir
                    juntos después de esta corrección.
                  </p>
                  {penaltyRelation.correctedIsPenalty &&
                    penaltyRelation.corrected.kind === "penalty" && (
                      <button
                        type="button"
                        className={`${styles.action} ${styles.actionGoal}`}
                        onClick={() => void savePenaltyRelation(true)}
                      >
                        Mantenerlos vinculados y mover ambos
                      </button>
                    )}
                  {!penaltyRelation.correctedIsPenalty && (
                    <button
                      type="button"
                      className={`${styles.action} ${styles.actionGoal}`}
                      onClick={() => void savePenaltyRelation(true)}
                    >
                      Mover también la sanción y guardar
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${styles.action} ${styles.actionSecondary}`}
                    onClick={() => void savePenaltyRelation(false)}
                  >
                    Guardar y dejar el lanzamiento independiente
                  </button>
                </div>
              )}

              {activePanel === "keeper" && (
                <div className="space-y-3">
                  {" "}
                  {keeperStart && (
                    <p className="rounded-xl border-2 border-[#f4c430] bg-[#fff7d6] p-3 text-base font-bold text-[#062048]">
                      Elige quién empieza el cuarto {s.period + 1}.
                    </p>
                  )}
                  <div className={styles.playerList}>
                    {orderedPlayers
                      .filter(
                        (player) =>
                          player.cap === 1 ||
                          player.cap === 13 ||
                          player.cap === s.keeper ||
                          showAllKeepers,
                      )
                      .map((player) => {
                        const totals = playerTotals(s, "us", player.cap);
                        const out = totals.red || totals.exclusions >= 3;
                        const isCurrentKeeper = s.keeper === player.cap;
                        return (
                          <button
                            key={player.cap}
                            type="button"
                            disabled={!enabled || out}
                            onClick={() =>
                              void patch(
                                selectMatchKeeper(
                                  s,
                                  player.cap,
                                  keeperStart ? "start" : keeperMode,
                                ),
                              )
                            }
                            className={`${styles.playerCard} ${isCurrentKeeper ? styles.playerCardActive : ""} ${out ? styles.playerCardOut : ""}`}
                          >
                            <div className={styles.cardTopRow}>
                              <div className={styles.cardCapGroup}>
                                <span className={styles.capBadge}>{player.cap}</span>
                              </div>
                              {isCurrentKeeper ? (
                                <span className={styles.keeperTagActive}>En juego</span>
                              ) : (
                                <span className={styles.cardGoalsZero}>Suplente</span>
                              )}
                            </div>
                            <div className={styles.cardNameRow}>
                              <span className={styles.cardPlayerName}>
                                <ActaPlayerName name={player.name} />
                              </span>
                            </div>
                            <div
                              className={`${styles.cardFoulsBar} ${styles.keeperChoiceAction} ${
                                out
                                  ? styles.foulsOut
                                  : isCurrentKeeper
                                    ? styles.foulsKeeperActive
                                    : styles.foulsClean
                              }`}
                            >
                              {out
                                ? "Fuera"
                                : isCurrentKeeper
                                  ? keeperStart
                                    ? "Empezar cuarto"
                                    : "Mantener"
                                  : keeperStart
                                    ? "Elegir y empezar"
                                    : keeperMode === "correct"
                                      ? "Corregir selección"
                                      : "Elegir portero"}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                  {!showAllKeepers &&
                    s.players.some((player) => player.cap !== 1 && player.cap !== 13) && (
                      <button
                        type="button"
                        className={`${styles.action} ${styles.actionSecondary}`}
                        onClick={() => setShowAllKeepers(true)}
                      >
                        Elegir otro jugador como portero
                      </button>
                    )}
                </div>
              )}

              {activePanel === "keeper-action" && keeperAction && (
                <div className="space-y-3">
                  <p className="rounded-xl bg-amber-50 p-3 text-base leading-relaxed text-amber-950">
                    Has apuntado la parada al #{keeperAction.cap}, pero figura en juego el #
                    {s.keeper}.
                  </p>
                  <button
                    type="button"
                    className={`${styles.action} ${styles.actionGoal}`}
                    onClick={() => void saveKeeperAction(true)}
                  >
                    Está jugando el #{keeperAction.cap}
                  </button>
                  <button
                    type="button"
                    className="min-h-14 w-full rounded-xl border-2 border-slate-400 bg-white px-4 text-lg font-bold"
                    onClick={() => void saveKeeperAction(false)}
                  >
                    Era una jugada anterior
                  </button>
                </div>
              )}

              {activePanel === "break-start" && (
                <div className={styles.actionList}>
                  <p className="rounded-xl border-2 border-[#e4b520] bg-[#fff7d6] p-4 text-center text-base font-bold text-[#062048]">
                    El cuarto {s.period + 1} todavía no ha empezado. Elige el portero y confirma el
                    inicio para anotar la siguiente jugada.
                  </p>
                  {button(
                    `Elegir portero y empezar el cuarto ${s.period + 1}`,
                    () => openKeeper(true),
                    styles.actionGoal,
                  )}
                </div>
              )}

              {activePanel === "shootout-start" && (
                <div className={styles.actionList}>
                  <p className="rounded-xl border border-[#b8cada] bg-[#e8f1fc] p-3 text-base font-semibold text-[#062048]">
                    Indica qué equipo lanza primero. Después los turnos se alternan automáticamente.
                  </p>
                  {button(
                    "Empieza Morvedre",
                    () =>
                      void patch({
                        ...s,
                        phase: "shootout",
                        pending: null,
                        shootout: { firstSide: "us", shots: [] },
                      }),
                    styles.actionGoal,
                  )}
                  {button(
                    `Empieza ${record.opponent}`,
                    () =>
                      void patch({
                        ...s,
                        phase: "shootout",
                        pending: null,
                        shootout: { firstSide: "them", shots: [] },
                      }),
                    styles.actionAssist,
                  )}
                </div>
              )}
              {activePanel === "periods" && (
                <>
                  <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    Resultado del partido
                  </p>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl bg-[#062048] p-3 text-center text-white">
                    <span className="text-sm font-bold">
                      {record.homeAway === "away" ? "Rival" : "Morvedre"}
                    </span>
                    <strong className="font-mono text-4xl font-extrabold">
                      {score(s, record.homeAway === "away" ? "them" : "us")}–
                      {score(s, record.homeAway === "away" ? "us" : "them")}
                    </strong>
                    <span className="text-sm font-bold">
                      {record.homeAway === "away" ? "Morvedre" : "Rival"}
                    </span>
                  </div>

                  <div
                    role="group"
                    className={`mt-2.5 grid gap-2 ${s.periods === 6 ? "grid-cols-3" : "grid-cols-2"}`}
                    aria-label="Parciales por cuarto"
                  >
                    {Array.from({ length: s.periods }, (_, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-[#b8cada] bg-white px-2 py-1.5 text-center text-[#062048]"
                      >
                        <span className="block text-xs font-bold uppercase">
                          Cuarto {index + 1}
                        </span>
                        <strong className="font-mono text-lg tabular-nums">
                          {index + 1 <= s.period
                            ? `${score(s, "us", index + 1)}–${score(s, "them", index + 1)}`
                            : "—"}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <p className="my-2.5 text-center text-base">
                    Este cuarto:{" "}
                    <strong>
                      {score(s, record.homeAway === "away" ? "them" : "us", s.period)}–
                      {score(s, record.homeAway === "away" ? "us" : "them", s.period)}
                    </strong>
                  </p>

                  {playing && (
                    <div className="space-y-2">
                      {s.period === s.periods && score(s, "us") === score(s, "them") && (
                        <p className="rounded-xl border-2 border-[#e4c45c] bg-[#fff7d6] p-3 text-center text-lg font-bold text-[#062048]">
                          Partido empatado · elige cómo termina
                        </p>
                      )}
                      {s.pending && (
                        <p className="text-center text-red-700">
                          Completa la jugada pendiente antes de terminar el cuarto.
                        </p>
                      )}
                      {s.period === s.periods && score(s, "us") === score(s, "them") ? (
                        <div className={styles.actionGrid}>
                          <button
                            type="button"
                            className={`${styles.action} ${styles.actionShot}`}
                            disabled={busy || Boolean(s.pending)}
                            onClick={() => void patch({ ...s, phase: "finished" })}
                          >
                            Terminar en empate
                          </button>
                          <button
                            type="button"
                            className={`${styles.action} ${styles.actionGoalPenalty}`}
                            disabled={busy || Boolean(s.pending)}
                            onClick={() => setPanel("shootout-start")}
                          >
                            Tanda de penaltis
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={`${styles.action} ${styles.actionGoal}`}
                            disabled={busy || Boolean(s.pending)}
                            onClick={() =>
                              void patch({
                                ...s,
                                phase: s.period === s.periods ? "finished" : "break",
                              })
                            }
                          >
                            {s.period === s.periods
                              ? "Sí, terminar partido"
                              : `Sí, terminar cuarto ${s.period}`}
                          </button>
                          <button
                            type="button"
                            className={`${styles.action} ${styles.actionSecondary}`}
                            onClick={closePanel}
                          >
                            Seguir anotando
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {activePanel === "history" && (
                <>
                  {s.keeper !== null &&
                    historySide === "us" &&
                    (s.keeperStints?.length ?? 0) > 0 && (
                      <div className="mb-4 rounded-xl border-2 border-[#8aa6bf] bg-white p-3">
                        <p className="text-base font-bold">Portero en juego · #{s.keeper}</p>
                        <button
                          type="button"
                          disabled={!enabled}
                          onClick={() => openKeeper(false, "correct")}
                          className="mt-2 min-h-12 w-full rounded-lg border-2 border-[#0b4d86] bg-[#e8f1fc] px-3 text-base font-bold text-[#062048]"
                        >
                          Corregir último cambio de portero
                        </button>
                      </div>
                    )}
                  <div className="mb-5 grid grid-cols-2 gap-2" aria-label="Equipo de las jugadas">
                    {(["us", "them"] as const).map((team) => (
                      <button
                        key={team}
                        type="button"
                        aria-pressed={historySide === team}
                        onClick={() => setHistorySide(team)}
                        className={`min-h-12 rounded-xl border px-3 text-base font-bold ${historySide === team ? "border-blue-900 bg-blue-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
                      >
                        {team === "us" ? "Morvedre" : "Rival"}
                      </button>
                    ))}
                  </div>
                  {active.filter((event) => event.side === historySide).length === 0 ? (
                    <p>Todavía no hay jugadas.</p>
                  ) : (
                    <ol className={styles.history}>
                      {[...active]
                        .filter((event) => event.side === historySide)
                        .reverse()
                        .map((e) => (
                          <li key={e.id}>
                            <small className="text-sm font-semibold">
                              {e.side === "us" ? "Morvedre" : "Rival"} · Cuarto {e.period}
                            </small>

                            <div className="my-3 flex items-center gap-3">
                              <span
                                className={`grid h-11 min-w-11 place-items-center rounded-lg text-xl font-bold ${e.side === "us" ? "bg-blue-900 text-white" : "bg-amber-100 text-blue-950"}`}
                              >
                                {e.cap === null ? "E" : `#${e.cap}`}
                              </span>
                              <div className="min-w-0">
                                <p className="text-lg leading-tight font-bold">
                                  {actionLabels[e.kind]}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {e.cap === null
                                    ? "Entrenador"
                                    : e.side === "us"
                                      ? (s.players.find((player) => player.cap === e.cap)?.name ??
                                        `Gorro ${e.cap}`)
                                      : `Jugador rival · gorro ${e.cap}`}
                                </p>
                              </div>
                            </div>

                            {enabled &&
                              e.kind === "penalty" &&
                              !s.pending &&
                              !active.some(
                                (item) =>
                                  item.related_event_id === e.id && item.origin === "penalty_flow",
                              ) && (
                                <button
                                  type="button"
                                  className="mb-2 min-h-12 w-full rounded-lg border-2 border-[#b45309] bg-[#fff7d6] px-3 text-base font-bold text-[#062048]"
                                  onClick={async () => {
                                    if (
                                      await patch(
                                        {
                                          ...s,
                                          pending: {
                                            kind: "penalty_shot",
                                            penalty_event_id: e.id,
                                            shooter_cap: null,
                                          },
                                        },
                                        false,
                                      )
                                    )
                                      setPanel("penalty-shooter");
                                  }}
                                >
                                  Completar lanzamiento pendiente
                                </button>
                              )}

                            {enabled && (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  className="min-h-12 rounded-lg border-2 border-blue-800 bg-blue-50 px-3 text-base font-bold"
                                  onClick={() => {
                                    setEditing(e);

                                    setBenchKind(e.kind === "timeout" ? "timeout" : "cards");

                                    setSide(e.side);

                                    setCap(e.cap);

                                    setOutWarning(false);

                                    setPanel(
                                      e.kind === "assist"
                                        ? "assist-edit"
                                        : e.kind === "penalty_missed"
                                          ? "miss-correction"
                                          : e.cap === null
                                            ? "bench-actions"
                                            : "actions",
                                    );
                                  }}
                                >
                                  Corregir
                                </button>

                                <button
                                  type="button"
                                  className="min-h-12 rounded-lg border-2 border-red-300 bg-red-50 px-3 text-base font-bold text-red-900"
                                  onClick={() => {
                                    setDeleting(e);
                                    setPanel("delete");
                                  }}
                                >
                                  Anular
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                    </ol>
                  )}
                </>
              )}

              {activePanel === "delete" && deleting && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-300 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-600">Cuarto {deleting.period}</p>
                    <p className="mt-1 text-lg font-bold">{describeEvent(deleting, s)}</p>
                    {s.events.some(
                      (event) => !event.deleted && event.related_event_id === deleting.id,
                    ) && (
                      <p className="mt-3 text-base leading-relaxed text-slate-700">
                        {deletingHasPenaltyResult
                          ? "Este penalti tiene un lanzamiento vinculado. Elige qué quieres anular."
                          : "También se anulará la asistencia vinculada a esta jugada."}
                      </p>
                    )}
                  </div>
                  {deletingHasPenaltyResult ? (
                    <>
                      <button
                        type="button"
                        className={`${styles.action} ${styles.actionDangerOutline}`}
                        disabled={busy}
                        onClick={() => void remove(deleting, false)}
                      >
                        Anular solo la sanción
                      </button>
                      <button
                        type="button"
                        className={`${styles.action} ${styles.actionSanctionRed}`}
                        disabled={busy}
                        onClick={() => void remove(deleting, true)}
                      >
                        Anular sanción y lanzamiento
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.action} ${styles.actionSanctionRed}`}
                      disabled={busy}
                      onClick={() => void remove(deleting)}
                    >
                      Sí, anular esta jugada
                    </button>
                  )}
                </div>
              )}

              {activePanel === "share" &&
                (() => {
                  const totalUs = score(s, "us");
                  const totalThem = score(s, "them");
                  const finalUs = finalScore(s, "us");
                  const finalThem = finalScore(s, "them");
                  const homeSide: Side = record.homeAway === "away" ? "them" : "us";
                  const awaySide: Side = homeSide === "us" ? "them" : "us";
                  const outcome =
                    finalUs > finalThem ? "win" : finalUs === finalThem ? "draw" : "loss";
                  const outcomeStyles = {
                    win: {
                      badge: "bg-emerald-100 text-emerald-800",
                      statusText: "Victoria",
                    },
                    draw: {
                      badge: "bg-slate-100 text-slate-700",
                      statusText: "Empate",
                    },
                    loss: {
                      badge: "bg-rose-100 text-rose-800",
                      statusText: "Derrota",
                    },
                  }[outcome];

                  return (
                    <div className="space-y-3 pb-2">
                      <div className="overflow-hidden rounded-2xl border border-[#c7d6e4] bg-white shadow-sm">
                        <div className="flex min-h-11 items-center justify-between gap-3 bg-[#062048] px-3 py-2 text-white">
                          <span className="min-w-0 text-sm font-extrabold">{record.team}</span>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${outcomeStyles.badge}`}
                          >
                            {outcomeStyles.statusText}
                          </span>
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)] items-end gap-x-2 gap-y-2 px-3 py-3 text-center text-[#062048]">
                          <p className="min-w-0 text-sm leading-tight font-extrabold break-words">
                            {homeSide === "us" ? "Morvedre" : record.opponent}
                          </p>
                          <p className="col-start-3 min-w-0 text-sm leading-tight font-extrabold break-words">
                            {awaySide === "us" ? "Morvedre" : record.opponent}
                          </p>
                          <strong className="font-mono text-5xl leading-none font-black tabular-nums">
                            {homeSide === "us" ? totalUs : totalThem}
                          </strong>
                          <span className="self-center text-xl text-slate-400">–</span>
                          <strong className="font-mono text-5xl leading-none font-black tabular-nums">
                            {awaySide === "us" ? totalUs : totalThem}
                          </strong>
                          {s.shootout && (
                            <p className="col-span-3 -mt-2 text-base leading-none font-extrabold">
                              ({finalScore(s, homeSide)}–{finalScore(s, awaySide)})
                            </p>
                          )}
                        </div>
                        {s.period > 0 && (
                          <div
                            className={`grid gap-2 border-t border-[#dce6ef] bg-[#edf3f8] px-3 py-2 ${s.period > 4 ? "grid-cols-3" : "grid-cols-2"}`}
                          >
                            {Array.from({ length: s.period }, (_, i) => (
                              <div
                                key={i}
                                className="rounded-lg border border-[#c7d6e4] bg-white px-1 py-1.5 text-center"
                              >
                                <span className="block text-xs font-semibold text-slate-600">
                                  {i + 1}º cuarto
                                </span>
                                <span className="text-base font-extrabold text-[#062048] tabular-nums">
                                  {score(s, homeSide, i + 1)}–{score(s, awaySide, i + 1)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="px-1 text-xs leading-relaxed text-slate-600">
                        El PDF incluye estadísticas, parciales y todas las jugadas.
                      </p>

                      {record.dirty && (
                        <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
                          Hay cambios guardados solo en este móvil. El PDF los incluye.
                        </p>
                      )}

                      <div className="grid gap-2.5 pt-1">
                        <button
                          type="button"
                          className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#062048] px-4 text-base font-extrabold text-white active:bg-[#0b4d86] disabled:opacity-50"
                          disabled={!pdf}
                          onClick={() => downloadPdf()}
                        >
                          <Download size={18} aria-hidden="true" />
                          <span>{pdf ? "Descargar PDF del acta" : "Preparando PDF…"}</span>
                        </button>

                        <button
                          type="button"
                          className="flex min-h-14 items-center justify-center gap-3 rounded-xl border-2 border-[#062048] bg-white px-4 text-base font-extrabold text-[#062048] active:bg-[#e8f1fc] disabled:opacity-50"
                          disabled={!pdf}
                          onClick={() => void share()}
                        >
                          <MessageCircle size={18} aria-hidden="true" />
                          <span>Compartir por WhatsApp</span>
                        </button>
                      </div>

                      {shareError && (
                        <p role="alert" className="text-center text-xs font-semibold text-red-600">
                          {shareError}
                        </p>
                      )}
                    </div>
                  );
                })()}

              {activePanel === "takeover" && (
                <div className="flex flex-col gap-4 pb-2">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 shadow-xs">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                        <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1 text-left">
                        <p className="text-sm leading-tight font-extrabold text-slate-900">
                          Confirma con el otro delegado
                        </p>
                        <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                          Asegúrate de que ha enviado todas sus jugadas antes de continuar. Su móvil
                          dejará de sincronizar y conservará los cambios pendientes en local.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#062048] px-4 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:bg-[#093574] active:scale-[0.99] disabled:opacity-50 sm:text-base"
                      disabled={busy}
                      onClick={() => void takeover()}
                    >
                      <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                      <span>Confirmar relevo</span>
                    </button>

                    <button
                      type="button"
                      className="flex min-h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:text-sm"
                      onClick={closePanel}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Dialog.Content>
        </>
      </Dialog.Root>
    </main>
  );
}
