import { UsersRound } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/server/actions/admin/_helpers";

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
  await requirePermission("manage_families");
  const supabase = createAdminClient();

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
      .eq("is_active", true)
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
    <AdminPageShell>
      <AdminPageHeader
        title="Familias"
        description="Gestiona los vínculos entre tutores y jugadores."
        icon={<UsersRound className="h-6 w-6" aria-hidden="true" />}
        action={<FamilyFormSheet parents={parents} childrenList={children} />}
      />

      <FamiliesTable rows={rows} />
    </AdminPageShell>
  );
}
