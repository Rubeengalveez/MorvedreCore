"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Search, UserPlus, X } from "lucide-react";

import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import styles from "@/components/matches/live-match.module.css";
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={`${styles.panel} ${styles.panelGuard} h-[min(90dvh,44rem)]`}>
          <div className="bg-pool-deep text-paper flex shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-4">
            <div className="min-w-0">
              <p className="text-ball-gold text-xs font-extrabold tracking-wider uppercase">
                Convocatoria
              </p>
              <Dialog.Title className="font-display mt-1 text-xl leading-tight font-extrabold">
                {replacing ? "¿Quién lleva ese gorro?" : "Añadir jugador"}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Cerrar selección de jugador"
                className="border-paper/60 text-paper focus-visible:ring-ball-gold focus-visible:ring-offset-pool-deep flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Dialog.Description className="border-pool-blue/70 bg-paper-card text-pool-deep rounded-xl border-2 px-4 py-3 text-sm leading-snug font-semibold">
              {replacing
                ? `Elige al jugador correcto. Las jugadas de ${replacingName} pasarán a quien selecciones.`
                : "Elige a quién quieres incluir en este partido."}
            </Dialog.Description>

            <div>
              <label htmlFor="callup-search" className="text-pool-deep text-sm font-extrabold">
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
                  className="border-pool-blue bg-paper-card text-ink-900 placeholder:text-ink-600 focus-visible:ring-pool-blue flex min-h-14 w-full rounded-xl border-2 pr-3 pl-10 text-base focus-visible:ring-2 focus-visible:outline-none"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {available.length === 0 ? (
                <p className="text-ink-700 py-4 text-center text-sm font-semibold">
                  {query
                    ? "No encontramos jugadores con ese nombre."
                    : "No quedan jugadores para añadir."}
                </p>
              ) : (
                <ul className="grid gap-2 pb-1">
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
                        className="border-pool-blue bg-paper-card text-pool-deep focus-visible:ring-pool-blue hover:bg-pool-foam flex min-h-16 w-full items-center gap-3 rounded-xl border-2 px-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-55"
                      >
                        <span className="min-w-0 flex-1 font-extrabold">
                          <AdaptivePlayerName name={candidate.full_name} />
                        </span>
                        {candidate.has_conflict ? (
                          <span className="shrink-0 text-sm font-bold text-red-800">
                            No disponible
                          </span>
                        ) : (
                          <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold">
                            <UserPlus className="h-4 w-4" aria-hidden="true" />
                            {replacing ? "Elegir" : "Añadir"}
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
                  onClick={onMore}
                  className="border-pool-blue bg-pool-blue text-paper focus-visible:ring-pool-blue hover:bg-pool-deep mt-2 flex min-h-12 w-full items-center justify-center rounded-xl border-2 px-3 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  Ver más jugadores
                </button>
              ) : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
