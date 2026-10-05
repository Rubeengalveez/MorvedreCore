import { teamAdminOrigin, teamNestedOrigin } from "./team-navigation-origin";
import { notificationBackTarget } from "./notifications";
import { calendarBackHref } from "./calendar-presentation";
export function getTeamMatchHref(
  matchId: string,
  teamId: string,
  tab: "principal" | "partidos",
  list?: "upcoming" | "played",
  visibleCount = 5,
  context = "",
) {
  const params = new URLSearchParams({ from: "team", teamId, teamTab: tab });
  for (const [key, value] of teamNestedOrigin(context)) params.set(key, value);
  if (list) params.set("teamList", list);
  if (visibleCount > 5) params.set("teamCount", String(Math.min(1000, visibleCount)));
  return `/matches/${matchId}?${params}`;
}

export function getMatchBackTarget(input: {
  from?: string;
  notificationId?: string;
  teamId?: string;
  teamTab?: string;
  teamList?: string;
  teamCount?: string;
  teamFrom?: string;
  teamAdminTab?: string;
  matchTeamId: string;
  calendarMonth?: string;
  calendarPlayer?: string;
  calendarTeam?: string;
  calendarDay?: string;
}) {
  if (input.from === "calendar") return { href: calendarBackHref(input), label: "Calendario" };
  if (input.from === "dashboard") return { href: "/dashboard", label: "Inicio" };
  const notification = notificationBackTarget(input.from, input.notificationId);
  if (notification) return notification;
  if (
    input.from === "team" &&
    input.teamId === input.matchTeamId &&
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(input.teamId)
  ) {
    const tab = input.teamTab === "partidos" ? "partidos" : "principal";
    const params = new URLSearchParams({ tab });
    if (tab === "partidos" && (input.teamList === "played" || input.teamList === "upcoming"))
      params.set("list", input.teamList);
    const count = Number(input.teamCount);
    if (tab === "partidos" && Number.isInteger(count) && count > 5 && count <= 1000)
      params.set("count", String(count));
    const origin = teamAdminOrigin(input.teamId, input.teamFrom, input.teamAdminTab);
    for (const [key, value] of new URLSearchParams(origin.context)) params.set(key, value);
    return { href: `/team/${input.teamId}?${params}`, label: "Volver al equipo" };
  }
  return { href: "/calendar", label: "Calendario" };
}
