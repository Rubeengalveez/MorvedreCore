"use client";

import { MdAutorenew, MdCheck, MdExpandMore, MdWarning } from "react-icons/md";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { cn } from "@/lib/utils/cn";
import {
  createSuggestedCallups,
  suggestCallupForMatchResult,
  type CallupSuggestion,
} from "@/server/actions/admin";

export interface SuggestCallupSheetProps {
  matchId: string;
}

const CAP_NUMBERS = Array.from({ length: 99 }, (_, index) => index + 1);

export function SuggestCallupSheet({ matchId }: SuggestCallupSheetProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CallupSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [capOverrides, setCapOverrides] = useState<Record<string, number>>({});
  const [committing, startCommit] = useTransition();
  const [commitError, setCommitError] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await suggestCallupForMatchResult(matchId);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const initialSelection = new Set<string>();
    const caps: Record<string, number> = {};
    for (const suggestion of result.data) {
      if (!suggestion.has_conflict && !suggestion.is_substitute) {
        initialSelection.add(suggestion.player_id);
      }
      if (suggestion.cap_number != null) caps[suggestion.player_id] = suggestion.cap_number;
    }
    setSuggestions(result.data);
    setSelected(initialSelection);
    setCapOverrides(caps);
    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  const recommended = useMemo(
    () => suggestions.filter((suggestion) => !suggestion.is_substitute),
    [suggestions],
  );
  const alternatives = useMemo(
    () => suggestions.filter((suggestion) => suggestion.is_substitute),
    [suggestions],
  );
  const selectedCaps = useMemo(
    () =>
      new Map(
        suggestions
          .filter((suggestion) => selected.has(suggestion.player_id))
          .map((suggestion) => [suggestion.player_id, capOverrides[suggestion.player_id]] as const),
      ),
    [capOverrides, selected, suggestions],
  );

  function toggle(playerId: string) {
    setCommitError(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  function closeAndRefresh() {
    router.refresh();
    document.querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')?.click();
  }

  function commit() {
    setCommitError(null);
    const targets = suggestions.filter((suggestion) => selected.has(suggestion.player_id));
    if (targets.length === 0) {
      setCommitError("Selecciona al menos un jugador.");
      return;
    }
    if (targets.some((suggestion) => capOverrides[suggestion.player_id] == null)) {
      setCommitError("Todos los jugadores necesitan un número de gorro.");
      return;
    }
    const caps = targets.map((suggestion) => capOverrides[suggestion.player_id]);
    if (new Set(caps).size !== caps.length) {
      setCommitError("Cada jugador debe tener un número de gorro distinto.");
      return;
    }

    startCommit(async () => {
      const result = await createSuggestedCallups({
        match_id: matchId,
        players: targets.map((suggestion) => ({
          player_id: suggestion.player_id,
          cap_number: capOverrides[suggestion.player_id],
          source_team_id: suggestion.source_team_id,
        })),
      });
      if (!result.ok) {
        setCommitError(
          result.created > 0
            ? `Se añadieron ${result.created} jugadores. ${result.error}`
            : result.error,
        );
        if (result.created > 0) {
          router.refresh();
          await loadSuggestions();
        }
        return;
      }
      closeAndRefresh();
    });
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col" aria-busy="true" aria-live="polite">
        <div className="border-ink-200 flex items-center gap-3 border-b px-5 py-3">
          <span className="bg-pool-blue/10 flex h-11 w-11 items-center justify-center rounded-full">
            <MdAutorenew className="text-pool-blue h-6 w-6 animate-spin" aria-hidden="true" />
          </span>
          <div>
            <p className="text-pool-deep font-bold">Preparando el equipo…</p>
            <p className="text-ink-600 text-sm">Revisamos plantilla y disponibilidad.</p>
          </div>
        </div>
        <div className="grid gap-2 px-5 py-4" aria-hidden="true">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="bg-ink-100 h-16 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col justify-between gap-4 px-5 py-4">
        <Alert variant="danger" title="No hemos podido preparar la propuesta">
          {error}
        </Alert>
        <div className="grid gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button type="button" size="lg" onClick={() => void loadSuggestions()}>
            Intentarlo de nuevo
          </Button>
          <SheetClose asChild>
            <Button type="button" size="md" variant="secondary">
              Cerrar
            </Button>
          </SheetClose>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex h-full flex-col justify-between gap-4 px-5 py-4">
        <Alert variant="info" title="El equipo ya está preparado">
          No quedan jugadores disponibles por añadir a este partido.
        </Alert>
        <SheetClose asChild>
          <Button type="button" size="lg" variant="secondary">
            Volver al partido
          </Button>
        </SheetClose>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-ink-200 bg-paper-card flex shrink-0 items-center justify-between gap-3 border-y px-5 py-2.5">
        <div aria-live="polite">
          <span className="text-pool-deep text-lg font-extrabold">{selected.size}</span>{" "}
          <span className="text-ink-600 text-sm font-semibold">seleccionados</span>
        </div>
        <p className="text-ink-600 text-right text-xs">Toca un nombre para cambiarlo</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5">
        {commitError ? (
          <div className="mb-3" role="alert">
            <Alert variant="danger" title="Revisa la convocatoria">
              {commitError}
            </Alert>
          </div>
        ) : null}

        <PlayerList
          title="Propuesta"
          players={recommended}
          selected={selected}
          selectedCaps={selectedCaps}
          capOverrides={capOverrides}
          onToggle={toggle}
          onCapChange={(playerId, cap) =>
            setCapOverrides((current) => ({ ...current, [playerId]: cap }))
          }
        />

        {alternatives.length > 0 ? (
          <details className="border-ink-300 bg-paper-card mt-3 rounded-xl border">
            <summary className="text-pool-deep flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pool-blue">
              <span>Otros jugadores ({alternatives.length})</span>
              <MdExpandMore className="h-6 w-6 shrink-0" aria-hidden="true" />
            </summary>
            <div className="border-ink-200 border-t p-2">
              <PlayerList
                players={alternatives}
                selected={selected}
                selectedCaps={selectedCaps}
                capOverrides={capOverrides}
                onToggle={toggle}
                onCapChange={(playerId, cap) =>
                  setCapOverrides((current) => ({ ...current, [playerId]: cap }))
                }
              />
            </div>
          </details>
        ) : null}
      </div>

      <div className="border-ink-300 bg-paper/95 grid shrink-0 gap-2 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(10,46,92,0.08)] backdrop-blur sm:grid-cols-[1fr_auto] sm:px-5">
        <Button type="button" size="lg" onClick={commit} disabled={committing || selected.size === 0}>
          {committing ? (
            <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <MdCheck className="h-5 w-5" aria-hidden="true" />
          )}
          {committing ? "Guardando…" : `Añadir ${selected.size} al partido`}
        </Button>
        <SheetClose asChild>
          <Button type="button" size="md" variant="secondary" disabled={committing}>
            Cancelar
          </Button>
        </SheetClose>
      </div>
    </div>
  );
}

interface PlayerListProps {
  title?: string;
  players: CallupSuggestion[];
  selected: Set<string>;
  selectedCaps: Map<string, number | undefined>;
  capOverrides: Record<string, number>;
  onToggle: (playerId: string) => void;
  onCapChange: (playerId: string, cap: number) => void;
}

function PlayerList({
  title,
  players,
  selected,
  selectedCaps,
  capOverrides,
  onToggle,
  onCapChange,
}: PlayerListProps) {
  if (players.length === 0) return null;

  return (
    <section aria-label={title ?? "Otros jugadores"}>
      {title ? (
        <h3 className="text-ink-600 mb-2 px-1 text-xs font-extrabold tracking-[0.1em] uppercase">
          {title}
        </h3>
      ) : null}
      <ul className="grid gap-2">
        {players.map((player) => {
          const isSelected = selected.has(player.player_id);
          const usedByAnother = new Set(
            [...selectedCaps.entries()]
              .filter(([playerId]) => playerId !== player.player_id)
              .map(([, cap]) => cap),
          );
          return (
            <li
              key={player.player_id}
              className={cn(
                "grid min-h-16 grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-2 rounded-xl border p-2",
                isSelected
                  ? "border-pool-blue bg-pool-foam/60"
                  : "border-ink-300 bg-paper opacity-80",
              )}
            >
              <label className="flex min-h-12 min-w-0 cursor-pointer items-center gap-3 rounded-lg px-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(player.player_id)}
                  className="accent-pool-blue h-6 w-6 shrink-0"
                />
                <span className="min-w-0">
                  <span className="text-pool-deep block truncate text-base font-bold">
                    {player.full_name}
                  </span>
                  <span className="text-ink-600 mt-0.5 flex items-center gap-1 text-xs font-semibold">
                    {player.has_conflict ? (
                      <>
                        <MdWarning className="text-danger h-4 w-4 shrink-0" aria-hidden="true" />
                        No disponible
                      </>
                    ) : (
                      CATEGORY_LABELS[player.category_code as CategoryCode] ?? player.category_code
                    )}
                  </span>
                </span>
              </label>
              <label className="text-ink-600 grid gap-0.5 text-center text-[0.65rem] font-extrabold tracking-wide uppercase">
                Gorro
                <select
                  value={capOverrides[player.player_id] ?? ""}
                  onChange={(event) => onCapChange(player.player_id, Number(event.target.value))}
                  disabled={!isSelected}
                  aria-label={`Gorro de ${player.full_name}`}
                  className="border-ink-300 bg-paper text-pool-deep h-11 w-full rounded-lg border text-center text-base font-extrabold disabled:opacity-50"
                >
                  {CAP_NUMBERS.map((cap) => (
                    <option key={cap} value={cap} disabled={usedByAnother.has(cap)}>
                      {cap}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
