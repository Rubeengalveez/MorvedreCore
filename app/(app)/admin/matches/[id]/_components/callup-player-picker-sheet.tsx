"use client";

import { Search, UserPlus } from "lucide-react";

import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { ActaFlowSheet } from "@/components/matches/acta-flow-sheet";
import type { CallupCandidate } from "@/lib/domain/callup-selection";

interface CallupPlayerPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replacingName?: string;
  query: string;
  onQueryChange: (query: string) => void;
  available: CallupCandidate[];
  visibleCount: number;
  onMore: () => void;
  onSelect: (candidate: CallupCandidate) => void;
  pending: boolean;
}

export function CallupPlayerPickerSheet({
  open,
  onOpenChange,
  replacingName,
  query,
  onQueryChange,
  available,
  visibleCount,
  onMore,
  onSelect,
  pending,
}: CallupPlayerPickerSheetProps) {
  const replacing = Boolean(replacingName);

  return (
    <ActaFlowSheet
      scrollKey={query}
      open={open}
      onClose={() => onOpenChange(false)}
      context="Convocatoria"
      title={replacing ? "¿Quién lleva ese gorro?" : "Añadir jugador"}
      closeLabel="Cerrar selección de jugador"
      pending={pending}
      controls={
        <div className="space-y-3">
          <p className="border-pool-deep text-pool-deep rounded-xl border bg-amber-50 px-3 py-2 text-base leading-snug font-semibold">
            {replacing
              ? `Las jugadas de ${replacingName} pasarán a quien selecciones.`
              : "Elige a quién quieres incluir en este partido."}
          </p>
          <div>
            <label htmlFor="callup-search" className="text-pool-deep text-base font-extrabold">
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
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Nombre o apellido"
                className="border-pool-deep text-ink-900 placeholder:text-ink-600 focus-visible:ring-pool-blue min-h-14 w-full rounded-xl border-2 bg-white pr-3 pl-10 text-base focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>
          </div>
        </div>
      }
      footer={
        available.length > visibleCount ? (
          <button
            type="button"
            onClick={onMore}
            disabled={pending}
            className="bg-pool-blue focus-visible:ring-pool-blue hover:bg-pool-deep flex min-h-14 w-full items-center justify-center rounded-xl px-3 text-base font-extrabold text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Ver más jugadores
          </button>
        ) : undefined
      }
    >
      {available.length === 0 ? (
        <p className="text-ink-700 rounded-xl bg-slate-100 p-4 text-center text-base font-semibold">
          {query ? "No encontramos jugadores con ese nombre." : "No quedan jugadores para añadir."}
        </p>
      ) : (
        <ul className="grid gap-2">
          {available.slice(0, visibleCount).map((candidate) => (
            <li key={candidate.player_id}>
              <button
                type="button"
                aria-label={
                  candidate.has_conflict
                    ? `${candidate.full_name} no disponible`
                    : replacing
                      ? `Elegir a ${candidate.full_name} para recibir las jugadas`
                      : `Añadir a ${candidate.full_name}`
                }
                onClick={() => onSelect(candidate)}
                disabled={candidate.has_conflict || pending}
                className="border-pool-deep text-pool-deep focus-visible:ring-pool-blue flex min-h-16 w-full items-center gap-3 rounded-xl border-2 bg-white px-3 text-left text-base transition-colors hover:bg-blue-50 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-55"
              >
                <span className="min-w-0 flex-1 font-extrabold">
                  <AdaptivePlayerName name={candidate.full_name} />
                </span>
                <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold">
                  {candidate.has_conflict ? (
                    "No disponible"
                  ) : (
                    <>
                      <UserPlus size={20} aria-hidden="true" />
                      {replacing ? "Elegir" : "Añadir"}
                    </>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ActaFlowSheet>
  );
}
