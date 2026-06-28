"use client";

import { Clock, MapPin, Users, Calendar, ChevronRight, Bell } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Avatar } from "@/components/ui/avatar";
import { CapTile } from "@/components/ui/cap-tile";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LanePattern } from "@/components/ui/lane-pattern";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Equipo, Gorro, Porteria, SilbatoActivo } from "@/components/brand/pictograms";
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
      <LanePattern className="border-ink-300 bg-paper-card shadow-elev-1 rounded-md border p-4">
        <div className="flex items-center gap-4">
          <PictogramBadge
            pictogram={CalendarioEmpty}
            color="var(--pool-teal)"
            size="md"
            ariaLabel="Sin eventos"
          />
          <div className="flex-1">
            <p className="font-display text-pool-deep text-base font-bold">Sin eventos próximos</p>
            <p className="text-ink-600 text-xs">Tu calendario está vacío esta semana</p>
          </div>
        </div>
      </LanePattern>
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
      className="group shadow-elev-2 hover:shadow-elev-3 block overflow-hidden rounded-md border-2 transition-shadow"
      style={{
        borderColor: event.team_color,
        backgroundColor: `color-mix(in oklab, ${event.team_color} 5%, var(--paper))`,
      }}
    >
      <div
        aria-hidden="true"
        className="h-1 w-full"
        style={{ backgroundColor: event.team_color }}
      />
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-eyebrow text-paper inline-flex h-5 items-center rounded-sm px-1.5"
              style={{ backgroundColor: event.team_color }}
            >
              {isMatch ? "Partido" : "Entreno"}
            </span>
            {event.is_today ? (
              <span className="bg-action text-eyebrow text-paper inline-flex h-5 items-center rounded-sm px-1.5">
                Hoy
              </span>
            ) : event.is_tomorrow ? (
              <span className="bg-ink-900 text-eyebrow text-paper inline-flex h-5 items-center rounded-sm px-1.5">
                Mañana
              </span>
            ) : null}
            <span className="text-eyebrow text-ink-600">
              {formatDayShort(event.scheduled_at, now)}
            </span>
          </div>
          <h2 className="font-display text-pool-deep text-xl leading-tight font-extrabold sm:text-2xl">
            {event.title}
          </h2>
          <div className="text-ink-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(event.scheduled_at)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.team_label}
            </span>
            {hours > 0 ? (
              <span className="text-pool-deep inline-flex items-center gap-1 font-semibold">
                {formatRelative(event.scheduled_at, now)}
              </span>
            ) : null}
          </div>
        </div>
        <PictogramBadge
          pictogram={isMatch ? Gorro : SilbatoActivo}
          color={event.team_color}
          size="lg"
        />
        <ChevronRight className="text-ink-600 h-6 w-6 shrink-0 self-center transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function CalendarioEmpty({ className }: { className?: string }) {
  return <Calendar className={className ?? "h-5 w-5"} aria-hidden="true" />;
}

export function TeamCard({ team }: { team: DashboardTeamInfo }) {
  const categoryLabel = CATEGORY_LABELS[team.category_code as CategoryCode] ?? team.category_code;
  return (
    <Link
      href={`/team/${team.id}` as Route}
      data-team-card
      className="group border-ink-300 bg-paper-card shadow-elev-1 hover:shadow-elev-3 block overflow-hidden rounded-md border transition-shadow"
    >
      <div aria-hidden="true" className="h-1.5 w-full" style={{ backgroundColor: team.color }} />
      <LanePattern className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Eyebrow>{categoryLabel}</Eyebrow>
            <h3 className="font-display text-pool-deep mt-0.5 text-2xl leading-tight font-extrabold">
              {team.label}
            </h3>
          </div>
          <PictogramBadge pictogram={Equipo} color={team.color} size="lg" />
        </div>
        <div className="border-ink-300 mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-xs">
          <span className="text-ink-600 inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="text-ink-900 font-bold">{team.player_count}</span> jugadores
          </span>
          {team.coach_name ? (
            <span className="text-ink-600 inline-flex items-center gap-1">
              <span className="text-ink-900 font-bold">{team.coach_name}</span>
            </span>
          ) : null}
        </div>
        {team.next_training || team.next_match ? (
          <div className="border-ink-300 mt-3 space-y-1 border-t pt-3 text-xs">
            {team.next_training ? (
              <p className="text-ink-600 flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--pool-blue)" }}
                />
                <span>
                  Próximo entreno{" "}
                  <span className="text-ink-900 font-bold">
                    {formatDayShort(team.next_training, new Date())}{" "}
                    {formatTime(team.next_training)}
                  </span>
                </span>
              </p>
            ) : null}
            {team.next_match ? (
              <p className="text-ink-600 flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--action)" }}
                />
                <span>
                  Próximo partido{" "}
                  <span className="text-ink-900 font-bold">
                    {formatDayShort(team.next_match, new Date())} {formatTime(team.next_match)}
                  </span>
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
      </LanePattern>
    </Link>
  );
}

export function DashboardHero({
  profile,
  now,
  unreadNotifications,
  isAdmin,
  hasTeam,
  nextEvent,
  capNumber,
}: {
  profile: { full_name: string; team_color: string | null };
  now: Date;
  unreadNotifications: number;
  isAdmin: boolean;
  hasTeam: boolean;
  nextEvent: DashboardWeekEvent | null;
  capNumber?: number | null;
}) {
  const hour = now.getHours();
  const baseGreeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const firstName = profile.full_name.split(" ")[0] ?? profile.full_name;
  const todayIso = now.toISOString().slice(0, 10);
  const isToday = nextEvent?.date === todayIso;
  const greeting =
    isToday && nextEvent
      ? `${baseGreeting}, ${firstName}. Hoy tienes ${nextEvent.kind === "match" ? "partido" : "entreno"}.`
      : `${baseGreeting}, ${firstName}.`;
  const teamColor = profile.team_color ?? "var(--pool-blue)";
  return (
    <LanePattern
      className="border-ink-300 bg-paper-card shadow-elev-2 overflow-hidden rounded-md border"
      strong
    >
      <div aria-hidden="true" className="h-1.5 w-full" style={{ backgroundColor: teamColor }} />
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={profile.full_name} src={null} size={64} teamColor={teamColor} />
          <div className="min-w-0">
            <Eyebrow>{baseGreeting}</Eyebrow>
            <h1 className="font-display text-pool-deep text-2xl leading-tight font-extrabold sm:text-3xl">
              {firstName}
            </h1>
            <p className="text-ink-600 text-xs">{greeting}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {capNumber != null && hasTeam ? (
            <CapTile number={capNumber} teamColor={teamColor} size="md" isMe />
          ) : null}
          {isAdmin ? (
            <Link
              href={"/admin" as Route}
              data-admin-link
              className="bg-pool-deep text-paper hover:bg-ink-900 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-bold transition-colors"
            >
              <PictogramBadge pictogram={Porteria} color="var(--ball-gold)" size="sm" />
              Panel admin
            </Link>
          ) : null}
          <Link
            href={"/notifications" as Route}
            data-notifications-link
            className="border-ink-300 bg-paper-card hover:bg-pool-foam relative inline-flex h-11 w-11 items-center justify-center rounded-md border transition-colors"
            aria-label={`Notificaciones${unreadNotifications > 0 ? ` (${unreadNotifications} sin leer)` : ""}`}
          >
            <Bell className="text-ink-900 h-5 w-5" />
            {unreadNotifications > 0 ? (
              <span
                aria-hidden="true"
                className="bg-action text-paper absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-extrabold"
              >
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </LanePattern>
  );
}
