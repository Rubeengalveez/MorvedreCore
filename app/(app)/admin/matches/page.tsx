import { MdAdd } from "react-icons/md";
import Link from "next/link";
import type { Route } from "next";
import { CalendarDays } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import type { Season, Team } from "@/server/actions/admin";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import { canManageTeam, getTeamScope } from "@/lib/domain/permissions";

import { MatchFormSheet } from "./_components/match-form-sheet";
import { MatchesList, type MatchRow } from "./_components/matches-list";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Partidos — Admin — Morvedre Core",
};

type SeasonRow = Season;
type TeamRow = Team & { season_label: string };

type LoadResult =
  | {
      ok: true;
      seasons: SeasonRow[];
      teams: TeamRow[];
      matches: MatchRow[];
      defaultTeamId: string | null;
      defaultSeasonId: string | null;
      error: null;
    }
  | {
      ok: false;
      seasons: SeasonRow[];
      teams: TeamRow[];
      matches: MatchRow[];
      defaultTeamId: null;
      defaultSeasonId: null;
      error: string;
    };

async function loadMatches(teamScope: string[] | null): Promise<LoadResult> {
  const supabase = await createClient();
  let teamsQuery = supabase
    .from("teams")
    .select(
      "id, season_id, category_code, label, gender, team_type, color, home_pool, notes, created_at, updated_at",
    );
  let matchesQuery = supabase
    .from("matches")
    .select(
      "id, season_id, team_id, opponent, competition_type, is_home, location, pool_name, maps_url, scheduled_at, status, logistics_enabled, notes, final_score_us, final_score_them, created_at, updated_at",
    )
    .order("scheduled_at", { ascending: true });
  if (teamScope) {
    teamsQuery = teamsQuery.in("id", teamScope);
    matchesQuery = matchesQuery.in("team_id", teamScope);
  }

  const [
    { data: seasonsData, error: seasonsError },
    { data: teamsData, error: teamsError },
    { data: matchesData, error: matchesError },
  ] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, label, start_date, end_date, is_current, archived_at, created_at, updated_at")
      .order("start_date", { ascending: false }),
    teamsQuery,
    matchesQuery,
  ]);

  const firstError = seasonsError ?? teamsError ?? matchesError;
  if (firstError) {
    return {
      ok: false,
      seasons: (seasonsData ?? []) as SeasonRow[],
      teams: ((teamsData ?? []) as Array<Team & { created_at: string; updated_at: string }>).map(
        (t) => ({ ...t, season_label: "" }),
      ),
      matches: [],
      defaultTeamId: null,
      defaultSeasonId: null,
      error: firstError.message,
    };
  }

  const seasons = (seasonsData ?? []) as SeasonRow[];
  const currentSeason = seasons.find((s) => s.is_current) ?? null;
  const teamsAll = (teamsData ?? []) as Array<Team & { created_at: string; updated_at: string }>;
  const teams: TeamRow[] = teamsAll
    .filter((team) => team.season_id === currentSeason?.id)
    .map((t) => ({
    ...t,
    season_label: seasons.find((s) => s.id === t.season_id)?.label ?? "Sin temporada",
    }));

  const teamById = new Map<string, TeamRow>();
  for (const t of teams) teamById.set(t.id, t);

  const matches: MatchRow[] = (
    (matchesData ?? []) as Array<{
      id: string;
      season_id: string;
      team_id: string;
      opponent: string;
      competition_type: string;
      is_home: boolean;
      location: string | null;
      pool_name: string | null;
      maps_url: string | null;
      scheduled_at: string;
      status: string;
      final_score_us: number | null;
      final_score_them: number | null;
    }>
  ).filter((match) => match.season_id === currentSeason?.id).map((m) => {
    const team = teamById.get(m.team_id);
    return {
      ...m,
      team_label: team?.label ?? "Equipo",
      team_color: team?.color ?? "var(--pool-blue)",
    };
  });

  return {
    ok: true,
    seasons,
    teams,
    matches,
    defaultTeamId: currentSeason
      ? (teams.find((t) => t.season_id === currentSeason.id)?.id ?? null)
      : null,
    defaultSeasonId: currentSeason?.id ?? null,
    error: null,
  };
}

export default async function MatchesPage() {
  const access = await getRenderAdminAccess();
  const teamScope = getTeamScope(access, "match_operations");
  const { seasons, teams, matches, defaultTeamId, defaultSeasonId, error } =
    await loadMatches(teamScope);
  const editableTeams = teams.filter((team) => canManageTeam(access, "match_schedule", team.id));
  const currentSeasonId = seasons.find((season) => season.is_current)?.id ?? null;
  const currentEditableTeams = editableTeams.filter((team) => team.season_id === currentSeasonId);
  const editableDefaultTeam =
    currentEditableTeams.find((team) => team.id === defaultTeamId) ?? currentEditableTeams[0];
  const scheduledCount = matches.filter((match) =>
    ["scheduled", "in_progress", "postponed"].includes(match.status),
  ).length;
  const playedCount = matches.filter((match) => match.status === "played").length;
  const currentSeason = seasons.find((season) => season.is_current) ?? null;

  if (seasons.length === 0) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          title="Partidos"
          description="Convocatorias, actas y logística de cada partido."
          icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
        />
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
          title="Primero crea una temporada"
          description="Los partidos pertenecen siempre a una temporada activa."
          action={
            <Button asChild size="md">
              <Link href={"/admin/seasons" as Route}>Ir a Temporadas</Link>
            </Button>
          }
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Partidos"
        description="Convocatorias, actas y logística de cada partido."
        icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
        action={
          currentEditableTeams.length > 0 ? (
            <MatchFormSheet
              teams={currentEditableTeams}
              defaultTeamId={editableDefaultTeam?.id ?? null}
              defaultSeasonId={editableDefaultTeam?.season_id ?? defaultSeasonId}
              trigger={
                <Button size="md" className="w-full shrink-0 justify-center sm:w-auto">
                  <MdAdd className="h-6 w-6" aria-hidden="true" />
                  <span>Nuevo partido</span>
                </Button>
              }
            />
          ) : undefined
        }
      />

      <section className="bg-pool-deep text-paper relative overflow-hidden rounded-2xl p-4 shadow-elev-1">
        <span className="lane-pattern absolute inset-0 opacity-15" aria-hidden="true" />
        <div className="relative flex flex-col gap-4">
          <div>
            <p className="text-ball-gold text-xs font-extrabold tracking-[0.12em] uppercase">
              {currentSeason?.label ?? "Temporada actual"}
            </p>
            <h2 className="mt-1 text-xl font-extrabold">Operativa de partidos</h2>
            <p className="text-paper/75 mt-1 text-sm">Crea, convoca y registra solo los partidos en curso.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="border-paper/15 bg-paper/10 rounded-xl border p-3">
              <p className="text-paper/70 text-xs font-bold">Por jugar</p>
              <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums">{scheduledCount}</p>
            </div>
            <div className="border-paper/15 bg-paper/10 rounded-xl border p-3">
              <p className="text-paper/70 text-xs font-bold">Jugados</p>
              <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums">{playedCount}</p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <Alert variant="danger" title="No pudimos cargar los partidos">
          {error}
        </Alert>
      ) : null}

      {!error && currentEditableTeams.length === 0 ? (
        <Alert variant="info" title="No tienes equipos editables en la temporada actual">
          Puedes consultar los partidos, pero para crear uno necesitas el permiso de gestión del equipo.
        </Alert>
      ) : null}

      <MatchesList
        teams={teams}
        matches={matches}
        defaultTeamId={defaultTeamId}
      />
    </AdminPageShell>
  );
}
