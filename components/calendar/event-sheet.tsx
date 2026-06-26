"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
            <ul className="flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
              {day.trainings.map((t) => (
                <li key={t.id}>
                  <TrainingRow
                    training={t}
                    isCoach={isCoach || isAdmin}
                  />
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
            <p className="text-sm text-ink-600">
              Nada en el calendario este día. Aprovéchalo para descansar.
            </p>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function TrainingRow({
  training,
  isCoach,
}: {
  training: NonNullable<CalendarEventDay["trainings"][number]>;
  isCoach: boolean;
}) {
  return (
    <article className="flex items-start gap-3 rounded-md border border-ink-300 bg-paper p-4">
      <span
        aria-hidden="true"
        className="mt-1 block h-8 w-1 shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: training.team_color }}
      />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-base font-semibold text-brand-deep">
            {formatTimeOfDay(training.scheduled_at)}
          </span>
          <span className="text-sm font-semibold text-ink-900">
            Entreno {training.team_label}
          </span>
          {training.block_label ? (
            <span className="rounded-full border border-ink-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-600">
              {training.block_label}
            </span>
          ) : null}
          {training.cancelled ? (
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold",
                "bg-danger/15 text-danger",
              )}
            >
              Cancelado
            </span>
          ) : null}
        </div>
        {training.location ? (
          <p className="text-sm text-ink-600">{training.location}</p>
        ) : null}
        {training.cancelled && training.cancellation_reason ? (
          <p className="text-sm text-danger">{training.cancellation_reason}</p>
        ) : null}
        <p className="text-xs text-ink-600">
          Duración: {training.duration_minutes} min
        </p>
        {isCoach ? (
          <p className="text-xs text-ink-600">
            Pasa lista desde el panel de administración.
          </p>
        ) : null}
      </div>
    </article>
  );
}

function MatchRow({
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
  const isMyCallup = isCalled;
  const href = `/matches/${match.id}` as Route;
  return (
    <article className="flex items-start gap-3 rounded-md border border-ink-300 bg-paper p-4">
      <span
        aria-hidden="true"
        className="mt-1 block h-8 w-1 shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: match.team_color }}
      />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-base font-semibold text-brand-deep">
            {formatTimeOfDay(match.scheduled_at)}
          </span>
          <span className="text-sm font-semibold text-ink-900">
            {match.team_label}
            <span className="text-ink-600"> vs </span>
            {match.opponent}
          </span>
          <span className="rounded-full border border-ink-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-600">
            {COMPETITION_LABELS[match.competition_type] ?? match.competition_type}
          </span>
          {match.status === "cancelled" ? (
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold",
                "bg-danger/15 text-danger",
              )}
            >
              Cancelado
            </span>
          ) : null}
          {match.status === "played" ? (
            <span className="inline-flex h-6 items-center rounded-full bg-success/15 px-2 text-[11px] font-semibold text-success">
              Jugado
            </span>
          ) : null}
        </div>
        {match.pool_name ? (
          <p className="text-sm text-ink-600">{match.pool_name}</p>
        ) : null}
        {match.location && match.location !== match.pool_name ? (
          <p className="text-sm text-ink-600">{match.location}</p>
        ) : null}
        {match.status === "played" &&
        match.final_score_us != null &&
        match.final_score_them != null ? (
          <p className="font-mono text-base font-bold text-brand-deep">
            {match.final_score_us} - {match.final_score_them}
          </p>
        ) : null}

        {isMyCallup && match.callup_status ? (
          <div className="flex flex-col gap-2">
            <CallupBadge
              status={match.callup_status}
              cap={match.cap_number}
            />
            {match.callup_status !== "withdrawn" ? (
              <RsvpControls
                matchId={match.id}
                currentStatus={match.callup_status}
                onChanged={onChanged}
                router={router}
                playerId={activeProfileId}
              />
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <a href={href}>Ver partido</a>
          </Button>
          {isCoach ? (
            <Button asChild size="sm" variant="ghost">
              <a href={`/admin/matches/${match.id}` as Route}>Editar convocatoria</a>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CallupBadge({
  status,
  cap,
}: {
  status: string;
  cap: number | null;
}) {
  const label = callupLabel(status);
  const tone = callupTone(status);
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border p-3",
        tone.bgClass,
        tone.borderClass,
      )}
    >
      <Gorro
        className="h-7 w-7 shrink-0"
        accent={cap != null ? "var(--brand-blue)" : "var(--brand-aqua)"}
      />
      <div className="flex flex-1 flex-col">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-600">
          Tu convocatoria
        </span>
        <span className={cn("font-display text-sm font-bold", tone.textClass)}>
          {label}
          {cap != null ? ` · Gorro #${cap}` : ""}
        </span>
      </div>
    </div>
  );
}

function callupLabel(status: string): string {
  switch (status) {
    case "called":
      return "Convocado";
    case "confirmed":
      return "Confirmado";
    case "declined":
      return "Has rechazado";
    case "withdrawn":
      return "Te has dado de baja";
    case "no_show":
      return "No te presentaste";
    default:
      return status;
  }
}

function callupTone(status: string): {
  bgClass: string;
  borderClass: string;
  textClass: string;
} {
  switch (status) {
    case "confirmed":
      return {
        bgClass: "bg-success/10",
        borderClass: "border-success/30",
        textClass: "text-success",
      };
    case "declined":
    case "no_show":
    case "withdrawn":
      return {
        bgClass: "bg-danger/10",
        borderClass: "border-danger/30",
        textClass: "text-danger",
      };
    default:
      return {
        bgClass: "bg-brand-foam",
        borderClass: "border-brand-aqua/30",
        textClass: "text-brand-deep",
      };
  }
}

function RsvpControls({
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
        setError(
          err instanceof Error
            ? err.message
            : "No pudimos guardar tu respuesta.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <Button
          size="md"
          variant="primary"
          disabled={pending || currentStatus === "confirmed"}
          onClick={() => send("confirmed")}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Confirmo
        </Button>
        <Button
          size="md"
          variant="danger"
          disabled={pending || currentStatus === "declined"}
          onClick={() => send("declined")}
        >
          No puedo
        </Button>
        <Button
          size="md"
          variant="secondary"
          disabled={pending}
          onClick={() => send("withdrawn")}
        >
          Cambiar de opinión
        </Button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <p className="sr-only">Convocatoria para el jugador {playerId}</p>
    </div>
  );
}
