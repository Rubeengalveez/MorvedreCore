"use client";

import { MdAutorenew, MdCheck, MdWarning } from "react-icons/md";
import { Search, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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

import { CapNumberButton, CapNumberOptions } from "./cap-number-picker";

export interface SuggestCallupSheetProps {
  matchId: string;
}

function normalizePlayerSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function SuggestCallupSheet({ matchId }: SuggestCallupSheetProps) {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CallupSuggestion[]>([]);
  const [occupiedCaps, setOccupiedCaps] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [capOverrides, setCapOverrides] = useState<Record<string, number>>({});
  const [committing, startCommit] = useTransition();
  const [commitError, setCommitError] = useState<string | null>(null);

  const loadSuggestions = useCallback(() => {
    return suggestCallupForMatchResult(matchId).then((result) => {
      setError(null);
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const initialSelection = new Set<string>();
      const caps: Record<string, number> = {};
      for (const suggestion of result.data) {
        if (suggestion.cap_number != null) caps[suggestion.player_id] = suggestion.cap_number;
      }
      setSuggestions(result.data);
      setOccupiedCaps(new Set(result.occupiedCaps));
      setSelected(initialSelection);
      setCapOverrides(caps);
      setLoading(false);
    });
  }, [matchId]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  const visiblePlayers = useMemo(() => {
    const normalizedQuery = normalizePlayerSearch(query);
    if (!normalizedQuery) return suggestions;
    return suggestions.filter((player) =>
      normalizePlayerSearch(player.full_name).includes(normalizedQuery),
    );
  }, [query, suggestions]);
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
    closeRef.current?.click();
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
        <Alert variant="danger" title="No hemos podido cargar los jugadores">
          {error}
        </Alert>
        <div className="grid gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            size="lg"
            onClick={() => {
              setLoading(true);
              void loadSuggestions();
            }}
          >
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
      <div className="border-ink-200 bg-paper-sunk/65 shrink-0 border-y px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-pool-deep text-sm font-extrabold">Elige los jugadores</p>
          <div
            className="bg-pool-deep text-paper rounded-lg px-2.5 py-1.5 text-sm font-extrabold"
            aria-live="polite"
          >
            {selected.size} {selected.size === 1 ? "elegido" : "elegidos"}
          </div>
        </div>
        <label className="mt-3 block">
          <span className="sr-only">Buscar jugador</span>
          <span className="relative block">
            <Search
              className="text-ink-500 pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre o apellido"
              className="border-ink-300 bg-paper-card focus:border-pool-blue focus:ring-pool-blue min-h-13 w-full rounded-xl border-2 pr-3 pl-11 text-base font-semibold focus:ring-2 focus:outline-none"
            />
          </span>
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5">
        {commitError ? (
          <div className="mb-3" role="alert">
            <Alert variant="danger" title="Revisa la convocatoria">
              {commitError}
            </Alert>
          </div>
        ) : null}

        <fieldset disabled={committing}>
          <PlayerList
            players={visiblePlayers}
            selected={selected}
            selectedCaps={selectedCaps}
            occupiedCaps={occupiedCaps}
            capOverrides={capOverrides}
            onToggle={toggle}
            onCapChange={(playerId, cap) => {
              setCommitError(null);
              setCapOverrides((current) => ({ ...current, [playerId]: cap }));
            }}
          />
        </fieldset>
        {visiblePlayers.length === 0 ? (
          <p className="text-ink-600 py-6 text-center text-sm">No hay jugadores con ese nombre.</p>
        ) : null}
      </div>

      <div className="border-ink-300 bg-paper/95 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-2 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(10,46,92,0.08)] backdrop-blur sm:grid-cols-[1fr_auto] sm:px-5">
        <Button
          type="button"
          size="lg"
          variant="deep"
          onClick={commit}
          disabled={committing || selected.size === 0}
        >
          {committing ? (
            <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          )}
          {committing ? "Guardando…" : `Añadir ${selected.size}`}
        </Button>
        <SheetClose asChild>
          <Button ref={closeRef} type="button" size="lg" variant="secondary" disabled={committing}>
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
  occupiedCaps: ReadonlySet<number>;
  capOverrides: Record<string, number>;
  onToggle: (playerId: string) => void;
  onCapChange: (playerId: string, cap: number) => void;
}

function PlayerList({
  title,
  players,
  selected,
  selectedCaps,
  occupiedCaps,
  capOverrides,
  onToggle,
  onCapChange,
}: PlayerListProps) {
  const [openCapPlayerId, setOpenCapPlayerId] = useState<string | null>(null);

  if (players.length === 0) return null;

  return (
    <section aria-label={title ?? "Jugadores por añadir"}>
      {title ? (
        <h3 className="text-ink-600 mb-2 px-1 text-xs font-extrabold tracking-[0.1em] uppercase">
          {title}
        </h3>
      ) : null}
      <ul className="flex flex-col gap-2">
        {players.map((player) => {
          const isSelected = selected.has(player.player_id);
          const usedByAnother = new Set<number>([
            ...occupiedCaps,
            ...[...selectedCaps.entries()]
              .filter(([playerId]) => playerId !== player.player_id)
              .map(([, cap]) => cap)
              .filter((cap): cap is number => cap != null),
          ]);
          const cap = capOverrides[player.player_id] ?? null;
          const capPickerOpen = openCapPlayerId === player.player_id;
          return (
            <li
              key={player.player_id}
              className={cn(
                "border-ink-200 bg-paper-card grid min-h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border-2 p-2.5 shadow-sm",
                isSelected && "border-pool-blue bg-pool-foam/45",
              )}
            >
              <label className="flex min-h-12 min-w-0 cursor-pointer items-center gap-3 rounded-xl">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(player.player_id)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "border-pool-blue/30 bg-pool-foam text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2",
                    isSelected && "border-pool-deep bg-pool-deep text-paper",
                  )}
                  aria-hidden="true"
                >
                  {isSelected ? <MdCheck className="h-6 w-6" /> : <UserPlus className="h-5 w-5" />}
                </span>
                <span className="min-w-0">
                  <span className="text-pool-deep block text-sm leading-snug font-extrabold break-words min-[360px]:text-base">
                    {player.full_name}
                  </span>
                  <span className="text-ink-600 mt-0.5 flex items-center gap-1 text-xs font-semibold">
                    {player.has_conflict ? (
                      <>
                        <MdWarning className="text-danger h-4 w-4 shrink-0" aria-hidden="true" />
                        No disponible
                      </>
                    ) : (
                      (CATEGORY_LABELS[player.category_code as CategoryCode] ??
                      player.category_code)
                    )}
                  </span>
                </span>
              </label>
              {isSelected ? (
                <CapNumberButton
                  value={cap}
                  open={capPickerOpen}
                  label={`Cambiar gorro de ${player.full_name}`}
                  onClick={() => setOpenCapPlayerId(capPickerOpen ? null : player.player_id)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onToggle(player.player_id)}
                  aria-label={`Añadir a ${player.full_name}`}
                  className="bg-pool-foam text-pool-blue focus-visible:ring-pool-blue min-h-11 rounded-xl px-3 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
                >
                  Añadir
                </button>
              )}
              {isSelected && capPickerOpen ? (
                <div className="col-span-2 pt-1">
                  <CapNumberOptions
                    value={cap}
                    occupied={usedByAnother}
                    allowNone={false}
                    onChange={(nextCap) => {
                      if (nextCap != null) onCapChange(player.player_id, nextCap);
                      setOpenCapPlayerId(null);
                    }}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
