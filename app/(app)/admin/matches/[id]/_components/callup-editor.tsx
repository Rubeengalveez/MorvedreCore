"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  ArrowLeft,
  Check,
  Loader2,
  RotateCcw,
  Search,
  UserMinus,
  UserPlus,
} from "lucide-react";

import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionSheet } from "@/components/ui/confirm-action-sheet";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  nextFreeCap,
  prepareCallupSource,
  type CallupCandidate,
  type CallupPick,
} from "@/lib/domain/callup-selection";
import { cn } from "@/lib/utils/cn";
import { replaceMatchCallupResult } from "@/server/actions/admin/matches";

import { CapNumberButton, CapNumberOptions } from "./cap-number-picker";

export type { CallupCandidate, CallupPick } from "@/lib/domain/callup-selection";

interface CallupEditorProps {
  matchId: string;
  teamLabel: string;
  initial: CallupPick[];
  candidates: CallupCandidate[];
  template: CallupPick[];
  previous: CallupPick[];
  previousLabel: string | null;
  editable: boolean;
  backHref: Route;
  backLabel: string;
  matchHeader: React.ReactNode;
}

type Source = "template" | "previous" | "automatic";

function selectionKey(players: CallupPick[]): string {
  return [...players]
    .sort((a, b) => a.player_id.localeCompare(b.player_id))
    .map((player) => `${player.player_id}:${player.cap_number ?? "-"}`)
    .join("|");
}

