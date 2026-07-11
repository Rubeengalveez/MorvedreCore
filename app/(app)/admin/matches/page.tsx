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

async function loadMatches(): Promise<LoadResult> {
  const supabase = await createClient();

  const [
    { data: seasonsData, error: seasonsError },
    { data: teamsData, error: teamsError },
    { data: matchesData, error: matchesError },
  ] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, label, start_date, end_date, is_current, archived_at, created_at, updated_at")
      .order("start_date", { ascending: false }),
    supabase
      .from("teams")
      .select(
        "id, season_id, category_code, label, gender, team_type, color, home_pool, notes, created_at, updated_at",
      ),
    supabase
      .from("matches")
      .select(
        "id, season_id, team_id, opponent, competition_type, is_home, location, pool_name, scheduled_at, status, logistics_enabled, notes, final_score_us, final_score_them, created_at, updated_at",
      )
      .order("scheduled_at", { ascending: true }),
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
  const teams: TeamRow[] = teamsAll.map((t) => ({
    ...t,
    season_label: seasons.find((s) => s.id === t.season_id)?.label ?? "Sin temporada",
  }));

  const teamById = new Map<string, TeamRow>();
  for (const t of teams) teamById.set(t.id, t);

  const matches: MatchRow[] = (
    (matchesData ?? []) as Array<{
      id: string;
      team_id: string;
      opponent: string;
      competition_type: string;
      is_home: boolean;
      location: string | null;
      pool_name: string | null;
      scheduled_at: string;
      status: string;
      final_score_us: number | null;
      final_score_them: number | null;
    }>
  ).map((m) => {
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
  const { seasons, teams, matches, defaultTeamId, defaultSeasonId, error } = await loadMatches();

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
          <MatchFormSheet
            seasons={seasons}
            teams={teams}
            defaultTeamId={defaultTeamId}
            defaultSeasonId={defaultSeasonId}
            trigger={
              <Button size="md" className="w-full shrink-0 justify-center sm:w-auto">
                <MdAdd className="h-6 w-6" aria-hidden="true" />
                <span>Nuevo partido</span>
              </Button>
            }
          />
        }
      />

      {error ? (
        <Alert variant="danger" title="No pudimos cargar los partidos">
          {error}
        </Alert>
      ) : null}

      <MatchesList
        seasons={seasons}
        teams={teams}
        matches={matches}
        defaultTeamId={defaultTeamId}
      />
    </AdminPageShell>
  );
}
