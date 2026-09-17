import { MdAdd, MdUploadFile } from "react-icons/md";
import { UserRound } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, inferCategory } from "@/lib/domain/categories";
import { Alert } from "@/components/ui/alert";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/server/actions/admin/_helpers";

import { PlayerFormSheet } from "./_components/player-form-sheet";
import { PlayersTable, type PlayerRow } from "./_components/players-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Jugadores — Admin — Morvedre Core",
};

const PAGE_SIZE = 24;

type PlayerFilters = {
  page: number;
  query: string;
  status: "active" | "inactive" | "all";
  teamId: string;
};

function categoryLabelFor(birthYear: number | null, currentYear: number): string {
  if (birthYear == null) return "—";
  try {
    const code = inferCategory(birthYear, currentYear);
    return CATEGORY_LABELS[code];
  } catch {
    return "—";
  }
}

async function loadPlayers(filters: PlayerFilters): Promise<{
  players: PlayerRow[];
  teams: Array<{ id: string; label: string }>;
  total: number;
  totalPages: number;
  error: string | null;
}> {
  await requirePermission("manage_players");
  const supabase = createAdminClient();

  const { data: currentSeasonData, error: seasonError } = await supabase
    .from("seasons")
    .select("id, start_date")
    .eq("is_current", true)
    .maybeSingle();
  if (seasonError) {
    return { players: [], teams: [], total: 0, totalPages: 0, error: seasonError.message };
  }
  const currentSeasonId = currentSeasonData?.id ?? null;
  const { data: teamsData, error: teamsError } = currentSeasonId
    ? await supabase
        .from("teams")
        .select("id, label")
        .eq("season_id", currentSeasonId)
        .order("label", { ascending: true })
    : { data: [], error: null };
  if (teamsError) {
    return { players: [], teams: [], total: 0, totalPages: 0, error: teamsError.message };
  }
  const teams = teamsData ?? [];

  let selectedPlayerIds: string[] | null = null;
  if (filters.teamId && teams.some((team) => team.id === filters.teamId)) {
    const { data: rosterForTeam, error: rosterForTeamError } = await supabase
      .from("team_rosters")
      .select("player_id")
      .eq("team_id", filters.teamId)
      .is("left_at", null);
    if (rosterForTeamError) {
      return { players: [], teams, total: 0, totalPages: 0, error: rosterForTeamError.message };
    }
    selectedPlayerIds = (rosterForTeam ?? []).map((row) => row.player_id);
  }

  if (selectedPlayerIds && selectedPlayerIds.length === 0) {
    return { players: [], teams, total: 0, totalPages: 1, error: null };
  }

  let profilesQuery = supabase
    .from("profiles")
    .select(
      "id, full_name, birth_year, gender, photo_url, cap_number, phone_e164, email_contact, notes, school_enrolled, school_payment_paid, is_active",
      { count: "exact" },
    )
    .order("full_name", { ascending: true });
  if (filters.status !== "all")
    profilesQuery = profilesQuery.eq("is_active", filters.status === "active");
  if (filters.query) profilesQuery = profilesQuery.ilike("full_name", `%${filters.query}%`);
  if (selectedPlayerIds) profilesQuery = profilesQuery.in("id", selectedPlayerIds);
  const first = (filters.page - 1) * PAGE_SIZE;
  const {
    data: profilesData,
    error: profilesError,
    count,
  } = await profilesQuery.range(first, first + PAGE_SIZE - 1);
  if (profilesError) {
    return { players: [], teams, total: 0, totalPages: 0, error: profilesError.message };
  }

  const profileIds = (profilesData ?? []).map((profile) => profile.id);
  const { data: rosterData, error: rosterError } =
    currentSeasonId && profileIds.length > 0 && teams.length > 0
      ? await supabase
          .from("team_rosters")
          .select("player_id, team_id")
          .in("player_id", profileIds)
          .in(
            "team_id",
            teams.map((team) => team.id),
          )
          .is("left_at", null)
      : { data: [], error: null };
  if (rosterError) {
    return { players: [], teams, total: 0, totalPages: 0, error: rosterError.message };
  }

  const teamsByPlayer = new Map<string, string[]>();
  const teamLabels = new Map(teams.map((team) => [team.id, team.label]));
  for (const row of rosterData ?? []) {
    const label = teamLabels.get(row.team_id);
    if (label) {
      const labels = teamsByPlayer.get(row.player_id) ?? [];
      labels.push(label);
      teamsByPlayer.set(row.player_id, labels);
    }
  }

  const currentYear = currentSeasonData?.start_date
    ? new Date(`${currentSeasonData.start_date}T12:00:00`).getFullYear()
    : new Date().getFullYear();
  const players = (
    (profilesData ?? []) as Array<Omit<PlayerRow, "currentTeam" | "categoryLabel">>
  ).map((p) => ({
    ...p,
    currentTeam: teamsByPlayer.get(p.id)?.join(" · ") ?? null,
    categoryLabel: categoryLabelFor(p.birth_year, currentYear),
  }));
  const total = count ?? 0;
  return {
    players,
    teams,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    error: null,
  };
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string; status?: string; team?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const filters: PlayerFilters = {
    page,
    query: (params.query ?? "").trim().slice(0, 100),
    status: params.status === "inactive" || params.status === "all" ? params.status : "active",
    teamId: params.team ?? "",
  };
  const { players, teams, total, totalPages, error } = await loadPlayers(filters);

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Jugadores"
        description="Altas, ediciones y asignación a equipos."
        icon={<UserRound className="h-6 w-6" aria-hidden="true" />}
        action={
          <div className="flex w-full flex-col gap-2 min-[360px]:grid min-[360px]:grid-cols-2 sm:flex sm:w-auto">
            <Button
              asChild
              size="md"
              variant="secondary"
              className="w-full shrink-0 justify-center sm:w-auto"
            >
              <Link href={"/admin/players/import" as Route}>
                <MdUploadFile className="h-5 w-5" aria-hidden="true" />
                <span>Importar</span>
              </Link>
            </Button>
            <PlayerFormSheet
              trigger={
                <Button size="md" className="w-full shrink-0 justify-center sm:w-auto">
                  <MdAdd className="h-6 w-6" aria-hidden="true" />
                  <span>Nuevo jugador</span>
                </Button>
              }
            />
          </div>
        }
      />

      {error ? (
        <Alert variant="danger" title="No pudimos cargar los jugadores">
          {error}
        </Alert>
      ) : (
        <PlayersTable
          players={players}
          teams={teams}
          total={total}
          totalPages={totalPages}
          filters={filters}
        />
      )}
    </AdminPageShell>
  );
}
