"use client";

import { Loader2, MoreHorizontal } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
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
        "inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold",
        variant === "current" && "bg-brand-blue text-paper",
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
          size="sm"
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
                onClick={() =>
                  startTransition(async () => {
                    await archiveSeason(season.id);
                  })
                }
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
      <div className="rounded-md border border-dashed border-ink-300 bg-paper p-6 text-center">
        <p className="text-base font-semibold text-brand-deep">
          Aún no has creado ninguna temporada.
        </p>
        <p className="mt-1 text-sm text-ink-600">
          Empieza creando la temporada actual para poder dar de alta los equipos.
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[480px] border-separate border-spacing-0 text-left">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-ink-600">
            <th className="border-b border-ink-300 px-3 py-2 font-semibold">Temporada</th>
            <th className="border-b border-ink-300 px-3 py-2 font-semibold">Inicio</th>
            <th className="border-b border-ink-300 px-3 py-2 font-semibold">Fin</th>
            <th className="border-b border-ink-300 px-3 py-2 font-semibold">Estado</th>
            <th className="border-b border-ink-300 px-3 py-2 text-right font-semibold">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((s) => {
            const isArchived = s.archived_at != null;
            return (
              <tr key={s.id} className="text-base">
                <td className="border-b border-ink-300 px-3 py-3 font-display font-bold text-brand-deep">
                  {s.label}
                </td>
                <td className="border-b border-ink-300 px-3 py-3 text-sm text-ink-600">
                  {formatDate(s.start_date)}
                </td>
                <td className="border-b border-ink-300 px-3 py-3 text-sm text-ink-600">
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
