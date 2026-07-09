"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";

import { Calendario } from "@/components/brand/pictograms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import {
  addDaysIso,
  formatLongDate,
  getMonthCells,
  monthLabel,
  weekdayShort,
  type YearMonth,
} from "@/lib/domain/calendar";
import { setMyAvailability } from "@/server/actions/admin";

export interface AvailabilityDay {
  iso: string;
  available: boolean;
  reason: string | null;
}

export interface UpcomingEvent {
  id: string;
  scheduled_at: string;
  opponent?: string;
  cancelled?: boolean;
  team_label: string;
  team_color: string;
}

export interface AvailabilityCalendarProps {
  initialAvailability: AvailabilityDay[];
  todayIso: string;
  upcomingMatches?: UpcomingEvent[];
  upcomingSessions?: UpcomingEvent[];
}

const WINDOW_DAYS = 180; // Ventana ampliada a 180 días
const MAX_REASON_LENGTH = 500;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function fromIsoMonth(iso: string): YearMonth {
  const [y, m] = iso.split("-").map(Number);
  return { year: y ?? 2026, month: (m ?? 1) - 1 };
}

function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  const d = new Date(ym.year, ym.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function ymKey(ym: YearMonth): string {
  return `${ym.year}-${pad2(ym.month + 1)}`;
}

export function AvailabilityCalendar({
  initialAvailability,
  todayIso,
  upcomingMatches = [],
  upcomingSessions = [],
}: AvailabilityCalendarProps) {
  const router = useRouter();
  const todayMonth = useMemo(() => fromIsoMonth(todayIso), [todayIso]);
  const windowEnd = useMemo(() => addDaysIso(todayIso, WINDOW_DAYS), [todayIso]);

  const [month, setMonth] = useState<YearMonth>(todayMonth);
  const [overrides, setOverrides] = useState<Map<string, AvailabilityDay>>(() => new Map());

  const availability = useMemo(() => {
    const m = new Map<string, AvailabilityDay>();
    for (const a of initialAvailability) {
      m.set(a.iso, a);
    }
    for (const [iso, override] of overrides) {
      m.set(iso, override);
    }
    return m;
  }, [initialAvailability, overrides]);

  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  const cells = useMemo(() => getMonthCells(month.year, month.month), [month]);
  const todayKey = todayIso;
  const windowEndKey = windowEnd;
  const isCurrentMonth = ymKey(month) === ymKey(todayMonth);

  const unavailableCount = Array.from(availability.values()).filter(
    (a) => a.available === false,
  ).length;

  function goToPrevMonth() {
    setMonth((m) => shiftMonth(m, -1));
  }
  function goToNextMonth() {
    setMonth((m) => shiftMonth(m, 1));
  }
  function goToToday() {
    setMonth(todayMonth);
  }

  function openDay(iso: string) {
    if (iso < todayKey) return;
    if (iso > windowEndKey) return;
    setSelectedIso(iso);
  }

  const activeDayMatches = useMemo(() => {
    if (!selectedIso) return [];
    return upcomingMatches.filter((m) => m.scheduled_at.startsWith(selectedIso));
  }, [selectedIso, upcomingMatches]);

  const activeDaySessions = useMemo(() => {
    if (!selectedIso) return [];
    return upcomingSessions.filter((s) => s.scheduled_at.startsWith(selectedIso) && !s.cancelled);
  }, [selectedIso, upcomingSessions]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink-600 text-xs sm:text-sm">
          Toca un día para marcar tu disponibilidad. El entrenador verá si cuentas para los partidos
          de esa fecha.
        </p>
        <span
          aria-live="polite"
          className="bg-goggle-red/10 text-eyebrow text-goggle-red inline-flex h-6 min-w-12 items-center justify-center rounded-full px-2.5 font-bold"
        >
          {unavailableCount === 0
            ? "Sin marcar"
            : `${unavailableCount} no disponible${unavailableCount === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="border-ink-300 bg-paper-card flex items-center justify-between gap-2 rounded-md border px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={goToPrevMonth}
          aria-label="Mes anterior"
          className="h-11 min-h-11 w-11 min-w-11 shrink-0 px-0"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="flex flex-1 flex-col items-center text-center">
          <span className="text-eyebrow text-ink-600 font-bold tracking-wider uppercase">
            Disponibilidad
          </span>
          <h3 className="font-display text-pool-deep text-base leading-tight font-extrabold sm:text-lg">
            {monthLabel(month)}
          </h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          aria-label="Mes siguiente"
          className="h-11 min-h-11 w-11 min-w-11 shrink-0 px-0"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={goToToday}
          disabled={isCurrentMonth}
          className="text-eyebrow h-11 min-h-11 shrink-0 px-3 font-bold uppercase"
        >
          Hoy
        </Button>
      </div>

      <div
        aria-hidden="true"
        className="text-eyebrow text-ink-600 grid grid-cols-7 gap-1 px-1 text-center sm:text-[11px]"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <span key={d}>{weekdayShort(d)}</span>
        ))}
      </div>

      <div
        aria-label={`Calendario de disponibilidad de ${monthLabel(month)}`}
        role="grid"
        className="grid grid-cols-7 gap-1"
      >
        {cells.map((cell) => {
          const entry = availability.get(cell.iso);
          const isUnavailable = entry?.available === false;
          const isPast = cell.iso < todayKey;
          const isOutOfWindow = cell.iso > windowEndKey;
          const isDisabled = isPast || isOutOfWindow;
          const isToday = cell.iso === todayKey;
          const inMonth = cell.inMonth;
          const dayLabelText = `${cell.iso}${isUnavailable ? " (no disponible)" : ""}${isToday ? " (hoy)" : ""}${isPast ? " (pasado)" : ""}${isOutOfWindow ? " (fuera de plazo)" : ""}`;

          // Eventos para este día concreto
          const dayMatches = upcomingMatches.filter((m) => m.scheduled_at.startsWith(cell.iso));
          const daySessions = upcomingSessions.filter(
            (s) => s.scheduled_at.startsWith(cell.iso) && !s.cancelled,
          );

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => openDay(cell.iso)}
              disabled={isDisabled}
              aria-pressed={isUnavailable}
              aria-label={dayLabelText}
              title={
                isPast
                  ? "Día pasado, no se puede modificar"
                  : isOutOfWindow
                    ? `Fuera del plazo de ${WINDOW_DAYS} días`
                    : isUnavailable
                      ? `No disponible${entry?.reason ? `: ${entry.reason}` : ""}. Toca para cambiar.`
                      : "Disponible. Toca para marcar como no disponible."
              }
              className={cn(
                "focus-visible:ring-pool-blue focus-visible:ring-offset-paper relative flex h-14 min-h-14 w-full flex-col items-center justify-between rounded-md border p-1 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:h-16",
                inMonth ? "" : "opacity-50",
                isDisabled
                  ? "bg-paper-sunk/60 text-ink-400 cursor-not-allowed border-transparent"
                  : isUnavailable
                    ? "border-goggle-red bg-goggle-red/10 text-goggle-red hover:bg-goggle-red/20 cursor-pointer font-bold active:scale-[0.97]"
                    : "border-ink-300 bg-paper text-ink-900 hover:border-pool-blue hover:bg-pool-foam cursor-pointer font-semibold active:scale-[0.97]",
                isToday && !isUnavailable
                  ? "ring-pool-blue/40 bg-pool-foam/60 border-pool-blue/50 ring-2"
                  : "",
                isToday && isUnavailable ? "ring-pool-blue/30 ring-2" : "",
              )}
            >
              <div className="flex w-full items-center justify-between leading-none">
                <span
                  className={cn("font-mono text-sm tabular-nums", isToday ? "font-extrabold" : "")}
                >
                  {cell.day}
                </span>
                {isUnavailable ? (
                  <X aria-hidden="true" className="text-goggle-red h-3 w-3 shrink-0" />
                ) : null}
              </div>

              {/* Indicadores visuales de partidos y entrenamientos */}
              <div className="mb-0.5 flex min-h-[6px] w-full justify-center gap-1">
                {dayMatches.map((m) => (
                  <span
                    key={m.id}
                    title={`Partido vs ${m.opponent}`}
                    className="bg-action h-1.5 w-1.5 animate-pulse rounded-full"
                  />
                ))}
                {daySessions.map((s) => (
                  <span
                    key={s.id}
                    title={`Entrenamiento: ${s.team_label}`}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: s.team_color }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-eyebrow text-ink-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="border-ink-300 bg-paper inline-block h-3 w-3 rounded border"
          />
          Disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="border-goggle-red bg-goggle-red/10 text-goggle-red inline-flex h-3 w-3 items-center justify-center rounded border"
          >
            <X className="h-2 w-2" aria-hidden="true" />
          </span>
          No disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="border-pool-blue/50 bg-pool-foam/60 ring-pool-blue/40 inline-block h-3 w-3 rounded border ring-2"
          />
          Hoy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="bg-paper-sunk/60 inline-block h-3 w-3 rounded" />
          Pasado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="bg-action inline-block h-1.5 w-1.5 rounded-full" />
          Partido
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="bg-pool-blue inline-block h-1.5 w-1.5 rounded-full" />
          Entrenamiento
        </span>
      </div>

      <AvailabilitySheet
        iso={selectedIso}
        onOpenChange={(open) => {
          if (!open) setSelectedIso(null);
        }}
        current={selectedIso ? (availability.get(selectedIso) ?? null) : null}
        dayMatches={activeDayMatches}
        daySessions={activeDaySessions}
        onSaved={(iso, next) => {
          setOverrides((prev) => {
            const m = new Map(prev);
            if (next.available) {
              m.delete(iso);
            } else {
              m.set(iso, next);
            }
            return m;
          });
          setSelectedIso(null);
        }}
        onError={(iso) => {
          setOverrides((prev) => {
            const m = new Map(prev);
            m.delete(iso);
            return m;
          });
        }}
        router={router}
      />
    </div>
  );
}

interface AvailabilitySheetProps {
  iso: string | null;
  current: AvailabilityDay | null;
  dayMatches: UpcomingEvent[];
  daySessions: UpcomingEvent[];
  onOpenChange: (open: boolean) => void;
  onSaved: (iso: string, next: AvailabilityDay) => void;
  onError: (iso: string) => void;
  router: ReturnType<typeof useRouter>;
}

function AvailabilitySheet({
  iso,
  current,
  dayMatches,
  daySessions,
  onOpenChange,
  onSaved,
  onError,
  router,
}: AvailabilitySheetProps) {
  const open = iso != null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="md" className="gap-0">
        {iso ? (
          <AvailabilitySheetForm
            key={iso}
            iso={iso}
            current={current}
            dayMatches={dayMatches}
            daySessions={daySessions}
            onSaved={onSaved}
            onError={onError}
            router={router}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

interface AvailabilitySheetFormProps {
  iso: string;
  current: AvailabilityDay | null;
  dayMatches: UpcomingEvent[];
  daySessions: UpcomingEvent[];
  onSaved: (iso: string, next: AvailabilityDay) => void;
  onError: (iso: string) => void;
  router: ReturnType<typeof useRouter>;
  onClose: () => void;
}

function AvailabilitySheetForm({
  iso,
  current,
  dayMatches,
  daySessions,
  onSaved,
  onError,
  router,
  onClose,
}: AvailabilitySheetFormProps) {
  const [unavailable, setUnavailable] = useState<boolean>(current?.available === false);
  const [reason, setReason] = useState<string>(current?.reason ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    const nextReason = unavailable ? reason.trim() || null : null;
    startTransition(async () => {
      try {
        await setMyAvailability({
          date: iso,
          available: !unavailable,
          reason: nextReason,
        });
        onSaved(iso, {
          iso,
          available: !unavailable,
          reason: nextReason,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos guardar. Inténtalo de nuevo.");
        onError(iso);
      }
    });
  }

  const dateLabel = formatLongDate(`${iso}T12:00:00`);
  const reasonTooLong = reason.length > MAX_REASON_LENGTH;

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <PictogramBadge
            pictogram={Calendario}
            color={unavailable ? "var(--goggle-red)" : "var(--pool-blue)"}
            size="sm"
          />
          <SheetTitle>{dateLabel}</SheetTitle>
        </div>
        <SheetDescription>
          Indica si podrás asistir a los partidos o entrenamientos de este día.
        </SheetDescription>
      </SheetHeader>
      <SheetBody>
        <div className="flex flex-col gap-4">
          {/* Listado de eventos del día */}
          {dayMatches.length > 0 || daySessions.length > 0 ? (
            <div className="border-ink-300 bg-paper-card flex flex-col gap-2 rounded-md border p-3">
              <span className="text-eyebrow text-ink-600 leading-none">
                Eventos programados para hoy:
              </span>
              <ul className="flex flex-col gap-1.5">
                {dayMatches.map((m) => (
                  <li
                    key={m.id}
                    className="border-action/30 bg-paper flex items-center justify-between rounded border px-2.5 py-1.5 text-xs"
                  >
                    <span className="text-pool-deep flex items-center gap-1.5 font-semibold">
                      🏆 Partido vs {m.opponent}
                    </span>
                    <span className="text-ink-500 shrink-0 font-mono font-bold">
                      {new Date(m.scheduled_at).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
                {daySessions.map((s) => (
                  <li
                    key={s.id}
                    className="border-ink-300 bg-paper flex items-center justify-between rounded border px-2.5 py-1.5 text-xs"
                  >
                    <span className="text-pool-deep flex items-center gap-1.5 font-semibold">
                      🏊‍♂️ Entreno · {s.team_label}
                    </span>
                    <span className="text-ink-500 shrink-0 font-mono font-bold">
                      {new Date(s.scheduled_at).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Toggle de Disponibilidad */}
          <div className="border-ink-300 bg-paper flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-pool-deep text-sm font-semibold">
                {unavailable ? "No disponible" : "Disponible"}
              </span>
              <span className="text-ink-600 text-xs">
                {unavailable
                  ? "Tu entrenador sabrá que no cuentas para este día."
                  : "Se mostrará como día disponible."}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={unavailable}
              aria-label="Marcar como no disponible"
              onClick={() => setUnavailable((v) => !v)}
              disabled={pending}
              className={cn(
                "focus-visible:ring-pool-blue focus-visible:ring-offset-paper relative inline-flex h-7 min-h-7 w-12 min-w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
                unavailable ? "bg-goggle-red" : "bg-ink-300",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "bg-paper shadow-elev-1 inline-block h-5 w-5 rounded-full transition-transform",
                  unavailable ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>

          {unavailable ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="availability-reason"
                className="text-eyebrow text-ink-600 font-bold tracking-wider uppercase"
              >
                Motivo (opcional)
              </label>
              <Input
                id="availability-reason"
                name="reason"
                placeholder="Ej: viaje, lesión, examen…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={pending}
                maxLength={MAX_REASON_LENGTH}
                autoComplete="off"
              />
              <p className="text-ink-600 flex items-center justify-between text-[11px]">
                <span>Tu entrenador verá este motivo al preparar la convocatoria.</span>
                <span
                  className={cn("font-mono tabular-nums", reasonTooLong ? "text-goggle-red" : "")}
                >
                  {reason.length}/{MAX_REASON_LENGTH}
                </span>
              </p>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="border-goggle-red bg-goggle-red/5 text-goggle-red rounded border px-3 py-2 text-xs"
            >
              {error}
            </p>
          ) : null}
        </div>
      </SheetBody>
      <SheetFooter className="flex-row gap-2">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onClose}
          disabled={pending}
          className="flex-1 font-bold uppercase"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={save}
          disabled={pending || reasonTooLong}
          className="flex-1 font-bold uppercase"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Guardar
        </Button>
      </SheetFooter>
    </>
  );
}
