"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  RotateCcw,
  Search,
  UserMinus,
  UserPlus,
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
  opponent: string;
  scheduledAt: string;
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
  opponent,
  scheduledAt,
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
  const [visibleCount, setVisibleCount] = useState(8);
  const [openCap, setOpenCap] = useState<string | null>(null);
  const [pendingSource, setPendingSource] = useState<Source | null>(null);
  const [clearCapsOpen, setClearCapsOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [lastAdded, setLastAdded] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

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
  const dirty = selectionKey(draft) !== selectionKey(baseline);
  const missingCaps = draft.filter((player) => player.cap_number == null).length;
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
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function sourcePicks(source: Source): CallupPick[] {
    if (source === "template") return template;
    if (source === "previous") return previous;
    return candidates
      .filter((candidate) => !candidate.has_conflict)
      .slice(0, 14)
      .map((candidate) => ({ player_id: candidate.player_id, cap_number: candidate.cap_number }));
  }

  function applySource(source: Source) {
    const result = prepareCallupSource(sourcePicks(source), candidates, originalIds);
    setDraft(result.players);
    setOpenCap(null);
    setAdding(false);
    setError("");
    setMessage(
      result.omitted > 0
        ? `${result.players.length} jugadores preparados; ${result.omitted} no disponibles se han omitido. Revisa y guarda.`
        : `${result.players.length} jugadores preparados. Revisa y guarda la convocatoria.`,
    );
    setPendingSource(null);
  }

  function requestSource(source: Source) {
    if (draft.length > 0 && selectionKey(draft) !== selectionKey(sourcePicks(source)))
      setPendingSource(source);
    else applySource(source);
  }

  function addPlayer(candidate: CallupCandidate) {
    if (!editable || pending || draft.length >= 14 || candidate.has_conflict) return;
    const cap = nextFreeCap(candidate.cap_number, occupied);
    setDraft((current) => [...current, { player_id: candidate.player_id, cap_number: cap }]);
    setMessage(`${candidate.full_name} añadido. Guarda para confirmar.`);
    setLastAdded(`${candidate.full_name} añadido a la convocatoria.`);
    setError("");
    if (draft.length === 13) setAdding(false);
  }

  function save() {
    if (missingCaps > 0) {
      setError(
        `Asigna ${missingCaps === 1 ? "el gorro pendiente" : `los ${missingCaps} gorros pendientes`} antes de guardar.`,
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
        saveTemplate ? "Convocatoria y lista habitual guardadas." : "Convocatoria guardada.",
      );
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="callup-title"
      className={cn(
        editable && (dirty || saveTemplate) ? "pb-[calc(var(--bottom-nav-height)+7rem)]" : "pb-3",
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

      {editable ? (
        <div className="mt-4">
          <h2 className="text-pool-deep text-base font-extrabold">Preparar lista</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => requestSource("template")}
              disabled={template.length === 0 || pending}
              aria-label={`Usar lista habitual del equipo${template.length ? `, ${template.length} jugadores` : ", todavía no guardada"}`}
              className="border-pool-blue/40 bg-paper-card text-pool-deep focus-visible:outline-pool-blue min-h-14 rounded-xl border-2 px-1 text-sm font-extrabold focus-visible:outline-2 disabled:opacity-50"
            >
              Habitual
            </button>
            <button
              type="button"
              onClick={() => requestSource("previous")}
              disabled={previous.length === 0 || pending}
              aria-label={`Usar convocatoria anterior${previousLabel ? ` del ${previousLabel}` : ", no disponible"}`}
              className="border-pool-blue/40 bg-paper-card text-pool-deep focus-visible:outline-pool-blue min-h-14 rounded-xl border-2 px-1 text-sm font-extrabold focus-visible:outline-2 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => requestSource("automatic")}
              disabled={pending || candidates.every((candidate) => candidate.has_conflict)}
              className="border-pool-blue/40 bg-paper-card text-pool-deep focus-visible:outline-pool-blue min-h-14 rounded-xl border-2 px-1 text-sm font-extrabold focus-visible:outline-2 disabled:opacity-50"
            >
              Automática
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3" role="alert">
          <Alert variant="danger" title="Revisa la convocatoria">
            {error}
          </Alert>
        </div>
      ) : null}
      {message ? (
        <p
          className="text-pool-deep bg-pool-foam mt-3 rounded-xl px-3 py-2 text-sm font-bold"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-2">
        <h2 className="text-pool-deep text-lg font-extrabold">Convocados</h2>
        {editable && draft.some((player) => player.cap_number != null) ? (
          <button
            type="button"
            onClick={() => setClearCapsOpen(true)}
            className="text-pool-blue focus-visible:outline-pool-blue inline-flex min-h-12 items-center gap-1.5 rounded-xl px-2 text-sm font-bold focus-visible:outline-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Quitar gorros
          </button>
        ) : null}
      </div>
      {selected.length === 0 ? (
        <p className="border-pool-blue/25 bg-paper-card text-ink-700 mt-2 rounded-xl border-2 p-4 text-sm">
          Todavía no hay jugadores. Usa una lista de arriba o añade uno.
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
                className="border-pool-blue/25 bg-paper-card shadow-elev-1 rounded-xl border-2 p-2"
              >
                <div className="flex min-h-12 items-center gap-2.5">
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
                        setMessage(`${name} quitado. Guarda para confirmar.`);
                      }}
                      disabled={pending}
                      aria-label={`Quitar a ${name}`}
                      className="border-danger/30 bg-danger/5 text-danger focus-visible:outline-danger flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 focus-visible:outline-2"
                    >
                      <UserMinus className="h-5 w-5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                {player?.has_conflict ? (
                  <p className="text-danger pl-14 text-sm font-bold">No disponible ese día</p>
                ) : null}
                {player && !player.is_current_team ? (
                  <p className="text-ink-600 pl-14 text-sm">Jugador de otro equipo</p>
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
                        setMessage(`Gorro de ${name} cambiado. Guarda para confirmar.`);
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
        <>
          {draft.length === 14 ? (
            <p className="text-ink-700 bg-pool-foam mt-4 rounded-xl px-4 py-3 text-sm font-semibold">
              Lista completa. Quita a un jugador si necesitas añadir otro.
            </p>
          ) : (
            <button
              type="button"
              aria-expanded={adding}
              onClick={() => {
                setAdding((current) => !current);
                setQuery("");
                setVisibleCount(8);
              }}
              className="border-pool-deep bg-paper-card text-pool-deep focus-visible:outline-pool-blue mt-4 flex min-h-14 w-full items-center gap-2 rounded-xl border-2 px-4 text-base font-extrabold focus-visible:outline-2"
            >
              <UserPlus className="h-5 w-5" aria-hidden="true" /> Añadir jugador{" "}
              <ChevronDown
                className={cn("ml-auto h-5 w-5 transition-transform", adding && "rotate-180")}
                aria-hidden="true"
              />
            </button>
          )}
          {adding && draft.length < 14 ? (
            <div className="border-pool-blue/25 bg-paper-card mt-2 rounded-xl border-2 p-3">
              <label htmlFor="callup-search" className="text-pool-deep text-sm font-bold">
                Buscar jugador
              </label>
              <div className="relative mt-1">
                <Search
                  className="text-ink-600 pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="callup-search"
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setVisibleCount(8);
                  }}
                  placeholder="Nombre o apellido"
                  className="border-ink-300 bg-paper text-ink-900 focus-visible:outline-pool-blue min-h-12 w-full rounded-xl border-2 pr-3 pl-10 text-base focus-visible:outline-2"
                />
              </div>
              {lastAdded ? (
                <p
                  className="text-pool-deep bg-pool-foam mt-2 rounded-lg px-3 py-2 text-sm font-bold"
                  role="status"
                >
                  {lastAdded}
                </p>
              ) : null}
              {available.length === 0 ? (
                <p className="text-ink-700 py-3 text-sm">No hay más jugadores con ese nombre.</p>
              ) : (
                <ul className="mt-2 grid gap-2">
                  {available.slice(0, visibleCount).map((candidate) => (
                    <li key={candidate.player_id}>
                      <button
                        type="button"
                        aria-label={
                          candidate.has_conflict
                            ? `${candidate.full_name} no disponible`
                            : `Añadir a ${candidate.full_name}`
                        }
                        onClick={() => addPlayer(candidate)}
                        disabled={draft.length >= 14 || candidate.has_conflict || pending}
                        className="border-pool-blue/25 bg-paper text-pool-deep focus-visible:outline-pool-blue flex min-h-14 w-full items-center gap-2 rounded-xl border-2 px-3 text-left focus-visible:outline-2 disabled:opacity-55"
                      >
                        <span className="min-w-0 flex-1 font-bold">
                          <AdaptivePlayerName name={candidate.full_name} />
                        </span>
                        {candidate.has_conflict ? (
                          <span className="text-danger text-sm font-bold">No disponible</span>
                        ) : (
                          <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold">
                            <UserPlus className="h-4 w-4" aria-hidden="true" /> Añadir
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {available.length > visibleCount ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + 8)}
                  className="text-pool-blue focus-visible:outline-pool-blue mt-2 min-h-12 w-full rounded-xl text-sm font-bold focus-visible:outline-2"
                >
                  Ver más jugadores
                </button>
              ) : null}
            </div>
          ) : null}

          <label className="border-pool-blue/25 bg-paper-card text-pool-deep mt-4 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={saveTemplate}
              onChange={(event) => setSaveTemplate(event.target.checked)}
              className="accent-pool-blue h-5 w-5 shrink-0"
            />
            <span>Guardar como lista habitual de {teamLabel}</span>
          </label>
        </>
      ) : (
        <p className="bg-paper-card text-ink-700 mt-4 rounded-xl p-4 text-sm">
          Este partido ya tiene acta o está cerrado. La convocatoria es de solo lectura.
        </p>
      )}

      {editable && (dirty || saveTemplate) ? (
        <div className="border-pool-blue/30 bg-paper-card shadow-elev-2 fixed inset-x-4 bottom-[calc(var(--bottom-nav-height)+0.5rem)] z-20 mx-auto max-w-xl rounded-2xl border-2 p-2.5">
          {error ? (
            <p className="text-danger px-1 pb-1 text-sm font-bold" role="alert">
              {error}
            </p>
          ) : missingCaps > 0 ? (
            <p className="text-danger px-1 pb-1 text-sm font-bold">
              Faltan {missingCaps} {missingCaps === 1 ? "gorro" : "gorros"} por asignar
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            variant="deep"
            onClick={save}
            disabled={pending || missingCaps > 0 || (!dirty && !saveTemplate)}
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

      <ConfirmActionSheet
        open={pendingSource !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSource(null);
        }}
        title="¿Cambiar la selección?"
        description="La lista actual se sustituirá en el borrador. Podrás revisarla antes de guardar."
        confirmLabel="Cambiar selección"
        cancelLabel="Mantener lista"
        variant="warning"
        onConfirm={() => {
          if (pendingSource) applySource(pendingSource);
        }}
      />
      <ConfirmActionSheet
        open={clearCapsOpen}
        onOpenChange={setClearCapsOpen}
        title="¿Quitar todos los gorros?"
        description="Los jugadores seguirán elegidos. Después tendrás que repartir los gorros para guardar."
        confirmLabel="Quitar gorros"
        cancelLabel="Mantener gorros"
        variant="warning"
        onConfirm={() => {
          setDraft((current) => current.map((player) => ({ ...player, cap_number: null })));
          setClearCapsOpen(false);
          setMessage("Gorros desasignados. Toca cada número para repartirlos.");
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
