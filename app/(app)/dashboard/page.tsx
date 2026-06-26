import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { UserPlus, Calendar, Users, FileUp, Volleyball, Trophy, Activity, Settings } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCalendarData } from "@/server/queries/calendar";
import { getDashboardData, type DashboardWeekEvent } from "@/server/queries/dashboard";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import { inferCategory, type CategoryCode } from "@/lib/domain/categories";

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
  const todayIso = now.toISOString().slice(0, 10);
  const monthAhead = new Date(now);
  monthAhead.setDate(monthAhead.getDate() + 30);
  const startIso = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString();
  const endIso = monthAhead.toISOString();

  const [eventsByDay, dashboardData, { data: unread }] = await Promise.all([
    teamIds.length > 0
      ? getCalendarData({ teamIds, startIso, endIso, profileId: activeProfile.id })
      : Promise.resolve(new Map()),
    teamIds.length > 0
      ? getDashboardData({ teamIds, profileId: activeProfile.id, now })
      : Promise.resolve({ weekEvents: [], teamInfo: null, recentActivity: [] }),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", activeProfile.id)
      .is("read_at", null),
  ]);

  const availabilityByDay = new Map<string, boolean>();
  const nextEvent: DashboardWeekEvent | null =
    dashboardData.weekEvents.find((e) => !e.cancelled) ?? null;

  const birthYear: number | null = ownProfile?.birth_year ?? null;
  let categoryLabel: string | null = null;
  if (birthYear != null) {
    try {
      categoryLabel = inferCategory(birthYear, now.getFullYear());
    } catch {
      categoryLabel = null;
    }
  }

  const teamColor = dashboardData.teamInfo?.color ?? null;

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
      />

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
