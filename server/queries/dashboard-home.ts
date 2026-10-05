import { createClient } from "@/lib/supabase/server";
import { canUseLiveMatch, hasGlobalPermission } from "@/lib/domain/permissions";
import {
  homeManagementLinks,
  homeEventIsCurrent,
  peopleForEvent,
  type HomeEvent,
  type HomePerson,
  type HomeTask,
} from "@/lib/domain/home";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import { getActiveProfileContext } from "./active-profile";
import { getCurrentSeason } from "./seasons";
import {
  getDashboardAudience,
  getUpcomingDashboardEvents,
  getClubDayKey,
  getCoachAttendanceSessions,
} from "./dashboard";
import { getSeasonActaStats } from "./rankings";
import { ACTIVE_SHOP_STATUSES } from "@/lib/domain/shop-management";
import { sheetSchema } from "@/lib/domain/live-match";
import { getMatchScoreboardState } from "@/lib/domain/match-scoreboard-state";

export async function getDashboardHome() {
  const ctx = await getActiveProfileContext();
  if (!ctx) return null;
  const [season, access] = await Promise.all([getCurrentSeason(), getRenderAdminAccess()]);
  const now = new Date();
  const client = await createClient();
  const profiles = [ctx.ownProfile, ...ctx.linkedProfiles];
  const profileIds = profiles.map((p) => p.id);
  const audience = season ? await getDashboardAudience(ctx.ownProfile.id, season.id) : null;
  const { data: rosters, error: rosterError } = season
    ? await client
        .from("team_rosters")
        .select("player_id,team_id,teams!inner(id,label,color,season_id)")
        .in("player_id", profileIds)
        .is("left_at", null)
        .eq("teams.season_id", season.id)
    : { data: [], error: null };
  if (rosterError) throw new Error("No pudimos cargar tus equipos.");
  const staffTeams = audience?.staff_teams ?? [];
  const people: HomePerson[] = profiles.map((p) => ({
    id: p.id,
    name: p.full_name,
    photo: p.photo_url,
    teamIds: [
      ...new Set([
        ...(rosters ?? []).filter((r) => r.player_id === p.id).map((r) => r.team_id),
        ...(p.id === ctx.ownProfile.id ? staffTeams.map((t) => t.id) : []),
      ]),
    ],
    staffTeamIds: p.id === ctx.ownProfile.id ? staffTeams.map((t) => t.id) : [],
  }));
  const teamIds = [...new Set(people.flatMap((p) => p.teamIds))];
  const sportTeamIds = [...new Set((rosters ?? []).map((r) => r.team_id))];
  const teamLabels = new Map((rosters ?? []).map((r) => [r.team_id, r.teams.label]));
  for (const team of staffTeams) teamLabels.set(team.id, team.label);
  const childIds = ctx.linkedProfiles.map((p) => p.id);
  const from = new Date(now.getTime() - 8 * 3600000).toISOString();
  const until = new Date(now.getTime() + 30 * 86400000).toISOString();
  const tasks: HomeTask[] = [];
  const issues: string[] = [];
  const operations = await Promise.allSettled([
    Promise.allSettled(
      people.map(async (person) => ({
        person,
        events: await getUpcomingDashboardEvents(person.teamIds, now, 6, {
          profileIds: [person.id],
          staffTeamIds: person.staffTeamIds,
        }),
      })),
    ),
    client
      .from("match_callups")
      .select(
        "player_id,match_id,matches!inner(id,team_id,opponent,is_home,pool_name,location,maps_url,scheduled_at,status,season_id,teams!inner(label,color))",
      )
      .in("player_id", profileIds)
      .in("status", ["called", "confirmed"])
      .not("cap_number", "is", null)
      .in("matches.status", ["scheduled", "in_progress"])
      .or(`status.eq.in_progress,and(scheduled_at.gte.${from},scheduled_at.lte.${until})`, {
        referencedTable: "matches",
      })
      .eq("matches.season_id", season?.id ?? "00000000-0000-0000-0000-000000000000")
      .limit(200)
      .throwOnError(),
    client
      .from("news_posts")
      .select("id,title,image_url,pinned,published_at,teams(label)")
      .or("expires_at.is.null,expires_at.gt." + now.toISOString())
      .lte("published_at", now.toISOString())
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(2)
      .throwOnError(),
    client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", ctx.ownProfile.id)
      .is("read_at", null)
      .throwOnError(),
    season
      ? getSeasonActaStats(client, season.id, undefined, undefined, profileIds)
      : Promise.resolve(new Map<string, { goals: number; assists: number; matches: number }>()),
    season && teamIds.length
      ? client
          .from("matches")
          .select("id,team_id,opponent,is_home,scheduled_at,final_score_us,final_score_them")
          .eq("season_id", season.id)
          .eq("status", "played")
          .in("team_id", sportTeamIds.length ? sportTeamIds : teamIds)
          .lte("scheduled_at", now.toISOString())
          .not("final_score_us", "is", null)
          .not("final_score_them", "is", null)
          .order("scheduled_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .throwOnError()
      : Promise.resolve({ data: null }),
    audience?.can_manage_attendance
      ? getCoachAttendanceSessions(staffTeams, getClubDayKey(now), now)
      : Promise.resolve([]),
    childIds.length
      ? client
          .from("shop_orders")
          .select("id", { count: "exact", head: true })
          .in("requested_by", childIds)
          .eq("status", "pending_parent")
          .throwOnError()
      : Promise.resolve({ count: 0 }),
    !access.isAdmin && hasGlobalPermission(access, "manage_shop")
      ? client
          .from("shop_orders")
          .select("id", { count: "exact", head: true })
          .in("status", [...ACTIVE_SHOP_STATUSES])
          .throwOnError()
      : Promise.resolve({ count: 0 }),
  ] as const);
  const [agenda, callups, news, unread, stats, result, attendance, approvals, shop] = operations;
  const eventMap = new Map<string, HomeEvent>();
  function addEvent(event: HomeEvent) {
    if (!homeEventIsCurrent(event, now)) return;
    const key = `${event.kind}/${event.joint_id ?? event.id}/${event.scheduled_at}/${event.duration_minutes}/${event.training_kind}/${event.location}`;
    const previous = eventMap.get(key);
    if (previous) {
      previous.personIds = [...new Set([...previous.personIds, ...event.personIds])];
      previous.calledPersonIds = [
        ...new Set([...previous.calledPersonIds, ...event.calledPersonIds]),
      ];
      previous.team_ids = [
        ...new Set([
          ...(previous.team_ids ?? [previous.team_id]),
          ...(event.team_ids ?? [event.team_id]),
        ]),
      ];
      previous.team_label = previous.team_ids
        .map((id) => teamLabels.get(id) ?? event.team_label)
        .join(" · ");
    } else eventMap.set(key, event);
  }
  if (agenda.status === "fulfilled")
    for (const entry of agenda.value) {
      if (entry.status === "rejected") {
        if (!issues.includes("agenda")) issues.push("agenda");
        continue;
      }
      const { person, events } = entry.value;
      for (const event of events) {
        const personIds = peopleForEvent(event, [person]);
        if (!personIds.length) continue;
        addEvent({
          ...event,
          personIds,
          calledPersonIds: [],
          canOpenActa: event.kind === "match" && canUseLiveMatch(access, event.team_id),
        });
      }
    }
  else issues.push("agenda");
  if (callups.status === "fulfilled")
    for (const row of callups.value.data ?? []) {
      const match = row.matches;
      const date = getClubDayKey(new Date(match.scheduled_at));
      addEvent({
        id: match.id,
        team_id: match.team_id,
        kind: "match",
        date,
        scheduled_at: match.scheduled_at,
        title: `Partido contra ${match.opponent}`,
        opponent: match.opponent,
        is_home: match.is_home,
        location: match.pool_name || match.location,
        maps_url: match.maps_url,
        team_label: match.teams.label,
        team_color: match.teams.color,
        status: match.status,
        cancelled: false,
        is_today: date === getClubDayKey(now),
        is_tomorrow: false,
        personIds: [row.player_id],
        calledPersonIds: [row.player_id],
        canOpenActa: canUseLiveMatch(access, match.team_id),
      });
    }
  else issues.push("convocatorias");
  const events = [...eventMap.values()].sort(
    (a, b) =>
      Number(b.status === "in_progress") - Number(a.status === "in_progress") ||
      a.scheduled_at.localeCompare(b.scheduled_at),
  );
  const live = events.find((e) => e.status === "in_progress" && e.canOpenActa);
  if (live)
    tasks.push({
      id: "live",
      title: "Continúa el acta",
      detail: `${live.team_label} · ${live.opponent}`,
      count: 1,
      kind: "live",
      href: `/acta?match=${live.id}&from=dashboard`,
    });
  if (approvals.status === "fulfilled" && approvals.value.count)
    tasks.push({
      id: "approvals",
      title: "Pedidos por autorizar",
      detail: "Revisa los pedidos de tus hijos",
      count: approvals.value.count,
      kind: "orders",
      href: "/shop/parents/pending?from=dashboard",
    });
  else if (approvals.status === "rejected") issues.push("pedidos");
  if (attendance.status === "fulfilled") {
    const pending = attendance.value.filter(
      (s) => s.is_past && s.unmarked_count > 0 && s.roster_count > 0,
    );
    if (pending.length)
      tasks.push({
        id: "attendance",
        title: pending.length === 1 ? "Una lista pendiente" : "Listas pendientes",
        detail: pending.length === 1 ? pending[0].team_label : "Entrenamientos de hoy",
        count: pending.length,
        kind: "attendance",
        href:
          pending.length === 1
            ? `/attendance/${pending[0].id}?from=dashboard`
            : "/attendance?from=dashboard",
      });
  } else issues.push("asistencia");
  if (shop.status === "fulfilled" && shop.value.count)
    tasks.push({
      id: "shop",
      title: "Pedidos pendientes",
      detail: "Preparar y entregar",
      count: shop.value.count,
      kind: "orders",
      href: "/admin/shop?view=orders",
    });
  else if (shop.status === "rejected") issues.push("gestión de pedidos");
  if (stats.status === "rejected") issues.push("estadísticas");
  if (result.status === "rejected") issues.push("resultados");
  if (news.status === "rejected") issues.push("noticias");
  if (unread.status === "rejected") issues.push("avisos");
  const resultRow = result.status === "fulfilled" ? result.value.data : null;
  let resultDocument: unknown = null;
  if (resultRow) {
    const sheet = await client
      .from("live_match_sheets")
      .select("document")
      .eq("match_id", resultRow.id)
      .maybeSingle();
    if (sheet.error) issues.push("detalle del resultado");
    else resultDocument = sheet.data?.document;
  }
  const parsedResultSheet = sheetSchema.safeParse(resultDocument);
  const resultScore = resultRow
    ? getMatchScoreboardState({
        status: "played",
        isHome: resultRow.is_home,
        finalScoreUs: resultRow.final_score_us,
        finalScoreThem: resultRow.final_score_them,
        sheet: parsedResultSheet.success ? parsedResultSheet.data : null,
      })
    : null;
  return {
    name: ctx.ownProfile.full_name,
    ownId: ctx.ownProfile.id,
    now: now.toISOString(),
    people,
    events,
    tasks,
    issues,
    hasSeason: Boolean(season),
    unread: unread.status === "fulfilled" ? (unread.value.count ?? 0) : null,
    news:
      news.status === "fulfilled"
        ? (news.value.data ?? []).map(({ id, title, image_url, pinned, published_at, teams }) => ({
            id,
            title,
            image_url,
            pinned,
            published_at,
            audience_team_label: teams?.label ?? null,
          }))
        : [],
    stats:
      stats.status === "fulfilled"
        ? Object.fromEntries([...stats.value].filter(([id]) => profileIds.includes(id)))
        : {},
    result: resultRow
      ? {
          id: resultRow.id,
          team_id: resultRow.team_id,
          opponent: resultRow.opponent,
          is_home: resultRow.is_home,
          scheduled_at: resultRow.scheduled_at,
          final_score_us: resultRow.final_score_us,
          final_score_them: resultRow.final_score_them,
          regulationScore: resultScore?.regulationScore ?? null,
          team_label: teamLabels.get(resultRow.team_id) ?? "Equipo",
        }
      : null,
    management: homeManagementLinks(access, Boolean(audience?.can_manage_attendance)),
  };
}

export type DashboardHomeData = NonNullable<Awaited<ReturnType<typeof getDashboardHome>>>;
