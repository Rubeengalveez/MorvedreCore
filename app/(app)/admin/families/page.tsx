import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import {
  FamilyFormSheet,
  FamiliesTable,
  type FamilyRow,
  type PersonOption,
} from "./_components/families-manager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Familias — Admin — Morvedre Core",
};

type LinkRow = {
  parent_profile_id: string;
  child_profile_id: string;
  relation: "mother" | "father" | "legal_guardian" | "other";
  parent: unknown;
  child: unknown;
};

async function loadData(): Promise<{
  rows: FamilyRow[];
  parents: PersonOption[];
  children: PersonOption[];
}> {
  const supabase = await createClient();

  const [{ data: linkData }, { data: profilesData }] = await Promise.all([
    supabase
      .from("parent_child_links")
      .select(
        "parent_profile_id, child_profile_id, relation, parent:profiles!parent_child_links_parent_profile_id_fkey(id, full_name, email_contact, birth_year), child:profiles!parent_child_links_child_profile_id_fkey(id, full_name, email_contact, birth_year)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email_contact, birth_year")
      .order("full_name", { ascending: true })
      .limit(2000),
  ]);

  const rows: FamilyRow[] = ((linkData ?? []) as LinkRow[]).map((r) => {
    const pRaw = Array.isArray(r.parent) ? r.parent[0] : r.parent;
    const cRaw = Array.isArray(r.child) ? r.child[0] : r.child;
    return {
      parent_id: r.parent_profile_id,
      parent_name: (pRaw as { full_name?: string } | null)?.full_name ?? "Sin nombre",
      child_id: r.child_profile_id,
      child_name: (cRaw as { full_name?: string } | null)?.full_name ?? "Sin nombre",
      relation: r.relation,
    };
  });

  const profiles = (profilesData ?? []) as PersonOption[];

  return {
    rows,
    parents: profiles,
    children: profiles,
  };
}

export default async function FamiliesPage() {
  const { rows, parents, children } = await loadData();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-deep">
            Familias
          </h1>
          <p className="text-sm text-ink-600">
            Vínculos entre tutores y jugadores.
          </p>
        </div>
        <FamilyFormSheet
          parents={parents}
          childrenList={children}
          trigger={
            <Button size="md" className="shrink-0">
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Nuevo</span>
            </Button>
          }
        />
      </header>

      <FamiliesTable rows={rows} />
    </div>
  );
}
