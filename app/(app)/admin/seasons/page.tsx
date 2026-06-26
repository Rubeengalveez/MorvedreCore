import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Season } from "@/server/actions/admin";

import { SeasonFormSheet } from "./_components/season-form-sheet";
import { SeasonsTable } from "./_components/seasons-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Temporadas — Admin — Morvedre Core",
};

async function loadSeasons(): Promise<Season[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, label, start_date, end_date, is_current, archived_at, created_at, updated_at")
    .order("start_date", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []) as Season[];
}

export default async function SeasonsPage() {
  const seasons = await loadSeasons();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-deep">
            Temporadas
          </h1>
          <p className="text-sm text-ink-600">
            Crea y archiva las temporadas del club.
          </p>
        </div>
        <SeasonFormSheet
          mode={{ kind: "create" }}
          trigger={
            <Button size="md" className="shrink-0">
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Nueva</span>
            </Button>
          }
        />
      </header>

      <SeasonsTable seasons={seasons} />
    </div>
  );
}
