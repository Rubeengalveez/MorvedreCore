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
  Sparkles,
  UserMinus,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { Button } from "@/components/ui/button";
import { ConfirmActionSheet } from "@/components/ui/confirm-action-sheet";
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
        ? `${result.players.length} jugadores preparados. ${result.omitted} no disponibles omitidos.`
        : `${result.players.length} jugadores cargados en la convocatoria.`,
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
        `Asigna un gorro a ${missingCaps === 1 ? "un jugador" : `${missingCaps} jugadores`} antes de guardar.`,
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
        className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl px-2 text-sm font-extrabold text-pool-blue hover:text-pool-deep focus-visible:outline-2 focus-visible:outline-pool-blue transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
      </button>

      {matchHeader}

      <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-pool-deep bg-white p-3.5 shadow-sm">
        <div className="min-w-0">
          <h2 id="callup-heading" className="flex items-center gap-2 text-lg font-black text-pool-deep">
            <UsersRound className="h-5 w-5 text-pool-blue shrink-0" aria-hidden="true" />
            <span>{draft.length} de 14 convocados</span>
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-ink-600">
            {draft.length === 14
              ? "Convocatoria completa. Para añadir otro jugador, quita uno primero."
              : `${14 - draft.length} plazas disponibles`}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "grid h-12 min-w-12 shrink-0 place-items-center rounded-xl px-3 font-mono text-xl font-black",
            draft.length === 14 ? "bg-success text-pool-deep" : "bg-pool-deep text-white",
          )}
        >
          {draft.length}
        </span>
      </div>

      {editable ? (
        <div className="rounded-2xl border-2 border-pool-blue/20 bg-paper-card p-3 shadow-xs">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-600">
              Plantillas rápidas
            </span>
            {draft.length > 0 && assignedCount > 0 ? (
              <button
                type="button"
                onClick={() => setClearCapsOpen(true)}
                className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold text-ink-600 hover:text-pool-deep focus-visible:outline-2 focus-visible:outline-pool-blue transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Quitar gorros
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => requestSource("template")}
              disabled={template.length === 0 || pending}
              className="flex min-h-12 flex-col items-center justify-center rounded-xl border border-pool-blue/20 bg-white p-2 text-center transition-colors hover:bg-pool-foam focus-visible:outline-2 focus-visible:outline-pool-blue disabled:opacity-40"
            >
              <span className="flex items-center gap-1 text-xs font-extrabold text-pool-deep">
                ⭐ Habitual
              </span>
              <span className="text-[11px] font-medium text-ink-600">
                {template.length > 0 ? `${template.length} jug.` : "Sin fijar"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => requestSource("previous")}
              disabled={previous.length === 0 || pending}
              className="flex min-h-12 flex-col items-center justify-center rounded-xl border border-pool-blue/20 bg-white p-2 text-center transition-colors hover:bg-pool-foam focus-visible:outline-2 focus-visible:outline-pool-blue disabled:opacity-40"
            >
              <span className="flex items-center gap-1 text-xs font-extrabold text-pool-deep">
                ↺ Anterior
              </span>
              <span className="max-w-full truncate text-[11px] font-medium text-ink-600">
                {previous.length > 0 ? (previousLabel ?? `${previous.length} jug.`) : "No hay"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => requestSource("automatic")}
              disabled={pending || candidates.every((candidate) => candidate.has_conflict)}
              className="flex min-h-12 flex-col items-center justify-center rounded-xl border border-pool-blue/20 bg-white p-2 text-center transition-colors hover:bg-pool-foam focus-visible:outline-2 focus-visible:outline-pool-blue disabled:opacity-40"
            >
              <span className="flex items-center gap-1 text-xs font-extrabold text-pool-deep">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Sugerida
              </span>
              <span className="text-[11px] font-medium text-ink-600">Automática</span>
            </button>
          </div>
        </div>
      ) : null}

      {missingCaps > 0 ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border-2 border-amber-500/40 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-950 sm:text-sm"
        >
          <span className="shrink-0 text-base" aria-hidden="true">
            ⚠️
          </span>
          <span>
            Gorros asignados: <strong>{assignedCount} de {draft.length}</strong>. Asigna los {missingCaps} que faltan para guardar.
          </span>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border-2 border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-900 sm:text-sm"
        >
          {error}
        </div>
      ) : null}

      {message ? (
        <p role="status" aria-live="polite" className="text-xs font-bold text-success sm:text-sm">
          {message}
        </p>
      ) : null}

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-500"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar jugador por nombre…"
          className="h-11 w-full rounded-xl border-2 border-ink-200 bg-white pr-3 pl-9 text-sm text-ink-900 placeholder:text-ink-500 focus-visible:outline-2 focus-visible:outline-pool-blue"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide text-pool-deep">
            <span>Convocados</span>
            <span className="rounded-full bg-pool-foam px-2 py-0.5 font-mono text-xs font-black text-pool-deep">
              {draft.length}/14
            </span>
          </h3>
        </div>

        {draft.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink-200 bg-white/70 p-4 text-center">
            <p className="text-sm font-bold text-ink-700">No hay jugadores convocados todavía</p>
            <p className="mt-1 text-xs text-ink-500">
              Toca el botón <strong className="text-pool-deep">+</strong> en cualquier jugador de abajo o usa una plantilla rápida.
            </p>
          </div>
        ) : selected.length === 0 ? (
          <p className="rounded-xl bg-paper-card p-3 text-center text-xs font-semibold text-ink-600">
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
                    "rounded-2xl border-2 bg-white p-2.5 shadow-sm transition-all",
                    pick.cap_number == null ? "border-amber-400 bg-amber-50/20" : "border-pool-blue",
                  )}
                >
                  <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_3rem] items-center gap-2.5">
                    <CapNumberButton
                      value={pick.cap_number}
                      open={isCapOpen}
                      disabled={!editable || pending}
                      label={`Gorro de ${name}: ${pick.cap_number ?? "sin asignar"}. Toca para cambiar`}
                      onClick={() => setOpenCap((curr) => (curr === pick.player_id ? null : pick.player_id))}
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-ink-900 sm:text-base">
                        <AdaptivePlayerName name={name} />
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {pick.cap_number != null ? (
                          <span className="text-xs font-bold text-success">
                            Gorro #{pick.cap_number}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-800">
                            ⚠️ Sin gorro
                          </span>
                        )}
                        {candidate?.has_conflict ? (
                          <span className="rounded bg-red-100 px-1.5 py-0.2 text-[11px] font-bold text-red-800">
                            No disponible
                          </span>
                        ) : null}
                        {candidate && !candidate.is_current_team ? (
                          <span className="rounded bg-pool-foam px-1.5 py-0.2 text-[11px] font-bold text-pool-deep">
                            Refuerzo
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {editable ? (
                      <button
                        type="button"
                        onClick={() => removePlayer(pick.player_id)}
                        disabled={pending}
                        aria-label={`Quitar a ${name} de la convocatoria`}
                        className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-40 transition-colors"
                      >
                        <UserMinus className="h-5 w-5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>

                  {isCapOpen ? (
                    <div className="mt-2.5">
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

      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide text-ink-600">
            <span>Disponibles para convocar</span>
            <span className="rounded-full bg-ink-200/60 px-2 py-0.5 font-mono text-xs font-bold text-ink-700">
              {candidates.length - draft.length}
            </span>
          </h3>
        </div>

        {unselected.length === 0 ? (
          <div className="rounded-xl border border-ink-200 bg-paper-sunk/40 p-3 text-center text-xs font-semibold text-ink-600">
            {normalizedQuery
              ? `Ningún jugador disponible coincide con «${query}».`
              : "Todos los jugadores de la lista ya están convocados."}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {unselected.map((candidate) => (
              <li
                key={candidate.player_id}
                className="rounded-2xl border-2 border-ink-200/80 bg-paper-sunk/60 p-2.5 opacity-90 transition-all hover:bg-white"
              >
                <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_3rem] items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="grid h-12 w-12 place-items-center rounded-full border-2 border-dashed border-ink-300 font-mono text-base font-bold text-ink-400"
                  >
                    –
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-800 sm:text-base">
                      <AdaptivePlayerName name={candidate.full_name} />
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {candidate.has_conflict ? (
                        <span className="rounded bg-red-100 px-1.5 py-0.2 text-[11px] font-bold text-red-800">
                          No disponible este día
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-ink-500">
                          Disponible para convocar
                        </span>
                      )}
                      {!candidate.is_current_team ? (
                        <span className="rounded bg-ink-200 px-1.5 py-0.2 text-[11px] font-bold text-ink-700">
                          Otro equipo
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {editable ? (
                    <button
                      type="button"
                      onClick={() => addPlayer(candidate)}
                      disabled={draft.length >= 14 || candidate.has_conflict || pending}
                      aria-label={`Añadir a ${candidate.full_name}`}
                      className="grid h-12 w-12 place-items-center rounded-xl bg-pool-deep text-white hover:bg-pool-blue focus-visible:outline-2 focus-visible:outline-pool-blue disabled:opacity-35 transition-colors"
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
        <div className="sticky bottom-[calc(var(--bottom-nav-height)+0.5rem)] z-20 mt-4 rounded-2xl border-2 border-pool-blue/30 bg-white/95 p-3.5 shadow-elev-4 backdrop-blur-md">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-xs font-bold text-pool-deep sm:text-sm">
            <input
              type="checkbox"
              checked={saveTemplate}
              onChange={(event) => setSaveTemplate(event.target.checked)}
              className="h-5 w-5 shrink-0 rounded border-2 border-pool-blue text-pool-blue accent-pool-blue focus-visible:outline-pool-blue"
            />
            <span>Guardar como convocatoria habitual de {teamLabel}</span>
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
            {pending ? "Guardando…" : "Guardar convocatoria"}
          </Button>
          {missingCaps > 0 ? (
            <p className="mt-1.5 text-center text-xs font-bold text-amber-700">
              Faltan {missingCaps} {missingCaps === 1 ? "gorro" : "gorros"} por asignar para guardar
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border-2 border-ink-200 bg-paper-sunk p-4 text-center">
          <p className="text-sm font-bold text-ink-700">
            Esta convocatoria ya no se puede modificar porque el partido ya tiene acta o está cerrado.
          </p>
        </div>
      )}

      <ConfirmActionSheet
        open={pendingSource !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSource(null);
        }}
        title="¿Cambiar la selección?"
        description="Se sustituirá el borrador actual con los jugadores de la plantilla seleccionada. Podrás revisarlo antes de guardar."
        confirmLabel="Sí, preparar selección"
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
        description="Los jugadores seguirán en la convocatoria, pero tendrás que asignarles un gorro a cada uno antes de guardar."
        confirmLabel="Sí, quitar gorros"
        cancelLabel="Mantener gorros"
        variant="warning"
        onConfirm={() => {
          setDraft((current) => current.map((player) => ({ ...player, cap_number: null })));
          setClearCapsOpen(false);
          setMessage("Gorros sin asignar. Toca cada número para repartirlos.");
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
