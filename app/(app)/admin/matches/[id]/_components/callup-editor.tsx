"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, RotateCcw, Search, UserMinus, UserPlus } from "lucide-react";

import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { ActaDecisionSheet } from "@/components/ui/acta-decision-sheet";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  editable: boolean;
  backHref: Route;
  backLabel: string;
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
  opponent,
  scheduledAt,
  initial,
  candidates,
  template: initialTemplate,
  editable,
  backHref,
  backLabel,
}: CallupEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<CallupPick[]>(initial);
  const [baseline, setBaseline] = useState<CallupPick[]>(initial);
  const [template, setTemplate] = useState<CallupPick[]>(initialTemplate);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const [openCap, setOpenCap] = useState<string | null>(null);
  const [pendingSource, setPendingSource] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
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

  function applySource() {
    const result = prepareCallupSource(template, candidates, originalIds);
    setDraft(result.players);
    setOpenCap(null);
    setAdding(false);
    setError("");
    setMessage(
      result.omitted > 0 ? `${result.omitted} jugadores no disponibles se han omitido.` : "",
    );
    setPendingSource(false);
  }

  function requestSource() {
    if (draft.length > 0 && selectionKey(draft) !== selectionKey(template)) setPendingSource(true);
    else applySource();
  }

  function addPlayer(candidate: CallupCandidate) {
    if (!editable || pending || draft.length >= 14 || candidate.has_conflict) return;
    const cap = nextFreeCap(candidate.cap_number, occupied);
    setDraft((current) => [...current, { player_id: candidate.player_id, cap_number: cap }]);
    setMessage("");
    setError("");
    if (draft.length === 13) setAdding(false);
  }

  function save(saveTemplate: boolean) {
    if (missingCaps > 0) {
      setError(
        `Asigna ${missingCaps === 1 ? "el gorro pendiente" : `los ${missingCaps} gorros pendientes`} antes de guardar.`,
      );
      return;
    }
    setError("");
    startTransition(async () => {
      try {
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
        setMessage(
          saveTemplate
            ? "Guardada para este partido y los próximos del equipo."
            : "Convocatoria de este partido guardada.",
        );
        router.refresh();
      } catch {
        setError("No pudimos guardar la convocatoria. Inténtalo de nuevo.");
      }
    });
  }

  return (
    <section aria-labelledby="callup-title" className={cn(editable && dirty ? "pb-12" : "pb-3")}>
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

      {error ? (
        <div className="mt-3" role="alert">
          <Alert variant="danger" title="Revisa la convocatoria">
            {error}
          </Alert>
        </div>
      ) : null}
      {message ? (
        <p
          className="border-pool-blue bg-paper-card text-pool-deep mt-3 rounded-xl border-l-4 px-3 py-2 text-sm font-bold"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
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
                aria-expanded={adding}
              aria-controls={adding ? "callup-add-panel" : undefined}
                disabled={pending}
                onClick={() => {
                  setAdding((current) => !current);
                  setQuery("");
                  setVisibleCount(8);
                }}
                className="bg-pool-blue text-paper focus-visible:outline-pool-blue flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-3 text-base font-extrabold focus-visible:outline-2 disabled:opacity-50"
              >
                <UserPlus className="h-5 w-5" aria-hidden="true" />{" "}
                {adding ? "Cerrar lista" : "Añadir jugador"}
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
          {adding && draft.length < 14 ? (
            <div id="callup-add-panel" className="bg-paper-card shadow-elev-1 mt-2 rounded-2xl p-4">
              <label htmlFor="callup-search" className="text-pool-deep text-base font-extrabold">
                ¿A quién añades?
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
                  className="border-pool-blue/70 bg-paper text-ink-900 focus-visible:outline-pool-blue min-h-14 w-full rounded-xl border-2 pr-3 pl-10 text-base focus-visible:outline-2"
                />
              </div>
              {available.length === 0 ? (
                <p className="text-ink-700 py-3 text-sm">No hay más jugadores con ese nombre.</p>
              ) : (
                <ul className="mt-2 grid max-h-72 gap-2 overflow-y-auto overscroll-contain">
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
                        className="border-pool-blue/65 bg-paper text-pool-deep focus-visible:outline-pool-blue flex min-h-16 w-full items-center gap-2 rounded-xl border-2 px-4 text-left focus-visible:outline-2 disabled:opacity-55"
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
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="border-pool-blue text-pool-deep focus-visible:outline-pool-blue bg-paper mt-2 min-h-12 w-full rounded-xl border-2 text-sm font-extrabold focus-visible:outline-2"
              >
                Cerrar lista de jugadores
              </button>
            </div>
          ) : null}
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
                        setMessage("");
                        setError("");
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
                        setMessage("");
                        setError("");
                      }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {editable && dirty ? (
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
            onClick={() => setSaveOpen(true)}
            disabled={pending || missingCaps > 0}
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

      <ActaDecisionSheet
        open={pendingSource}
        onOpenChange={setPendingSource}
        title="Volver a la convocatoria por defecto"
        description="Sustituirá la lista actual de este partido."
        actions={[
          { label: "Usar lista por defecto", tone: "primary", onClick: applySource },
          { label: "Seguir editando", onClick: () => setPendingSource(false) },
        ]}
      />
      <ActaDecisionSheet
        open={clearCapsOpen}
        onOpenChange={setClearCapsOpen}
        title="Quitar todos los gorros"
        description="Los jugadores seguirán convocados."
        actions={[
          { label: "Mantener gorros", tone: "primary", onClick: () => setClearCapsOpen(false) },
          {
            label: "Quitar gorros",
            tone: "danger",
            onClick: () => {
              setDraft((current) => current.map((player) => ({ ...player, cap_number: null })));
              setClearCapsOpen(false);
              setMessage("");
              setError("");
            },
          },
        ]}
      />
      <ActaDecisionSheet
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Cambios sin guardar"
        description="Si sales, perderás los cambios de esta convocatoria."
        actions={[
          { label: "Seguir editando", tone: "primary", onClick: () => setLeaveOpen(false) },
          {
            label: "Salir sin guardar",
            tone: "danger",
            onClick: () => {
              setLeaveOpen(false);
              router.push(backHref);
            },
          },
        ]}
      />
      <ActaDecisionSheet
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="Guardar convocatoria"
        description="Elige si esta lista se repetirá en los próximos partidos."
        pending={pending}
        error={error}
        actions={[
          {
            label: "Solo este partido",
            detail: "No cambia la lista por defecto",
            tone: "primary",
            onClick: () => save(false),
          },
          {
            label: "Este y los próximos",
            detail: `Nueva lista por defecto de ${teamLabel}`,
            tone: "outline",
            onClick: () => save(true),
          },
          { label: "Seguir editando", onClick: () => setSaveOpen(false) },
        ]}
      />
    </section>
  );
}
