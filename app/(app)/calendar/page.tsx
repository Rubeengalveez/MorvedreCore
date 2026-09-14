import type { Metadata } from "next";




import { redirect } from "next/navigation";


import { Equipo, Silbato } from "@/components/brand/pictograms";
import { CalendarView, type CalendarViewTeam } from "@/components/calendar/calendar-view";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCalendarData, type CalendarData } from "@/server/queries/calendar";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import { addDaysIso, currentYearMonth, todayIso } from "@/lib/domain/calendar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Calendario - Morvedre Core",
  description: "Tus entrenos, partidos y eventos.",
};

async function loadAdminFlag(profileId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();
  return data != null;
}

async function loadCoachTeams(profileId: string, seasonId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("scope_team_id, teams!user_roles_scope_team_id_fkey(season_id)")
    .eq("profile_id", profileId)
    .eq("role", "coach");
  const out: string[] = [];
  for (const row of (data ?? []) as Array<{ scope_team_id: string | null; teams: unknown }>) {
    if (!row.scope_team_id) continue;
    const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
    const seasonIdOfTeam = (team as { season_id?: string } | null)?.season_id;
    if (seasonIdOfTeam === seasonId) out.push(row.scope_team_id);
  }
  return out;
}

export default async function CalendarPage() {
  const supabase = await createClient();
  const [ctx, season] = await Promise.all([getActiveProfileContext(), getCurrentSeason()]);
  if (!ctx) redirect("/login");
  const { activeProfile, linkedProfiles, ownProfile } = ctx;

  const profileTeams = season
    ? await Promise.all(
        [ownProfile, ...linkedProfiles].map(async (profile) => ({
          profile,
          teams: await getTeamsForProfileInSeason(profile.id, season.id),
        })),
      )
    : [];
  const teamMap = new Map<string, CalendarViewTeam & { memberNames: string[] }>();
  for (const { profile, teams } of profileTeams) {
    for (const team of teams) {
      const current = teamMap.get(team.id) ?? {
        id: team.id,
        label: team.label,
        color: team.color,
        memberNames: [],
      };
      if (profile.id !== ownProfile.id) {
        current.memberNames.push(profile.full_name.split(/\s+/)[0] ?? profile.full_name);
      }
      teamMap.set(team.id, current);
    }
  }
  const calendarTeams: CalendarViewTeam[] = Array.from(teamMap.values()).map((team) => ({
    id: team.id,
    label:
      team.memberNames.length > 0 ? `${team.label} · ${team.memberNames.join(" y ")}` : team.label,
    color: team.color,
  }));

  const teamIds = calendarTeams.map((t) => t.id);
  const ym = currentYearMonth();
  const startIso = new Date(ym.year, ym.month - 2, 1, 0, 0, 0).toISOString();
  const endIso = new Date(ym.year, ym.month + 3, 0, 23, 59, 59).toISOString();

  const [coachTeamIds, isAdmin, eventsByDay] = await Promise.all([
    season ? loadCoachTeams(activeProfile.id, season.id) : Promise.resolve([]),
    loadAdminFlag(activeProfile.id),
    teamIds.length
      ? getCalendarData({
          teamIds,
          startIso,
          endIso,
          profileId: activeProfile.id,
        })
      : Promise.resolve(new Map() as CalendarData),
  ]);
  const isCoach = coachTeamIds.length > 0;

  const today = todayIso();
  const monthAhead = addDaysIso(today, 30);
  const attendanceProfileIds = profileTeams
    .filter((entry) => entry.teams.length > 0)
    .map((entry) => entry.profile.id);
  const trainingSessionIds = Array.from(eventsByDay.values()).flatMap((day) =>
    day.trainings.map((training) => training.id),
  );
  const [availabilityRes, attendanceRes] = await Promise.all([
    supabase
      .from("match_availability")
      .select("date, available, reason")
      .eq("player_id", activeProfile.id)
      .gte("date", today)
      .lte("date", monthAhead),
    attendanceProfileIds.length > 0 && trainingSessionIds.length > 0
      ? supabase
          .from("training_attendance")
          .select("session_id, present")
          .in("player_id", attendanceProfileIds)
          .in("session_id", trainingSessionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const availabilityByDay = new Map<string, boolean>();
  for (const row of availabilityRes.data ?? []) {
    const r = row as { date: string; available: boolean };
    availabilityByDay.set(r.date, r.available);
  }

  const userAttendanceBySession = new Map<string, boolean>();
  for (const a of attendanceRes.data ?? []) {
    const ar = a as { session_id: string; present: boolean };
    const current = userAttendanceBySession.get(ar.session_id);
    userAttendanceBySession.set(ar.session_id, current === false ? false : ar.present);
  }

  return (
    <PageShell width="lg" className="gap-4 pb-0 sm:pb-0">
      <PageHeader
        eyebrow="Tu agenda deportiva"
        title="Tu mes"
        description={
          linkedProfiles.length > 0
            ? "Los entrenamientos y partidos de toda tu familia, juntos."
            : "Entrenamientos, partidos y disponibilidad en una sola vista."
        }
        icon={<Silbato className="h-7 w-7 shrink-0" accent="currentColor" />}
      />

      {teamIds.length === 0 ? (
        <EmptyState
          icon={<Silbato className="h-7 w-7" accent="currentColor" />}
          title="Tu calendario está vacío"
          description="Cuando formes parte de un equipo, tus entrenamientos y partidos aparecerán aquí."
        />
      ) : (
        <CalendarView
          teams={calendarTeams}
          defaultTeamId={calendarTeams[0]?.id ?? null}
          eventsByDay={eventsByDay}
          availabilityByDay={availabilityByDay}
          isCoach={isCoach}
          isAdmin={isAdmin}
          activeProfileId={activeProfile.id}
          userAttendanceBySession={userAttendanceBySession}
          showAttendance={attendanceProfileIds.length > 0}
        />
      )}



      {isCoach ? (
        <p className="text-ink-600 flex items-center gap-2 px-1 text-sm font-medium">
          <Equipo className="h-4 w-4" accent="var(--pool-teal)" />
          Como entrenador, puedes cancelar sesiones desde el detalle del día.
        </p>
      ) : null}
    </PageShell>
  );
}
