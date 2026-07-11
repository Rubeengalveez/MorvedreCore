import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { LogOut, ChevronRight, User } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { CapTile } from "@/components/ui/cap-tile";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageShell } from "@/components/ui/page-shell";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Equipo, Gorro, Porteria, SilbatoActivo, Trofeo } from "@/components/brand/pictograms";
import { ProfileSwitcherInline } from "@/components/profile/profile-switcher-inline";
import { CalendarSyncCard } from "@/components/profile/calendar-sync-card";
import {
  AvailabilityCalendar,
  type AvailabilityDay,
} from "@/components/profile/availability-calendar";
import { todayIso, addDaysIso } from "@/lib/domain/calendar";
import { CATEGORY_LABELS, inferCategory, type CategoryCode } from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/server/actions/auth";
import { computePlayerStats } from "@/lib/domain/stats";
import { getRankings } from "@/server/queries/rankings";
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

export default async function ProfilePage() {
  const supabase = await createClient();
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { activeProfile, ownProfile, linkedProfiles } = ctx;

  const [seasonRes, ownProfileRolesRes] = await Promise.all([
    supabase.from("seasons").select("id, is_current").eq("is_current", true).maybeSingle(),
    supabase.from("user_roles").select("role, scope_team_id").eq("profile_id", ownProfile.id),
  ]);
  const seasonId = seasonRes.data?.id ?? null;

  const roles = (
    (ownProfileRolesRes.data ?? []) as Array<{ role: string; scope_team_id: string | null }>
  )
    .map((r) => r.role)
    .filter((r) => r in ROLE_LABELS)
    .sort((a, b) => (ROLE_PRIORITY[a] ?? 99) - (ROLE_PRIORITY[b] ?? 99));

  const isAdmin = roles.includes("admin");
  const isPlayer = roles.includes("player");
  const isCoach = roles.includes("coach");

  const teams = seasonId ? await getTeamsForProfileInSeason(activeProfile.id, seasonId) : [];

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
      .select(
        "id, scheduled_at, status, opponent, final_score_us, final_score_them, teams!matches_team_id_fkey(label, color)",
      )
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
          .select(
            "id, scheduled_at, opponent, status, teams!matches_team_id_fkey(id, label, color)",
          )
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

  const availability: AvailabilityDay[] = (
    (availabilityData.data ?? []) as Array<{
      date: string;
      available: boolean;
      reason: string | null;
    }>
  ).map((row) => ({
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
    (allSessions.data ?? []) as unknown as Array<{
      id: string;
      team_id: string;
      cancelled: boolean;
      scheduled_at: string;
    }>,
    (attendanceData.data ?? []) as unknown as Array<{
      session_id: string;
      player_id: string;
      present: boolean;
    }>,
    (allMatches.data ?? []) as unknown as Array<{
      id: string;
      team_id: string;
      status: "scheduled" | "in_progress" | "played" | "cancelled" | "postponed";
      scheduled_at: string;
      final_score_us: number | null;
      final_score_them: number | null;
      season_id: string;
    }>,
    (callupsData.data ?? []) as unknown as Array<{
      match_id: string;
      player_id: string;
      status: "called" | "confirmed" | "declined" | "withdrawn" | "no_show";
    }>,
    [] as Array<{
      match_id: string;
      player_id: string;
      goals: number;
      exclusions: number;
      mvp: boolean;
    }>,
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

  const coachUpcoming = (
    (coachMatchesRes.data ?? []) as Array<{
      id: string;
      scheduled_at: string;
      opponent: string;
      status: string;
      teams: unknown;
    }>
  ).map((row) => {
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

  const stats = [
    {
      label: "Partidos",
      value: String(playerStats.matches_played),
      color: "var(--ball-gold)",
    },
    {
      label: "Goles",
      value: String(playerStats.goals),
      color: "var(--success)",
    },
    {
      label: "Excl.",
      value: String(playerStats.exclusions),
      color: "var(--goggle-red)",
    },
    {
      label: "Asist.",
      value: playerStats.attendance_pct > 0 ? `${playerStats.attendance_pct}%` : "—",
      color: "var(--pool-blue)",
    },
  ];

  const showStatsGrid = playerStats.matches_played > 0 || playerStats.trainings_total > 0;

  return (
    <PageShell width="md" className="gap-5 pb-8">
      {linkedProfiles.length > 0 ? (
        <ProfileSwitcherInline
          ownProfile={ownProfile}
          activeProfile={activeProfile}
          linkedProfiles={linkedProfiles}
        />
      ) : null}

      <header className="bg-pool-deep text-paper shadow-elev-3 relative overflow-hidden rounded-[1.75rem] px-5 py-6 sm:px-7">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-2/5 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08))]"
        />
        <div className="relative flex items-center gap-4">
          <Avatar
            name={activeProfile.full_name}
            src={activeProfile.photo_url}
            size={56}
            teamColor={teamColor}
            className="ring-2 ring-white/60"
          />
          <div className="min-w-0 flex-1">
            <p className="text-paper/65 text-xs font-extrabold tracking-[0.14em] uppercase">
              Tu perfil
            </p>
            <h1 className="font-display text-paper mt-1 truncate text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
              {activeProfile.full_name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {primaryRole ? (
                <span className="text-paper inline-flex min-h-7 items-center rounded-full border border-white/15 bg-white/10 px-2.5 text-xs font-extrabold uppercase">
                  {ROLE_LABELS[primaryRole]}
                </span>
              ) : null}
              {categoryLabel ? (
                <span className="text-paper inline-flex min-h-7 items-center rounded-full border border-white/15 bg-white/10 px-2.5 text-xs font-extrabold uppercase">
                  {CATEGORY_LABELS[categoryLabel as CategoryCode]}
                </span>
              ) : null}
              {activeProfile.cap_number != null ? (
                <CapTile number={activeProfile.cap_number} teamColor={teamColor} size="sm" />
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {showStatsGrid ? (
        <section
          aria-label="Estadísticas de la temporada"
          className="border-ink-200 bg-paper-card shadow-elev-1 grid grid-cols-2 overflow-hidden rounded-2xl border sm:grid-cols-4"
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-col items-center gap-1 px-2 py-4 ${
                i < stats.length - 1 ? "border-ink-200 border-r" : ""
              }`}
            >
              <p className="text-pool-deep font-mono text-xl leading-none font-extrabold tabular-nums">
                {s.value}
              </p>
              <p className="text-ink-600 text-xs font-bold uppercase">{s.label}</p>
            </div>
          ))}
        </section>
      ) : null}

      {isPlayer && seasonId ? (
        <PlayerRankingSummary
          profileId={activeProfile.id}
          seasonId={seasonId}
          birthYear={activeProfile.birth_year}
        />
      ) : null}

      {primaryTeam ? (
        <Link
          href={`/team/${primaryTeam.id}` as Route}
          className="border-ink-200 bg-paper-card shadow-elev-1 hover:bg-pool-foam focus-visible:ring-pool-blue flex min-h-20 touch-manipulation items-center justify-between rounded-2xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <div className="flex items-center gap-3">
            <PictogramBadge pictogram={Equipo} color={primaryTeam.color} size="md" />
            <div>
              <Eyebrow>Tu equipo</Eyebrow>
              <p className="font-display text-pool-deep text-base font-extrabold">
                {primaryTeam.label}
              </p>
            </div>
          </div>
          <ChevronRight className="text-ink-600 h-5 w-5" />
        </Link>
      ) : null}

      {isCoach && coachUpcoming.length > 0 ? (
        <section
          aria-labelledby="coach-week-heading"
          className="border-ink-200 bg-paper-card shadow-elev-1 flex flex-col gap-3 rounded-2xl border p-4"
        >
          <div className="flex items-center gap-2">
            <PictogramBadge pictogram={SilbatoActivo} color="var(--pool-teal)" size="sm" />
            <h2
              id="coach-week-heading"
              className="font-display text-pool-deep text-sm font-extrabold"
            >
              Mis equipos esta semana
            </h2>
          </div>
          <ul className="flex flex-col gap-1.5">
            {coachUpcoming.slice(0, 3).map((m) => (
              <li key={m.id}>
                <Link
                  href={`/matches/${m.id}` as Route}
                  className="hover:bg-pool-foam focus-visible:ring-pool-blue flex min-h-16 items-center gap-2.5 rounded-xl border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  style={{
                    borderColor: m.team_color,
                    backgroundColor: `color-mix(in oklab, ${m.team_color} 5%, var(--paper))`,
                  }}
                >
                  <PictogramBadge pictogram={Gorro} color={m.team_color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Eyebrow style={{ color: m.team_color }}>{m.team_label}</Eyebrow>
                    <p className="font-display text-pool-deep line-clamp-1 text-sm font-extrabold">
                      vs {m.opponent}
                    </p>
                  </div>
                  <span className="text-ink-600 shrink-0 text-xs font-bold uppercase">
                    {new Date(m.scheduled_at).toLocaleDateString("es-ES", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="availability-heading"
        className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-4 sm:p-5"
      >
        <div className="mb-3 flex flex-col gap-1">
          <h2
            id="availability-heading"
            className="font-display text-pool-deep text-base font-extrabold"
          >
            Disponibilidad
          </h2>
          <p className="text-ink-600 text-sm leading-relaxed">
            Toca un día para marcar si no podrás asistir. Tu entrenador lo verá al preparar la
            convocatoria.
          </p>
        </div>
        <AvailabilityCalendar
          initialAvailability={availability}
          todayIso={today}
          upcomingMatches={upcomingMatches}
          upcomingSessions={upcomingSessions}
        />
      </section>

      <CalendarSyncCard
        token={activeProfile.calendar_token}
        baseUrl={process.env.NEXT_PUBLIC_APP_URL || ""}
      />

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Link
          href={"/profile/edit" as Route}
          className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue inline-flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <User className="h-4 w-4" aria-hidden="true" />
          Editar perfil
        </Link>
        <Link
          href={"/change-password" as Route}
          className="border-ink-300 bg-paper-card text-ink-900 hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Contraseña
        </Link>
        {isAdmin ? (
          <Link
            href={"/admin" as Route}
            className="border-ink-300 bg-paper-card text-ink-900 hover:bg-pool-foam focus-visible:ring-pool-blue col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <PictogramBadge pictogram={Porteria} color="var(--pool-deep)" size="sm" />
            Panel de administración
          </Link>
        ) : null}
      </div>

      <form action={signOut} className="pt-1">
        <Button type="submit" variant="secondary" size="md" className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </form>
    </PageShell>
  );
}

async function PlayerRankingSummary({
  profileId,
  seasonId,
  birthYear,
}: {
  profileId: string;
  seasonId: string;
  birthYear: number | null;
}) {
  if (birthYear == null) return null;
  const categoryCode = inferCategory(birthYear, new Date().getFullYear());
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
      className="border-ink-300 bg-paper-card shadow-elev-1 flex flex-col gap-2 rounded-md border p-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PictogramBadge pictogram={Trofeo} color="var(--ball-gold)" size="sm" />
          <h2
            id="my-rankings-heading"
            className="font-display text-pool-deep text-sm font-extrabold"
          >
            Tu posición en los rankings
          </h2>
        </div>
        <Link
          href={"/rankings" as Route}
          className="text-pool-blue text-xs font-bold hover:underline"
        >
          Ver todo
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
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
            label="Asist."
            suffix="%"
            position={attendanceRank.my_position.row.position}
            value={attendanceRank.my_position.row.primary_value}
            totalPlayers={attendanceRank.total_players}
            accent="var(--pool-blue)"
          />
        ) : null}
        <RankingRelativeCard
          goalsDelta={goalsRank.my_position?.delta_to_next ?? null}
          attendanceDelta={attendanceRank.my_position?.delta_to_next ?? null}
        />
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
    <div className="border-ink-300 bg-pool-foam/40 flex flex-col items-center gap-0.5 rounded-md border p-2">
      <p className="tracking-eyebrow text-ink-600 text-xs font-bold uppercase">{label}</p>
      <span
        className="text-paper inline-flex h-7 min-w-7 items-center justify-center rounded-sm px-1.5 font-mono text-base leading-none font-extrabold tabular-nums"
        style={{ backgroundColor: accent }}
      >
        {position}
      </span>
      <p className="text-pool-deep font-mono text-sm leading-none font-extrabold tabular-nums">
        {value}
        {suffix}
      </p>
      <p className="tracking-eyebrow text-ink-500 text-xs uppercase">de {totalPlayers}</p>
    </div>
  );
}

function RankingRelativeCard({
  goalsDelta,
  attendanceDelta,
}: {
  goalsDelta: number | null;
  attendanceDelta: number | null;
}) {
  const goalTxt =
    goalsDelta == null
      ? "Eres el #1"
      : goalsDelta === 0
        ? "Líder en goles"
        : `A ${goalsDelta} del 1º en goles`;
  const attTxt =
    attendanceDelta == null
      ? null
      : attendanceDelta === 0
        ? "Líder en asist."
        : `A ${attendanceDelta} del 1º en asist.`;
  return (
    <div className="border-ink-300 bg-pool-foam/40 flex flex-col items-center gap-0.5 rounded-md border p-2">
      <p className="tracking-eyebrow text-ink-600 text-xs font-bold uppercase">Reta al líder</p>
      <p className="font-display text-pool-deep text-center text-xs leading-tight font-extrabold">
        {goalTxt}
      </p>
      {attTxt ? <p className="text-ink-600 text-center text-xs font-medium">{attTxt}</p> : null}
    </div>
  );
}
