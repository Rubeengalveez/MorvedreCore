import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Activity, Trophy, Target, Settings, LogOut, ChevronRight, Award, TrendingUp, Users } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AvailabilityCalendar, type AvailabilityDay } from "@/components/profile/availability-calendar";
import { CalendarEventCard } from "@/components/calendar/event-card";
import { todayIso, addDaysIso } from "@/lib/domain/calendar";
import {
  CATEGORY_LABELS,
  inferCategory,
  type CategoryCode,
} from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/server/actions/auth";
import { computePlayerStats } from "@/lib/domain/stats";
import { getNextEventForProfile, type NextEvent } from "@/server/queries/calendar";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tu perfil — Morvedre Core",
  description: "Edita tus datos de jugador y contacto.",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Entrenador",
  delegate: "Delegado",
  directiva: "Directiva",
  parent: "Tutor",
  player: "Jugador",
};

const ROLE_PRIORITY: Record<string, number> = {
  admin: 0,
  directiva: 1,
  coach: 2,
  delegate: 3,
  player: 4,
  parent: 5,
};

function extractYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function extractJoined<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

type ProfileStat = {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone: "default" | "positive" | "muted";
  color: string;
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { activeProfile, ownProfile } = ctx;

  const season = await supabase
    .from("seasons")
    .select("id, is_current")
    .eq("is_current", true)
    .maybeSingle();
  const seasonId = season.data?.id ?? null;

  const ownProfileRoles = await supabase
    .from("user_roles")
    .select("role, scope_team_id")
    .eq("profile_id", ownProfile.id);

  const roles = ((ownProfileRoles.data ?? []) as Array<{ role: string; scope_team_id: string | null }>)
    .map((r) => r.role)
    .filter((r) => r in ROLE_LABELS)
    .sort((a, b) => (ROLE_PRIORITY[a] ?? 99) - (ROLE_PRIORITY[b] ?? 99));

  const isAdmin = roles.includes("admin");
  const isPlayer = roles.includes("player");

  const teams = seasonId
    ? await getTeamsForProfileInSeason(activeProfile.id, seasonId)
    : [];

  const teamIds = teams.map((t) => t.id);
  const primaryTeam = teams[0] ?? null;

  const teamColor = activeProfile.team_color ?? primaryTeam?.color ?? "var(--brand-blue)";
  const primaryRole = roles[0] ?? null;

  const now = new Date();
  const today = todayIso();
  const monthAhead = addDaysIso(today, 30);
  const oneYearAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString();
  const [availabilityData, attendanceData, allMatches, allSessions, callupsData] = await Promise.all([
    supabase
      .from("match_availability")
      .select("date, available, reason")
      .eq("player_id", activeProfile.id)
      .gte("date", today)
      .lte("date", monthAhead),
    supabase
      .from("training_attendance")
      .select("session_id, present, marked_at")
      .eq("player_id", activeProfile.id)
      .gte("marked_at", oneYearAgo),
    supabase
      .from("matches")
      .select("id, scheduled_at, status, opponent, final_score_us, final_score_them, teams!matches_team_id_fkey(label, color)")
      .in("team_id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"])
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: false })
      .limit(20),
    supabase
      .from("training_sessions")
      .select("id, scheduled_at, cancelled, teams!training_sessions_team_id_fkey(label, color)")
      .in("team_id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"])
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: false })
      .limit(20),
    supabase
      .from("match_callups")
      .select("match_id, status")
      .eq("player_id", activeProfile.id)
      .gte("created_at", oneYearAgo),
  ]);

  const nextEvent: NextEvent | null = teamIds.length > 0
    ? await getNextEventForProfile({ teamIds, profileId: activeProfile.id, now })
    : null;

  const availability: AvailabilityDay[] = ((availabilityData.data ?? []) as Array<{ date: string; available: boolean; reason: string | null }>).map((row) => ({
    iso: row.date,
    available: row.available,
    reason: row.reason,
  }));

  const attendedSessionIds = new Set(
    ((attendanceData.data ?? []) as Array<{ session_id: string; present: boolean }>)
      .filter((a) => a.present)
      .map((a) => a.session_id),
  );

  const playerStats = computePlayerStats(
    activeProfile.id,
    seasonId ?? "",
    ((allSessions.data ?? []) as unknown as Array<{ id: string; team_id: string; cancelled: boolean; scheduled_at: string }>),
    ((attendanceData.data ?? []) as unknown as Array<{ session_id: string; player_id: string; present: boolean }>),
    ((allMatches.data ?? []) as unknown as Array<{ id: string; team_id: string; status: "scheduled" | "in_progress" | "played" | "cancelled" | "postponed"; scheduled_at: string; final_score_us: number | null; final_score_them: number | null; season_id: string }>),
    ((callupsData.data ?? []) as unknown as Array<{ match_id: string; player_id: string; status: "called" | "confirmed" | "declined" | "withdrawn" | "no_show" }>),
    [] as Array<{ match_id: string; player_id: string; goals: number; exclusions: number; mvp: boolean }>,
  );

  const birthYear = extractYear(activeProfile.birth_year);
  let categoryLabel: string | null = null;
  if (birthYear != null) {
    try {
      categoryLabel = inferCategory(birthYear, now.getFullYear());
    } catch {
      categoryLabel = null;
    }
  }

  const recentMatches = (allMatches.data ?? []).slice(0, 3).map((m) => {
    const mr = m as { id: string; scheduled_at: string; opponent: string; status: string; final_score_us: number | null; final_score_them: number | null; teams: unknown };
    const team = Array.isArray(mr.teams) ? mr.teams[0] : mr.teams;
    const teamObj = team as { label?: string; color?: string } | null;
    return {
      id: mr.id,
      scheduled_at: mr.scheduled_at,
      opponent: mr.opponent,
      status: mr.status,
      score_us: mr.final_score_us,
      score_them: mr.final_score_them,
      team_label: teamObj?.label ?? "",
      team_color: teamObj?.color ?? "#1E5AA8",
    };
  });

  const stats: ProfileStat[] = [
    {
      label: "Partidos",
      value: String(playerStats.matches_played),
      hint: playerStats.matches_played > 0
        ? `${Math.round((playerStats.goals / Math.max(playerStats.matches_played, 1)) * 100) / 100} por partido`
        : undefined,
      icon: <Trophy className="h-3.5 w-3.5" />,
      tone: playerStats.matches_played > 5 ? "positive" : "default",
      color: "var(--brand-ball)",
    },
    {
      label: "Goles",
      value: String(playerStats.goals),
      hint: playerStats.matches_played > 0
        ? `${(playerStats.goals / Math.max(playerStats.matches_played, 1)).toFixed(2)} por partido`
        : undefined,
      icon: <Target className="h-3.5 w-3.5" />,
      tone: "default",
      color: "var(--success)",
    },
    {
      label: "Exclusiones",
      value: String(playerStats.exclusions),
      hint: undefined,
      icon: <Activity className="h-3.5 w-3.5" />,
      tone: "default",
      color: "var(--warning)",
    },
    {
      label: "Asistencia",
      value: playerStats.attendance_pct > 0 ? `${playerStats.attendance_pct}%` : "—",
      hint: playerStats.trainings_total > 0
        ? `${playerStats.trainings_attended}/${playerStats.trainings_total} entrenos`
        : undefined,
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      tone: playerStats.attendance_pct >= 80 ? "positive" : "default",
      color: "var(--brand-blue)",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
      <header
        className="overflow-hidden rounded-lg border border-ink-300 bg-paper"
        style={{ borderTop: `4px solid ${teamColor}` }}
      >
        <div className="flex items-start gap-4 p-4">
          <Avatar
            name={activeProfile.full_name}
            src={activeProfile.photo_url}
            size={88}
            style={{ backgroundColor: teamColor, color: "white" }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
              Perfil
            </p>
            <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-brand-deep">
              {activeProfile.full_name}
            </h1>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {primaryRole ? (
                <span className="inline-flex h-6 items-center rounded-full bg-brand-deep px-2.5 text-[11px] font-bold uppercase tracking-wider text-paper">
                  {ROLE_LABELS[primaryRole]}
                </span>
              ) : null}
              {categoryLabel ? (
                <span className="inline-flex h-6 items-center rounded-full border border-ink-300 bg-paper px-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-900">
                  {CATEGORY_LABELS[categoryLabel as CategoryCode]}
                </span>
              ) : null}
              {activeProfile.cap_number != null ? (
                <span
                  className="inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wider text-paper"
                  style={{ backgroundColor: teamColor }}
                >
                  #{activeProfile.cap_number}
                </span>
              ) : null}
              {primaryTeam ? (
                <span className="inline-flex h-6 items-center rounded-full border border-ink-300 bg-paper px-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-900">
                  {primaryTeam.label}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {(primaryTeam || playerStats.matches_played > 0 || playerStats.trainings_total > 0) ? (
          <div className="grid grid-cols-4 border-t border-ink-300 bg-brand-foam/30">
            {stats.map((s, i) => (
              <div
                key={i}
                className={`flex flex-col items-start gap-0.5 p-3 ${
                  i < 3 ? "border-r border-ink-300" : ""
                }`}
              >
                <dt
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: s.color }}
                >
                  {s.icon}
                  {s.label}
                </dt>
                <dd
                  className={`font-display text-2xl font-extrabold leading-none ${
                    s.tone === "positive"
                      ? "text-success"
                      : s.tone === "muted"
                        ? "text-ink-600"
                        : "text-brand-deep"
                  }`}
                >
                  {s.value}
                </dd>
                {s.hint ? (
                  <dd className="text-[10px] text-ink-600">{s.hint}</dd>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </header>

      {nextEvent ? (
        <section className="rounded-lg border-2 border-brand-blue/30 bg-brand-foam/50 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-600">
            Tu próximo compromiso
          </p>
          <CalendarEventCard
            event={{
              id: nextEvent.id,
              kind: nextEvent.kind,
              scheduled_at: nextEvent.scheduled_at,
              title:
                nextEvent.kind === "match"
                  ? nextEvent.scheduled_at
                    ? `Partido a las ${new Date(nextEvent.scheduled_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
                    : "Partido"
                  : "Entreno",
              team_label: nextEvent.team_label,
              team_color: nextEvent.team_color,
              location: nextEvent.location,
            }}
            href={
              nextEvent.kind === "match" ? `/matches/${nextEvent.id}` : "/calendar"
            }
          />
        </section>
      ) : null}

      {primaryTeam ? (
        <Link
          href={`/team/${primaryTeam.id}` as Route}
          className="flex items-center justify-between rounded-lg border border-ink-300 bg-paper p-4 transition-colors hover:bg-brand-foam"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-md text-paper"
              style={{ backgroundColor: primaryTeam.color }}
            >
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                Tu equipo
              </p>
              <p className="font-display text-lg font-extrabold text-brand-deep">
                {primaryTeam.label}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-ink-600" />
        </Link>
      ) : null}

      {recentMatches.length > 0 && isPlayer ? (
        <section className="rounded-lg border border-ink-300 bg-paper p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-600">
            Últimos partidos
          </p>
          <div className="space-y-2">
            {recentMatches.map((m) => {
              const isPlayed = m.status === "played" && m.score_us !== null && m.score_them !== null;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded border border-ink-300 bg-paper p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-ink-900">
                      vs {m.opponent}
                    </p>
                    <p className="text-[10px] text-ink-600">
                      {new Date(m.scheduled_at).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · {m.team_label}
                    </p>
                  </div>
                  {isPlayed ? (
                    <div
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${
                          m.score_us! > m.score_them! ? "var(--success)" : "var(--danger)"
                        } 12%, var(--paper))`,
                        color:
                          m.score_us! > m.score_them!
                            ? "var(--success)"
                            : "var(--danger)",
                      }}
                    >
                      {m.score_us! > m.score_them! ? "V" : m.score_us === m.score_them! ? "E" : "D"} {m.score_us}–{m.score_them}
                    </div>
                  ) : (
                    <span className="rounded-md bg-ink-300 px-2 py-1 text-[11px] font-bold uppercase text-ink-900">
                      Programado
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <Link
            href={"/calendar" as Route}
            className="mt-3 inline-flex h-8 items-center gap-1 text-xs font-bold text-brand-blue hover:underline"
          >
            Ver todo el calendario
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      ) : null}

      <section className="rounded-lg border border-ink-300 bg-paper p-4">
        <div className="mb-3 flex flex-col gap-1">
          <h2 className="font-display text-base font-extrabold text-brand-deep">
            Disponibilidad
          </h2>
          <p className="text-xs text-ink-600">
            Marca los próximos 30 días que no podrás venir. Tu entrenador lo verá
            al preparar la convocatoria.
          </p>
        </div>
        <AvailabilityCalendar
          initialAvailability={availability}
          todayIso={today}
        />
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={"/profile/edit" as Route}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-brand-deep text-sm font-bold text-paper transition-colors hover:bg-ink-900"
        >
          <Settings className="h-4 w-4" />
          Editar perfil
        </Link>
        <Link
          href={"/change-password" as Route}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-ink-300 bg-paper text-sm font-bold text-ink-900 transition-colors hover:bg-brand-foam"
        >
          Cambiar contraseña
        </Link>
        {isAdmin ? (
          <Link
            href={"/admin" as Route}
            className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-ink-300 bg-paper text-sm font-bold text-ink-900 transition-colors hover:bg-brand-foam"
          >
            <Award className="h-4 w-4" />
            Panel de administración
          </Link>
        ) : null}
      </div>

      <form action={signOut} className="pt-1">
        <Button
          type="submit"
          variant="secondary"
          size="md"
          className="w-full"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
