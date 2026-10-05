import { AdminPageShell } from "@/components/admin/admin-page";
import { TeamHeading, TeamError } from "@/components/team/team-ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/server/actions/admin/_helpers";
import {
  categorySearchLabel,
  matchesPlayerSearch,
  playerCategory,
  type PlayerFilters,
} from "@/lib/domain/admin-players";
import { calendarSeasonStartYear, CATEGORY_LABELS } from "@/lib/domain/categories";
import { PlayersTable, type PlayerRow } from "./_components/players-table";
import { PlayerFormSheet } from "./_components/player-form-sheet";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jugadores — Admin — Morvedre Core" };

async function loadPlayers(filters: PlayerFilters) {
  await requirePermission("manage_players");
  const db = createAdminClient();
  const [seasonResult, rolesResult] = await Promise.all([
    db.from("seasons").select("id, start_date").eq("is_current", true).maybeSingle(),
    db.from("user_roles").select("profile_id").eq("role", "player"),
  ]);
  if (seasonResult.error || rolesResult.error)
    throw new Error("No pudimos cargar los jugadores. Vuelve a intentarlo.");
  const season = seasonResult.data;
  const seasonYear = season ? Number(season.start_date.slice(0, 4)) : calendarSeasonStartYear();
  const teamResult = season
    ? await db
        .from("teams")
        .select("id, label, category_code")
        .eq("season_id", season.id)
        .order("label")
    : { data: [], error: null };
  if (teamResult.error) throw new Error("No pudimos cargar los equipos.");
  const teams = teamResult.data ?? [];
  filters.teamId =
    filters.teamId === "unassigned" || teams.some((team) => team.id === filters.teamId)
      ? filters.teamId
      : "";
  filters.category = filters.category in CATEGORY_LABELS ? filters.category : "";
  const ids = [...new Set((rolesResult.data ?? []).map((role) => role.profile_id))];
  const [indexResult, rosterResult, templatesResult] = await Promise.all([
    ids.length
      ? db
          .from("profiles")
          .select("id, full_name, birth_year, cap_number, is_active, school_enrolled")
          .in("id", ids)
          .order("full_name")
      : Promise.resolve({ data: [], error: null }),
    teams.length
      ? db
          .from("team_rosters")
          .select("player_id, team_id, squad_number")
          .in(
            "team_id",
            teams.map((team) => team.id),
          )
          .is("left_at", null)
      : Promise.resolve({ data: [], error: null }),
    teams.length
      ? db
          .from("team_callup_templates")
          .select("team_id, cap_number")
          .in(
            "team_id",
            teams.map((team) => team.id),
          )
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (indexResult.error || rosterResult.error || templatesResult.error)
    throw new Error("No pudimos cargar la plantilla.");
  const memberships = new Map<string, string[]>();
  for (const row of rosterResult.data ?? [])
    memberships.set(row.player_id, [...(memberships.get(row.player_id) ?? []), row.team_id]);
  const labels = new Map(teams.map((team) => [team.id, team.label]));
  const index = (indexResult.data ?? []).filter((player) => {
    const category = playerCategory(player.birth_year, seasonYear, player.school_enrolled);
    const teamIds = memberships.get(player.id) ?? [];
    return (
      (filters.status === "all" || player.is_active === (filters.status === "active")) &&
      (!filters.teamId ||
        (filters.teamId === "unassigned" ? !teamIds.length : teamIds.includes(filters.teamId))) &&
      (!filters.category || category === filters.category) &&
      matchesPlayerSearch(filters.query, [
        player.full_name,
        player.birth_year,
        player.cap_number,
        categorySearchLabel(category),
        ...teamIds.map((id) => labels.get(id) ?? ""),
      ])
    );
  });
  const total = index.length;
  const totalPages = Math.max(1, Math.ceil(total / 24));
  filters.page = Math.min(totalPages, filters.page);
  const pageIds = index
    .slice((filters.page - 1) * 24, filters.page * 24)
    .map((player) => player.id);
  const profiles = pageIds.length
    ? await db
        .from("profiles")
        .select(
          "id, full_name, birth_year, gender, photo_url, cap_number, phone_e164, email_contact, notes, school_enrolled, school_payment_paid, is_active",
        )
        .in("id", pageIds)
    : { data: [], error: null };
  if (profiles.error) throw new Error("No pudimos abrir las fichas de los jugadores.");
  const byId = new Map((profiles.data ?? []).map((player) => [player.id, player]));
  const players: PlayerRow[] = pageIds.flatMap((id) => {
    const player = byId.get(id);
    if (!player) return [];
    const category = playerCategory(player.birth_year, seasonYear, player.school_enrolled);
    return [
      {
        ...player,
        category,
        categoryLabel: categorySearchLabel(category),
        currentTeam:
          (memberships.get(id) ?? []).map((teamId) => labels.get(teamId)).join(" · ") || null,
      },
    ];
  });
  const formTeams = teams.map((team) => ({
    ...team,
    occupiedCaps: (templatesResult.data ?? []).some((row) => row.team_id === team.id)
      ? (templatesResult.data ?? [])
          .filter((row) => row.team_id === team.id)
          .flatMap((row) => (row.cap_number == null ? [] : [row.cap_number]))
      : (rosterResult.data ?? [])
          .filter((row) => row.team_id === team.id)
          .flatMap((row) => (row.squad_number == null ? [] : [row.squad_number])),
  }));
  return { players, teams: formTeams, total, totalPages, seasonYear };
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters: PlayerFilters = {
    page: Math.min(10000, Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1)),
    query: (params.query ?? "").trim().slice(0, 100),
    status: params.status === "all" || params.status === "inactive" ? params.status : "active",
    teamId: params.team ?? "",
    category: params.category ?? "",
  };
  let data: Awaited<ReturnType<typeof loadPlayers>>;
  try {
    data = await loadPlayers(filters);
  } catch (error) {
    return (
      <AdminPageShell className="pt-0 sm:pt-0">
        <TeamHeading title="Jugadores" />
        <TeamError>
          {error instanceof Error ? error.message : "No pudimos cargar los jugadores."}
        </TeamError>
      </AdminPageShell>
    );
  }
  return (
    <AdminPageShell className="pt-0 sm:pt-0">
      <TeamHeading
        title="Jugadores"
        action={<PlayerFormSheet teams={data.teams} seasonYear={data.seasonYear} />}
      />
      <PlayersTable key={JSON.stringify(filters)} {...data} filters={filters} />
    </AdminPageShell>
  );
}
