"use client";

import { Calendar, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { CapTile } from "@/components/ui/cap-tile";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Gorro, SilbatoActivo } from "@/components/brand/pictograms";
import { formatRelativeUpcoming, formatTimeOfDay } from "@/lib/domain/calendar";

export interface DashboardWeekEvent {
  id: string;
  kind: "training" | "match";
  date: string;
  scheduled_at: string;
  duration_minutes?: number;
  title: string;
  team_label: string;
  team_color: string;
  cancelled: boolean;
  status: string;
  is_today: boolean;
  is_tomorrow: boolean;
}

export function NextEventCard({ event, now }: { event: DashboardWeekEvent | null; now: Date }) {
  if (!event) {
    return (
      <div className="border-ink-300 bg-paper-card flex min-h-[72px] items-center gap-3 rounded-md border border-dashed px-3 py-3">
        <Calendar className="text-ink-400 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-ink-700 text-base font-extrabold">Sin eventos proximos</p>
          <p className="text-ink-500 text-sm">Tu calendario esta vacio esta semana</p>
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
      className="group border-ink-300 bg-paper-card shadow-elev-2 hover:shadow-elev-3 block overflow-hidden rounded-md border transition-shadow"
      style={{ borderLeftWidth: "4px", borderLeftColor: event.team_color }}
    >
      <div className="flex items-center gap-3 px-3 py-3.5">
        <PictogramBadge
          pictogram={isMatch ? Gorro : SilbatoActivo}
          color={event.team_color}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span
              className="text-paper inline-flex min-h-6 items-center rounded-sm px-2 text-xs font-extrabold tracking-[0.08em] uppercase"
              style={{ backgroundColor: event.team_color }}
            >
              {isMatch ? "Partido" : "Entreno"}
            </span>
            {event.is_today ? (
              <span className="bg-pool-deep text-paper inline-flex min-h-6 items-center rounded-sm px-2 text-xs font-extrabold tracking-[0.08em] uppercase">
                Hoy
              </span>
            ) : event.is_tomorrow ? (
              <span className="bg-ink-700 text-paper inline-flex min-h-6 items-center rounded-sm px-2 text-xs font-extrabold tracking-[0.08em] uppercase">
                Manana
              </span>
            ) : null}
          </div>
          <p className="font-display text-pool-deep line-clamp-1 text-lg leading-tight font-extrabold">
            {event.title}
          </p>
          <div className="text-ink-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4 shrink-0" />
              {formatTimeOfDay(event.scheduled_at)}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="max-w-[150px] truncate">{event.team_label}</span>
            </span>
            {hours > 0 ? (
              <span className="text-pool-blue font-extrabold">
                {formatRelativeUpcoming(event.scheduled_at, now)}
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
  const baseGreeting = hour < 12 ? "Buenos dias" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const firstName = profile.full_name.split(" ")[0] ?? profile.full_name;
  const teamColor = profile.team_color ?? "var(--pool-blue)";

  return (
    <div
      className="bg-pool-deep text-paper shadow-elev-3 relative overflow-hidden rounded-md px-4 py-4"
      style={{ borderTop: `3px solid ${teamColor}` }}
    >
      <div className="absolute inset-x-0 bottom-0 h-1 bg-[linear-gradient(90deg,var(--pool-blue),var(--ball-gold),var(--action))]" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-paper/62 text-xs font-extrabold tracking-[0.08em] uppercase">
            {baseGreeting}
          </p>
          <h1 className="font-display text-paper mt-1 truncate text-[2rem] leading-none font-extrabold">
            {firstName}
          </h1>
          <p className="text-paper/72 mt-2 text-sm leading-snug font-semibold">
            Club, calendario y temporada en un vistazo
          </p>
        </div>
        {capNumber != null && hasTeam ? (
          <div className="shrink-0">
            <CapTile number={capNumber} teamColor={teamColor} size="md" isMe />
          </div>
        ) : null}
      </div>
    </div>
  );
}
