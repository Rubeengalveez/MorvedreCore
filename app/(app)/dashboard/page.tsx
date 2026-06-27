import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { UserPlus, Calendar, Users, FileUp, Volleyball, Trophy, Settings, Goal, TrendingUp, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getDashboardData, type DashboardWeekEvent } from "@/server/queries/dashboard";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";

type AppRole = "admin" | "coach" | "delegate" | "directiva" | "parent" | "player";

async function userHasRole(supabase: Awaited<ReturnType<typeof createClient>>, profileId: string, role: AppRole): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId)
    .eq("role", role)
    .is("scope_team_id", null)
    .maybeSingle();
  return data != null;
}

const isUserAdmin = (supabase: Awaited<ReturnType<typeof createClient>>, profileId: string) => userHasRole(supabase, profileId, "admin");

import {
  ActivityItem,
  DashboardHero,
  NextEventCard,
  TeamCard,
  WeekEventCard,
} from "@/components/dashboard/dashboard-blocks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inicio — Morvedre Core",
  description: "Tu resumen del día en el Waterpolo Morvedre.",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { activeProfile, ownProfile } = ctx;

  const isAdmin = ownProfile ? await isUserAdmin(supabase, ownProfile.id) : false;
  // isCoach/isPlayer reserved for future use (only isAdmin drives the shortcuts today)

  const { data: seasonRow } = await supabase
    .from("seasons")
    .select("id, label, is_current")
    .eq("is_current", true)
    .maybeSingle();

  const seasonId = seasonRow?.id ?? null;

  const calendarTeams = seasonId
    ? await getTeamsForProfileInSeason(activeProfile.id, seasonId)
    : [];

  const teamIds = calendarTeams.map((t) => t.id);
  const hasTeam = teamIds.length > 0;

  const now = new Date();

  const [dashboardData, { data: unread }, myCallupRes] = await Promise.all([
    teamIds.length > 0
      ? getDashboardData({ teamIds, profileId: activeProfile.id, now })
      : Promise.resolve({ weekEvents: [], teamInfo: null, recentActivity: [], seasonStats: null }),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", activeProfile.id)
      .is("read_at", null),
    teamIds.length > 0
      ? supabase
          .from("match_callups")
          .select("id, match_id, status, matches!match_callups_match_id_fkey(id, scheduled_at, opponent, teams!matches_team_id_fkey(label, color))")
          .eq("player_id", activeProfile.id)
          .in("status", ["called", "confirmed"])
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as Array<unknown> }),
  ]);

  const nextEvent: DashboardWeekEvent | null =
    dashboardData.weekEvents.find((e) => !e.cancelled) ?? null;

  const teamColor = dashboardData.teamInfo?.color ?? null;

  const myCallups = ((myCallupRes.data ?? []) as Array<{
    id: string;
    match_id: string;
    status: string;
    matches: unknown;
  }>).map((row) => {
    const matchRaw = Array.isArray(row.matches) ? row.matches[0] : row.matches;
    const m = matchRaw as {
      id: string;
      scheduled_at: string;
      opponent: string;
      teams: unknown;
    } | null;
    const teamRaw = m ? (Array.isArray(m.teams) ? m.teams[0] : m.teams) : null;
    const team = teamRaw as { label?: string; color?: string } | null;
    return {
      id: row.id,
      match_id: row.match_id,
      status: row.status,
      scheduled_at: m?.scheduled_at ?? null,
      opponent: m?.opponent ?? "",
      team_label: team?.label ?? "",
      team_color: team?.color ?? "var(--brand-blue)",
    };
  });

  const upcomingCallup = myCallups
    .filter((c) => c.scheduled_at != null && new Date(c.scheduled_at).getTime() > now.getTime() - 1000 * 60 * 60 * 24)
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
      <DashboardHero
        profile={{
          full_name: activeProfile.full_name,
          team_color: teamColor,
        }}
        now={now}
        unreadNotifications={unread?.length ?? 0}
        isAdmin={isAdmin}
        hasTeam={hasTeam}
        nextEvent={nextEvent}
      />

      {hasTeam ? (
        <section
          aria-labelledby="your-week-heading"
          className="rounded-lg border border-ink-300 bg-paper p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-foam text-brand-deep">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2
              id="your-week-heading"
              className="font-display text-base font-bold text-brand-deep"
            >
              Tu semana
            </h2>
          </div>
          <ul className="flex flex-col gap-2">
            {upcomingCallup ? (
              <li>
                <Link
                  href={`/matches/${upcomingCallup.match_id}` as Route}
                  className="flex items-center gap-3 rounded-md border-2 p-2.5 transition-colors hover:bg-brand-foam"
                  style={{
                    borderColor: upcomingCallup.team_color,
                    backgroundColor: `color-mix(in oklab, ${upcomingCallup.team_color} 6%, var(--paper))`,
                  }}
                >
                  <Trophy
                    className="h-4 w-4 shrink-0"
                    style={{ color: upcomingCallup.team_color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                      Convocatoria
                    </p>
                    <p className="line-clamp-1 font-display text-sm font-bold text-brand-deep">
                      vs {upcomingCallup.opponent}
                    </p>
                    <p className="text-[11px] text-ink-600">
                      {upcomingCallup.scheduled_at
                        ? new Date(upcomingCallup.scheduled_at).toLocaleDateString("es-ES", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                          })
                        : ""}
                      {upcomingCallup.scheduled_at
                        ? ` · ${formatTime(upcomingCallup.scheduled_at)}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-paper"
                    style={{ backgroundColor: upcomingCallup.team_color }}
                  >
                    {upcomingCallup.status === "confirmed" ? "Confirmado" : "Convocado"}
                  </span>
                </Link>
              </li>
            ) : null}
            {dashboardData.weekEvents
              .filter((e) => e.kind === "training" && !e.cancelled)
              .slice(0, 1)
              .map((e) => (
                <li key={e.id}>
                  <Link
                    href={"/calendar" as Route}
                    className="flex items-center gap-3 rounded-md border border-ink-300 bg-paper p-2.5 transition-colors hover:bg-brand-foam"
                  >
                    <Volleyball
                      className="h-4 w-4 shrink-0"
                      style={{ color: e.team_color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                        Próximo entreno
                      </p>
                      <p className="line-clamp-1 font-display text-sm font-bold text-brand-deep">
                        {e.team_label}
                      </p>
                      <p className="text-[11px] text-ink-600">
                        {new Date(e.scheduled_at).toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {formatTime(e.scheduled_at)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            {dashboardData.weekEvents
              .filter((e) => e.kind === "match" && !e.cancelled)
              .slice(0, 1)
              .map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/matches/${e.id}` as Route}
                    className="flex items-center gap-3 rounded-md border border-ink-300 bg-paper p-2.5 transition-colors hover:bg-brand-foam"
                  >
                    <Trophy
                      className="h-4 w-4 shrink-0"
                      style={{ color: e.team_color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                        Próximo partido
                      </p>
                      <p className="line-clamp-1 font-display text-sm font-bold text-brand-deep">
                        {e.title}
                      </p>
                      <p className="text-[11px] text-ink-600">
                        {new Date(e.scheduled_at).toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {formatTime(e.scheduled_at)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            {myCallups.length === 0 &&
            dashboardData.weekEvents.filter((e) => e.kind === "training" && !e.cancelled).length === 0 &&
            dashboardData.weekEvents.filter((e) => e.kind === "match" && !e.cancelled).length === 0 ? (
              <li className="rounded-md border border-dashed border-ink-300 bg-paper p-3 text-center text-xs text-ink-600">
                Esta semana no tienes entrenos ni partidos. Descansa.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="next-event-heading">
        <h2
          id="next-event-heading"
          className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-600"
        >
          Tu próximo evento
        </h2>
        <NextEventCard event={nextEvent} now={now} />
      </section>

      {hasTeam && dashboardData.teamInfo ? (
        <section aria-labelledby="your-team-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2
              id="your-team-heading"
              className="text-[10px] font-bold uppercase tracking-wider text-ink-600"
            >
              Tu equipo
            </h2>
            <Link
              href={"/calendar" as Route}
              className="text-xs font-bold text-brand-blue hover:underline"
            >
              Ver calendario completo
            </Link>
          </div>
          <TeamCard team={dashboardData.teamInfo} />
        </section>
      ) : !hasTeam ? (
        <section
          aria-labelledby="no-team-heading"
          className="rounded-lg border-2 border-dashed border-ink-300 bg-paper p-6 text-center"
        >
          <Users className="mx-auto h-10 w-10 text-ink-300" />
          <h2
            id="no-team-heading"
            className="mt-3 font-display text-lg font-extrabold text-brand-deep"
          >
            Aún no formas parte de un equipo
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Cuando el admin te asigne a un equipo esta temporada, tus entrenos y
            partidos aparecerán aquí.
          </p>
        </section>
      ) : null}

      {dashboardData.weekEvents.length > 1 ? (
        <section aria-labelledby="this-week-heading">
          <h2
            id="this-week-heading"
            className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-600"
          >
            Esta semana
          </h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {dashboardData.weekEvents.slice(0, 10).map((e) => (
              <WeekEventCard key={e.id} event={e} now={now} />
            ))}
          </div>
        </section>
      ) : null}

      {dashboardData.seasonStats ? (
        <section
          aria-labelledby="your-season-heading"
          className="rounded-lg border border-ink-300 bg-paper p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-foam text-brand-deep">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h2
              id="your-season-heading"
              className="font-display text-base font-bold text-brand-deep"
            >
              Tu temporada
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <SeasonStatCard
              label="Goles"
              value={String(dashboardData.seasonStats.goals)}
              color="var(--success)"
              icon={<Goal className="h-3.5 w-3.5" />}
            />
            <SeasonStatCard
              label="Asistencia del mes"
              value={
                dashboardData.seasonStats.month_attendance_pct > 0
                  ? `${dashboardData.seasonStats.month_attendance_pct}%`
                  : "—"
              }
              color="var(--brand-blue)"
              icon={<Calendar className="h-3.5 w-3.5" />}
            />
            <SeasonStatCard
              label="Racha"
              value={
                dashboardData.seasonStats.attendance_streak > 0
                  ? `${dashboardData.seasonStats.attendance_streak} seguidos`
                  : "—"
              }
              color="var(--brand-action)"
              icon={<Sparkles className="h-3.5 w-3.5" />}
            />
          </div>
        </section>
      ) : null}

      {dashboardData.recentActivity.length > 0 ? (
        <section aria-labelledby="activity-heading">
          <h2
            id="activity-heading"
            className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-600"
          >
            Actividad reciente
          </h2>
          <div className="flex flex-col gap-3 rounded-lg border border-ink-300 bg-paper p-4">
            {dashboardData.recentActivity.slice(0, 6).map((a) => (
              <ActivityItem key={a.id} activity={a} />
            ))}
          </div>
        </section>
      ) : null}

      {isAdmin ? (
        <section aria-labelledby="admin-shortcuts-heading">
          <h2
            id="admin-shortcuts-heading"
            className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-600"
          >
            Atajos de admin
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <AdminLink
              href="/admin/seasons"
              icon={<Calendar className="h-4 w-4" />}
              label="Temporadas"
            />
            <AdminLink
              href="/admin/teams"
              icon={<Users className="h-4 w-4" />}
              label="Equipos"
            />
            <AdminLink
              href="/admin/players"
              icon={<UserPlus className="h-4 w-4" />}
              label="Jugadores"
            />
            <AdminLink
              href="/admin/matches"
              icon={<Trophy className="h-4 w-4" />}
              label="Partidos"
            />
            <AdminLink
              href="/admin/trainings"
              icon={<Volleyball className="h-4 w-4" />}
              label="Entrenamientos"
            />
            <AdminLink
              href="/admin/players/import"
              icon={<FileUp className="h-4 w-4" />}
              label="Importar"
            />
          </div>
        </section>
      ) : null}

      <section
        aria-label="Enlaces rápidos"
        className="grid grid-cols-2 gap-2 border-t border-ink-300 pt-3"
      >
        <Link
          href={"/profile" as Route}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-ink-300 bg-paper text-xs font-bold text-ink-900 transition-colors hover:bg-brand-foam"
        >
          <Settings className="h-3.5 w-3.5" />
          Mi perfil
        </Link>
        {hasTeam ? (
          <Link
            href={"/calendar" as Route}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-ink-300 bg-paper text-xs font-bold text-ink-900 transition-colors hover:bg-brand-foam"
          >
            <Calendar className="h-3.5 w-3.5" />
            Calendario
          </Link>
        ) : (
          <Link
            href={"/team" as Route}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-ink-300 bg-paper text-xs font-bold text-ink-900 transition-colors hover:bg-brand-foam"
          >
            <Users className="h-3.5 w-3.5" />
            Mi equipo
          </Link>
        )}
      </section>
    </div>
  );
}

function SeasonStatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-md border border-ink-300 bg-brand-foam/30 p-3">
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
        style={{ color }}
      >
        {icon}
        {label}
      </span>
      <span className="font-display text-xl font-extrabold leading-none text-brand-deep">
        {value}
      </span>
    </div>
  );
}

function AdminLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href as Route}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-ink-300 bg-paper px-3 text-xs font-bold text-ink-900 transition-colors hover:border-brand-blue hover:bg-brand-foam"
    >
      {icon}
      {label}
    </Link>
  );
}
