"use client";

import { Clock, MapPin, Calendar, Users, X, ChevronRight, AlertCircle, Check } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Avatar } from "@/components/ui/avatar";
import { CapTile } from "@/components/ui/cap-tile";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { cn } from "@/lib/utils/cn";
import { matchColor, trainingColor } from "@/lib/domain/event-colors";
import { formatTimeOfDay, formatTimeRangeFromDuration } from "@/lib/domain/calendar";
import { Gorro, SilbatoActivo } from "@/components/brand/pictograms";

export interface CalendarEventBase {
  id: string;
  kind: "training" | "match";
  scheduled_at: string;
  team_label: string;
  team_color: string;
  cancelled?: boolean;
  status?: string;
  duration_minutes?: number;
}

export interface CalendarEventCardData {
  id: string;
  kind: "training" | "match";
  scheduled_at: string;
  title: string;
  team_label: string;
  team_color: string;
  cancelled?: boolean;
  status?: string;
  subtitle?: string;
  location?: string | null;
  duration_minutes?: number;
  competition_type?: string;
  opponent?: string;
  callup_photo_url?: string | null;
  callup_name?: string | null;
  callup_status?: string | null;
  callup_cap_number?: number | null;
  callup_team_color?: string | null;
}

export function CalendarEventChip({
  event,
  size = "sm",
  className,
}: {
  event: CalendarEventBase & { title: string };
  size?: "sm" | "md";
  className?: string;
}) {
  const color =
    event.kind === "match"
      ? matchColor({
          competitionType: (event as { competition_type?: string }).competition_type ?? "league",
          status: event.status ?? "scheduled",
          isPast: false,
          unavailable: false,
        })
      : trainingColor({ cancelled: !!event.cancelled, isPast: false, unavailable: false });

  return (
    <span
      className={cn(
        "text-paper inline-flex items-center gap-1 rounded-sm px-1.5 leading-none font-semibold",
        size === "sm" ? "min-h-5 text-xs" : "min-h-6 text-xs",
        event.cancelled && "line-through opacity-50",
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {event.duration_minutes
        ? formatTimeRangeFromDuration(event.scheduled_at, event.duration_minutes)
        : formatTimeOfDay(event.scheduled_at)}
      <span className="truncate">{event.title}</span>
    </span>
  );
}

function EventBody({
  event,
  color,
  timeStr,
  isCancelled,
  isPostponed,
  isPast,
  showAttendance,
  userAttendance,
}: {
  event: CalendarEventCardData;
  color: string;
  timeStr: string;
  isCancelled: boolean;
  isPostponed: boolean;
  isPast: boolean;
  showAttendance: boolean | undefined;
  userAttendance: boolean | null;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <PictogramBadge
            pictogram={event.kind === "match" ? Gorro : SilbatoActivo}
            color={color}
            size="md"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {event.kind === "match" ? (
                event.competition_type === "tournament" ? (
                  <StatusBadge variant="brand">Torneo</StatusBadge>
                ) : event.competition_type === "friendly" ? (
                  <StatusBadge variant="info">Amistoso</StatusBadge>
                ) : (
                  <StatusBadge variant="gold">Liga/Copa</StatusBadge>
                )
              ) : (
                <StatusBadge variant="info">Entreno</StatusBadge>
              )}
              {isCancelled ? <StatusBadge variant="danger">Cancelado</StatusBadge> : null}
              {isPostponed ? <StatusBadge variant="neutral">Aplazado</StatusBadge> : null}
              {showAttendance && userAttendance === true ? (
                <StatusBadge variant="success" icon={<Check />}>
                  Asistió
                </StatusBadge>
              ) : null}
              {showAttendance && userAttendance === false ? (
                <StatusBadge variant="danger" icon={<X />}>
                  Ausente
                </StatusBadge>
              ) : null}
            </div>
            <p
              className={cn(
                "font-display text-pool-deep mt-1 text-sm leading-tight font-extrabold",
                isPast && "opacity-80",
                isCancelled && "line-through opacity-60",
              )}
            >
              {event.title}
            </p>
            {event.subtitle ? <p className="text-ink-600 text-xs">{event.subtitle}</p> : null}
          </div>
        </div>
      </div>
      {event.callup_name ? (
        <div
          className="border-ink-300 bg-pool-foam/40 flex items-center gap-2 rounded-md border p-2"
          style={{ borderLeftWidth: "3px", borderLeftColor: color }}
        >
          {event.callup_cap_number != null ? (
            <CapTile
              number={event.callup_cap_number}
              teamColor={event.callup_team_color ?? color}
              size="sm"
            />
          ) : (
            <Avatar src={event.callup_photo_url ?? null} name={event.callup_name} size={28} />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-pool-deep line-clamp-1 text-xs font-semibold">{event.callup_name}</p>
            {event.callup_status ? (
              <Eyebrow tone="muted">
                {event.callup_status === "confirmed" ? "Confirmado" : "Convocado"}
              </Eyebrow>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="border-ink-300 text-ink-600 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-xs">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeStr}
        </span>
        {event.location ? (
          <span className="inline-flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{event.location}</span>
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1 truncate">
          <Users className="h-3 w-3 shrink-0" />
          {event.team_label}
        </span>
      </div>
    </>
  );
}

export function CalendarEventCard({
  event,
  href,
  isPast,
  showAttendance = false,
  userAttendance = null,
  className,
}: {
  event: CalendarEventCardData;
  href?: string;
  isPast?: boolean;
  showAttendance?: boolean;
  userAttendance?: boolean | null;
  className?: string;
}) {
  const color =
    event.kind === "match"
      ? matchColor({
          competitionType: event.competition_type ?? "league",
          status: event.status ?? "scheduled",
          isPast: !!isPast,
          unavailable: false,
        })
      : trainingColor({ cancelled: !!event.cancelled, isPast: !!isPast, unavailable: false });
  const timeStr = event.duration_minutes
    ? formatTimeRangeFromDuration(event.scheduled_at, event.duration_minutes)
    : formatTimeOfDay(event.scheduled_at);
  const isCancelled = !!event.cancelled || event.status === "cancelled";
  const isPostponed = event.status === "postponed";
  const cardVariant = href ? "interactive" : "default";

  const body = (
    <div className="flex flex-col gap-2 p-3">
      <EventBody
        event={event}
        color={color}
        timeStr={timeStr}
        isCancelled={isCancelled}
        isPostponed={isPostponed}
        isPast={!!isPast}
        showAttendance={showAttendance}
        userAttendance={userAttendance}
      />
      {href ? (
        <div className="text-ink-300 group-hover:text-ink-600 -mt-1 -mb-1 self-end transition-transform group-hover:translate-x-0.5">
          <ChevronRight className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Card
        asChild
        variant={cardVariant}
        accentColor={color}
        className={cn(
          "group",
          isPast && !isCancelled && !isPostponed && "opacity-80",
          isCancelled && "border-danger/30 bg-danger/5",
          isPostponed && "bg-paper/50",
          className,
        )}
      >
        <Link href={href as Route}>{body}</Link>
      </Card>
    );
  }

  return (
    <Card
      variant={cardVariant}
      accentColor={color}
      className={cn(
        isPast && !isCancelled && !isPostponed && "opacity-80",
        isCancelled && "border-danger/30 bg-danger/5",
        isPostponed && "bg-paper/50",
        className,
      )}
    >
      {body}
    </Card>
  );
}

export function CalendarEmptyState({
  message,
  icon,
  cta,
}: {
  message: string;
  icon?: React.ReactNode;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="border-ink-300 bg-paper/50 flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 text-center">
      <div className="bg-pool-foam text-ink-600 flex h-12 w-12 items-center justify-center rounded-full">
        {icon ?? <Calendar className="h-5 w-5" />}
      </div>
      <p className="text-ink-900 text-sm font-semibold">{message}</p>
      {cta ? (
        <Link
          href={cta.href as Route}
          className="bg-pool-deep text-paper hover:bg-ink-900 focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center gap-1.5 rounded-xl px-4 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}

export function CalendarAlert({
  variant = "info",
  message,
}: {
  variant?: "info" | "warning" | "error";
  message: string;
}) {
  const styles = {
    info: "border-pool-teal/30 bg-pool-teal/10 text-pool-deep",
    warning: "border-warning/20 bg-warning/5 text-warning",
    error: "border-danger/20 bg-danger/5 text-danger",
  };
  return (
    <div
      role="status"
      className={cn("flex items-start gap-2 rounded-md border p-2.5 text-xs", styles[variant])}
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p className="flex-1">{message}</p>
    </div>
  );
}
