import { CalendarRange, Plus } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { nextSeasonDraft } from "@/lib/domain/seasons";
import type { Season } from "@/server/actions/admin";

import { SeasonFormSheet } from "./_components/season-form-sheet";
import { SeasonTransitionSheet } from "./_components/season-transition-sheet";
import { SeasonsTable } from "./_components/seasons-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Temporadas — Admin — Morvedre Core",
};

type LoadResult =
  { ok: true; seasons: Season[]; error: null } | { ok: false; seasons: []; error: string };

async function loadSeasons(): Promise<LoadResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, label, start_date, end_date, is_current, archived_at, created_at, updated_at")
    .order("start_date", { ascending: false });

  if (error) {
    return { ok: false, seasons: [], error: error.message };
  }

  return { ok: true, seasons: (data ?? []) as Season[], error: null };
}

export default async function SeasonsPage() {
  const result = await loadSeasons();
  const currentSeason = result.ok ? result.seasons.find((season) => season.is_current) : undefined;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Estructura del club"
        title="Temporadas"
        description="Crea, activa y archiva las temporadas del club."
        icon={<CalendarRange className="h-6 w-6" aria-hidden="true" />}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {currentSeason ? (
              <SeasonTransitionSheet
                season={currentSeason}
                draft={nextSeasonDraft(currentSeason)}
              />
            ) : null}
            <SeasonFormSheet
              mode={{ kind: "create" }}
              trigger={
                <Button size="md" className="w-full shrink-0 sm:w-auto">
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  Nueva temporada
                </Button>
              }
            />
          </div>
        }
      />

      {result.ok ? null : (
        <Alert variant="danger" title="No pudimos cargar las temporadas">
          {result.error}
        </Alert>
      )}

      <SeasonsTable seasons={result.ok ? result.seasons : []} />
    </AdminPageShell>
  );
}
