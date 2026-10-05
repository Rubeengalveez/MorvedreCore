import { getAttendanceDayKey } from "./attendance";
import { canAccessAdminArea, canAccessAdminModule, type AdminCapabilities } from "./permissions";
import type { DashboardWeekEvent } from "@/server/queries/dashboard";

export interface HomePerson {
  id: string;
  name: string;
  photo: string | null;
  teamIds: string[];
  staffTeamIds: string[];
}

export interface HomeEvent extends DashboardWeekEvent {
  personIds: string[];
  calledPersonIds: string[];
  canOpenActa: boolean;
}

export interface HomeTask {
  id: string;
  title: string;
  detail: string;
  href: string;
  count: number;
  kind: "orders" | "attendance" | "live";
}

export function peopleForEvent(event: DashboardWeekEvent, people: HomePerson[]) {
  return people
    .filter((person) =>
      (event.team_ids ?? [event.team_id]).some((teamId) => {
        if (!person.teamIds.includes(teamId)) return false;
        if (event.kind === "match" || person.staffTeamIds.includes(teamId)) return true;
        const audience =
          event.team_player_ids && teamId in event.team_player_ids
            ? event.team_player_ids[teamId]
            : event.player_ids;
        return !audience || audience.includes(person.id);
      }),
    )
    .map((person) => person.id);
}

export function homeEventIsCurrent(event: DashboardWeekEvent, now: Date) {
  if (event.cancelled || event.status === "cancelled" || event.status === "played") return false;
  if (event.kind === "match" && event.status === "in_progress") return true;
  const end = new Date(event.scheduled_at).getTime() + (event.duration_minutes ?? 120) * 60000;
  return end > now.getTime();
}

export function homeDate(value: string, now: string, includeTime = false) {
  const date = new Date(value);
  const day = getAttendanceDayKey(date);
  const today = getAttendanceDayKey(now);
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const label =
    day === today
      ? "Hoy"
      : day === getAttendanceDayKey(tomorrow)
        ? "Mañana"
        : new Intl.DateTimeFormat("es-ES", {
            timeZone: "Europe/Madrid",
            weekday: "short",
            day: "numeric",
            month: "short",
          })
            .format(date)
            .replaceAll(".", "");
  return includeTime ? `${label} · ${homeTime(value)}` : label;
}

export function homeTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function homeManagementLinks(access: AdminCapabilities, canPassList: boolean) {
  const links: Array<{
    href: string;
    label: string;
    kind: "attendance" | "admin" | "shop" | "treasury";
  }> = [];
  if (canPassList)
    links.push({ href: "/attendance?from=dashboard", label: "Pasar lista", kind: "attendance" });
  const modules = [
    "manage_matches",
    "manage_trainings",
    "manage_shop",
    "manage_treasury",
    "manage_news",
    "manage_players",
    "manage_families",
    "manage_staff",
    "manage_teams",
  ] as const;
  const allowed = modules.filter((permission) => canAccessAdminModule(access, permission));
  if (!access.isAdmin && allowed.length === 1 && allowed[0] === "manage_shop")
    links.push({ href: "/admin/shop?view=orders", label: "Gestionar tienda", kind: "shop" });
  else if (!access.isAdmin && allowed.length === 1 && allowed[0] === "manage_treasury")
    links.push({ href: "/admin/treasury", label: "Tesorería", kind: "treasury" });
  else if (canAccessAdminArea(access))
    links.push({ href: "/admin", label: "Administración", kind: "admin" });
  return links;
}
