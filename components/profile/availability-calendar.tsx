"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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

export function AvailabilityCalendar({
  initialAvailability,
  todayIso,
}: AvailabilityCalendarProps) {
  const router = useRouter();
  const [pendingIso, setPendingIso] = useState<string | null>(null);
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
    const existing = availability.get(iso);
    const nextAvailable = !(existing?.available === false);
    setPendingIso(iso);
    setAvailability((prev) => {
      const m = new Map(prev);
      m.set(iso, {
        iso,
        available: nextAvailable,
        reason: nextAvailable ? null : existing?.reason ?? "No disponible",
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
      } catch {
        setAvailability((prev) => {
          const m = new Map(prev);
          if (existing) m.set(iso, existing);
          else m.delete(iso);
          return m;
        });
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
          Marca los días que no podrás venir. Tu entrenador lo verá al
          preparar la convocatoria.
        </p>
        <span className="inline-flex h-6 items-center rounded-full bg-danger/10 px-2 text-[11px] font-semibold text-danger">
          {unavailableCount} marcados
        </span>
      </div>
      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-600"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <span key={d}>{WEEKDAYS_SHORT[d - 1]}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const isToday = cell.iso === todayIso;
          const entry = availability.get(cell.iso);
          const isUnavailable = entry?.available === false;
          const isPast = cell.iso < todayIso;
          const isPending = pendingIso === cell.iso;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => toggleDay(cell.iso)}
              disabled={isPast || !cell.inWindow}
              aria-pressed={isUnavailable}
              className={cn(
                "relative flex h-12 min-h-12 flex-col items-center justify-center rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:h-14",
                isPast || !cell.inWindow
                  ? "border-transparent bg-transparent text-ink-300"
                  : isUnavailable
                    ? "border-danger bg-danger/10 text-danger hover:bg-danger/20"
                    : "border-ink-300 bg-paper text-ink-900 hover:bg-brand-foam",
                isToday && !isUnavailable ? "border-brand-deep" : "",
              )}
              aria-label={cell.iso}
            >
              <span className="font-mono text-sm font-bold leading-none">
                {cell.date.getDate()}
              </span>
              {isPending ? (
                <Loader2
                  aria-hidden="true"
                  className="absolute right-1 top-1 h-3 w-3 animate-spin text-brand-blue"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 px-1 text-[11px] text-ink-600">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-danger bg-danger/10" />
        Día marcado como no disponible
      </div>
    </div>
  );
}

