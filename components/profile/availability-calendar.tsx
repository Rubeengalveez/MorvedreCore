"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";

import { getNext30Days, isoDateFromDate } from "@/lib/domain/calendar";
import { cn } from "@/lib/utils/cn";
import { setMyAvailability } from "@/server/actions/admin";

export interface AvailabilityDay {
  iso: string;
  available: boolean;
  reason: string | null;
}

export interface AvailabilityCalendarProps {
  initialAvailability: AvailabilityDay[];
  todayIso: string;
}

const WEEKDAYS_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function AvailabilityCalendar({
  initialAvailability,
  todayIso,
}: AvailabilityCalendarProps) {
  const router = useRouter();
  const [pendingIso, setPendingIso] = useState<string | null>(null);
  const [errorIso, setErrorIso] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Map<string, AvailabilityDay>>(
    () => {
      const m = new Map<string, AvailabilityDay>();
      for (const a of initialAvailability) {
        m.set(a.iso, a);
      }
      return m;
    },
  );

  const [, startTransition] = useTransition();

  const now = new Date();
  const days = getNext30Days(now);
  const firstDay = days[0] ?? now;
  const lastDay = days[days.length - 1] ?? now;
  const start = startOfWeek(firstDay);
  const lastIso = isoDateFromDate(lastDay);
  const cells: { iso: string; date: Date; inWindow: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = isoDateFromDate(d);
    cells.push({
      iso,
      date: d,
      inWindow: iso >= todayIso && iso <= lastIso,
    });
  }

  function toggleDay(iso: string) {
    if (iso < todayIso) return;
    if (iso > lastIso) return;
    const existing = availability.get(iso);
    const nextAvailable = !(existing?.available === false);
    const previousEntry = existing;
    setErrorIso(null);
    setPendingIso(iso);
    setAvailability((prev) => {
      const m = new Map(prev);
      m.set(iso, {
        iso,
        available: nextAvailable,
        reason: nextAvailable ? null : previousEntry?.reason ?? "No disponible",
      });
      return m;
    });
    startTransition(async () => {
      try {
        await setMyAvailability({
          date: iso,
          available: nextAvailable,
          reason: nextAvailable ? null : "No disponible",
        });
        router.refresh();
      } catch (err) {
        setAvailability((prev) => {
          const m = new Map(prev);
          if (previousEntry) m.set(iso, previousEntry);
          else m.delete(iso);
          return m;
        });
        setErrorIso(
          err instanceof Error
            ? err.message
            : "No pudimos guardar. Inténtalo de nuevo.",
        );
      } finally {
        setPendingIso(null);
      }
    });
  }

  const unavailableCount = Array.from(availability.values()).filter(
    (a) => a.available === false,
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-600">
          Toca un día futuro para marcar que no podrás venir. Tu entrenador
          lo verá al preparar la convocatoria.
        </p>
        <span
          aria-live="polite"
          className="inline-flex h-6 items-center rounded-full bg-danger/10 px-2 text-[11px] font-semibold text-danger"
        >
          {unavailableCount === 0
            ? "Sin marcar"
            : `${unavailableCount} marcado${unavailableCount === 1 ? "" : "s"}`}
        </span>
      </div>

      {errorIso ? (
        <div
          role="alert"
          className="rounded border border-danger bg-danger/5 px-3 py-2 text-xs text-danger"
        >
          {errorIso}
        </div>
      ) : null}

      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-600"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <span key={d}>{WEEKDAYS_SHORT[d - 1]}</span>
        ))}
      </div>

      <div
        role="grid"
        aria-label="Calendario de disponibilidad"
        className="grid grid-cols-7 gap-1"
      >
        {cells.map((cell) => {
          const isToday = cell.iso === todayIso;
          const entry = availability.get(cell.iso);
          const isUnavailable = entry?.available === false;
          const isPast = cell.iso < todayIso;
          const isOutOfWindow = !cell.inWindow;
          const isDisabled = isPast || isOutOfWindow;
          const isPending = pendingIso === cell.iso;
          const label = `${dayLabel(cell.date)}${isUnavailable ? " (no disponible)" : ""}${isToday ? " (hoy)" : ""}${isPast ? " (pasado)" : ""}`;
          return (
            <button
              key={cell.iso}
              type="button"
              role="gridcell"
              onClick={() => toggleDay(cell.iso)}
              disabled={isDisabled}
              aria-pressed={isUnavailable}
              aria-label={label}
              title={isPast ? "Día pasado, no se puede modificar" : isOutOfWindow ? "Fuera de los próximos 30 días" : isUnavailable ? "Toca para marcar como disponible" : "Toca para marcar como no disponible"}
              className={cn(
                "relative flex h-12 min-h-12 flex-col items-center justify-center gap-1 rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:h-14",
                isDisabled
                  ? "cursor-not-allowed border-transparent bg-transparent text-ink-600 opacity-60"
                  : isUnavailable
                    ? "border-danger bg-danger/10 font-bold text-danger hover:bg-danger/20"
                    : "border-ink-300 bg-paper text-ink-900 hover:bg-brand-foam hover:border-brand-blue",
                isToday && !isUnavailable ? "border-brand-deep font-bold" : "",
                errorIso === cell.iso ? "border-danger ring-2 ring-danger/30" : "",
              )}
            >
              <span className="font-mono text-sm leading-none">
                {cell.date.getDate()}
              </span>
              {isUnavailable ? (
                <X
                  aria-hidden="true"
                  className="h-3 w-3 text-danger"
                />
              ) : isToday ? (
                <span
                  aria-hidden="true"
                  className="block h-1.5 w-1.5 rounded-full bg-brand-deep"
                />
              ) : null}
              {isPending ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center rounded-md bg-paper/80"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-brand-blue" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 px-1 text-[11px] text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded border border-ink-300 bg-paper"
          />
          Disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-flex h-3 w-3 items-center justify-center rounded border border-danger bg-danger/10 text-[8px] font-bold text-danger"
          >
            <X className="h-2 w-2" />
          </span>
          No disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-full bg-brand-deep"
          />
          Hoy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded border border-transparent text-ink-300"
          >
            —
          </span>
          Pasado
        </span>
      </div>
    </div>
  );
}
