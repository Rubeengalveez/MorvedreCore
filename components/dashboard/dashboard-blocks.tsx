"use client";

import { Clock, MapPin, Users as UsersInline, Calendar, Bell } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { CapTile } from "@/components/ui/cap-tile";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Equipo, Gorro, SilbatoActivo } from "@/components/brand/pictograms";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";

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

export interface DashboardTeamInfo {
  id: string;
  label: string;
  category_code: string;
  color: string;
  player_count: number;
  coach_name: string | null;
  next_training: string | null;
  next_match: string | null;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDayShort(iso: string, now: Date): string {
  const d = new Date(iso);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return days[d.getDay()] ?? "";
}
void formatDayShort;

function formatRelative(iso: string, now: Date): string {
  const then = new Date(iso);
  const diffMs = then.getTime() - now.getTime();
  const diffH = Math.round(diffMs / (1000 * 60 * 60));
  if (diffH < 0) return "hace " + Math.abs(diffH) + "h";
  if (diffH < 1) return "ahora";
  if (diffH < 24) return "en " + diffH + "h";
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return "en " + diffD + "d";
  return "hace " + Math.round(diffD / 7) + "sem";
}

export function NextEventCard({ event, now }: { event: DashboardWeekEvent | null; now: Date }) {
  if (!event) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed border-ink-300 bg-paper-card px-4 py-3">
        <Calendar className="h-5 w-5 shrink-0 text-ink-400" aria-hidden="true" />
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
      className="group block overflow-hidden rounded-md border border-ink-200 bg-paper-card transition-shadow hover:shadow-md"
      style={{ borderLeftWidth: "3px", borderLeftColor: event.team_color }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
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
              <span className="truncate max-w-[120px]">{event.team_label}</span>
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

export function TeamCard({ team }: { team: DashboardTeamInfo }) {
  const categoryLabel = CATEGORY_LABELS[team.category_code as CategoryCode] ?? team.category_code;
  return (
    <Link
      href={`/team/${team.id}` as Route}
      data-team-card
      className="group block overflow-hidden rounded-md border border-ink-200 bg-paper-card transition-shadow hover:shadow-md"
      style={{ borderTopWidth: "3px", borderTopColor: team.color }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <PictogramBadge pictogram={Equipo} color={team.color} size="md" />
        <div className="min-w-0 flex-1">
          <Eyebrow className="mb-0.5">{categoryLabel}</Eyebrow>
          <p className="font-display text-base font-extrabold leading-tight text-pool-deep line-clamp-1">
            {team.label}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-600">
            <span className="inline-flex items-center gap-1">
              <UsersInline className="h-3 w-3 shrink-0" />
              <span>{team.player_count} jugadores</span>
            </span>
            {team.coach_name ? (
              <span className="truncate">{team.coach_name}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function DashboardHero({
  profile,
  unreadNotifications,
  hasTeam,
  capNumber,
}: {
  profile: { full_name: string; team_color: string | null };
  unreadNotifications: number;
  hasTeam: boolean;
  capNumber?: number | null;
}) {
  const hour = new Date().getHours();
  const baseGreeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const firstName = profile.full_name.split(" ")[0] ?? profile.full_name;
  const teamColor = profile.team_color ?? "var(--pool-blue)";

  return (
    <div
      className="overflow-hidden rounded-md border border-ink-200 bg-paper-card"
      style={{ borderTopWidth: "3px", borderTopColor: teamColor }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-400">{baseGreeting}</p>
          <h1 className="font-display text-xl font-extrabold leading-tight tracking-tight text-pool-deep truncate">
            {firstName}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {capNumber != null && hasTeam ? (
            <CapTile number={capNumber} teamColor={teamColor} size="md" isMe />
          ) : null}
          <Link
            href={"/notifications" as Route}
            data-notifications-link
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-paper hover:bg-pool-foam transition-colors"
            aria-label={`Notificaciones${unreadNotifications > 0 ? ` (${unreadNotifications} sin leer)` : ""}`}
          >
            <Bell className="h-4 w-4 text-ink-600" />
            {unreadNotifications > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-pool-blue px-0.5 text-[9px] font-extrabold leading-none text-paper"
              >
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </div>
  );
}
