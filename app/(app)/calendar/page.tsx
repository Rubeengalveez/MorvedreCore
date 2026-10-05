import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { PageBackLink } from "@/components/ui/page-back-link";
import { PageShell } from "@/components/ui/page-shell";
import { CalendarView, type CalendarViewTeam } from "@/components/calendar/calendar-view";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCalendarData } from "@/server/queries/calendar";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import {
  calendarMonth,
  calendarMonthKey,
  compactMonthCells,
  mergeCalendarData,
} from "@/lib/domain/calendar-presentation";
import { notificationBackTarget } from "@/lib/domain/notifications";
import { addDaysIso } from "@/lib/domain/calendar";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Calendario — Morvedre Core",
  description: "Tus entrenamientos, partidos y asistencia.",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    notificationId?: string;
    month?: string;
    player?: string;
    team?: string;
    day?: string;
  }>;
}) {
  const [params, ctx, season, access] = await Promise.all([
    searchParams,
    getActiveProfileContext(),
    getCurrentSeason(),
    getRenderAdminAccess(),
  ]);
  if (!ctx) redirect("/login");
  const profileTeams = season
    ? await Promise.all(
        [ctx.ownProfile, ...ctx.linkedProfiles].map(async (profile) => ({
          profile,
          teams: await getTeamsForProfileInSeason(profile.id, season.id),
        })),
      )
    : [];
  const people = profileTeams.filter((entry) => entry.teams.length > 0);
  const requested = people.find((entry) => entry.profile.id === params.player);
  const selected =
    params.player === "all"
      ? people
      : requested
        ? [requested]
        : people.filter((entry) => entry.profile.id === ctx.activeProfile.id).length
          ? people.filter((entry) => entry.profile.id === ctx.activeProfile.id)
          : people.slice(0, 1);
  const player = selected.length === 1 ? selected[0]!.profile.id : "all";
  const teams = Array.from(
    new Map(
      selected
        .flatMap((entry) => entry.teams)
        .map((team) => [team.id, { id: team.id, label: team.label, color: team.color }]),
    ).values(),
  ) as CalendarViewTeam[];
  const selectedTeam = teams.some((team) => team.id === params.team) ? params.team! : "";
  const ym = calendarMonth(params.month);
  const month = calendarMonthKey(ym);
  const cells = compactMonthCells(ym.year, ym.month);
  const firstDay = cells[0]!.iso;
  const lastDay = cells.at(-1)!.iso;
  const startIso = `${addDaysIso(firstDay, -1)}T00:00:00.000Z`;
  const endIso = `${addDaysIso(lastDay, 1)}T23:59:59.999Z`;
  const supabase = await createClient();
  const roster = people.length
    ? await supabase
        .from("team_rosters")
        .select("player_id,team_id")
        .in(
          "player_id",
          people.map((entry) => entry.profile.id),
        )
        .is("left_at", null)
    : { data: [], error: null };
  if (roster.error) throw new Error("No pudimos cargar las plantillas del calendario.");
  const datasets = await Promise.all(
    selected.map(async ({ profile, teams: personTeams }) => {
      const teamIds = personTeams
        .filter((team) => !selectedTeam || team.id === selectedTeam)
        .map((team) => team.id);
      const data = await getCalendarData({
        teamIds,
        startIso,
        endIso,
        profileId: profile.id,
        includeCalledMatches: !selectedTeam,
      });
      for (const date of data.keys()) if (date < firstDay || date > lastDay) data.delete(date);
      const sessionIds = Array.from(data.values()).flatMap((day) =>
        day.trainings.map((training) => training.id),
      );
      const attendance = sessionIds.length
        ? await supabase
            .from("training_attendance")
            .select("session_id,present,reason")
            .eq("player_id", profile.id)
            .in("session_id", sessionIds)
        : { data: [], error: null };
      if (attendance.error) throw new Error("No pudimos cargar la asistencia del calendario.");
      const bySession = new Map((attendance.data ?? []).map((row) => [row.session_id, row]));
      for (const day of data.values())
        for (const training of day.trainings) {
          const record = bySession.get(training.id);
          training.attendance = roster.data?.some(
            (row) => row.player_id === profile.id && row.team_id === training.team_id,
          )
            ? [
                {
                  player_id: profile.id,
                  name: profile.full_name,
                  present: record?.present ?? null,
                  reason: record?.reason ?? null,
                },
              ]
            : [];
          training.can_manage = access.isAdmin || access.coachTeamIds.has(training.team_id);
        }
      for (const day of data.values())
        for (const match of day.matches)
          if (match.callup_status)
            match.callups = [
              {
                player_id: profile.id,
                name: profile.full_name,
                status: match.callup_status,
                cap_number: match.cap_number,
              },
            ];
      return data;
    }),
  );
  const back =
    params.from === "dashboard"
      ? { href: "/dashboard", label: "Inicio" }
      : notificationBackTarget(params.from, params.notificationId);
  return (
    <PageShell width="md" className="gap-3 py-3 sm:py-4">
      {back && <PageBackLink href={back.href as Route}>{back.label}</PageBackLink>}
      <CalendarView
        key={`${month}/${player}/${selectedTeam}`}
        teams={teams}
        people={people.map((entry) => ({ id: entry.profile.id, name: entry.profile.full_name }))}
        player={player}
        team={selectedTeam}
        yearMonth={ym}
        eventsByDay={mergeCalendarData(datasets)}
        initialDay={params.day}
        origin={params.from}
        notificationId={params.notificationId}
        canManageAttendance={access.isAdmin || access.coachTeamIds.size > 0}
      />
    </PageShell>
  );
}
