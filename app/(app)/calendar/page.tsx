import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Equipo, Silbato } from "@/components/brand/pictograms";
import { CalendarView, type CalendarViewTeam } from "@/components/calendar/calendar-view";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getCalendarData,
  type CalendarData,
} from "@/server/queries/calendar";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import { currentYearMonth, daysInMonth, todayIso, addDaysIso } from "@/lib/domain/calendar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Calendario — Morvedre Core",
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

async function loadCoachTeams(
  profileId: string,
  seasonId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("scope_team_id, teams!user_roles_scope_team_id_fkey(season_id)")
    .eq("profile_id", profileId)
    .eq("role", "coach");
  const out: string[] = [];
  for (const row of (data ?? []) as Array<{
    scope_team_id: string | null;
    teams: unknown;
  }>) {
    if (!row.scope_team_id) continue;
    const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
    const seasonIdOfTeam = (team as { season_id?: string } | null)?.season_id;
    if (seasonIdOfTeam === seasonId) {
      out.push(row.scope_team_id);
    }
  }
  return out;
}

export default async function CalendarPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { activeProfile } = ctx;

  const season = await getCurrentSeason();

  const calendarTeams: CalendarViewTeam[] = season
    ? (await getTeamsForProfileInSeason(activeProfile.id, season.id)).map((t) => ({
        id: t.id,
        label: t.label,
        color: t.color,
      }))
    : [];

  const teamIds = calendarTeams.map((t) => t.id);
  const coachTeamIds = season
    ? await loadCoachTeams(activeProfile.id, season.id)
    : [];
  const isCoach = coachTeamIds.length > 0;
  const isAdmin = await loadAdminFlag(activeProfile.id);

  const ym = currentYearMonth();
  const now = new Date();
  const startIso = new Date(ym.year, ym.month, 1, 0, 0, 0).toISOString();
  const endIso = new Date(
    ym.year,
    ym.month,
    daysInMonth(ym.year, ym.month),
    23,
    59,
    59,
  ).toISOString();

  const eventsByDay: CalendarData = teamIds.length
    ? await getCalendarData({
        teamIds,
        startIso,
        endIso,
        profileId: activeProfile.id,
      })
    : new Map();

  const supabase = await createClient();
  const today = todayIso();
  const monthAhead = addDaysIso(today, 30);
  const { data: availabilityData } = await supabase
    .from("match_availability")
    .select("date, available, reason")
    .eq("player_id", activeProfile.id)
    .gte("date", today)
    .lte("date", monthAhead);

  const availabilityByDay = new Map<string, boolean>();
  for (const row of availabilityData ?? []) {
    const r = row as { date: string; available: boolean };
    availabilityByDay.set(r.date, r.available);
  }

  const { data: attendanceData } = await supabase
    .from("training_attendance")
    .select("session_id, present")
    .eq("player_id", activeProfile.id)
    .gte("marked_at", new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60).toISOString());
  const userAttendanceBySession = new Map<string, boolean>();
  for (const a of attendanceData ?? []) {
    const ar = a as { session_id: string; present: boolean };
    userAttendanceBySession.set(ar.session_id, ar.present);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-tight text-brand-deep">
          Tu mes en el club
        </h1>
        <p className="text-sm leading-relaxed text-ink-600">
          Aquí verás tus entrenos, partidos y eventos.
        </p>
      </header>

      {teamIds.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-ink-300 bg-paper p-8 text-center">
          <Silbato className="h-12 w-12" accent="var(--brand-aqua)" />
          <p className="text-sm leading-relaxed text-ink-600">
            Aún no formas parte de un equipo esta temporada. Cuando tu entrenador
            te asigne, tus entrenos y partidos aparecerán aquí.
          </p>
        </div>
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
          showAttendance
        />
      )}

      {isCoach ? (
        <p className="flex items-center gap-2 px-1 text-xs text-ink-600">
          <Equipo className="h-4 w-4" accent="var(--brand-aqua)" />
          Como entrenador, podrás cancelar sesiones desde la papeleta del día.
        </p>
      ) : null}
    </div>
  );
}
