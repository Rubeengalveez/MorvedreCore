"use client";

import { Clock, MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { CapTile } from "@/components/ui/cap-tile";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Gorro, SilbatoActivo } from "@/components/brand/pictograms";

export interface DashboardWeekEvent {
  id: string;
  kind: "training" | "match";
  date: string;
  scheduled_at: string;
  title: string;
  team_label: string;
  team_color: string;
  cancelled: boolean;
  status: string;
  is_today: boolean;
  is_tomorrow: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatRelative(iso: string, now: Date): string {
  const then = new Date(iso);
  const diffMs = then.getTime() - now.getTime();
  const diffH = Math.round(diffMs / (1000 * 60 * 60));
  if (diffH < 0) return "hace " + Math.abs(diffH) + "h";
  if (diffH < 1) return "ahora";
  if (diffH < 24) return "en " + diffH + "h";
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return "en " + diffD + "d";
  return "en " + Math.round(diffD / 7) + "sem";
}

export function NextEventCard({ event, now }: { event: DashboardWeekEvent | null; now: Date }) {
  if (!event) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed border-ink-300 bg-paper-card px-3 py-3">
        <Calendar className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-ink-700">Sin eventos próximos</p>
          <p className="text-xs text-ink-400">Tu calendario está vacío esta semana</p>
        </div>
      </div>
    );
  }
  const isMatch = event.kind === "match";
  const eventDate = new Date(event.scheduled_at);
  const hours = Math.round((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <Link
      href={isMatch ? (`/matches/${event.id}` as Route) : ("/calendar" as Route)}
      data-next-event
      data-event-kind={event.kind}
      className="group block overflow-hidden rounded-md border border-ink-300 bg-paper-card transition-shadow hover:shadow-elev-2"
      style={{ borderLeftWidth: "3px", borderLeftColor: event.team_color }}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="shrink-0">
          <PictogramBadge
            pictogram={isMatch ? Gorro : SilbatoActivo}
            color={event.team_color}
            size="md"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span
              className="text-eyebrow inline-flex h-4 items-center rounded-sm px-1.5 text-paper"
              style={{ backgroundColor: event.team_color }}
            >
              {isMatch ? "Partido" : "Entreno"}
            </span>
            {event.is_today ? (
              <span className="text-eyebrow inline-flex h-4 items-center rounded-sm bg-pool-deep px-1.5 text-paper">
                Hoy
              </span>
            ) : event.is_tomorrow ? (
              <span className="text-eyebrow inline-flex h-4 items-center rounded-sm bg-ink-700 px-1.5 text-paper">
                Mañana
              </span>
            ) : null}
          </div>
          <p className="font-display text-base font-extrabold leading-tight text-pool-deep line-clamp-1">
            {event.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-600">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {formatTime(event.scheduled_at)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[140px]">{event.team_label}</span>
            </span>
            {hours > 0 ? (
              <span className="font-semibold text-pool-blue">
                {formatRelative(event.scheduled_at, now)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function DashboardHero({
  profile,
  hasTeam,
  capNumber,
}: {
  profile: { full_name: string; team_color: string | null };
  hasTeam: boolean;
  capNumber?: number | null;
}) {
  const hour = new Date().getHours();
  const baseGreeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const firstName = profile.full_name.split(" ")[0] ?? profile.full_name;
  const teamColor = profile.team_color ?? "var(--pool-blue)";

  return (
    <div
      className="flex items-center justify-between gap-3 overflow-hidden rounded-md border border-ink-300 bg-paper-card px-3 py-3"
      style={{ borderLeftWidth: "3px", borderLeftColor: teamColor }}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-400">{baseGreeting}</p>
        <h1 className="font-display text-xl font-extrabold leading-tight tracking-tight text-pool-deep truncate">
          {firstName}
        </h1>
      </div>
      {capNumber != null && hasTeam ? (
        <div className="shrink-0">
          <CapTile number={capNumber} teamColor={teamColor} size="md" isMe />
        </div>
      ) : null}
    </div>
  );
}
