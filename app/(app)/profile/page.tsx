import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { LogOut, ChevronRight } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { CapTile } from "@/components/ui/cap-tile";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Medal } from "@/components/ui/medal";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import {
  Equipo,
  Gorro,
  Porteria,
  SilbatoActivo,
  Trofeo,
  Usuario,
} from "@/components/brand/pictograms";
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

type ProfileStat = {
  label: string;
  value: string;
  hint?: string;
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
  const isCoach = roles.includes("coach");

  const { data: activeProfileRow } = await supabase
    .from("profiles")
    .select("notes")
    .eq("id", activeProfile.id)
    .maybeSingle();
  const activeProfileNotes =
    (activeProfileRow as { notes: string | null } | null)?.notes ?? null;

  const teams = seasonId
    ? await getTeamsForProfileInSeason(activeProfile.id, seasonId)
    : [];

  const teamIds = teams.map((t) => t.id);
  const primaryTeam = teams[0] ?? null;

  const teamColor = activeProfile.team_color ?? primaryTeam?.color ?? "var(--pool-blue)";
  const primaryRole = roles[0] ?? null;

  const now = new Date();
  const today = todayIso();
  const halfYearAhead = addDaysIso(today, 180);
  const oneYearAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 365).toISOString();

  const [
    availabilityData,
    attendanceData,
    allMatches,
    allSessions,
    callupsData,
    coachMatchesRes,
    upcomingMatchesRes,
    upcomingSessionsRes,
  ] = await Promise.all([
    supabase
      .from("match_availability")
      .select("date, available, reason")
      .eq("player_id", activeProfile.id)
      .gte("date", today)
      .lte("date", halfYearAhead),
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
    isCoach
      ? supabase
          .from("matches")
          .select("id, scheduled_at, opponent, status, teams!matches_team_id_fkey(id, label, color)")
          .in("team_id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"])
          .in("status", ["scheduled", "in_progress"])
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(6)
      : Promise.resolve({ data: [] as Array<unknown> }),
    supabase
      .from("matches")
      .select("id, scheduled_at, status, opponent, teams!matches_team_id_fkey(label, color)")
      .in("team_id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"])
      .gte("scheduled_at", today)
      .lte("scheduled_at", new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString())
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("training_sessions")
      .select("id, scheduled_at, cancelled, teams!training_sessions_team_id_fkey(label, color)")
      .in("team_id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"])
      .gte("scheduled_at", today)
      .lte("scheduled_at", new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString())
      .order("scheduled_at", { ascending: true }),
  ]);

  const nextEvent: NextEvent | null = teamIds.length > 0
    ? await getNextEventForProfile({ teamIds, profileId: activeProfile.id, now })
    : null;

  const availability: AvailabilityDay[] = ((availabilityData.data ?? []) as Array<{ date: string; available: boolean; reason: string | null }>).map((row) => ({
    iso: row.date,
    available: row.available,
    reason: row.reason,
  }));

  const upcomingMatches = (upcomingMatchesRes.data ?? []).map((row) => ({
    id: row.id,
    scheduled_at: row.scheduled_at,
    opponent: row.opponent,
    team_label: row.teams?.label ?? "Equipo",
    team_color: row.teams?.color ?? "var(--pool-blue)",
  }));

  const upcomingSessions = (upcomingSessionsRes.data ?? []).map((row) => ({
    id: row.id,
    scheduled_at: row.scheduled_at,
    cancelled: row.cancelled,
    team_label: row.teams?.label ?? "Equipo",
    team_color: row.teams?.color ?? "var(--pool-blue)",
  }));

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

  const coachUpcoming = ((coachMatchesRes.data ?? []) as Array<{
    id: string;
    scheduled_at: string;
    opponent: string;
    status: string;
    teams: unknown;
  }>).map((row) => {
    const teamRaw = Array.isArray(row.teams) ? row.teams[0] : row.teams;
    const team = teamRaw as { id?: string; label?: string; color?: string } | null;
    return {
      id: row.id,
      scheduled_at: row.scheduled_at,
      opponent: row.opponent,
      status: row.status,
      team_id: team?.id ?? "",
      team_label: team?.label ?? "",
      team_color: team?.color ?? "var(--pool-blue)",
    };
  });

  const stats: ProfileStat[] = [
    {
      label: "Partidos",
      value: String(playerStats.matches_played),
      hint: playerStats.matches_played > 0
        ? `${Math.round((playerStats.goals / Math.max(playerStats.matches_played, 1)) * 100) / 100} por partido`
        : undefined,
      tone: playerStats.matches_played > 5 ? "positive" : "default",
      color: "var(--ball-gold)",
    },
    {
      label: "Goles",
      value: String(playerStats.goals),
      hint: playerStats.matches_played > 0
        ? `${(playerStats.goals / Math.max(playerStats.matches_played, 1)).toFixed(2)} por partido`
        : undefined,
      tone: "default",
      color: "var(--success)",
    },
    {
      label: "Exclusiones",
      value: String(playerStats.exclusions),
      hint: undefined,
      tone: "default",
      color: "var(--goggle-red)",
    },
    {
      label: "Asistencia",
      value: playerStats.attendance_pct > 0 ? `${playerStats.attendance_pct}%` : "—",
      hint: playerStats.trainings_total > 0
        ? `${playerStats.trainings_attended}/${playerStats.trainings_total} entrenos`
        : undefined,
      tone: playerStats.attendance_pct >= 80 ? "positive" : "default",
      color: "var(--pool-blue)",
    },
  ];

  const top3 = [
    { label: "Goles", value: playerStats.goals, color: "var(--success)" },
    { label: "Asistencia", value: playerStats.attendance_pct, color: "var(--pool-blue)" },
    { label: "Convocatorias", value: playerStats.matches_played, color: "var(--ball-gold)" },
  ]
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" strong />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
      <header
        className="overflow-hidden rounded-md border border-ink-300 bg-paper-card shadow-elev-2"
        style={{ borderTop: `4px solid ${teamColor}` }}
      >
        <div
          aria-hidden="true"
          className="h-1.5 w-full"
          style={{ backgroundColor: teamColor }}
        />
        <div className="flex items-start gap-4 p-4">
          <Avatar
            name={activeProfile.full_name}
            src={activeProfile.photo_url}
            size={88}
            teamColor={teamColor}
          />
          <div className="min-w-0 flex-1">
            <Eyebrow>Perfil</Eyebrow>
            <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-pool-deep sm:text-3xl">
              {activeProfile.full_name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {primaryRole ? (
                <span className="inline-flex h-6 items-center rounded-sm bg-pool-deep px-2.5 text-eyebrow text-paper">
                  {ROLE_LABELS[primaryRole]}
                </span>
              ) : null}
              {categoryLabel ? (
                <span className="inline-flex h-6 items-center rounded-sm border border-ink-300 bg-paper-card px-2.5 text-eyebrow text-ink-900">
                  {CATEGORY_LABELS[categoryLabel as CategoryCode]}
                </span>
              ) : null}
              {activeProfile.cap_number != null ? (
                <CapTile number={activeProfile.cap_number} teamColor={teamColor} size="sm" />
              ) : null}
              {primaryTeam ? (
                <span className="inline-flex h-6 items-center rounded-sm border border-ink-300 bg-paper-card px-2.5 text-eyebrow text-ink-900">
                  {primaryTeam.label}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {(primaryTeam || playerStats.matches_played > 0 || playerStats.trainings_total > 0) ? (
          <div className="grid grid-cols-4 border-t border-ink-300 bg-pool-foam/40">
            {stats.map((s, i) => {
              const numericMatch = s.value.match(/^\d+/);
              const numericPart = numericMatch ? numericMatch[0] : "0";
              const safeNumber = Math.max(0, Math.min(99, parseInt(numericPart, 10) || 0));
              return (
                <div
                  key={i}
                  className={`flex flex-col items-start gap-0.5 p-3 ${
                    i < 3 ? "border-r border-ink-300" : ""
                  }`}
                >
                  <Eyebrow style={{ color: s.color }}>{s.label}</Eyebrow>
                  <div className="mt-1 flex items-center gap-2">
                    <CapTile number={safeNumber} teamColor={s.color} size="sm" />
                    <span
                      className={`font-mono text-xl font-extrabold leading-none tabular-nums ${
                        s.tone === "positive"
                          ? "text-success"
                          : s.tone === "muted"
                            ? "text-ink-600"
                            : "text-pool-deep"
                      }`}
                    >
                      {s.value}
                    </span>
                  </div>
                  {s.hint ? (
                    <p className="text-[10px] text-ink-600">{s.hint}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </header>

      {nextEvent ? (
        <section className="rounded-md border-2 border-pool-blue/30 bg-pool-foam/60 p-4">
          <Eyebrow className="mb-2">
            {nextEvent.kind === "match" ? "Tu próximo partido" : "Tu próximo entreno"}
          </Eyebrow>
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

      {isPlayer && seasonId ? <PlayerRankingSummary profileId={activeProfile.id} seasonId={seasonId} /> : null}

      {primaryTeam ? (
        <Link
          href={`/team/${primaryTeam.id}` as Route}
          className="flex items-center justify-between rounded-md border border-ink-300 bg-paper-card p-4 transition-colors hover:bg-pool-foam shadow-elev-1"
        >
          <div className="flex items-center gap-3">
            <PictogramBadge
              pictogram={Equipo}
              color={primaryTeam.color}
              size="lg"
            />
            <div>
              <Eyebrow>Tu equipo</Eyebrow>
              <p className="font-display text-lg font-extrabold text-pool-deep">
                {primaryTeam.label}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-ink-600" />
        </Link>
      ) : null}

      {isPlayer && top3.length > 0 ? (
        <section
          aria-labelledby="top3-heading"
          className="rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1"
        >
          <div className="mb-3 flex items-center gap-2">
            <PictogramBadge
              pictogram={Trofeo}
              color="var(--ball-gold)"
              size="sm"
            />
            <h2
              id="top3-heading"
              className="font-display text-base font-extrabold text-pool-deep"
            >
              Top 3 personal
            </h2>
          </div>
          <p className="mb-3 text-xs text-ink-600">
            Tus categorías más fuertes esta temporada.
          </p>
          <ol className="flex flex-col gap-2">
            {top3.map((s, idx) => {
              const rank = (idx + 1) as 1 | 2 | 3;
              return (
                <li
                  key={s.label}
                  className="flex items-center gap-3 rounded-md border border-ink-300 bg-paper p-2.5"
                >
                  <Medal rank={rank} size="sm" />
                  <span className="text-sm font-semibold text-pool-deep">
                    {s.label}
                  </span>
                  <span
                    className="ml-auto font-mono text-base font-extrabold tabular-nums"
                    style={{ color: s.color }}
                  >
                    {s.value}
                    {s.label === "Asistencia" ? "%" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {isCoach && coachUpcoming.length > 0 ? (
        <section
          aria-labelledby="coach-week-heading"
          className="rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1"
        >
          <div className="mb-3 flex items-center gap-2">
            <PictogramBadge
              pictogram={SilbatoActivo}
              color="var(--pool-teal)"
              size="sm"
            />
            <h2
              id="coach-week-heading"
              className="font-display text-base font-extrabold text-pool-deep"
            >
              Mis equipos esta semana
            </h2>
          </div>
          <p className="mb-3 text-xs text-ink-600">
              Próximos partidos de los equipos que entrenas.
          </p>
          <ul className="flex flex-col gap-2">
            {coachUpcoming.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/matches/${m.id}` as Route}
                  className="flex items-center gap-3 rounded-md border-2 p-2.5 transition-colors hover:bg-pool-foam"
                  style={{
                    borderColor: m.team_color,
                    backgroundColor: `color-mix(in oklab, ${m.team_color} 5%, var(--paper))`,
                  }}
                >
                  <PictogramBadge
                    pictogram={Gorro}
                    color={m.team_color}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <Eyebrow style={{ color: m.team_color }}>{m.team_label}</Eyebrow>
                    <p className="line-clamp-1 font-display text-sm font-extrabold text-pool-deep">
                      vs {m.opponent}
                    </p>
                    <p className="text-[11px] text-ink-600">
                      {new Date(m.scheduled_at).toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      ·{" "}
                      {new Date(m.scheduled_at).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recentMatches.length > 0 && isPlayer ? (
        <section className="rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1">
          <Eyebrow className="mb-3">Últimos partidos</Eyebrow>
          <div className="space-y-2">
            {recentMatches.map((m) => {
              const isPlayed = m.status === "played" && m.score_us !== null && m.score_them !== null;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-ink-300 bg-paper-card p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-pool-deep">
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
                      className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-bold"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${
                          m.score_us! > m.score_them! ? "var(--success)" : m.score_us === m.score_them! ? "var(--ink-300)" : "var(--goggle-red)"
                        } 12%, var(--paper))`,
                        color:
                          m.score_us! > m.score_them!
                            ? "var(--success)"
                            : m.score_us === m.score_them!
                              ? "var(--ink-600)"
                              : "var(--goggle-red)",
                      }}
                    >
                      {m.score_us! > m.score_them! ? (
                        <Medal rank={1} size="sm" />
                      ) : m.score_us === m.score_them! ? (
                        <Medal rank={2} size="sm" />
                      ) : (
                        <Medal rank={3} size="sm" />
                      )}
                      {m.score_us! > m.score_them! ? "V" : m.score_us === m.score_them! ? "E" : "D"} {m.score_us}–{m.score_them}
                    </div>
                  ) : (
                    <span className="rounded-sm bg-ink-300 px-2 py-1 text-eyebrow text-ink-900">
                      Programado
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <Link
            href={"/calendar" as Route}
            className="mt-3 inline-flex h-8 items-center gap-1 text-xs font-bold text-pool-blue hover:underline"
          >
            Ver todo el calendario
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      ) : null}

      <section className="rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1">
        <div className="mb-3 flex flex-col gap-1">
          <h2 className="font-display text-base font-extrabold text-pool-deep">
            Disponibilidad
          </h2>
          <p className="text-xs text-ink-600">
            Marca los próximos 180 días que no podrás asistir. Tu entrenador lo verá
            al preparar la convocatoria.
          </p>
        </div>
        <AvailabilityCalendar
          initialAvailability={availability}
          todayIso={today}
          upcomingMatches={upcomingMatches}
          upcomingSessions={upcomingSessions}
        />
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={"/profile/edit" as Route}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-pool-deep text-sm font-bold text-paper transition-colors hover:bg-ink-900"
        >
          <PictogramBadge
            pictogram={Usuario}
            color="var(--ball-gold)"
            size="sm"
          />
          Editar perfil
        </Link>
        <Link
          href={"/change-password" as Route}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-ink-300 bg-paper-card text-sm font-bold text-ink-900 transition-colors hover:bg-pool-foam"
        >
          Cambiar contraseña
        </Link>
        {isAdmin ? (
          <Link
            href={"/admin" as Route}
            className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-ink-300 bg-paper-card text-sm font-bold text-ink-900 transition-colors hover:bg-pool-foam"
          >
            <PictogramBadge
              pictogram={Porteria}
              color="var(--pool-deep)"
              size="sm"
            />
            Panel de administración
          </Link>
        ) : null}
      </div>

      {activeProfileNotes ? (
        <section
          aria-labelledby="my-notes-heading"
          className="rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1"
        >
          <h2
            id="my-notes-heading"
            className="mb-1.5 font-display text-base font-extrabold text-pool-deep"
          >
            Notas
          </h2>
          <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-ink-900">
            {activeProfileNotes}
          </p>
        </section>
      ) : null}

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
    </div>
  );
}

async function PlayerRankingSummary({
  profileId,
  seasonId,
}: {
  profileId: string;
  seasonId: string;
}) {
  const { getRankings } = await import("@/server/queries/rankings");
  const { inferCategory } = await import("@/lib/domain/categories");
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const profileRes = await supabase
    .from("profiles")
    .select("birth_year, cap_number, full_name, photo_url, team_color")
    .eq("id", profileId)
    .maybeSingle();
  const profile = profileRes.data as
    | { birth_year: number | null; cap_number: number | null; full_name: string; photo_url: string | null; team_color: string | null }
    | null;
  if (!profile?.birth_year) return null;

  const categoryCode = inferCategory(profile.birth_year, new Date().getFullYear());
  if (!categoryCode) return null;

  const [goalsRank, attendanceRank] = await Promise.all([
    getRankings({
      season_id: seasonId,
      scope: { kind: "category", category_code: categoryCode },
      metric: "goals",
      my_player_id: profileId,
    }),
    getRankings({
      season_id: seasonId,
      scope: { kind: "category", category_code: categoryCode },
      metric: "attendance",
      my_player_id: profileId,
      min_trainings_total: 3,
    }),
  ]);

  if (!goalsRank.my_position && !attendanceRank.my_position) return null;

  return (
    <section
      aria-labelledby="my-rankings-heading"
      className="flex flex-col gap-3 rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PictogramBadge pictogram={Trofeo} color="var(--ball-gold)" size="sm" />
          <h2
            id="my-rankings-heading"
            className="font-display text-base font-extrabold text-pool-deep"
          >
            Tu posición en los rankings
          </h2>
        </div>
        <Link
          href={"/rankings" as Route}
          className="text-xs font-bold text-pool-blue hover:underline"
        >
          Ver todo
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {goalsRank.my_position ? (
          <RankingMiniCard
            label="Goles"
            suffix=""
            position={goalsRank.my_position.row.position}
            value={goalsRank.my_position.row.primary_value}
            totalPlayers={goalsRank.total_players}
            accent="var(--ball-gold)"
          />
        ) : null}
        {attendanceRank.my_position ? (
          <RankingMiniCard
            label="Asistencia"
            suffix="%"
            position={attendanceRank.my_position.row.position}
            value={attendanceRank.my_position.row.primary_value}
            totalPlayers={attendanceRank.total_players}
            accent="var(--pool-blue)"
          />
        ) : null}
      </div>
    </section>
  );
}

function RankingMiniCard({
  label,
  suffix,
  position,
  value,
  totalPlayers,
  accent,
}: {
  label: string;
  suffix: string;
  position: number;
  value: number;
  totalPlayers: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-ink-300 bg-pool-foam/40 p-3">
      <span
        aria-hidden="true"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-mono text-base font-extrabold text-paper"
        style={{ backgroundColor: accent }}
      >
        {position}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
          {label}
        </p>
        <p className="font-display text-base font-extrabold text-pool-deep">
          {value}
          {suffix}
        </p>
      </div>
      <span className="text-[10px] uppercase tracking-eyebrow text-ink-600">
        de {totalPlayers}
      </span>
    </div>
  );
}
