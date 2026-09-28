"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  RotateCcw,
  Search,
  UserMinus,
  UserPlus,
  UsersRound,
  WandSparkles,
} from "lucide-react";

import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { Alert } from "@/components/ui/alert";
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
}

type Source = "template" | "previous" | "automatic";

function selectionKey(players: CallupPick[]): string {
  return [...players]
    .sort((a, b) => a.player_id.localeCompare(b.player_id))
    .map((player) => `${player.player_id}:${player.cap_number ?? "-"}`)
    .join("|");
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
}: CallupEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<CallupPick[]>(initial);
  const [baseline, setBaseline] = useState<CallupPick[]>(initial);
  const [template, setTemplate] = useState<CallupPick[]>(initialTemplate);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [adding, setAdding] = useState(initial.length === 0);
  const [query, setQuery] = useState("");
  const [lastAdded, setLastAdded] = useState("");
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
  const missingCaps = draft.filter((player) => player.cap_number == null).length;
  const selected = [...draft].sort(
    (a, b) =>
      (a.cap_number ?? 99) - (b.cap_number ?? 99) ||
      (byId.get(a.player_id)?.full_name ?? "").localeCompare(
        byId.get(b.player_id)?.full_name ?? "",
        "es",
      ),
  );
  const available = candidates.filter(
    (candidate) =>
      !selectedIds.has(candidate.player_id) &&
      candidate.full_name
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase("es")
        .includes(
          query
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLocaleLowerCase("es")
            .trim(),
        ),
  );

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
    setAdding(false);
    setQuery("");
    setLastAdded("");
    setOpenCap(null);
    setError("");
    setMessage(
      result.omitted > 0
        ? `${result.players.length} jugadores preparados. ${result.omitted} no disponibles o ya no elegibles; revisa antes de guardar.`
        : `${result.players.length} jugadores preparados. Pulsa «Guardar convocatoria» para aplicar el cambio.`,
    );
    setPendingSource(null);
  }

  function requestSource(source: Source) {
    if (draft.length > 0) setPendingSource(source);
    else applySource(source);
  }

  function addPlayer(candidate: CallupCandidate) {
    if (draft.length >= 14 || candidate.has_conflict) return;
    const cap = nextFreeCap(candidate.cap_number, occupied);
    setDraft((current) => [...current, { player_id: candidate.player_id, cap_number: cap }]);
    setAdding(false);
    setQuery("");
    setError("");
    setMessage(
      `${candidate.full_name} añadido a la selección. Guarda la convocatoria para confirmar.`,
    );
  }

  function save() {
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
    <section aria-labelledby="callup-title" className="pb-28">
      <button
        type="button"
        onClick={() => (dirty ? setLeaveOpen(true) : router.push(backHref))}
        className="text-pool-blue focus-visible:outline-pool-blue mb-2 -ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-extrabold focus-visible:outline-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
      </button>
      <div className="bg-pool-deep text-paper shadow-elev-2 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-blue-100">{teamLabel}</p>
            <h2 id="callup-title" className="font-display text-xl font-extrabold">
              Convocatoria
            </h2>
          </div>
          <span
            className="bg-paper text-pool-deep flex h-12 min-w-16 items-center justify-center rounded-xl px-2 font-mono text-lg font-extrabold"
            aria-label={`${draft.length} de 14 jugadores seleccionados`}
          >
            {draft.length}/14
          </span>
        </div>
        <p className="mt-2 text-sm text-blue-100">
          {editable
            ? "Elige quién juega y asigna un gorro a cada uno."
            : "Este partido ya tiene acta o está cerrado. La convocatoria se muestra solo para consulta."}
        </p>
      </div>

      {editable ? (
        <div className="mt-4">
          <h3 className="text-pool-deep text-base font-extrabold">Preparar en un toque</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => requestSource("template")}
              disabled={template.length === 0 || pending}
              className="border-pool-blue/35 bg-paper-card text-pool-deep focus-visible:outline-pool-blue flex min-h-16 flex-col items-start justify-center rounded-xl border-2 p-3 text-left focus-visible:outline-2 disabled:opacity-50"
            >
              <span className="font-extrabold">Habitual del equipo</span>
              <span className="text-ink-600 mt-0.5 text-sm">
                {template.length ? `${template.length} jugadores` : "Todavía sin guardar"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => requestSource("previous")}
              disabled={previous.length === 0 || pending}
              className="border-pool-blue/35 bg-paper-card text-pool-deep focus-visible:outline-pool-blue flex min-h-16 flex-col items-start justify-center rounded-xl border-2 p-3 text-left focus-visible:outline-2 disabled:opacity-50"
            >
              <span className="font-extrabold">Último partido</span>
              <span className="text-ink-600 mt-0.5 text-sm">
                {previous.length
                  ? (previousLabel ?? `${previous.length} jugadores`)
                  : "No hay uno anterior"}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => requestSource("automatic")}
            disabled={pending || candidates.every((candidate) => candidate.has_conflict)}
            className="bg-pool-foam border-pool-blue/35 text-pool-deep focus-visible:outline-pool-blue mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 px-3 font-extrabold focus-visible:outline-2 disabled:opacity-50"
          >
            <WandSparkles className="h-5 w-5" aria-hidden="true" /> Propuesta automática
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3" role="alert">
          <Alert variant="danger" title="Revisa la convocatoria">
            {error}
          </Alert>
        </div>
      ) : null}
      <p className="text-pool-deep mt-3 min-h-5 text-sm font-bold" role="status" aria-live="polite">
        {message || (dirty ? "Cambios sin guardar" : "Convocatoria guardada")}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <h3 className="text-pool-deep flex items-center gap-2 text-lg font-extrabold">
          <UsersRound className="h-5 w-5" aria-hidden="true" /> Jugadores elegidos
        </h3>
        {editable && draft.length > 0 ? (
          <button
            type="button"
            onClick={() => setClearCapsOpen(true)}
            className="text-pool-blue focus-visible:outline-pool-blue flex min-h-11 items-center gap-1 text-sm font-bold focus-visible:outline-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Repartir gorros
          </button>
        ) : null}
      </div>
      {selected.length === 0 ? (
        <p className="bg-paper-card text-ink-700 mt-2 rounded-xl p-4 text-sm">
          Todavía no has elegido jugadores. Usa una opción de arriba o pulsa «Añadir jugador».
        </p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {selected.map((pick) => {
            const player = byId.get(pick.player_id);
            const name = player?.full_name ?? "Jugador del equipo";
            const capOpen = openCap === pick.player_id;
            return (
              <li
                key={pick.player_id}
                className="border-pool-blue/30 bg-paper-card shadow-elev-1 rounded-xl border-2 p-2.5"
              >
                <div className="flex min-h-12 items-center gap-2">
                  <CapNumberButton
                    value={pick.cap_number}
                    open={capOpen}
                    disabled={!editable || pending}
                    label={`Gorro de ${name}: ${pick.cap_number ?? "sin asignar"}. Cambiar`}
                    onClick={() => setOpenCap(capOpen ? null : pick.player_id)}
                  />
                  <span className="text-pool-deep min-w-0 flex-1 text-base font-extrabold">
                    <AdaptivePlayerName name={name} />
                  </span>
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraft((current) =>
                          current.filter((item) => item.player_id !== pick.player_id),
                        );
                        setOpenCap(null);
                        setMessage(`${name} quitado de la selección. Guarda para confirmar.`);
                      }}
                      disabled={pending}
                      aria-label={`Quitar a ${name}`}
                      className="text-danger border-danger/30 bg-danger/5 focus-visible:outline-danger flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 focus-visible:outline-2"
                    >
                      <UserMinus className="h-5 w-5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                {player?.has_conflict ? (
                  <p className="text-danger mt-1 pl-14 text-sm font-bold">
                    No disponible este día. Revisa su asistencia.
                  </p>
                ) : null}
                {capOpen ? (
                  <div className="mt-2">
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
                      onChange={(cap) => {
                        setDraft((current) =>
                          current.map((item) =>
                            item.player_id === pick.player_id ? { ...item, cap_number: cap } : item,
                          ),
                        );
                        setOpenCap(null);
                        setMessage(`Gorro de ${name} actualizado. Guarda la convocatoria.`);
                      }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {editable ? (
        <div className="mt-4">
          <button
            type="button"
            aria-expanded={adding}
            onClick={() => {
              setLastAdded("");
              setAdding((current) => !current);
            }}
            className="border-pool-deep bg-paper-card text-pool-deep focus-visible:outline-pool-blue flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 px-3 text-base font-extrabold focus-visible:outline-2"
          >
            <UserPlus className="h-5 w-5" aria-hidden="true" /> Añadir jugador{" "}
            <ChevronDown
              className={cn("ml-auto h-5 w-5 transition-transform", adding && "rotate-180")}
              aria-hidden="true"
            />
          </button>
          {lastAdded ? (
            <p
              className="text-pool-deep bg-pool-foam mt-2 rounded-xl px-3 py-2 text-sm font-bold"
              role="status"
            >
              {lastAdded} añadido. Pulsa «Guardar convocatoria» para confirmar.
            </p>
          ) : null}
          {adding ? (
            <div className="bg-pool-ice mt-2 rounded-xl p-3">
              <label htmlFor="callup-player-search" className="text-pool-deep text-sm font-bold">
                Busca en el club
              </label>
              <div className="relative mt-1">
                <Search
                  className="text-ink-600 pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="callup-player-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nombre o apellido"
                  className="border-ink-300 bg-paper-card text-ink-900 focus-visible:outline-pool-blue min-h-12 w-full rounded-xl border-2 pr-3 pl-10 text-base focus-visible:outline-2"
                />
              </div>
              <ul className="mt-2 grid max-h-72 gap-1.5 overflow-y-auto overscroll-contain">
                {available.map((player) => (
                  <li key={player.player_id}>
                    <button
                      type="button"
                      onClick={() => addPlayer(player)}
                      disabled={draft.length >= 14 || player.has_conflict || pending}
                      className="bg-paper-card border-pool-blue/25 text-pool-deep focus-visible:outline-pool-blue flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-3 text-left focus-visible:outline-2 disabled:opacity-55"
                    >
                      <span className="min-w-0 flex-1 font-bold">
                        <AdaptivePlayerName name={player.full_name} />
                        <span className="text-ink-600 block text-xs font-semibold">
                          {player.has_conflict
                            ? "No disponible"
                            : player.is_current_team
                              ? "Este equipo"
                              : "Otro equipo compatible"}
                        </span>
                      </span>
                      {player.has_conflict ? null : (
                        <UserPlus className="h-5 w-5 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {available.length === 0 ? (
                <p className="text-ink-700 py-3 text-sm">No quedan jugadores con ese nombre.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {editable ? (
        <div className="border-pool-blue/30 bg-paper-card shadow-elev-4 sticky bottom-[calc(var(--bottom-nav-height)+.5rem)] z-20 mt-4 rounded-2xl border-2 p-3">
          <label className="text-pool-deep flex min-h-12 cursor-pointer items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={saveTemplate}
              onChange={(event) => setSaveTemplate(event.target.checked)}
              className="accent-pool-blue h-5 w-5 shrink-0"
            />
            Usar esta convocatoria en próximos partidos de {teamLabel}
          </label>
          <Button
            type="button"
            size="lg"
            variant="deep"
            onClick={save}
            disabled={pending || missingCaps > 0 || (!dirty && !saveTemplate)}
            className="mt-1 w-full rounded-xl"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-5 w-5" aria-hidden="true" />
            )}
            {pending ? "Guardando…" : "Guardar convocatoria"}
          </Button>
          {missingCaps > 0 ? (
            <p className="text-danger mt-1 text-center text-sm font-bold">
              Faltan {missingCaps} {missingCaps === 1 ? "gorro" : "gorros"}
            </p>
          ) : null}
        </div>
      ) : null}

      <ConfirmActionSheet
        open={pendingSource !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSource(null);
        }}
        title="¿Cambiar la selección?"
        description="Los jugadores que ves ahora se sustituirán en el borrador. Podrás revisarlo antes de guardar."
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
        title="¿Repartir los gorros de nuevo?"
        description="Los jugadores seguirán elegidos. Tendrás que asignar un gorro a cada uno antes de guardar."
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
        description="Los cambios de esta convocatoria aún no están guardados."
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
