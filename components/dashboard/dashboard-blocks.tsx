"use client";

import {
  Clock,
  MapPin,
  Users,
  Calendar,
  ChevronRight,
  Trophy,
  Check,
  Minus,
  TrendingDown,
  Sparkles,
  Activity,
  Bell,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Avatar } from "@/components/ui/avatar";
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

export interface DashboardActivity {
  id: string;
  kind: "training" | "match" | "team" | "season";
  title: string;
  subtitle: string;
  result: "win" | "draw" | "loss" | "scheduled" | "training";
  color: string;
  timestamp: string;
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

export function NextEventCard({
  event,
  now,
}: {
  event: DashboardWeekEvent | null;
  now: Date;
}) {
  if (!event) {
    return (
      <div className="flex items-center gap-4 rounded-lg border border-ink-300 bg-paper p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-foam">
          <Calendar className="h-6 w-6 text-ink-600" />
        </div>
        <div className="flex-1">
          <p className="font-display text-sm font-bold text-ink-900">Sin eventos próximos</p>
          <p className="text-xs text-ink-600">Tu calendario está vacío esta semana</p>
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
      className="group block rounded-lg border-2 p-4 transition-all hover:shadow-md"
      style={{
        borderColor: event.team_color,
        backgroundColor: `color-mix(in oklab, ${event.team_color} 6%, var(--paper))`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wider text-paper"
              style={{ backgroundColor: event.team_color }}
            >
              {isMatch ? "Partido" : "Entreno"}
            </span>
            {event.is_today ? (
              <span className="inline-flex h-6 items-center rounded-full bg-brand-action px-2.5 text-[11px] font-bold uppercase tracking-wider text-paper">
                Hoy
              </span>
            ) : event.is_tomorrow ? (
              <span className="inline-flex h-6 items-center rounded-full bg-ink-900 px-2.5 text-[11px] font-bold uppercase tracking-wider text-paper">
                Mañana
              </span>
            ) : null}
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-600">
              {formatDayShort(event.scheduled_at, now)}
            </span>
          </div>
          <h2 className="font-display text-xl font-extrabold leading-tight text-brand-deep sm:text-2xl">
            {event.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(event.scheduled_at)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.team_label}
            </span>
            {hours > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-brand-deep">
                <Sparkles className="h-3.5 w-3.5" />
                {formatRelative(event.scheduled_at, now)}
              </span>
            ) : null}
          </div>
        </div>
        <ChevronRight className="h-6 w-6 shrink-0 text-ink-600 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export function TeamCard({ team }: { team: DashboardTeamInfo }) {
  const categoryLabel = CATEGORY_LABELS[team.category_code as CategoryCode] ?? team.category_code;
  return (
    <Link
      href={`/team/${team.id}` as Route}
      className="group block overflow-hidden rounded-lg border border-ink-300 bg-paper transition-all hover:shadow-md"
    >
      <div className="h-2" style={{ backgroundColor: team.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
              {categoryLabel}
            </p>
            <h3 className="mt-0.5 font-display text-2xl font-extrabold leading-tight text-brand-deep">
              {team.label}
            </h3>
          </div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-md text-paper"
            style={{ backgroundColor: team.color }}
          >
            <Users className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-ink-300 pt-3 text-xs">
          <span className="inline-flex items-center gap-1 text-ink-600">
            <Users className="h-3.5 w-3.5" />
            <span className="font-bold text-ink-900">{team.player_count}</span> jugadores
          </span>
          {team.coach_name ? (
            <span className="inline-flex items-center gap-1 text-ink-600">
              <span className="font-bold text-ink-900">{team.coach_name}</span>
            </span>
          ) : null}
        </div>
        {(team.next_training || team.next_match) ? (
          <div className="mt-3 space-y-1 border-t border-ink-300 pt-3 text-xs">
            {team.next_training ? (
              <p className="flex items-center gap-1.5 text-ink-600">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--brand-blue)" }}
                />
                <span>
                  Próximo entreno{" "}
                  <span className="font-bold text-ink-900">
                    {formatDayShort(team.next_training, new Date())} {formatTime(team.next_training)}
                  </span>
                </span>
              </p>
            ) : null}
            {team.next_match ? (
              <p className="flex items-center gap-1.5 text-ink-600">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--brand-action)" }}
                />
                <span>
                  Próximo partido{" "}
                  <span className="font-bold text-ink-900">
                    {formatDayShort(team.next_match, new Date())} {formatTime(team.next_match)}
                  </span>
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function WeekEventCard({
  event,
  now,
}: {
  event: DashboardWeekEvent;
  now: Date;
}) {
  const isMatch = event.kind === "match";
  const accent = isMatch ? "var(--brand-action)" : "var(--brand-blue)";
  return (
    <Link
      href={isMatch ? (`/matches/${event.id}` as Route) : ("/calendar" as Route)}
      className="flex shrink-0 flex-col gap-1 rounded-md border border-ink-300 bg-paper p-3 transition-all hover:border-brand-blue hover:shadow-sm"
      style={{ minWidth: 180 }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
          {formatDayShort(event.scheduled_at, now)} {formatTime(event.scheduled_at)}
        </span>
        {event.cancelled ? (
          <span className="inline-flex h-4 items-center rounded bg-danger/10 px-1.5 text-[9px] font-bold uppercase tracking-wider text-danger">
            Cancelado
          </span>
        ) : null}
      </div>
      <p className="line-clamp-2 font-display text-sm font-bold leading-tight text-brand-deep">
        {event.title}
      </p>
      <p className="line-clamp-1 text-[11px] text-ink-600">{event.team_label}</p>
    </Link>
  );
}

export function ActivityItem({ activity }: { activity: DashboardActivity }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `color-mix(in oklab, ${activity.color} 15%, var(--paper))` }}
      >
        <ActivityIcon result={activity.result} color={activity.color} />
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-semibold leading-tight text-ink-900">
          {activity.title}
        </p>
        <p className="text-[11px] text-ink-600">{activity.subtitle}</p>
      </div>
    </div>
  );
}

function ActivityIcon({
  result,
  color,
}: {
  result: DashboardActivity["result"];
  color: string;
}) {
  if (result === "win") return <Trophy className="h-3.5 w-3.5" style={{ color }} />;
  if (result === "draw") return <Minus className="h-3.5 w-3.5" style={{ color }} />;
  if (result === "loss") return <TrendingDown className="h-3.5 w-3.5" style={{ color }} />;
  if (result === "training") return <Check className="h-3.5 w-3.5" style={{ color }} />;
  return <Calendar className="h-3.5 w-3.5" style={{ color }} />;
}

export function DashboardHero({
  profile,
  now,
  unreadNotifications,
  isAdmin,
  hasTeam,
  nextEvent,
}: {
  profile: { full_name: string; team_color: string | null };
  now: Date;
  unreadNotifications: number;
  isAdmin: boolean;
  hasTeam: boolean;
  nextEvent: DashboardWeekEvent | null;
}) {
  const hour = now.getHours();
  const baseGreeting =
    hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const firstName = profile.full_name.split(" ")[0] ?? profile.full_name;
  const todayIso = now.toISOString().slice(0, 10);
  const isToday = nextEvent?.date === todayIso;
  const greeting = isToday && nextEvent
    ? `${baseGreeting}, ${firstName}. Hoy tienes ${nextEvent.kind === "match" ? "partido" : "entreno"}.`
    : `${baseGreeting}, ${firstName}.`;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ink-300 bg-paper p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Avatar
          name={profile.full_name}
          src={null}
          size={56}
          style={profile.team_color ? { backgroundColor: profile.team_color, color: "white" } : undefined}
        />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
            {baseGreeting}
          </p>
          <h1 className="font-display text-2xl font-extrabold leading-tight text-brand-deep sm:text-3xl">
            {firstName}
          </h1>
          <p className="text-xs text-ink-600">{greeting}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <Link
            href={"/admin" as Route}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-deep px-4 text-sm font-bold text-paper transition-colors hover:bg-ink-900"
          >
            <Activity className="h-4 w-4" />
            Panel admin
          </Link>
        ) : null}
        <Link
          href={"/notifications" as Route}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-ink-300 bg-paper transition-colors hover:bg-brand-foam"
          aria-label={`Notificaciones${unreadNotifications > 0 ? ` (${unreadNotifications} sin leer)` : ""}`}
        >
          <Bell className="h-5 w-5 text-ink-900" />
          {unreadNotifications > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-action px-1 text-[10px] font-bold leading-none text-brand-deep"
            >
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          ) : null}
        </Link>
        {hasTeam ? (
          <Link
            href={"/calendar" as Route}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-ink-300 bg-paper px-4 text-sm font-bold text-ink-900 transition-colors hover:bg-brand-foam"
          >
            <Calendar className="h-4 w-4" />
            Calendario
          </Link>
        ) : null}
      </div>
    </div>
  );
}
