"use client";

import Link from "next/link";
import type { Route } from "next";
import { Clock3, ChevronRight, Check, X, Minus } from "lucide-react";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { MapLocationLink } from "@/components/ui/map-location-link";
import {
  formatLongDate,
  formatTimeOfDay,
  formatTimeRangeFromDuration,
} from "@/lib/domain/calendar";
import type { CalendarEventDay, CalendarTraining, CalendarMatch } from "@/server/queries/calendar";
import { cn } from "@/lib/utils/cn";
import { CalendarMarker } from "./calendar-key";

export interface EventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  iso: string | null;
  day: CalendarEventDay | null;
  returnParams?: string;
  isCoach?: boolean;
  isAdmin?: boolean;
}
const labels: Record<string, string> = {
  league: "Liga",
  cup: "Copa",
  tournament: "Torneo",
  friendly: "Amistoso",
};
const action =
  "bg-pool-deep border-pool-deep focus-visible:outline-pool-blue flex min-h-12 items-center justify-between gap-2 rounded-xl border-2 px-3 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2";
function TeamLabel({ label, color }: { label: string; color: string }) {
  return (
    <span className="border-pool-deep/65 text-pool-deep inline-flex max-w-full items-center gap-2 rounded-lg border bg-white px-2 py-1 text-sm font-extrabold">
      <span
        className="h-3 w-3 shrink-0 rounded-full border border-slate-700"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
export function EventSheet({ open, onOpenChange, iso, day, returnParams }: EventSheetProps) {
  const events = [
    ...(day?.trainings ?? []).map((training) => ({ kind: "training" as const, event: training })),
    ...(day?.matches ?? []).map((match) => ({ kind: "match" as const, event: match })),
  ].sort((a, b) => a.event.scheduled_at.localeCompare(b.event.scheduled_at));
  return (
    <ActaGuardSheet
      open={open}
      onOpenChange={onOpenChange}
      context="Calendario"
      title={iso ? formatLongDate(`${iso}T12:00:00`) : "Actividades del día"}
      description="Horarios, categorías y asistencia de las actividades de este día."
      icon="saved"
      tall
      actions={[]}
      body={
        events.length ? (
          <ul className="flex flex-col gap-3">
            {events.map(({ kind, event }) => (
              <li key={`${kind}/${event.id}`}>
                {kind === "training" ? (
                  <TrainingRow training={event as CalendarTraining} returnParams={returnParams} />
                ) : (
                  <MatchRow match={event as CalendarMatch} returnParams={returnParams} />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-pool-deep/65 text-pool-deep rounded-xl border-2 bg-white p-5 text-center font-semibold">
            No hay entrenamientos ni partidos este día.
          </div>
        )
      }
    />
  );
}
export function TrainingRow({
  training,
  isCoach = false,
  returnParams,
  compact = false,
}: {
  training: CalendarTraining;
  isCoach?: boolean;
  returnParams?: string;
  compact?: boolean;
}) {
  const kind =
    training.training_kind === "dry" || training.training_kind === "physical"
      ? "Físico / seco"
      : training.training_kind === "meeting"
        ? "Reunión"
        : "Agua";
  return (
    <article
      className={cn(
        "border-pool-deep/65 flex flex-col gap-3 rounded-xl border-2 bg-white p-3",
        compact && "p-2.5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-pool-deep inline-flex items-center gap-2 text-sm font-extrabold">
          <CalendarMarker kind="training" />
          Entrenamiento
        </span>
        <span className="border-pool-deep/65 text-pool-deep rounded-lg border bg-blue-50 px-2 py-1 text-sm font-bold">
          {kind}
        </span>
      </div>
      <TeamLabel label={training.team_label} color={training.team_color} />
      <h3 className="text-pool-deep text-base leading-snug font-extrabold">
        {training.block_label || `Entrenamiento de ${kind.toLowerCase()}`}
      </h3>
      <div className="border-pool-deep/65 text-pool-deep flex items-center gap-2 rounded-xl border bg-blue-50 px-3 py-2.5">
        <Clock3 className="h-5 w-5 shrink-0" aria-hidden="true" />
        <time dateTime={training.scheduled_at} className="text-lg font-extrabold tabular-nums">
          {formatTimeRangeFromDuration(training.scheduled_at, training.duration_minutes)}
        </time>
        <span className="ml-auto text-sm font-semibold whitespace-nowrap">
          {training.duration_minutes} min
        </span>
      </div>
      {(training.location || training.maps_url) && (
        <MapLocationLink
          name={training.location}
          mapsUrl={training.maps_url}
          className="border-pool-deep/65 border-2"
        />
      )}
      {training.cancelled ? (
        <div className="rounded-xl border-2 border-red-800 bg-red-50 p-3 text-sm font-bold text-red-900">
          <span>Cancelado.</span> {training.cancellation_reason || "Sin motivo especificado"}
        </div>
      ) : (
        <>
          {!!training.attendance?.length && (
            <ul aria-label="Asistencia registrada" className="flex flex-col gap-2">
              {training.attendance.map((person) => (
                <li
                  key={person.player_id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm",
                    person.present === true
                      ? "border-green-800 bg-green-50 text-green-900"
                      : person.present === false
                        ? "border-red-800 bg-red-50 text-red-900"
                        : training.upcoming
                          ? "border-slate-500 bg-slate-50 text-slate-800"
                          : "border-amber-800 bg-amber-50 text-amber-950",
                  )}
                >
                  <span aria-hidden="true">
                    {person.present === true ? (
                      <Check className="h-4 w-4" />
                    ) : person.present === false ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{person.name}</p>
                    <p className="font-semibold">
                      {person.present === true
                        ? "Asistió"
                        : person.present === false
                          ? `No asistió${person.reason ? ` · ${person.reason}` : ""}`
                          : training.upcoming
                            ? "Entrenamiento pendiente"
                            : "Sin revisar · asistencia provisional"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(training.can_manage ?? isCoach) && (
            <Link
              href={`/attendance/${training.id}${returnParams ? `?${returnParams}` : ""}` as Route}
              className={action}
            >
              Pasar lista
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </>
      )}
    </article>
  );
}
export function MatchRow({
  match,
  returnParams,
  compact = false,
}: {
  match: CalendarMatch;
  returnParams?: string;
  isCoach?: boolean;
  compact?: boolean;
}) {
  const home = match.is_home ? "Morvedre" : match.opponent;
  const away = match.is_home ? match.opponent : "Morvedre";
  return (
    <article
      className={cn(
        "border-pool-deep/65 text-pool-deep flex flex-col gap-3 rounded-xl border-2 bg-white p-3",
        compact && "p-2.5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-extrabold">
          <CalendarMarker kind="match" />
          Partido · {labels[match.competition_type] ?? "Competición"}
        </span>
        <time dateTime={match.scheduled_at} className="font-extrabold tabular-nums">
          {formatTimeOfDay(match.scheduled_at)}
        </time>
      </div>
      <TeamLabel label={match.team_label} color={match.team_color} />
      <h3 className="sr-only">
        {home} contra {away}
      </h3>
      <div className="border-pool-deep/65 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl border bg-blue-50 p-3 text-center">
        <span className="min-w-0 text-sm leading-snug font-extrabold">{home}</span>
        <strong className="whitespace-nowrap">
          {match.status === "played" &&
          match.final_score_us !== null &&
          match.final_score_them !== null
            ? `${match.is_home ? match.final_score_us : match.final_score_them}–${match.is_home ? match.final_score_them : match.final_score_us}`
            : "vs"}
        </strong>
        <span className="min-w-0 text-sm leading-snug font-extrabold">{away}</span>
      </div>
      {match.status === "cancelled" || match.status === "postponed" ? (
        <p className="rounded-lg border border-red-800 bg-red-50 p-2.5 text-sm font-bold text-red-900">
          {match.status === "cancelled"
            ? "Partido cancelado"
            : "Aplazado · pendiente de nueva fecha"}
        </p>
      ) : match.status === "in_progress" ? (
        <p className="rounded-lg bg-blue-50 p-2.5 text-sm font-extrabold">Partido en juego</p>
      ) : null}
      {!!match.callups?.length ? (
        <ul className="grid gap-2">
          {match.callups.map((person) => (
            <li
              key={person.player_id}
              className="border-pool-deep/65 rounded-lg border bg-blue-50 p-2.5 text-sm"
            >
              <p className="font-extrabold">{person.name}</p>
              <p className="mt-1 font-semibold">
                En la convocatoria{person.cap_number ? ` · Gorro ${person.cap_number}` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        match.callup_status && (
          <p className="border-pool-deep/65 rounded-lg border bg-blue-50 p-2.5 text-sm font-extrabold">
            En la convocatoria{match.cap_number ? ` · Gorro ${match.cap_number}` : ""}
          </p>
        )
      )}
      {(match.pool_name || match.location || match.maps_url) && (
        <MapLocationLink
          name={match.pool_name || match.location}
          address={match.location}
          mapsUrl={match.maps_url}
          className="border-pool-deep/65 border-2"
        />
      )}
      <Link
        href={`/matches/${match.id}${returnParams ? `?${returnParams}` : ""}` as Route}
        className={action}
      >
        {match.status === "played" ? "Ver partido y acta" : "Ver partido"}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
