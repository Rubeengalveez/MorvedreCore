"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, RotateCcw, UserMinus, UserPlus } from "lucide-react";

import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  nextFreeCap,
  prepareCallupSource,
  type CallupCandidate,
  type CallupPick,
} from "@/lib/domain/callup-selection";
import { cn } from "@/lib/utils/cn";
import {
  playerHasRecordedHistory,
  transferSummary,
  type RosterTransfer,
} from "@/lib/domain/live-match-roster-edit";
import type { LiveSheet } from "@/lib/domain/live-match";
import { rosterRequirementError } from "@/lib/domain/live-match-rules";
import { replaceMatchCallupResult } from "@/server/actions/admin/matches";

import { CapNumberButton, CapNumberOptions } from "./cap-number-picker";
import { CallupPlayerPickerSheet } from "./callup-player-picker-sheet";

export type { CallupCandidate, CallupPick } from "@/lib/domain/callup-selection";

interface CallupEditorProps {
  matchId: string;
  teamLabel: string;
  category?: string;
  opponent: string;
  scheduledAt: string;
  initial: CallupPick[];
  candidates: CallupCandidate[];
  template: CallupPick[];
  editable: boolean;
  backHref: Route;
  backLabel: string;
  liveSheet?: LiveSheet;
  online?: boolean;
  onSaveLive?: (players: CallupPick[], transfers: RosterTransfer[]) => Promise<void>;
}

