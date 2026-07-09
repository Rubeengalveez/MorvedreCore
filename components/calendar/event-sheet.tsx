"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, MapPin, ChevronRight, Check, X } from "lucide-react";
import type { Route } from "next";

import { Gorro } from "@/components/brand/pictograms";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatLongDate, formatTimeOfDay } from "@/lib/domain/calendar";
import { setMyCallupStatus } from "@/server/actions/admin";
import type { CalendarEventDay } from "@/server/queries/calendar";
import { cn } from "@/lib/utils/cn";

export interface EventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  iso: string | null;
  day: CalendarEventDay | null;
  isCoach: boolean;
  activeProfileId: string;
  isAdmin: boolean;
}

const COMPETITION_LABELS: Record<string, string> = {
  league: "Liga",
  cup: "Copa",
  tournament: "Torneo",
  friendly: "Amistoso",
};

export function EventSheet({
  open,
  onOpenChange,
  iso,
  day,
  isCoach,
  activeProfileId,
  isAdmin,
}: EventSheetProps) {
  const dateLabel = iso ? formatLongDate(`${iso}T12:00:00`) : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg" className="gap-0">
        <SheetHeader>
          <SheetTitle>{dateLabel || "Eventos"}</SheetTitle>
          <SheetDescription>
            {day && day.trainings.length + day.matches.length > 0
              ? `${day.trainings.length + day.matches.length} eventos`
              : "No hay eventos programados."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {day && (day.trainings.length > 0 || day.matches.length > 0) ? (
            <ul className="flex flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
              {day.trainings.map((t) => (
                <li key={t.id}>
                  <TrainingRow training={t} isCoach={isCoach || isAdmin} />
                </li>
              ))}
              {day.matches.map((m) => (
                <li key={m.id}>
                  <MatchRow
                    match={m}
                    isCoach={isCoach || isAdmin}
                    activeProfileId={activeProfileId}
                    onChanged={() => {
                      onOpenChange(false);
                    }}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-600 text-sm">
              Nada en el calendario este día. Aprovéchalo para descansar.
            </p>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export function TrainingRow({
  training,
  isCoach,
}: {
  training: NonNullable<CalendarEventDay["trainings"][number]>;
  isCoach: boolean;
}) {
  return (
    <article className="border-ink-200/80 bg-paper-card relative flex flex-col gap-3 overflow-hidden rounded-lg border p-5 shadow-sm transition-all hover:shadow-elev-2">
      {/* Decorative vertical color stripe */}
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-1.5"
        style={{ backgroundColor: training.team_color }}
      />

      <div className="flex flex-col gap-2 pl-1.5">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2 select-none">
          <span className="text-pool-blue text-[10px] font-black tracking-widest uppercase">
            {training.team_label}
          </span>
          <span className="border-pool-blue/15 bg-pool-foam text-pool-deep rounded-full border px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase">
            Entrenamiento
          </span>
        </div>

        {/* Time and Title Row */}
        <div className="mt-1 flex items-baseline gap-3 select-none">
          <span className="text-pool-deep shrink-0 font-mono text-xl font-black tracking-tight">
            {formatTimeOfDay(training.scheduled_at)}
          </span>
          <h4 className="text-ink-950 text-sm leading-tight font-extrabold">
            {training.cancelled ? (
              <span className="text-ink-400 line-through">Sesión de entrenamiento</span>
            ) : (
              "Sesión de agua y táctica"
            )}
          </h4>
        </div>

        {/* Location & Details */}
        {training.location && (
          <p className="text-ink-600 mt-1 flex items-center gap-1.5 text-xs font-semibold select-none">
            <MapPin className="text-ink-400 h-4 w-4 shrink-0" />
            <span>{training.location}</span>
          </p>
        )}

        {training.cancelled ? (
          <div className="bg-danger/10 border-danger/20 text-danger mt-1 rounded-xl border p-3 text-xs font-bold">
            Cancelado: {training.cancellation_reason || "Sin motivo especificado"}
          </div>
        ) : null}

        {/* Footer */}
        <div className="border-ink-200/40 text-ink-500 mt-2.5 flex items-center justify-between border-t pt-3 text-[10px] font-extrabold tracking-wider uppercase select-none">
          <span>Duración: {training.duration_minutes} min</span>
          {isCoach && <span className="text-pool-teal">Pasar lista en admin</span>}
        </div>
      </div>
    </article>
  );
}

export function MatchRow({
  match,
  isCoach,
  activeProfileId,
  onChanged,
}: {
  match: NonNullable<CalendarEventDay["matches"][number]>;
  isCoach: boolean;
  activeProfileId: string;
  onChanged: () => void;
}) {
  const router = useRouter();
  const isCalled = match.callup_status != null;
  const href = `/matches/${match.id}` as Route;

  return (
    <article className="border-ink-200/80 bg-paper-card relative flex flex-col gap-3 overflow-hidden rounded-lg border p-5 shadow-sm transition-all hover:shadow-elev-2">
      {/* Decorative vertical team color stripe */}
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-1.5"
        style={{ backgroundColor: match.team_color }}
      />

      <div className="flex flex-col gap-3 pl-1.5">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2 select-none">
          <span className="text-pool-blue text-[10px] font-black tracking-widest uppercase">
            {match.team_label}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="border-ink-300 bg-paper text-ink-600 rounded-full border px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase">
              {COMPETITION_LABELS[match.competition_type] ?? match.competition_type}
            </span>
            {match.status === "cancelled" ? (
              <span className="bg-danger/10 border-danger/20 text-danger rounded-full border px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase">
                Cancelado
              </span>
            ) : match.status === "played" ? (
              <span className="bg-success/10 border-success/20 text-success rounded-full border px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase">
                Jugado
              </span>
            ) : null}
          </div>
        </div>

        {/* Visual Scoreboard (High hierarchy, extremely clear for kids & elderly) */}
        <div className="flex items-center justify-between gap-2 py-2 select-none">
          {/* Team 1: Morvedre */}
          <div className="flex max-w-[40%] flex-1 items-center gap-2">
            <Gorro className="h-6 w-6 shrink-0" accent={match.team_color} />
            <span className="text-ink-950 truncate text-xs font-black">Morvedre</span>
          </div>

          {/* Time or Score Center */}
          <div className="flex min-w-[70px] shrink-0 justify-center">
            {match.status === "played" &&
            match.final_score_us != null &&
            match.final_score_them != null ? (
              <span className="bg-pool-deep text-paper border-pool-deep rounded-lg border px-3 py-1 font-mono text-sm font-black tracking-widest shadow-sm md:text-base">
                {match.final_score_us}-{match.final_score_them}
              </span>
            ) : (
              <span className="bg-ink-100 text-pool-deep border-ink-200 rounded-lg border px-2.5 py-1 font-mono text-xs font-black md:text-sm">
                {formatTimeOfDay(match.scheduled_at)}
              </span>
            )}
          </div>

          {/* Team 2: Opponent */}
          <div className="flex max-w-[40%] flex-1 items-center justify-end gap-2 text-right">
            <span className="text-ink-950 truncate text-xs font-black">{match.opponent}</span>
            <Gorro className="h-6 w-6 shrink-0" accent="#A0AEC0" />
          </div>
        </div>

        {/* Location Info */}
        {match.pool_name && (
          <p className="text-ink-600 flex items-center gap-1.5 text-xs font-semibold select-none">
            <MapPin className="text-ink-400 h-4 w-4 shrink-0" />
            <span className="truncate">{match.pool_name}</span>
          </p>
        )}
        {match.location && match.location !== match.pool_name && (
          <p className="text-ink-500 truncate pl-5 text-[11px] leading-none font-semibold select-none">
            {match.location}
          </p>
        )}

        {/* RSVP Section (Big, Clean, Touch-Safe Buttons) */}
        {isCalled && match.callup_status && (
          <div className="border-ink-200/40 mt-1.5 border-t pt-3">
            <PremiumRsvpSection
              matchId={match.id}
              currentStatus={match.callup_status}
              onChanged={onChanged}
              router={router}
              playerId={activeProfileId}
            />
          </div>
        )}

        {/* Action Button: View Convocatoria */}
        <div className="border-ink-200/40 mt-1 flex flex-col gap-2 border-t pt-3 select-none">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="hover:bg-ink-100/50 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl text-xs font-extrabold"
          >
            <Link href={href}>
              <span>Ver convocatoria completa</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {isCoach && (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="text-ink-600 hover:text-pool-deep h-8 w-full cursor-pointer text-[10px] font-extrabold"
            >
              <Link href={`/admin/matches/${match.id}` as Route}>
                Editar convocatoria (Entrenador)
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function PremiumRsvpSection({
  matchId,
  currentStatus,
  onChanged,
  router,
  playerId,
}: {
  matchId: string;
  currentStatus: string;
  onChanged: () => void;
  router: ReturnType<typeof useRouter>;
  playerId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function send(status: "confirmed" | "declined" | "withdrawn") {
    setError(null);
    startTransition(async () => {
      try {
        await setMyCallupStatus({ match_id: matchId, status });
        onChanged();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos guardar tu respuesta.");
      }
    });
  }

  const isConfirmed = currentStatus === "confirmed" || currentStatus === "called";
  const isDeclined =
    currentStatus === "declined" || currentStatus === "withdrawn" || currentStatus === "no_show";

  return (
    <div className="flex flex-col gap-2 select-none">
      <span className="text-ink-500 text-[9px] font-black tracking-widest uppercase">
        ¿Confirmas tu asistencia?
      </span>

      <div className="flex gap-2.5">
        {/* Green Button: Confirm */}
        <button
          type="button"
          disabled={pending}
          onClick={() => send("confirmed")}
          className={cn(
            "flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border text-xs font-extrabold transition-all active:scale-[0.97]",
            isConfirmed
              ? "text-paper border-emerald-600 bg-emerald-600 shadow-sm"
              : "bg-paper border-emerald-500/25 text-emerald-700 hover:bg-emerald-50/50",
          )}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-current" />
          ) : (
            <Check className="h-4 w-4 shrink-0" />
          )}
          <span>{isConfirmed ? "Asistiré" : "Confirmar"}</span>
        </button>

        {/* Red Button: Decline */}
        <button
          type="button"
          disabled={pending}
          onClick={() => send("declined")}
          className={cn(
            "flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border text-xs font-extrabold transition-all active:scale-[0.97]",
            isDeclined
              ? "text-paper border-red-600 bg-red-600 shadow-sm"
              : "bg-paper border-red-500/25 text-red-600 hover:bg-red-50/50",
          )}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-current" />
          ) : (
            <X className="h-4 w-4 shrink-0" />
          )}
          <span>{isDeclined ? "No puedo ir" : "Denegar"}</span>
        </button>
      </div>

      {error ? <p className="text-danger mt-0.5 text-[10px] font-semibold">{error}</p> : null}
      <p className="sr-only">Convocatoria para el jugador {playerId}</p>
    </div>
  );
}
