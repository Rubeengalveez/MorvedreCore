import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import type { Tables } from "@/types/database";

const querySchema = z.object({
  team: z.string().uuid().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

type CalendarTraining = Tables<"training_sessions", "Row">;
type CalendarMatch = Tables<"matches", "Row">;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatIcsDate(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  if (allDay) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  }
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let remaining = line;
  while (remaining.length > 75) {
    out.push(remaining.slice(0, 75));
    remaining = ` ${remaining.slice(75)}`;
  }
  out.push(remaining);
  return out.join("\r\n");
}

function trainingToVEvent(t: CalendarTraining, teamLabel: string, teamColor: string): string {
  const start = formatIcsDate(t.scheduled_at, false);
  const end = formatIcsDate(
    new Date(new Date(t.scheduled_at).getTime() + t.duration_minutes * 60_000).toISOString(),
    false,
  );
  const summary = escapeIcs(`Entreno ${teamLabel}`);
  const desc = escapeIcs(
    t.cancelled ? `Cancelado. Motivo: ${t.cancellation_reason ?? ""}` : (t.location ?? ""),
  );
  return [
    "BEGIN:VEVENT",
    `UID:training-${t.id}@morvedre-core`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString(), false)}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    desc ? `DESCRIPTION:${desc}` : "",
    t.location ? `LOCATION:${escapeIcs(t.location)}` : "",
    t.cancelled ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    `CATEGORIES:Morvedre,Entreno,${escapeIcs(teamLabel)}`,
    `COLOR:${teamColor.replace("#", "")}`,
    "END:VEVENT",
  ]
    .filter(Boolean)
    .map(foldLine)
    .join("\r\n");
}

function matchToVEvent(m: CalendarMatch, teamLabel: string, teamColor: string): string {
  const start = formatIcsDate(m.scheduled_at, false);
  const end = formatIcsDate(
    new Date(new Date(m.scheduled_at).getTime() + 2 * 60 * 60_000).toISOString(),
    false,
  );
  const summary = escapeIcs(
    m.is_home ? `${teamLabel} vs ${m.opponent}` : `${m.opponent} vs ${teamLabel}`,
  );
  const desc = [
    `Competición: ${m.competition_type}`,
    m.location ? `Sede: ${m.location}` : "",
    m.pool_name ? `Piscina: ${m.pool_name}` : "",
    m.notes ? `Notas: ${m.notes}` : "",
  ]
    .filter(Boolean)
    .join("\\n");
  const uid = `match-${m.id}@morvedre-core`;
  const status =
    m.status === "cancelled" ? "CANCELLED" : m.status === "postponed" ? "CANCELLED" : "CONFIRMED";
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString(), false)}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    desc ? `DESCRIPTION:${desc}` : "",
    m.location ? `LOCATION:${escapeIcs(m.location)}` : "",
    `STATUS:${status}`,
    `CATEGORIES:Morvedre,Partido,${escapeIcs(teamLabel)}`,
    `COLOR:${teamColor.replace("#", "")}`,
    "END:VEVENT",
  ]
    .filter(Boolean)
    .map(foldLine)
    .join("\r\n");
}

export async function GET(request: Request) {
  const ctx = await getActiveProfileContext();
  if (!ctx) {
    return new NextResponse("Not authenticated", { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    team: url.searchParams.get("team") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return new NextResponse("Invalid query params", { status: 400 });
  }

  const { activeProfile } = ctx;
  const season = await getCurrentSeason();
  if (!season) {
    return new NextResponse("No current season", { status: 404 });
  }

  const teams = await getTeamsForProfileInSeason(activeProfile.id, season.id);
  const teamsFiltered = parsed.data.team ? teams.filter((t) => t.id === parsed.data.team) : teams;
  const teamIds = teamsFiltered.map((t) => t.id);
  const teamIdToLabel = new Map<string, string>();
  for (const t of teamsFiltered) {
    teamIdToLabel.set(t.id, t.label);
  }
  const teamIdToColor = new Map<string, string>();
  for (const t of teamsFiltered) {
    teamIdToColor.set(t.id, t.color);
  }

  if (teamIds.length === 0) {
    return new NextResponse(generateIcs([], [], "Morvedre"), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="morvedre.ics"',
      },
    });
  }

  const admin = createAdminClient();
  const now = parsed.data.from
    ? new Date(`${parsed.data.from}T00:00:00Z`).toISOString()
    : new Date().toISOString();
  const toIso = parsed.data.to
    ? new Date(`${parsed.data.to}T23:59:59Z`).toISOString()
    : new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();

  const [{ data: trainings }, { data: matches }] = await Promise.all([
    admin
      .from("training_sessions")
      .select("*")
      .in("team_id", teamIds)
      .gte("scheduled_at", now)
      .lte("scheduled_at", toIso)
      .order("scheduled_at", { ascending: true }),
    admin
      .from("matches")
      .select("*")
      .in("team_id", teamIds)
      .gte("scheduled_at", now)
      .lte("scheduled_at", toIso)
      .order("scheduled_at", { ascending: true }),
  ]);

  const trainingEvents = (trainings ?? []).map((t) =>
    trainingToVEvent(
      t,
      teamIdToLabel.get(t.team_id) ?? "Equipo",
      teamIdToColor.get(t.team_id) ?? "#0A2E5C",
    ),
  );
  const matchEvents = (matches ?? []).map((m) =>
    matchToVEvent(
      m,
      teamIdToLabel.get(m.team_id) ?? "Equipo",
      teamIdToColor.get(m.team_id) ?? "#0A2E5C",
    ),
  );

  const ics = generateIcs(trainingEvents, matchEvents, "Morvedre");
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="morvedre.ics"',
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function generateIcs(trainingVEvents: string[], matchVEvents: string[], calName: string): string {
  const now = formatIcsDate(new Date().toISOString(), false);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Morvedre Core//Calendar//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeIcs(calName)}`),
    foldLine(`X-WR-CALDESC:${escapeIcs("Calendario de Morvedre Core")}`),
    `DTSTAMP:${now}`,
    ...trainingVEvents,
    ...matchVEvents,
    "END:VCALENDAR",
  ].join("\r\n");
}
