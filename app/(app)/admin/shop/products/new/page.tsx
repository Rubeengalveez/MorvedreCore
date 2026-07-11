import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, PackagePlus } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { createClient } from "@/lib/supabase/server";
import { ShopEditorForm } from "../../_components/shop-editor-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Nuevo producto — Morvedre Core",
};

async function isAdmin(profileId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();
  return !!data;
}

export default async function NewShopProductPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  if (!(await isAdmin(ctx.activeProfile.id))) redirect("/dashboard");

  return (
    <AdminPageShell>
      <Link
        href={"/admin/shop" as Route}
        className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-11 w-fit items-center gap-2 rounded-lg text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Pedidos
      </Link>
      <AdminPageHeader
        eyebrow="Catálogo de tienda"
        title="Crear producto"
        description="Añade imágenes, tallas y opciones de personalización."
        icon={<PackagePlus className="h-6 w-6" aria-hidden="true" />}
      />
      <ShopEditorForm mode="create" />
    </AdminPageShell>
  );
}
