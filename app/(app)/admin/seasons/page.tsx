import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LanePattern } from "@/components/ui/lane-pattern";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Calendario } from "@/components/brand/pictograms";
import { createClient } from "@/lib/supabase/server";
import type { Season } from "@/server/actions/admin";

import { SeasonFormSheet } from "./_components/season-form-sheet";
import { SeasonsTable } from "./_components/seasons-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Temporadas — Admin — Morvedre Core",
};

type LoadResult =
  | { ok: true; seasons: Season[]; error: null }
  | { ok: false; seasons: []; error: string };

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

  return (
    <div className="relative">
      <LanePattern className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
        <header className="flex items-end justify-between gap-3">
          <div className="flex items-start gap-3">
            <PictogramBadge
              pictogram={Calendario}
              color="var(--pool-teal)"
              size="lg"
            />
            <div className="flex flex-col gap-0.5">
              <Eyebrow>Estructura del club</Eyebrow>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-pool-deep">
                Temporadas
              </h1>
              <p className="text-sm text-ink-600">
                Crea y archiva las temporadas del club.
              </p>
            </div>
          </div>
          <SeasonFormSheet
            mode={{ kind: "create" }}
            trigger={
              <Button size="md" className="shrink-0">
                <Plus className="h-5 w-5" aria-hidden="true" />
                <span className="hidden sm:inline">Nueva</span>
                <span className="sr-only sm:hidden">Nueva temporada</span>
              </Button>
            }
          />
        </header>

        {result.ok ? null : (
          <Alert variant="danger" title="No pudimos cargar las temporadas">
            {result.error}
          </Alert>
        )}

        <SeasonsTable seasons={result.ok ? result.seasons : []} />
      </div>
    </div>
  );
}