function selectionKey(players: CallupPick[]): string {
  return [...players]
    .sort((a, b) => a.player_id.localeCompare(b.player_id))
    .map((player) => `${player.player_id}:${player.cap_number ?? "-"}`)
    .join("|");
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function CallupEditor({
  matchId,
  teamLabel,
  category,
  opponent,
  scheduledAt,
  initial,
  candidates,
  template: initialTemplate,
  editable,
  backHref,
  backLabel,
  liveSheet,
  online = true,
  onSaveLive,
}: CallupEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<CallupPick[]>(initial);
  const [baseline, setBaseline] = useState<CallupPick[]>(initial);
  const [template, setTemplate] = useState<CallupPick[]>(initialTemplate);
  const [adding, setAdding] = useState(false);
  const [replaceFrom, setReplaceFrom] = useState<string | null>(null);
  const [pendingReplacement, setPendingReplacement] = useState<CallupCandidate | null>(null);
  const [pendingCapSwap, setPendingCapSwap] = useState<{ playerId: string; cap: number } | null>(
    null,
  );
  const [liveTransfers, setLiveTransfers] = useState<RosterTransfer[]>([]);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const [openCap, setOpenCap] = useState<string | null>(null);
  const [pendingSource, setPendingSource] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirmTemplate, setConfirmTemplate] = useState(false);
  const [clearCapsOpen, setClearCapsOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const allowLeave = useRef(false);
  const hasRecordedActions = (playerId: string) =>
    Boolean(
      liveSheet &&
      (playerHasRecordedHistory(liveSheet, playerId) ||
        liveTransfers.some((transfer) => transfer.toPlayerId === playerId)),
    );

  const byId = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.player_id, candidate])),
    [candidates],
  );
  const selectedIds = useMemo(() => new Set(draft.map((player) => player.player_id)), [draft]);
  const originalIds = useMemo(() => new Set(initial.map((player) => player.player_id)), [initial]);
  const occupied = useMemo(
    () =>
      new Set(draft.map((player) => player.cap_number).filter((cap): cap is number => cap != null)),
    [draft],
  );
  const draftKey = selectionKey(draft);
  const dirty = draftKey !== selectionKey(baseline);
  const differsFromDefault = template.length > 0 && draftKey !== selectionKey(template);
  const missingCaps = draft.filter((player) => player.cap_number == null).length;
  const unassignedWithHistory = draft.find(
    (player) => player.cap_number == null && hasRecordedActions(player.player_id),
  );
  const invalidCaps = draft
    .map((player) => player.cap_number)
    .filter((cap): cap is number => cap != null && (cap < 1 || cap > 14));
  const rosterError = rosterRequirementError(
    liveSheet?.category ?? category,
    draft.map((p) => p.cap_number),
  );
  const missingKeeper = Boolean(rosterError);
  const selected = [...draft].sort(
    (a, b) =>
      (a.cap_number ?? 99) - (b.cap_number ?? 99) ||
      (byId.get(a.player_id)?.full_name ?? "").localeCompare(
        byId.get(b.player_id)?.full_name ?? "",
        "es",
      ),
  );
  const available = candidates
    .filter(
      (candidate) =>
        !selectedIds.has(candidate.player_id) &&
        (!query || normalizeSearch(candidate.full_name).includes(normalizeSearch(query))),
    )
    .sort(
      (a, b) =>
        Number(b.is_current_team) - Number(a.is_current_team) ||
        Number(a.has_conflict) - Number(b.has_conflict) ||
        a.full_name.localeCompare(b.full_name, "es"),
    );
  const originalReplaceId = replaceFrom
    ? (liveTransfers.find((item) => item.toPlayerId === replaceFrom)?.fromPlayerId ?? replaceFrom)
    : null;
  const replacingName = originalReplaceId
    ? (liveSheet?.players.find((player) => player.id === originalReplaceId)?.name ??
      byId.get(originalReplaceId)?.full_name ??
      "este jugador")
    : undefined;
  const replacementSummary =
    liveSheet && originalReplaceId ? transferSummary(liveSheet, originalReplaceId) : null;
  const replacementStats = replacementSummary
    ? [
        replacementSummary.goals > 0
          ? `${replacementSummary.goals} ${replacementSummary.goals === 1 ? "gol" : "goles"}`
          : null,
        replacementSummary.assists > 0
          ? `${replacementSummary.assists} ${replacementSummary.assists === 1 ? "asistencia" : "asistencias"}`
          : null,
        replacementSummary.exclusions > 0
          ? `${replacementSummary.exclusions} ${replacementSummary.exclusions === 1 ? "expulsión" : "expulsiones"}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const capSwapPlayer = pendingCapSwap
    ? draft.find((player) => player.player_id === pendingCapSwap.playerId)
    : undefined;
  const capSwapOther = pendingCapSwap
    ? draft.find(
        (player) =>
          player.player_id !== pendingCapSwap.playerId && player.cap_number === pendingCapSwap.cap,
      )
    : undefined;
  const dateLabel = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(scheduledAt));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (allowLeave.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function applySource() {
    const result = prepareCallupSource(template, candidates, originalIds);
    const nextIds = new Set(result.players.map((player) => player.player_id));
    if (liveSheet) {
      const unsafe = liveSheet.players.find(
        (player) =>
          !player.retired &&
          playerHasRecordedHistory(liveSheet, player.id) &&
          !nextIds.has(player.id) &&
          !liveTransfers.some(
            (transfer) => transfer.fromPlayerId === player.id && nextIds.has(transfer.toPlayerId),
          ),
      );
      if (unsafe) {
        setError(
          `${unsafe.name} tiene jugadas. Reemplázalo antes de volver a la lista por defecto.`,
        );
        setPendingSource(false);
        return;
      }
      setLiveTransfers((current) =>
        current.filter(
          (transfer) => !nextIds.has(transfer.fromPlayerId) && nextIds.has(transfer.toPlayerId),
        ),
      );
    }
    setDraft(result.players);
    setOpenCap(null);
    setAdding(false);
    setReplaceFrom(null);
    setError("");
    setPendingSource(false);
  }

  function requestSource() {
    if (draft.length > 0 && selectionKey(draft) !== selectionKey(template)) setPendingSource(true);
    else applySource();
  }

  function addPlayer(candidate: CallupCandidate) {
    if (!editable || pending || (draft.length >= 14 && !replaceFrom) || candidate.has_conflict)
      return;
    if (replaceFrom) {
      setAdding(false);
      setPendingReplacement(candidate);
      return;
    }
    const cap = nextFreeCap(candidate.cap_number, occupied);
    setDraft((current) => [...current, { player_id: candidate.player_id, cap_number: cap }]);
    setError("");
    setAdding(false);
  }

  function confirmReplacement() {
    if (!replaceFrom || !pendingReplacement) return;
    const candidate = pendingReplacement;
    const replacedId = replaceFrom;
    const originalId =
      liveTransfers.find((item) => item.toPlayerId === replacedId)?.fromPlayerId ?? replacedId;
    setDraft((current) =>
      current.map((pick) =>
        pick.player_id === replacedId
          ? { player_id: candidate.player_id, cap_number: pick.cap_number }
          : pick,
      ),
    );
    setLiveTransfers((current) => {
      const others = current.filter((item) => item.fromPlayerId !== originalId);
      return candidate.player_id === originalId
        ? others
        : [...others, { fromPlayerId: originalId, toPlayerId: candidate.player_id }];
    });
    setPendingReplacement(null);
    setReplaceFrom(null);
    setError("");
  }

  function changeCap(playerId: string, cap: number | null) {
    const currentPick = draft.find((item) => item.player_id === playerId);
    if (!currentPick) return;
    if (currentPick.cap_number === cap) {
      setOpenCap(null);
      return;
    }
    const displaced =
      cap === null
        ? undefined
        : draft.find((item) => item.player_id !== playerId && item.cap_number === cap);
    if (displaced && cap !== null) {
      setPendingCapSwap({ playerId, cap });
      return;
    }
    setDraft((current) =>
      current.map((item) => (item.player_id === playerId ? { ...item, cap_number: cap } : item)),
    );
    setOpenCap(null);
    setError("");
  }

  function confirmCapSwap() {
    if (!pendingCapSwap || !capSwapPlayer || !capSwapOther) return;
    const { playerId, cap } = pendingCapSwap;
    setDraft((current) =>
      current.map((item) => {
        if (item.player_id === playerId) return { ...item, cap_number: cap };
        if (item.player_id === capSwapOther.player_id)
          return { ...item, cap_number: capSwapPlayer.cap_number };
        return item;
      }),
    );
    setPendingCapSwap(null);
    setOpenCap(null);
    setError("");
  }

  function save(saveTemplate: boolean) {
    if (missingCaps > 0) {
      setError(
        `Asigna ${missingCaps === 1 ? "el gorro pendiente" : `los ${missingCaps} gorros pendientes`} antes de guardar.`,
      );
      return;
    }
    if (invalidCaps.length > 0) {
      setError(`Reasigna los gorros ${invalidCaps.join(", ")}: solo existen del 1 al 14.`);
      return;
    }
    if (missingKeeper) {
      setError(rosterError);
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        if (onSaveLive) {
          await onSaveLive(draft, liveTransfers);
          allowLeave.current = true;
          setBaseline(draft);
          setSaveOpen(false);
          window.location.replace(backHref);
          return;
        }
        const result = await replaceMatchCallupResult({
          match_id: matchId,
          players: draft.map((player) => ({
            player_id: player.player_id,
            cap_number: player.cap_number,
          })),
          save_template: saveTemplate,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setBaseline(draft);
        if (saveTemplate) setTemplate(draft);
        setSaveOpen(false);
        setConfirmTemplate(false);
        allowLeave.current = true;
        setLeaveOpen(false);
        router.push(backHref);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos guardar la convocatoria.");
      }
    });
  }

  return (
    <section
      aria-labelledby="callup-title"
      className={cn(
        editable && (dirty || error)
          ? onSaveLive
            ? error || missingCaps > 0 || invalidCaps.length > 0 || missingKeeper
              ? "pb-32"
              : "pb-28"
            : missingCaps > 0 || error
              ? "pb-28"
              : "pb-20"
          : "pb-3",
      )}
    >
      <button
        type="button"
        onClick={() => (dirty ? setLeaveOpen(true) : router.push(backHref))}
        className="text-pool-blue focus-visible:outline-pool-blue -ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-extrabold focus-visible:outline-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
      </button>

      <header className="bg-pool-deep text-paper shadow-elev-2 mt-1 rounded-2xl px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 id="callup-title" className="font-display text-xl font-extrabold">
              Convocatoria
            </h1>
            <p className="mt-0.5 truncate text-sm font-semibold text-blue-100">
              {teamLabel} · {opponent}
            </p>
          </div>
          <span
            className="bg-paper text-pool-deep shrink-0 rounded-xl px-3 py-2 font-mono text-lg font-black tabular-nums"
            aria-label={`${draft.length} de 14 jugadores convocados`}
          >
            {draft.length}/14
          </span>
        </div>
        <time dateTime={scheduledAt} className="mt-2 block text-sm text-blue-100">
          {dateLabel}
        </time>
      </header>

      {editable && invalidCaps.length > 0 ? (
        <p
          className="border-danger bg-paper-card mt-3 rounded-xl border-2 px-3 py-2 text-sm font-bold text-red-800"
          role="alert"
        >
          Reasigna los gorros {invalidCaps.join(", ")}. Solo existen del 1 al 14.
        </p>
      ) : null}

      {editable && differsFromDefault ? (
        <button
          type="button"
          onClick={requestSource}
          disabled={pending}
          className="border-pool-blue bg-paper-card text-pool-deep focus-visible:outline-pool-blue mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 px-3 text-sm font-extrabold focus-visible:outline-2"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Volver a la convocatoria por defecto
        </button>
      ) : null}

      {error && !editable ? (
        <div className="mt-3" role="alert">
          <Alert variant="danger" title="Revisa la convocatoria">
            {error}
          </Alert>
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-2">
        <h2 className="text-pool-deep text-lg font-extrabold">Convocados</h2>
      </div>
      {editable ? (
        <>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            {draft.length >= 14 ? (
              <span
                className="border-pool-deep bg-paper-card text-pool-deep flex min-h-14 items-center justify-center gap-1 rounded-xl border-2 px-2 text-sm font-extrabold"
                role="status"
                aria-label="Convocatoria completa, 14 de 14 jugadores"
              >
                <Check className="h-4 w-4" aria-hidden="true" /> 14/14 jugadores
              </span>
            ) : (
              <button
                type="button"
                aria-haspopup="dialog"
                disabled={pending}
                onClick={() => {
                  setReplaceFrom(null);
                  setQuery("");
                  setVisibleCount(8);
                  setAdding(true);
                }}
                className="bg-pool-blue text-paper focus-visible:outline-pool-blue flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-3 text-base font-extrabold focus-visible:outline-2 disabled:opacity-50"
              >
                <UserPlus className="h-5 w-5" aria-hidden="true" /> Añadir jugador
              </button>
            )}
            <button
              type="button"
              onClick={() => setClearCapsOpen(true)}
              disabled={pending || !draft.some((player) => player.cap_number != null)}
              className="border-pool-blue bg-paper-card text-pool-deep focus-visible:outline-pool-blue inline-flex min-h-14 items-center justify-center gap-1.5 rounded-xl border-2 px-3 text-sm font-extrabold focus-visible:outline-2 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Quitar gorros
            </button>
          </div>
        </>
      ) : (
        <p className="bg-paper-card text-ink-700 mt-4 rounded-xl p-4 text-sm">
          Este partido ya tiene acta o está cerrado. La convocatoria es de solo lectura.
        </p>
      )}

      {selected.length === 0 ? (
        <p className="border-pool-blue/25 bg-paper-card text-ink-700 mt-2 rounded-xl border-2 p-4 text-sm">
          Todavía no hay jugadores. Añade el primero para preparar este partido.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {selected.map((pick) => {
            const player = byId.get(pick.player_id);
            const name = player?.full_name ?? "Jugador del equipo";
            const capOpen = openCap === pick.player_id;
            const toggleCap = () => setOpenCap(capOpen ? null : pick.player_id);
            const capOptionsId = `callup-cap-options-${pick.player_id}`;
            return (
              <li
                key={pick.player_id}
                className="border-pool-deep bg-paper-card shadow-elev-1 rounded-xl border-2 p-2"
              >
                <div className="flex min-h-12 items-center gap-2.5">
                  <CapNumberButton
                    value={pick.cap_number}
                    open={capOpen}
                    disabled={!editable || pending}
                    label={`Gorro de ${name}: ${pick.cap_number ?? "sin asignar"}. Cambiar`}
                    onClick={toggleCap}
                  />
                  {editable ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={toggleCap}
                      aria-label={`Elegir gorro de ${name}`}
                      aria-expanded={capOpen}
                      aria-controls={capOptionsId}
                      className="text-pool-deep focus-visible:outline-pool-blue min-h-12 min-w-0 flex-1 rounded-lg text-left text-base font-extrabold focus-visible:outline-2 disabled:opacity-50"
                    >
                      <AdaptivePlayerName name={name} />
                    </button>
                  ) : (
                    <span className="text-pool-deep min-w-0 flex-1 text-base font-extrabold">
                      <AdaptivePlayerName name={name} />
                    </span>
                  )}
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (hasRecordedActions(pick.player_id)) {
                          setReplaceFrom(pick.player_id);
                          setAdding(true);
                          setQuery("");
                          setVisibleCount(8);
                          return;
                        }
                        const next = draft.filter((item) => item.player_id !== pick.player_id);
                        const requirement = rosterRequirementError(
                          liveSheet?.category ?? category,
                          next.map((p) => p.cap_number),
                        );
                        if (requirement) {
                          setError(requirement);
                          return;
                        }
                        setDraft((current) =>
                          current.filter((item) => item.player_id !== pick.player_id),
                        );
                        setOpenCap(null);
                        setError("");
                      }}
                      disabled={pending}
                      aria-label={
                        hasRecordedActions(pick.player_id)
                          ? `Reemplazar a ${name} y conservar sus jugadas`
                          : `Quitar a ${name}`
                      }
                      className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-red-800 bg-red-50 text-red-800 focus-visible:outline-2 focus-visible:outline-red-800"
                    >
                      <UserMinus className="h-5 w-5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                {player?.has_conflict ? (
                  <p className="pl-14 text-sm font-bold text-red-800">No disponible ese día</p>
                ) : null}
                {player && !player.is_current_team ? (
                  <p className="text-ink-600 pl-14 text-sm">Jugador de otro equipo</p>
                ) : null}
                {capOpen ? (
                  <div id={capOptionsId} className="mt-2">
                    <CapNumberOptions
                      value={pick.cap_number}
                      occupied={
                        new Set(
                          draft
                            .filter((item) => item.player_id !== pick.player_id)
                            .map((item) => item.cap_number)
                            .filter((cap): cap is number => cap != null),
                        )
                      }
                      onChange={(cap) => changeCap(pick.player_id, cap)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {editable && (dirty || error) ? (
        <div
          className={cn(
            "border-pool-blue/30 bg-paper-card shadow-elev-2 fixed inset-x-4 z-20 mx-auto max-w-xl rounded-2xl border-2 p-2.5",
            onSaveLive
              ? "bottom-[max(0.75rem,env(safe-area-inset-bottom))]"
              : "bottom-[calc(var(--bottom-nav-height)+0.5rem)]",
          )}
        >
          {error ? (
            <p
              className="border-pool-deep text-pool-deep mb-2 rounded-xl border-2 bg-amber-100 px-3 py-2 text-base font-bold"
              role="alert"
            >
              {error}
            </p>
          ) : unassignedWithHistory ? (
            <p className="px-1 pb-1 text-sm font-bold text-red-800">
              {byId.get(unassignedWithHistory.player_id)?.full_name ?? "Este jugador"} tiene
              jugadas. Asígnale un gorro para guardar.
            </p>
          ) : missingCaps > 0 ? (
            <p className="px-1 pb-1 text-sm font-bold text-red-800">
              {missingCaps === 1 ? "Falta" : "Faltan"} {missingCaps}{" "}
              {missingCaps === 1 ? "gorro" : "gorros"} por asignar
            </p>
          ) : invalidCaps.length > 0 ? (
            <p className="px-1 pb-1 text-sm font-bold text-red-800">
              Reasigna los gorros {invalidCaps.join(", ")}: solo existen del 1 al 14
            </p>
          ) : missingKeeper ? (
            <p
              className="border-pool-deep text-pool-deep mb-2 rounded-xl border-2 bg-amber-100 px-3 py-2 text-base font-bold"
              role="alert"
            >
              {rosterError}
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            variant="deep"
            onClick={() => setSaveOpen(true)}
            disabled={
              pending || !dirty || missingCaps > 0 || invalidCaps.length > 0 || missingKeeper
            }
            className="w-full rounded-xl"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-5 w-5" aria-hidden="true" />
            )}
            {pending ? "Guardando…" : "Guardar convocatoria"}
          </Button>
        </div>
      ) : null}

      <CallupPlayerPickerSheet
        open={adding}
        onOpenChange={(open) => {
          setAdding(open);
          if (!open && !pendingReplacement) setReplaceFrom(null);
        }}
        replacingName={replacingName}
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          setVisibleCount(8);
        }}
        available={available}
        visibleCount={visibleCount}
        onMore={() => setVisibleCount((count) => count + 8)}
        onSelect={addPlayer}
        pending={pending}
      />
      <ActaGuardSheet
        open={pendingReplacement !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingReplacement(null);
            setReplaceFrom(null);
          }
        }}
        context="Convocatoria"
        title="¿Pasar sus jugadas?"
        body={
          <div className="border-pool-blue/70 bg-paper-card rounded-xl border-2 px-4 py-3.5">
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-2 gap-y-2">
              <span className="text-ink-600 text-sm font-bold">De</span>
              <strong className="text-pool-deep min-w-0 text-base leading-tight font-extrabold">
                {replacingName ?? "Jugador"}
              </strong>
              <span className="text-ink-600 text-sm font-bold">A</span>
              <strong className="text-pool-deep min-w-0 text-base leading-tight font-extrabold">
                {pendingReplacement?.full_name ?? "Jugador"}
              </strong>
            </div>
            {replacementStats ? (
              <p className="bg-pool-foam text-pool-deep mt-3 w-fit rounded-lg px-3 py-1.5 text-sm font-extrabold">
                {replacementStats}
              </p>
            ) : null}
          </div>
        }
        notice="Las jugadas y estadísticas pasarán al jugador elegido."
        icon="warning"
        actions={[
          { label: "Sí, pasar jugadas", tone: "primary", onClick: confirmReplacement },
          {
            label: "Elegir otro jugador",
            tone: "secondary",
            onClick: () => {
              setPendingReplacement(null);
              setAdding(true);
            },
          },
        ]}
      />
      <ActaGuardSheet
        open={pendingCapSwap !== null}
        onOpenChange={(open) => !open && setPendingCapSwap(null)}
        context="Convocatoria"
        title="¿Intercambiar estos gorros?"
        summary={`${byId.get(capSwapPlayer?.player_id ?? "")?.full_name ?? "Jugador"} llevará el ${pendingCapSwap?.cap ?? ""}`}
        description={`${byId.get(capSwapOther?.player_id ?? "")?.full_name ?? "El otro jugador"} ${capSwapPlayer?.cap_number == null ? "quedará sin gorro. Asígnale uno antes de guardar." : `llevará el ${capSwapPlayer.cap_number}. Las jugadas seguirán con cada jugador.`}`}
        icon="warning"
        actions={[
          { label: "Intercambiar gorros", tone: "primary", onClick: confirmCapSwap },
          {
            label: "Volver a elegir",
            tone: "secondary",
            onClick: () => setPendingCapSwap(null),
          },
        ]}
      />
      <ActaGuardSheet
        open={pendingSource}
        onOpenChange={setPendingSource}
        context="Convocatoria"
        title="Volver a la convocatoria por defecto"
        summary="Se sustituirá la lista actual"
        description="Volverán los jugadores y gorros guardados para este equipo."
        icon="warning"
        actions={[
          { label: "Usar lista por defecto", tone: "primary", onClick: applySource },
          { label: "Seguir editando", tone: "secondary", onClick: () => setPendingSource(false) },
        ]}
      />
      <ActaGuardSheet
        open={clearCapsOpen}
        onOpenChange={setClearCapsOpen}
        context="Convocatoria"
        title="Quitar todos los gorros"
        summary="Los jugadores seguirán en la lista"
        description="Tendrás que asignar de nuevo sus gorros antes de guardar."
        icon="warning"
        actions={[
          { label: "Mantener gorros", tone: "primary", onClick: () => setClearCapsOpen(false) },
          {
            label: "Quitar gorros",
            tone: "danger",
            onClick: () => {
              setDraft((current) => current.map((player) => ({ ...player, cap_number: null })));
              setClearCapsOpen(false);
              setError("");
            },
          },
        ]}
      />
      <ActaGuardSheet
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        context="Convocatoria"
        title="Cambios sin guardar"
        summary="¿Qué quieres hacer con los cambios?"
        description="Puedes guardarlos para este partido antes de volver."
        icon="warning"
        pending={pending}
        error={error}
        actions={[
          { label: "Guardar y volver", tone: "primary", onClick: () => save(false) },
          { label: "Seguir editando", tone: "secondary", onClick: () => setLeaveOpen(false) },
          {
            label: "Salir sin guardar",
            tone: "danger",
            onClick: () => {
              setLeaveOpen(false);
              allowLeave.current = true;
              router.push(backHref);
            },
          },
        ]}
      />
      <ActaGuardSheet
        open={saveOpen}
        onOpenChange={(open) => {
          setSaveOpen(open);
          if (!open) setConfirmTemplate(false);
        }}
        context="Convocatoria"
        title={
          confirmTemplate
            ? "¿Usar esta lista en los próximos partidos?"
            : onSaveLive
              ? "Guardar cambios del partido"
              : "Guardar convocatoria"
        }
        summary={
          confirmTemplate
            ? `Nueva lista por defecto de ${teamLabel}`
            : onSaveLive
              ? online
                ? "Cambios solo para este partido"
                : "Puedes guardar sin conexión"
              : "Cambios para este partido"
        }
        description={
          confirmTemplate
            ? "Guardarás este partido y esta será la lista predeterminada para los próximos. Los partidos ya creados no cambian."
            : onSaveLive
              ? online
                ? "Los jugadores y gorros se actualizarán para los demás."
                : "Los cambios quedan en este móvil y se envían cuando vuelve la conexión."
              : "Se guardarán los jugadores y gorros de este partido."
        }
        icon="warning"
        pending={pending}
        error={error}
        actions={
          confirmTemplate
            ? [
                {
                  label: "Sí, guardar como predeterminada",
                  tone: "primary",
                  onClick: () => save(true),
                },
                {
                  label: "Volver a las opciones",
                  tone: "secondary",
                  onClick: () => {
                    setConfirmTemplate(false);
                    setError("");
                  },
                },
              ]
            : onSaveLive
              ? [
                  { label: "Guardar este partido", tone: "primary", onClick: () => save(false) },
                  {
                    label: "Seguir editando",
                    tone: "secondary",
                    onClick: () => setSaveOpen(false),
                  },
                ]
              : [
                  {
                    label: "Solo este partido",
                    detail: "No cambia la lista por defecto",
                    tone: "primary",
                    onClick: () => save(false),
                  },
                  {
                    label: "Este y los próximos",
                    detail: `Nueva lista por defecto de ${teamLabel}`,
                    tone: "subtle",
                    onClick: () => {
                      setError("");
                      setConfirmTemplate(true);
                    },
                  },
                  {
                    label: "Seguir editando",
                    tone: "secondary",
                    onClick: () => setSaveOpen(false),
                  },
                ]
        }
      />
    </section>
  );
}
