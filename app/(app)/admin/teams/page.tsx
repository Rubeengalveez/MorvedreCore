import Link from "next/link";
import type { Route } from "next";
import { Plus, UsersRound } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CATEGORY_LABELS, type CategoryCode, type TeamGender } from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";
import type { Season, Team } from "@/server/actions/admin";

import { TeamFormSheet } from "./_components/team-form-sheet";
import { TeamsGrid, type TeamCardData } from "./_components/teams-grid";

const GENDER_LABELS: Record<TeamGender, string> = {
  male: "Masculino",
  female: "Femenino",
  mixed: "Mixto",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Equipos — Admin — Morvedre Core",
};

type LoadResult =
  | {
      ok: true;
      seasons: Season[];
      currentSeasonId: string | null;
      teamsBySeason: Map<string, TeamCardData[]>;
      error: null;
    }
  | {
      ok: false;
      seasons: Season[];
      currentSeasonId: null;
      teamsBySeason: Map<string, TeamCardData[]>;
      error: string;
    };

async function loadData(): Promise<LoadResult> {
  const supabase = await createClient();

  const [
    { data: seasonsData, error: seasonsError },
    { data: teamsData, error: teamsError },
    { data: staffData },
    { data: rostersData },
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
      .from("team_staff")
      .select("team_id, profile_id, role, profiles!team_staff_profile_id_fkey(full_name)"),
    supabase.from("team_rosters").select("team_id, player_id").is("left_at", null),
  ]);

  const firstError = seasonsError ?? teamsError;
  if (firstError) {
    return {
      ok: false,
      seasons: (seasonsData ?? []) as Season[],
      currentSeasonId: null,
      teamsBySeason: new Map(),
      error: firstError.message,
    };
  }

  const seasons = (seasonsData ?? []) as Season[];
  const currentSeason = seasons.find((s) => s.is_current) ?? null;

  const coachByTeam = new Map<string, string>();
  for (const row of staffData ?? []) {
    const r = row as {
      team_id: string;
      role: string;
      profiles: unknown;
    };
    if (r.role === "head_coach") {
      const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      const name = (prof as { full_name?: string } | null)?.full_name ?? null;
      if (name) coachByTeam.set(r.team_id, name);
    }
  }

  const playerCountByTeam = new Map<string, number>();
  for (const row of rostersData ?? []) {
    const teamId = (row as { team_id: string }).team_id;
    playerCountByTeam.set(teamId, (playerCountByTeam.get(teamId) ?? 0) + 1);
  }

  const teamsBySeason = new Map<string, TeamCardData[]>();
  for (const t of (teamsData ?? []) as Team[]) {
    const card: TeamCardData = {
      ...t,
      playerCount: playerCountByTeam.get(t.id) ?? 0,
      coachName: coachByTeam.get(t.id) ?? null,
      categoryLabel: CATEGORY_LABELS[t.category_code as CategoryCode] ?? t.category_code,
      genderLabel: GENDER_LABELS[t.gender as TeamGender] ?? t.gender,
    };
    const list = teamsBySeason.get(t.season_id) ?? [];
    list.push(card);
    teamsBySeason.set(t.season_id, list);
  }

  for (const list of teamsBySeason.values()) {
    list.sort((a, b) => a.label.localeCompare(b.label, "es"));
  }

  return {
    ok: true,
    seasons,
    currentSeasonId: currentSeason?.id ?? seasons[0]?.id ?? null,
    teamsBySeason,
    error: null,
  };
}

export default async function TeamsPage() {
  const { seasons, currentSeasonId, teamsBySeason, error } = await loadData();

  if (seasons.length === 0) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Estructura del club"
          title="Equipos"
          description="Configura los equipos y asigna sus plantillas."
          icon={<UsersRound className="h-6 w-6" aria-hidden="true" />}
        />
        <EmptyState
          icon={<UsersRound className="h-6 w-6" aria-hidden="true" />}
          title="Primero crea una temporada"
          description="Los equipos pertenecen siempre a una temporada activa."
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
        eyebrow="Estructura del club"
        title="Equipos"
        description="Configura los equipos y asigna sus plantillas."
        icon={<UsersRound className="h-6 w-6" aria-hidden="true" />}
        action={
          <TeamFormSheet
            seasons={seasons}
            defaultSeasonId={currentSeasonId ?? seasons[0]!.id}
            trigger={
              <Button size="md" className="w-full shrink-0 sm:w-auto">
                <Plus className="h-5 w-5" aria-hidden="true" />
                Nuevo equipo
              </Button>
            }
          />
        }
      />

      {error ? (
        <Alert variant="danger" title="No pudimos cargar los equipos">
          {error}
        </Alert>
      ) : null}

      <TeamsGrid
        seasons={seasons}
        teamsBySeason={teamsBySeason}
        defaultSeasonId={currentSeasonId ?? seasons[0]!.id}
      />
    </AdminPageShell>
  );
}