function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function CallupEditor({
  matchId,
  teamLabel,
  initial,
  candidates,
  template: initialTemplate,
  previous,
  previousLabel,
  editable,
  backHref,
  backLabel,
  matchHeader,
}: CallupEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<CallupPick[]>(initial);
  const [baseline, setBaseline] = useState<CallupPick[]>(initial);
  const [template, setTemplate] = useState<CallupPick[]>(initialTemplate);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [query, setQuery] = useState("");
  const [openCap, setOpenCap] = useState<string | null>(null);
  const [pendingSource, setPendingSource] = useState<Source | null>(null);
  const [clearCapsOpen, setClearCapsOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const byId = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.player_id, candidate])),
    [candidates],
  );
  const selectedIds = useMemo(() => new Set(draft.map((player) => player.player_id)), [draft]);
  const initialIds = useMemo(() => new Set(initial.map((player) => player.player_id)), [initial]);
  const occupied = useMemo(
    () =>
      new Set(draft.map((player) => player.cap_number).filter((cap): cap is number => cap != null)),
    [draft],
  );
  const dirty = selectionKey(draft) !== selectionKey(baseline);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const assignedCount = draft.filter((player) => player.cap_number != null).length;
  const missingCaps = draft.length - assignedCount;

  const normalizedQuery = normalizeSearch(query);

  const selected = useMemo(() => {
    return [...draft]
      .filter((pick) => {
        if (!normalizedQuery) return true;
        const candidate = byId.get(pick.player_id);
        return candidate && normalizeSearch(candidate.full_name).includes(normalizedQuery);
      })
      .sort((a, b) => {
        const aCap = a.cap_number ?? 99;
        const bCap = b.cap_number ?? 99;
        if (aCap !== bCap) return aCap - bCap;
        const aName = byId.get(a.player_id)?.full_name ?? "";
        const bName = byId.get(b.player_id)?.full_name ?? "";
        return aName.localeCompare(bName, "es");
      });
  }, [draft, byId, normalizedQuery]);

  const unselected = useMemo(() => {
    return candidates
      .filter((candidate) => {
        if (selectedIds.has(candidate.player_id)) return false;
        if (!normalizedQuery) return true;
        return normalizeSearch(candidate.full_name).includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (a.is_current_team !== b.is_current_team) return a.is_current_team ? -1 : 1;
        if (a.has_conflict !== b.has_conflict) return a.has_conflict ? 1 : -1;
        return a.full_name.localeCompare(b.full_name, "es");
      });
  }, [candidates, selectedIds, normalizedQuery]);

  function occupiedExcept(playerId: string): ReadonlySet<number> {
    return new Set(
      draft
        .filter((item) => item.player_id !== playerId && item.cap_number != null)
        .map((item) => item.cap_number!),
    );
  }

  function sourcePicks(source: Source): CallupPick[] {
    if (source === "template") return template;
    if (source === "previous") return previous;
    return candidates
      .filter((candidate) => !candidate.has_conflict)
      .slice(0, 14)
      .map((candidate) => ({
        player_id: candidate.player_id,
        cap_number: candidate.cap_number,
      }));
  }

  function applySource(source: Source) {
    const result = prepareCallupSource(sourcePicks(source), candidates, initialIds);
    setDraft(result.players);
    setOpenCap(null);
    setError("");
    setMessage(
      result.omitted > 0
        ? `${result.players.length} jugadores cargados (${result.omitted} no disponibles omitidos).`
        : `${result.players.length} jugadores preparados en la convocatoria.`,
    );
    setPendingSource(null);
  }

  function requestSource(source: Source) {
    if (draft.length > 0) setPendingSource(source);
    else applySource(source);
  }

  function addPlayer(candidate: CallupCandidate) {
    if (draft.length >= 14 || candidate.has_conflict || !editable || pending) return;
    const cap = nextFreeCap(candidate.cap_number, occupied);
    setDraft((current) => [...current, { player_id: candidate.player_id, cap_number: cap }]);
    setError("");
    setMessage("");
  }

  function removePlayer(playerId: string) {
    if (!editable || pending) return;
    setDraft((current) => current.filter((item) => item.player_id !== playerId));
    if (openCap === playerId) setOpenCap(null);
    setError("");
    setMessage("");
  }

  function changeCap(playerId: string, cap: number | null) {
    setDraft((current) =>
      current.map((item) => (item.player_id === playerId ? { ...item, cap_number: cap } : item)),
    );
    setOpenCap(null);
    setError("");
  }

  function save() {
    if (draft.length === 0) {
      setError("Debes convocar al menos a un jugador para guardar.");
      return;
    }
    if (missingCaps > 0) {
      setError(
        `Asigna un dorsal a ${missingCaps === 1 ? "un jugador" : `${missingCaps} jugadores`} antes de guardar.`,
      );
      return;
    }
    setError("");
    startTransition(async () => {
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
      setSaveTemplate(false);
      setMessage(
        saveTemplate ? "Convocatoria y plantilla habitual guardadas." : "Convocatoria guardada.",
      );
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="callup-heading" className="flex flex-col gap-3 pb-4">
      <button
        type="button"
        onClick={() => (dirty ? setLeaveOpen(true) : router.push(backHref))}
        className="text-pool-blue hover:bg-pool-foam hover:text-pool-deep focus-visible:ring-pool-blue -ml-2 inline-flex min-h-12 w-fit touch-manipulation items-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{backLabel}</span>
      </button>

      {matchHeader}

      <Card variant="lane" className="bg-paper-card">
        <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <Eyebrow tone="muted">Convocatoria oficial</Eyebrow>
            <h2
              id="callup-heading"
              className="font-display text-pool-deep text-2xl font-extrabold tracking-tight"
            >
              {draft.length} de 14 convocados
            </h2>
            <p className="text-ink-600 mt-1 text-sm font-medium">
              {draft.length === 14
                ? "Lista completa. Para añadir otro jugador, retira uno antes."
                : `${14 - draft.length} plazas disponibles en el banquillo`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center justify-center">
            <div
              className={cn(
                "shadow-elev-2 flex h-14 min-w-14 items-center justify-center rounded-xl px-3 font-mono text-2xl font-black tabular-nums",
                draft.length === 14 ? "bg-success text-paper" : "bg-pool-deep text-paper",
              )}
            >
              {draft.length}
            </div>
            <span className="text-ink-500 mt-1 font-mono text-[11px] font-bold">/14</span>
          </div>
        </div>
      </Card>

      {editable ? (
        <Card className="bg-paper-card p-3 sm:p-4">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <Eyebrow tone="default">Cargar plantilla</Eyebrow>
            {draft.length > 0 && assignedCount > 0 ? (
              <button
                type="button"
                onClick={() => setClearCapsOpen(true)}
                className="text-ink-600 hover:text-pool-deep hover:bg-pool-foam flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-pool-blue"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Desasignar gorros</span>
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => requestSource("template")}
              disabled={template.length === 0 || pending}
              className="focus-visible:ring-pool-blue flex min-h-12 flex-col items-start justify-center rounded-xl border border-ink-200 bg-paper-sunk/60 p-2.5 text-left transition-colors hover:border-pool-blue/40 hover:bg-pool-foam/40 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
            >
              <span className="text-pool-deep text-xs font-extrabold">Habitual</span>
              <span className="text-ink-600 max-w-full truncate text-[11px] font-medium">
                {template.length > 0 ? `${template.length} jugadores` : "Sin plantilla"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => requestSource("previous")}
              disabled={previous.length === 0 || pending}
              className="focus-visible:ring-pool-blue flex min-h-12 flex-col items-start justify-center rounded-xl border border-ink-200 bg-paper-sunk/60 p-2.5 text-left transition-colors hover:border-pool-blue/40 hover:bg-pool-foam/40 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
            >
              <span className="text-pool-deep text-xs font-extrabold">Último partido</span>
              <span className="text-ink-600 max-w-full truncate text-[11px] font-medium">
                {previous.length > 0 ? (previousLabel ?? `${previous.length} jug.`) : "No disponible"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => requestSource("automatic")}
              disabled={pending || candidates.every((candidate) => candidate.has_conflict)}
              className="focus-visible:ring-pool-blue flex min-h-12 flex-col items-start justify-center rounded-xl border border-ink-200 bg-paper-sunk/60 p-2.5 text-left transition-colors hover:border-pool-blue/40 hover:bg-pool-foam/40 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
            >
              <span className="text-pool-deep text-xs font-extrabold">Propuesta</span>
              <span className="text-ink-600 text-[11px] font-medium">Asistencia</span>
            </button>
          </div>
        </Card>
      ) : null}

      {missingCaps > 0 ? (
        <Alert variant="warning" title="Gorros pendientes de asignar">
          Hay {missingCaps} {missingCaps === 1 ? "jugador" : "jugadores"} sin dorsal ({assignedCount} de {draft.length} asignados). Asigna todos los gorros para guardar la convocatoria.
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="danger" title="Revisa la convocatoria">
          {error}
        </Alert>
      ) : null}

      {message ? (
        <Alert variant="success">
          {message}
        </Alert>
      ) : null}

      <div className="relative">
        <Search
          className="text-ink-400 pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar jugador por nombre…"
          className="border-ink-200 bg-paper-card text-ink-900 placeholder:text-ink-400 focus-visible:ring-pool-blue h-11 w-full rounded-xl border pl-10 pr-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Eyebrow tone="default" as="h3">
            Convocados ({draft.length}/14)
          </Eyebrow>
        </div>

        {draft.length === 0 ? (
          <Card variant="sunken" className="p-5 text-center">
            <p className="text-pool-deep text-sm font-extrabold">No hay jugadores convocados todavía</p>
            <p className="text-ink-600 mt-1 text-xs">
              Usa el botón de añadir en la lista inferior o carga una de las plantillas de arriba.
            </p>
          </Card>
        ) : selected.length === 0 ? (
          <p className="bg-paper-card text-ink-600 rounded-xl p-3 text-center text-xs font-semibold">
            Ningún convocado coincide con «{query}».
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selected.map((pick) => {
              const candidate = byId.get(pick.player_id);
              const name = candidate?.full_name ?? "Jugador del equipo";
              const isCapOpen = openCap === pick.player_id;
              return (
                <li
                  key={pick.player_id}
                  className={cn(
                    "shadow-elev-1 rounded-xl border bg-paper-card p-3 transition-colors",
                    pick.cap_number == null
                      ? "border-warning bg-amber-50/20"
                      : "border-ink-200 hover:border-pool-blue/40",
                  )}
                >
                  <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_3rem] items-center gap-3">
                    <CapNumberButton
                      value={pick.cap_number}
                      open={isCapOpen}
                      disabled={!editable || pending}
                      label={`Gorro de ${name}: ${pick.cap_number ?? "sin dorsal"}. Toca para cambiar`}
                      onClick={() => setOpenCap((curr) => (curr === pick.player_id ? null : pick.player_id))}
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-ink-900 sm:text-base">
                        <AdaptivePlayerName name={name} />
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {pick.cap_number != null ? (
                          <StatusBadge variant="brand" size="sm">
                            Gorro #{pick.cap_number}
                          </StatusBadge>
                        ) : (
                          <StatusBadge variant="warning" size="sm">
                            Sin dorsal
                          </StatusBadge>
                        )}
                        {candidate?.has_conflict ? (
                          <StatusBadge variant="danger" size="sm">
                            No disponible
                          </StatusBadge>
                        ) : null}
                        {candidate && !candidate.is_current_team ? (
                          <StatusBadge variant="info" size="sm">
                            Refuerzo
                          </StatusBadge>
                        ) : null}
                      </div>
                    </div>

                    {editable ? (
                      <button
                        type="button"
                        onClick={() => removePlayer(pick.player_id)}
                        disabled={pending}
                        aria-label={`Quitar a ${name} de la convocatoria`}
                        className="text-goggle-red hover:bg-red-100 focus-visible:ring-goggle-red flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
                      >
                        <UserMinus className="h-5 w-5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>

                  {isCapOpen ? (
                    <div className="mt-3">
                      <CapNumberOptions
                        value={pick.cap_number}
                        occupied={occupiedExcept(pick.player_id)}
                        onChange={(cap) => changeCap(pick.player_id, cap)}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center justify-between">
          <Eyebrow tone="default" as="h3">
            Disponibles para convocar ({candidates.length - draft.length})
          </Eyebrow>
        </div>

        {unselected.length === 0 ? (
          <div className="border-ink-200 bg-paper-sunk/40 text-ink-600 rounded-xl border p-3 text-center text-xs font-semibold">
            {normalizedQuery
              ? `Ningún jugador disponible coincide con «${query}».`
              : "Todos los jugadores de la plantilla ya están convocados."}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {unselected.map((candidate) => (
              <li
                key={candidate.player_id}
                className="border-ink-200/70 bg-paper-sunk/50 rounded-xl border p-3 opacity-90 transition-all hover:bg-paper-card hover:opacity-100"
              >
                <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_3rem] items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="border-ink-300 text-ink-400 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-dashed font-mono text-base font-bold select-none"
                  >
                    —
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-800 sm:text-base">
                      <AdaptivePlayerName name={candidate.full_name} />
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {candidate.has_conflict ? (
                        <StatusBadge variant="danger" size="sm">
                          No disponible
                        </StatusBadge>
                      ) : (
                        <span className="text-ink-500 text-xs font-medium">
                          Disponible para convocar
                        </span>
                      )}
                      {!candidate.is_current_team ? (
                        <StatusBadge variant="neutral" size="sm">
                          Otro equipo
                        </StatusBadge>
                      ) : null}
                    </div>
                  </div>

                  {editable ? (
                    <button
                      type="button"
                      onClick={() => addPlayer(candidate)}
                      disabled={draft.length >= 14 || candidate.has_conflict || pending}
                      aria-label={`Añadir a ${candidate.full_name}`}
                      className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue flex h-12 w-12 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-35"
                    >
                      <UserPlus className="h-5 w-5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editable ? (
        <div className="shadow-elev-4 border-ink-200/90 bg-paper-card/95 sticky bottom-[calc(var(--bottom-nav-height)+0.5rem)] z-20 mt-4 rounded-2xl border p-4 backdrop-blur-md">
          <label className="text-pool-deep flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={saveTemplate}
              onChange={(event) => setSaveTemplate(event.target.checked)}
              className="border-ink-300 text-pool-blue accent-pool-blue focus-visible:ring-pool-blue h-5 w-5 shrink-0 rounded focus-visible:ring-2 focus-visible:outline-none"
            />
            <span>Fijar como plantilla habitual de {teamLabel}</span>
          </label>
          <Button
            type="button"
            size="lg"
            variant="deep"
            onClick={save}
            disabled={pending || draft.length === 0 || missingCaps > 0 || (!dirty && !saveTemplate)}
            className="mt-2 w-full rounded-xl"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-5 w-5" aria-hidden="true" />
            )}
            <span>{pending ? "Guardando…" : "Guardar convocatoria"}</span>
          </Button>
          {missingCaps > 0 ? (
            <p className="text-warning mt-2 text-center text-xs font-bold">
              Asigna los {missingCaps} dorsales pendientes para poder guardar.
            </p>
          ) : null}
        </div>
      ) : (
        <Card variant="sunken" className="mt-4 p-4 text-center">
          <p className="text-ink-700 text-sm font-bold">
            Esta convocatoria ya no se puede modificar porque el partido ya tiene acta o está cerrado.
          </p>
        </Card>
      )}

      <ConfirmActionSheet
        open={pendingSource !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSource(null);
        }}
        title="¿Cambiar la selección?"
        description="Se sustituirá el borrador actual con los jugadores de la plantilla seleccionada. Podrás revisarlo antes de guardar."
        confirmLabel="Sí, cargar plantilla"
        cancelLabel="Mantener selección"
        variant="warning"
        onConfirm={() => {
          if (pendingSource) applySource(pendingSource);
        }}
      />
      <ConfirmActionSheet
        open={clearCapsOpen}
        onOpenChange={setClearCapsOpen}
        title="¿Quitar todos los gorros?"
        description="Los jugadores seguirán en la convocatoria, pero tendrás que asignarles un dorsal a cada uno antes de guardar."
        confirmLabel="Sí, quitar gorros"
        cancelLabel="Mantener gorros"
        variant="warning"
        onConfirm={() => {
          setDraft((current) => current.map((player) => ({ ...player, cap_number: null })));
          setClearCapsOpen(false);
          setMessage("Gorros sin asignar. Selecciona un dorsal para cada jugador.");
        }}
      />
      <ConfirmActionSheet
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="¿Salir sin guardar?"
        description="Tienes cambios en la convocatoria que aún no has guardado."
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir editando"
        variant="warning"
        onConfirm={() => {
          setLeaveOpen(false);
          router.push(backHref);
        }}
      />
    </section>
  );
}
