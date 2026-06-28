"use client";

import { Loader2, MoreHorizontal } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Calendario } from "@/components/brand/pictograms";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import {
  archiveSeason,
  setCurrentSeason,
  type Season,
} from "@/server/actions/admin";

import { SeasonFormSheet } from "./season-form-sheet";

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "current" | "archived" | "inactive";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-sm px-2 text-eyebrow",
        variant === "current" && "bg-pool-deep text-paper",
        variant === "archived" && "bg-ink-300 text-ink-900",
        variant === "inactive" && "border border-ink-300 text-ink-600",
      )}
    >
      {children}
    </span>
  );
}

function RowActions({ season }: { season: Season }) {
  const [pending, startTransition] = useTransition();

  const isArchived = season.archived_at != null;
  const isCurrent = season.is_current;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="md"
          className="h-12 w-12 min-w-12 p-0"
          aria-label="Acciones"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent size="sm">
        <SheetBody>
          <div className="flex flex-col gap-2 pb-4">
            <SeasonFormSheet
              mode={{ kind: "edit", season }}
              trigger={
                <Button variant="secondary" size="lg" className="w-full justify-start">
                  Editar
                </Button>
              }
            />
            {!isCurrent ? (
              <Button
                variant="secondary"
                size="lg"
                className="w-full justify-start"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await setCurrentSeason(season.id);
                  })
                }
              >
                {pending ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : null}
                Marcar como actual
              </Button>
            ) : null}
            {!isArchived ? (
              <Button
                variant="danger"
                size="lg"
                className="w-full justify-start"
                disabled={pending}
                onClick={() => {
                  if (
                    !window.confirm(
                      `¿Archivar la temporada ${season.label}? Esta acción no se puede deshacer.`,
                    )
                  ) {
                    return;
                  }
                  startTransition(async () => {
                    await archiveSeason(season.id);
                  });
                }}
              >
                Archivar
              </Button>
            ) : null}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export interface SeasonsTableProps {
  seasons: Season[];
}

export function SeasonsTable({ seasons }: SeasonsTableProps) {
  if (seasons.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-ink-300 bg-paper-card p-6 text-center">
        <PictogramBadge
          pictogram={Calendario}
          color="var(--pool-teal)"
          size="lg"
        />
        <p className="font-display text-base font-extrabold text-pool-deep">
          Empieza la máquina.
        </p>
        <p className="max-w-sm text-sm text-ink-600">
          Crea la temporada 26/27 para dar de alta los equipos y partidos.
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[480px] border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            <th className="border-b border-ink-300 px-3 py-2">
              <Eyebrow as="span" className="text-ink-600">Temporada</Eyebrow>
            </th>
            <th className="border-b border-ink-300 px-3 py-2">
              <Eyebrow as="span" className="text-ink-600">Inicio</Eyebrow>
            </th>
            <th className="border-b border-ink-300 px-3 py-2">
              <Eyebrow as="span" className="text-ink-600">Fin</Eyebrow>
            </th>
            <th className="border-b border-ink-300 px-3 py-2">
              <Eyebrow as="span" className="text-ink-600">Estado</Eyebrow>
            </th>
            <th className="border-b border-ink-300 px-3 py-2 text-right">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((s) => {
            const isArchived = s.archived_at != null;
            return (
              <tr key={s.id} className="text-base">
                <td className="border-b border-ink-300 px-3 py-3 font-display text-base font-extrabold text-pool-deep">
                  {s.label}
                </td>
                <td className="border-b border-ink-300 px-3 py-3 text-mono-num text-sm text-ink-700">
                  {formatDate(s.start_date)}
                </td>
                <td className="border-b border-ink-300 px-3 py-3 text-mono-num text-sm text-ink-700">
                  {formatDate(s.end_date)}
                </td>
                <td className="border-b border-ink-300 px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.is_current ? (
                      <Badge variant="current">Actual</Badge>
                    ) : null}
                    {isArchived ? (
                      <Badge variant="archived">Archivada</Badge>
                    ) : !s.is_current ? (
                      <Badge variant="inactive">Inactiva</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="border-b border-ink-300 px-3 py-3 text-right">
                  <div className="flex justify-end">
                    <RowActions season={s} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
