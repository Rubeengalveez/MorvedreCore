"use client";

import { Clock, MapPin, Calendar, Users, X, ChevronRight, AlertCircle, Check } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Avatar } from "@/components/ui/avatar";
import { CapTile } from "@/components/ui/cap-tile";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { cn } from "@/lib/utils/cn";
import { matchColor, trainingColor } from "@/lib/domain/event-colors";
import { Gorro, SilbatoActivo } from "@/components/brand/pictograms";

export interface CalendarEventBase {
  id: string;
  kind: "training" | "match";
  scheduled_at: string;
  team_label: string;
  team_color: string;
  cancelled?: boolean;
  status?: string;
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(startIso: string, durationMinutes: number): string {
  const end = new Date(new Date(startIso).getTime() + durationMinutes * 60000);
  return `${formatTime(startIso)}–${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
}

export function CalendarEventChip({ event, size = "sm", className }: {
  event: CalendarEventBase & { title: string };
  size?: "sm" | "md";
  className?: string;
}) {
  const color = event.kind === "match"
    ? matchColor({ competitionType: (event as { competition_type?: string }).competition_type ?? "league", status: event.status ?? "scheduled", isPast: false, unavailable: false })
    : trainingColor({ cancelled: !!event.cancelled, isPast: false, unavailable: false });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 text-paper font-semibold leading-none",
        size === "sm" ? "h-4 text-[9px]" : "h-5 text-[10px]",
        event.cancelled && "opacity-50 line-through",
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {formatTime(event.scheduled_at)}
      <span className="truncate">{event.title}</span>
    </span>
  );
}

function Badge({
  children,
  bg,
  className,
}: {
  children: React.ReactNode;
  bg: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm px-2 text-eyebrow text-paper",
        className,
      )}
      style={{ backgroundColor: bg }}
    >
      {children}
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
                  <Badge bg="var(--action)">Torneo</Badge>
                ) : event.competition_type === "friendly" ? (
                  <Badge bg="var(--pool-teal)">Amistoso</Badge>
                ) : (
                  <Badge bg="var(--ball-gold)">Liga/Copa</Badge>
                )
              ) : (
                <Badge bg="var(--pool-blue)">Entreno</Badge>
              )}
              {isCancelled ? <Badge bg="var(--danger)">Cancelado</Badge> : null}
              {isPostponed ? <Badge bg="var(--ink-600)">Aplazado</Badge> : null}
              {showAttendance && userAttendance === true ? (
                <Badge bg="var(--success)">
                  <Check className="h-2.5 w-2.5" /> Asististe
                </Badge>
              ) : null}
              {showAttendance && userAttendance === false ? (
                <span className="inline-flex h-5 items-center gap-0.5 rounded-sm bg-danger/10 px-2 text-eyebrow text-danger">
                  <X className="h-2.5 w-2.5" /> No asististe
              </span>
              ) : null}
            </div>
            <p
              className={cn(
                "mt-1 font-display text-sm font-extrabold leading-tight text-pool-deep",
                isPast && "opacity-80",
                isCancelled && "line-through opacity-60",
              )}
            >
              {event.title}
            </p>
            {event.subtitle ? (
              <p className="text-[11px] text-ink-600">{event.subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      {event.callup_name ? (
        <div
          className="flex items-center gap-2 rounded-md border border-ink-300 bg-pool-foam/40 p-2"
          style={{ borderLeftWidth: "3px", borderLeftColor: color }}
        >
          {event.callup_cap_number != null ? (
            <CapTile
              number={event.callup_cap_number}
              teamColor={event.callup_team_color ?? color}
              size="sm"
            />
          ) : (
            <Avatar
              src={event.callup_photo_url ?? null}
              name={event.callup_name}
              size={28}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-xs font-semibold text-pool-deep">
              {event.callup_name}
            </p>
            {event.callup_status ? (
              <Eyebrow tone="muted">
                {event.callup_status === "confirmed" ? "Confirmado" : "Convocado"}
              </Eyebrow>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink-300 pt-2 text-[11px] text-ink-600">
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
  const color = event.kind === "match"
    ? matchColor({ competitionType: event.competition_type ?? "league", status: event.status ?? "scheduled", isPast: !!isPast, unavailable: false })
    : trainingColor({ cancelled: !!event.cancelled, isPast: !!isPast, unavailable: false });
  const timeStr = event.duration_minutes
    ? formatDuration(event.scheduled_at, event.duration_minutes)
    : formatTime(event.scheduled_at);
  const isCancelled = !!event.cancelled || event.status === "cancelled";
  const isPostponed = event.status === "postponed";
  const baseClass = cn(
    "group flex flex-col gap-2 rounded-md border bg-paper-card p-3 transition-colors shadow-elev-1",
    isPast && !isCancelled && !isPostponed && "border-ink-300 opacity-80",
    isCancelled && "border-danger/30 bg-danger/5",
    isPostponed && "border-ink-300 bg-paper/50",
    !isPast && !isCancelled && !isPostponed && "border-ink-300",
    href && "hover:border-pool-blue hover:shadow-elev-2",
    className,
  );
  const body = (
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
  );
  if (href) {
    return (
      <Link href={href as Route} className={baseClass}>
        {body}
        <div className="-mt-1 -mb-1 self-end text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-600">
          <ChevronRight className="h-4 w-4" />
        </div>
      </Link>
    );
  }
  return <div className={baseClass}>{body}</div>;
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
    <div className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-ink-300 bg-paper/50 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pool-foam text-ink-600">
        {icon ?? <Calendar className="h-5 w-5" />}
      </div>
      <p className="text-sm font-semibold text-ink-900">{message}</p>
      {cta ? (
        <Link
          href={cta.href as Route}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-pool-deep px-3 text-xs font-bold text-paper transition-colors hover:bg-ink-900"
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
      className={cn(
        "flex items-start gap-2 rounded-md border p-2.5 text-xs",
        styles[variant],
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <p className="flex-1">{message}</p>
    </div>
  );
}
