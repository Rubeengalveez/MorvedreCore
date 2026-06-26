import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CATEGORY_LABELS,
  type CategoryCode,
  type TeamGender,
} from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";
import type { Season, Team } from "@/server/actions/admin";

import { TeamFormSheet } from "./_components/team-form-sheet";
import {
  TeamsGrid,
  type TeamCardData,
} from "./_components/teams-grid";

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

async function loadData(): Promise<{
  seasons: Season[];
  currentSeasonId: string | null;
  teamsBySeason: Map<string, TeamCardData[]>;
}> {
  const supabase = await createClient();

  const [{ data: seasonsData }, { data: teamsData }, { data: staffData }, { data: rostersData }] =
    await Promise.all([
      supabase
        .from("seasons")
        .select("id, label, start_date, end_date, is_current, archived_at, created_at, updated_at")
        .order("start_date", { ascending: false }),
      supabase
        .from("teams")
        .select("id, season_id, category_code, label, gender, team_type, color, home_pool, notes, created_at, updated_at"),
      supabase
        .from("team_staff")
        .select("team_id, profile_id, role, profiles!team_staff_profile_id_fkey(full_name)"),
      supabase
        .from("team_rosters")
        .select("team_id, player_id")
        .is("left_at", null),
    ]);

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
    seasons,
    currentSeasonId: currentSeason?.id ?? seasons[0]?.id ?? null,
    teamsBySeason,
  };
}

export default async function TeamsPage() {
  const { seasons, currentSeasonId, teamsBySeason } = await loadData();

  if (seasons.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-deep">
          Equipos
        </h1>
        <div className="rounded-md border border-dashed border-ink-300 bg-paper p-6 text-center">
          <p className="text-base font-semibold text-brand-deep">
            Primero crea una temporada.
          </p>
          <p className="mt-1 text-sm text-ink-600">
            Los equipos pertenecen siempre a una temporada.
          </p>
          <div className="mt-4 flex justify-center">
            <Button asChild size="md">
              <a href="/admin/seasons">Ir a Temporadas</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-deep">
            Equipos
          </h1>
          <p className="text-sm text-ink-600">
            Configura los equipos y asigna plantilla.
          </p>
        </div>
        <TeamFormSheet
          seasons={seasons}
          defaultSeasonId={currentSeasonId ?? seasons[0]!.id}
          trigger={
            <Button size="md" className="shrink-0">
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Nuevo</span>
            </Button>
          }
        />
      </header>

      <TeamsGrid
        seasons={seasons}
        teamsBySeason={teamsBySeason}
        defaultSeasonId={currentSeasonId ?? seasons[0]!.id}
      />
    </div>
  );
}
