import { MdAdd, MdUploadFile } from "react-icons/md";
import { UserRound } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, inferCategory } from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";

import { PlayerFormSheet } from "./_components/player-form-sheet";
import { PlayersTable, type PlayerRow } from "./_components/players-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Jugadores — Admin — Morvedre Core",
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

async function loadPlayers(): Promise<PlayerRow[]> {
  const supabase = await createClient();

  const [{ data: currentSeasonData }, { data: profilesData }] = await Promise.all([
    supabase.from("seasons").select("id").eq("is_current", true).maybeSingle(),
    supabase
      .from("profiles")
      .select(
        "id, full_name, birth_year, gender, photo_url, cap_number, phone_e164, email_contact, notes, is_active",
      )
      .order("full_name", { ascending: true })
      .limit(1000),
  ]);

  const currentSeasonId = currentSeasonData?.id ?? null;

  const { data: rosterData } = currentSeasonId
    ? await supabase
        .from("team_rosters")
        .select("player_id, squad_number, teams!team_rosters_team_id_fkey(label, season_id)")
        .is("left_at", null)
    : { data: [] };

  const teamByPlayer = new Map<string, string>();
  for (const row of rosterData ?? []) {
    const r = row as {
      player_id: string;
      teams: unknown;
    };
    const teamRaw = Array.isArray(r.teams) ? r.teams[0] : r.teams;
    const team = teamRaw as { label?: string; season_id?: string } | null;
    if (team && team.season_id === currentSeasonId && team.label) {
      teamByPlayer.set(r.player_id, team.label);
    }
  }

  const currentYear = new Date().getFullYear();
  return ((profilesData ?? []) as Array<Omit<PlayerRow, "currentTeam" | "categoryLabel">>).map(
    (p) => ({
      ...p,
      currentTeam: teamByPlayer.get(p.id) ?? null,
      categoryLabel: categoryLabelFor(p.birth_year, currentYear),
    }),
  );
}

export default async function PlayersPage() {
  const players = await loadPlayers();

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Jugadores"
        description="Altas, ediciones y asignación a equipos."
        icon={<UserRound className="h-6 w-6" aria-hidden="true" />}
        action={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
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

      <PlayersTable players={players} />
    </AdminPageShell>
  );
}
