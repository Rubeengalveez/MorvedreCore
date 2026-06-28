import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Flame } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getDashboardData, type DashboardWeekEvent } from "@/server/queries/dashboard";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import { getStreaksForPlayer, type ActiveStreakRow } from "@/server/queries/streaks";
import { LanePattern } from "@/components/ui/lane-pattern";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import {
  Balon,
  Calendario,
  Equipo,
  FileUp,
  Gorro,
  Porteria,
  Silbato,
  SilbatoActivo,
  Trofeo,
  Usuario,
} from "@/components/brand/pictograms";

import { DashboardHero, NextEventCard, TeamCard } from "@/components/dashboard/dashboard-blocks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inicio — Morvedre Core",
  description: "Tu resumen del día en el Waterpolo Morvedre.",
};

type AppRole = "admin" | "coach" | "delegate" | "directiva" | "parent" | "player";

async function userHasRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  role: AppRole,
): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId)
    .eq("role", role)
    .is("scope_team_id", null)
    .maybeSingle();
  return data != null;
}

const isUserAdmin = (supabase: Awaited<ReturnType<typeof createClient>>, profileId: string) =>
  userHasRole(supabase, profileId, "admin");

function toActiveStreak(row: ActiveStreakRow): ActiveStreak {
  return {
    type: row.type,
    current_value: row.current_value,
    best_value: row.best_value,
  };
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

  const [dashboardData, streaks, { data: unread }] = await Promise.all([
    teamIds.length > 0
      ? getDashboardData({ teamIds, profileId: activeProfile.id, now })
      : Promise.resolve({
          weekEvents: [],
          teamInfo: null,
          recentActivity: [],
          seasonStats: null,
        }),
    seasonId
      ? getStreaksForPlayer(seasonId, activeProfile.id)
      : Promise.resolve([] as ActiveStreakRow[]),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", activeProfile.id)
      .is("read_at", null),
  ]);

  const upcomingWeekEvents = dashboardData.weekEvents.filter(
    (e) => !e.cancelled && new Date(e.scheduled_at).getTime() >= now.getTime() - 1000 * 60 * 60 * 6,
  );
  const nextEvent: DashboardWeekEvent | null = upcomingWeekEvents[0] ?? null;
  const teamColor = dashboardData.teamInfo?.color ?? activeProfile.team_color ?? "var(--pool-blue)";

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" strong />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
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
          capNumber={activeProfile.cap_number}
        />

        {/* Tira compacta de Rachas Activas */}
        {streaks.filter((s) => s.current_value > 0).length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#FF6B35]/20 bg-[#FF6B35]/5 px-3 py-2.5 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B35] flex items-center gap-1">
              <Flame className="h-4 w-4 fill-[#FF6B35] text-[#FF6B35] animate-pulse" />
              Tus rachas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {streaks
                .filter((s) => s.current_value > 0)
                .map((streak) => {
                  const meta = STREAK_METADATA[streak.type];
                  return (
                    <div
                      key={streak.type}
                      title={`Récord histórico: ${streak.best_value}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink-300 bg-paper px-2.5 py-1 text-xs font-bold text-pool-deep shadow-sm"
                    >
                      <span className="text-[#FF6B35] font-extrabold">🔥 {streak.current_value}</span>
                      <span className="text-ink-600 text-[10px] font-semibold">
                        {meta.label.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : null}

        <section aria-labelledby="next-event-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="next-event-heading" className="text-eyebrow text-ink-600">
              Tu próximo evento
            </h2>
            <Link
              href={"/calendar" as Route}
              className="text-pool-blue text-xs font-bold hover:underline"
            >
              Calendario
            </Link>
          </div>
          <NextEventCard event={nextEvent} now={now} />
        </section>

        {hasTeam && dashboardData.teamInfo ? (
          <section aria-labelledby="your-team-heading">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="your-team-heading" className="text-eyebrow text-ink-600">
                Tu equipo
              </h2>
              <Link
                href={"/team" as Route}
                className="text-pool-blue text-xs font-bold hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <TeamCard team={dashboardData.teamInfo} />
          </section>
        ) : !hasTeam ? (
          <section
            aria-labelledby="no-team-heading"
            className="border-ink-300 bg-paper rounded-md border-2 border-dashed p-6 text-center"
          >
            <PictogramBadge pictogram={Silbato} color="var(--ink-400)" size="lg" />
            <h2
              id="no-team-heading"
              className="font-display text-pool-deep mt-3 text-lg font-extrabold"
            >
              Aún no formas parte de un equipo
            </h2>
            <p className="text-ink-600 mt-1 text-sm">
              Cuando el admin te asigne a un equipo esta temporada, tus entrenos y partidos
              aparecerán aquí.
            </p>
          </section>
        ) : null}

        {isAdmin ? (
          <section aria-labelledby="admin-shortcuts-heading">
            <h2 id="admin-shortcuts-heading" className="text-eyebrow text-ink-600 mb-2">
              Atajos de admin
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <AdminLink
                href="/admin/seasons"
                pictogram={Calendario}
                label="Temporadas"
                color="var(--pool-teal)"
              />
              <AdminLink
                href="/admin/teams"
                pictogram={Equipo}
                label="Equipos"
                color="var(--pool-blue)"
              />
              <AdminLink
                href="/admin/players"
                pictogram={Usuario}
                label="Jugadores"
                color="var(--action)"
              />
              <AdminLink
                href="/admin/matches"
                pictogram={Gorro}
                label="Partidos"
                color="var(--goggle-red)"
              />
              <AdminLink
                href="/admin/trainings"
                pictogram={SilbatoActivo}
                label="Entrenamientos"
                color="var(--success)"
              />
              <AdminLink
                href="/admin/players/import"
                pictogram={FileUp}
                label="Importar"
                color="var(--ball-gold)"
              />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function AdminLink({
  href,
  pictogram: Pictogram,
  label,
  color,
}: {
  href: string;
  pictogram: React.ComponentType<{ className?: string; accent?: string }>;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href as Route}
      data-admin-shortcut
      className="border-ink-300 bg-paper-card text-ink-900 hover:border-pool-blue hover:bg-pool-foam inline-flex h-11 items-center gap-2.5 rounded-md border px-3 text-xs font-bold transition-colors"
    >
      <PictogramBadge pictogram={Pictogram} color={color} size="sm" />
      {label}
    </Link>
  );
}

interface ActiveStreak {
  type: "goals_consec" | "excl_consec" | "train_consec" | "mvp_consec" | "wins_consec";
  current_value: number;
  best_value: number;
}

const STREAK_METADATA: Record<
  ActiveStreak["type"],
  { label: string; color: string; pictogram: React.ComponentType<{ className?: string; accent?: string }> }
> = {
  goals_consec: {
    label: "Goles seguidos",
    color: "var(--success)",
    pictogram: Porteria,
  },
  excl_consec: {
    label: "Exclusiones seguidas",
    color: "var(--goggle-red)",
    pictogram: Silbato,
  },
  train_consec: {
    label: "Entrenos seguidos",
    color: "var(--pool-teal)",
    pictogram: Balon,
  },
  mvp_consec: {
    label: "MVP seguidos",
    color: "var(--ball-gold)",
    pictogram: Trofeo,
  },
  wins_consec: {
    label: "Victorias seguidas",
    color: "var(--pool-blue)",
    pictogram: Trofeo,
  },
};

function StreakStrip({ streaks }: { streaks: ActiveStreak[] }) {
  const active = streaks.filter((s) => s.current_value > 0);

  if (active.length === 0) {
    return (
      <p className="text-ink-500 text-xs italic">Sin rachas activas en este momento.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {active.map((streak) => {
        const meta = STREAK_METADATA[streak.type];
        if (!meta) return null;
        return (
          <div
            key={streak.type}
            className="border-ink-300 bg-paper-card/50 flex flex-col gap-1 rounded-md border p-3"
          >
            <div className="flex items-center gap-1.5">
              <PictogramBadge pictogram={meta.pictogram} color={meta.color} size="xs" />
              <span className="text-ink-600 text-[10px] font-bold uppercase tracking-wider">
                {meta.label}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-pool-deep text-2xl font-extrabold leading-none">
                {streak.current_value}
              </span>
              <span className="text-ink-500 text-[10px] font-medium">
                (récord: {streak.best_value})
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
