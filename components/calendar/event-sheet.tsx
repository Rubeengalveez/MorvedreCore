"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ChevronRight, Check, X, Clock3 } from "lucide-react";
import type { Route } from "next";

import { Gorro } from "@/components/brand/pictograms";
import { Button } from "@/components/ui/button";
import { MapLocationLink } from "@/components/ui/map-location-link";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  formatLongDate,
  formatTimeOfDay,
  formatTimeRangeFromDuration,
} from "@/lib/domain/calendar";
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

function EventCardHeader({ teamLabel, children }: { teamLabel: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <span className="text-pool-blue min-w-0 pt-1 text-xs leading-tight font-black tracking-[0.08em] uppercase">
        {teamLabel}
      </span>
      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">{children}</div>
    </div>
  );
}

function EventBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-lg border px-2.5 text-xs leading-tight font-black tracking-[0.05em] uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

function EventMetaRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="text-ink-600 flex min-w-0 items-start gap-2 text-sm leading-5 font-semibold">
      <span className="text-ink-400 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

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
        <SheetBody className="pt-3 pb-[max(2rem,env(safe-area-inset-bottom))]">
          {day && (day.trainings.length > 0 || day.matches.length > 0) ? (
            <ul className="flex flex-col gap-3 pb-4">
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
            <div className="border-ink-300 bg-paper-sunk rounded-2xl border border-dashed p-5 text-center">
              <p className="text-ink-700 text-sm font-semibold">
                Nada en el calendario este día. Aprovéchalo para descansar.
              </p>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export function TrainingRow({
  training,
  isCoach,
  compact = false,
}: {
  training: NonNullable<CalendarEventDay["trainings"][number]>;
  isCoach: boolean;
  compact?: boolean;
}) {
  const timeRange = formatTimeRangeFromDuration(training.scheduled_at, training.duration_minutes);

  return (
    <article className="border-ink-300 bg-paper-card hover:shadow-elev-2 relative overflow-hidden rounded-2xl border shadow-sm transition-shadow motion-reduce:transition-none">
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-1.5"
        style={{ backgroundColor: training.team_color }}
      />

      <div
        className={cn(
          "flex flex-col py-4 pr-4 pl-5 sm:p-5 sm:pl-6",
          compact ? "gap-3 py-3 pr-3 pl-4 sm:p-4 sm:pl-5" : "gap-4",
        )}
      >
        {compact ? (
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="text-pool-blue min-w-0 truncate text-[0.6875rem] font-black tracking-[0.08em] uppercase">
              {training.team_label}
            </span>
            <EventBadge className="border-pool-blue/15 bg-pool-foam text-pool-deep min-h-7 shrink-0 px-2 text-[0.625rem]">
              Entreno
            </EventBadge>
          </div>
        ) : (
          <EventCardHeader teamLabel={training.team_label}>
            <EventBadge className="border-pool-blue/15 bg-pool-foam text-pool-deep">
              Entrenamiento
            </EventBadge>
          </EventCardHeader>
        )}

        <div className="min-w-0">
          <h3
            className={cn(
              "text-pool-deep leading-tight font-extrabold text-pretty",
              compact ? "text-base" : "text-lg",
              training.cancelled && "text-ink-500",
            )}
          >
            {training.cancelled ? "Sesión de entrenamiento" : "Sesión de agua y táctica"}
          </h3>

          <div className={cn("flex flex-col gap-2.5", compact ? "mt-2" : "mt-3")}>
            <EventMetaRow icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <time className="text-pool-deep font-mono text-base font-black tracking-tight tabular-nums">
                  {timeRange}
                </time>
                <span className="bg-ink-100 text-ink-600 rounded-md px-2 py-0.5 text-xs font-extrabold tabular-nums">
                  {training.duration_minutes} min
                </span>
              </div>
            </EventMetaRow>

            {training.location || training.maps_url ? (
              <MapLocationLink
                name={training.location}
                mapsUrl={training.maps_url}
                compact={compact}
              />
            ) : null}
          </div>
        </div>

        {training.cancelled ? (
          <div className="bg-danger/10 border-danger/20 text-danger flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold">
            <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 break-words">
              <span className="font-black">Cancelado.</span>{" "}
              {training.cancellation_reason || "Sin motivo especificado"}
            </p>
          </div>
        ) : null}

        {isCoach && !training.cancelled ? (
          <div className="border-ink-200 border-t pt-3">
            <Link
              href={`/attendance/${training.id}` as Route}
              className="bg-pool-foam text-pool-blue hover:bg-pool-blue hover:text-paper focus-visible:ring-pool-blue flex min-h-12 w-full touch-manipulation items-center justify-between rounded-xl px-3.5 text-sm font-extrabold transition-[background-color,color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
            >
              <span>Pasar lista</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function MatchRow({
  match,
  isCoach,
  activeProfileId,
  onChanged,
  compact = false,
}: {
  match: NonNullable<CalendarEventDay["matches"][number]>;
  isCoach: boolean;
  activeProfileId: string;
  onChanged: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const isCalled = match.callup_status != null;
  const href = `/matches/${match.id}` as Route;
  const homeTeam = match.is_home ? "Morvedre" : match.opponent;
  const awayTeam = match.is_home ? match.opponent : "Morvedre";

  return (
    <article className="border-ink-300 bg-paper-card hover:shadow-elev-2 relative overflow-hidden rounded-2xl border shadow-sm transition-shadow motion-reduce:transition-none">
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-1.5"
        style={{ backgroundColor: match.team_color }}
      />

      <div
        className={cn(
          "flex flex-col py-4 pr-4 pl-5 sm:p-5 sm:pl-6",
          compact ? "gap-3 py-3 pr-3 pl-4 sm:p-4 sm:pl-5" : "gap-4",
        )}
      >
        {compact ? (
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="text-pool-blue min-w-0 truncate text-[0.6875rem] font-black tracking-[0.08em] uppercase">
              {match.team_label}
            </span>
            <EventBadge className="border-ink-300 bg-paper text-ink-600 min-h-7 shrink-0 px-2 text-[0.625rem]">
              {COMPETITION_LABELS[match.competition_type] ?? match.competition_type}
            </EventBadge>
          </div>
        ) : (
          <EventCardHeader teamLabel={match.team_label}>
            <EventBadge className="border-ink-300 bg-paper text-ink-600">
              {COMPETITION_LABELS[match.competition_type] ?? match.competition_type}
            </EventBadge>
            {match.status === "cancelled" ? (
              <EventBadge className="bg-danger/10 border-danger/20 text-danger">
                Cancelado
              </EventBadge>
            ) : match.status === "played" ? (
              <EventBadge className="bg-success/10 border-success/20 text-success">
                Jugado
              </EventBadge>
            ) : null}
          </EventCardHeader>
        )}

        {compact ? (
          <div className="bg-paper-sunk/70 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 select-none">
            <div className="min-w-0">
              <p className="text-ink-600 text-xs font-bold">
                Morvedre · {match.is_home ? "local" : "visitante"}
              </p>
              <h3 className="text-pool-deep mt-0.5 text-base leading-tight font-black text-pretty">
                <span className="text-ink-500 font-bold">vs </span>
                {match.opponent}
              </h3>
            </div>
            <div className="shrink-0">
              {match.status === "played" &&
              match.final_score_us != null &&
              match.final_score_them != null ? (
                <span className="bg-pool-deep text-paper border-pool-deep inline-flex rounded-lg border px-2.5 py-1 font-mono text-sm font-black tracking-wider shadow-sm">
                  {match.final_score_us}-{match.final_score_them}
                </span>
              ) : (
                <time className="bg-paper-card text-pool-deep border-ink-200 inline-flex rounded-lg border px-2 py-1 font-mono text-sm font-black">
                  {formatTimeOfDay(match.scheduled_at)}
                </time>
              )}
            </div>
          </div>
        ) : (
          <>
            <h3 className="sr-only">
              {homeTeam} contra {awayTeam}
            </h3>

            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-1 select-none">
              <div className="flex min-w-0 items-center gap-1">
                <Gorro
                  className="h-[18px] w-[18px] shrink-0"
                  accent={match.is_home ? match.team_color : "#718096"}
                  aria-hidden="true"
                />
                <span className="text-ink-950 truncate text-xs font-black">{homeTeam}</span>
              </div>

              <div className="flex min-w-12 shrink-0 justify-center">
                {match.status === "played" &&
                match.final_score_us != null &&
                match.final_score_them != null ? (
                  <span className="bg-pool-deep text-paper border-pool-deep rounded-lg border px-3 py-1 font-mono text-sm font-black tracking-widest shadow-sm md:text-base">
                    {match.is_home ? match.final_score_us : match.final_score_them}-
                    {match.is_home ? match.final_score_them : match.final_score_us}
                  </span>
                ) : (
                  <span className="bg-ink-100 text-pool-deep border-ink-200 rounded-lg border px-2 py-1 font-mono text-xs font-black md:text-sm">
                    {formatTimeOfDay(match.scheduled_at)}
                  </span>
                )}
              </div>

              <div className="flex min-w-0 items-center justify-end gap-1 text-right">
                <span className="text-ink-950 truncate text-xs font-black">{awayTeam}</span>
                <Gorro
                  className="h-[18px] w-[18px] shrink-0"
                  accent={match.is_home ? "#718096" : match.team_color}
                  aria-hidden="true"
                />
              </div>
            </div>
          </>
        )}

        {match.pool_name || match.location || match.maps_url ? (
          <MapLocationLink
            name={match.pool_name || match.location}
            address={match.location}
            mapsUrl={match.maps_url}
            compact={compact}
          />
        ) : null}

        {isCalled && match.callup_status && (
          <div className={cn("border-ink-200/40 border-t", compact ? "pt-2" : "mt-1.5 pt-3")}>
            <PremiumRsvpSection
              matchId={match.id}
              currentStatus={match.callup_status}
              onChanged={onChanged}
              router={router}
              playerId={activeProfileId}
              compact={compact}
            />
          </div>
        )}

        <div
          className={cn(
            "border-ink-200/40 flex flex-col border-t select-none",
            compact ? "gap-1.5 pt-2" : "mt-1 gap-2 pt-3",
          )}
        >
          <Button
            asChild
            size="sm"
            variant="secondary"
            className={cn(
              "hover:bg-ink-100/50 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl font-extrabold",
              compact ? "min-h-10 text-sm" : "min-h-12 text-sm",
            )}
          >
            <Link href={href}>
              <span>{compact ? "Ver convocatoria" : "Ver convocatoria completa"}</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
          {isCoach && (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className={cn(
                "text-ink-600 hover:text-pool-deep w-full cursor-pointer text-sm font-extrabold",
                compact ? "min-h-10" : "min-h-12",
              )}
            >
              <Link href={`/admin/matches/${match.id}` as Route}>Gestionar convocatoria</Link>
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
  compact = false,
}: {
  matchId: string;
  currentStatus: string;
  onChanged: () => void;
  router: ReturnType<typeof useRouter>;
  playerId: string;
  compact?: boolean;
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

  const isConfirmed = currentStatus === "confirmed";
  const isDeclined =
    currentStatus === "declined" || currentStatus === "withdrawn" || currentStatus === "no_show";

  return (
    <div className="flex flex-col gap-2 select-none">
      <span className="text-ink-600 text-xs font-black tracking-wider uppercase">
        {compact ? "¿Asistes?" : "¿Confirmas tu asistencia?"}
      </span>

      <div className={cn("flex w-full", compact ? "gap-2" : "gap-2.5")}>
        <button
          type="button"
          disabled={pending}
          onClick={() => send("confirmed")}
          className={cn(
            "focus-visible:ring-pool-blue flex flex-1 cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-xl border font-extrabold transition-[background-color,border-color,color,box-shadow,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none",
            compact ? "min-h-10 min-w-0 px-2 text-xs whitespace-nowrap" : "min-h-12 text-sm",
            isConfirmed
              ? "bg-success text-paper border-success shadow-sm"
              : "bg-paper border-success/25 text-success hover:bg-success/10",
          )}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-current" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{isConfirmed ? "Asistiré" : "Confirmar"}</span>
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => send("declined")}
          className={cn(
            "focus-visible:ring-pool-blue flex flex-1 cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-xl border font-extrabold transition-[background-color,border-color,color,box-shadow,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none",
            compact ? "min-h-10 min-w-0 px-2 text-xs whitespace-nowrap" : "min-h-12 text-sm",
            isDeclined
              ? "bg-danger text-paper border-danger shadow-sm"
              : "bg-paper border-danger/25 text-danger hover:bg-danger/10",
          )}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-current" aria-hidden="true" />
          ) : (
            <X className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{isDeclined ? "No puedo ir" : "Denegar"}</span>
        </button>
      </div>

      {error ? (
        <p className="text-danger mt-0.5 text-sm font-semibold" role="alert">
          {error}
        </p>
      ) : null}
      <p className="sr-only">Convocatoria para el jugador {playerId}</p>
    </div>
  );
}
