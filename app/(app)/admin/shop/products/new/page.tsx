import { redirect } from "next/navigation";
import { PackagePlus } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { createClient } from "@/lib/supabase/server";
import { ShopEditorForm } from "../../_components/shop-editor-form";
import { PageBackLink } from "@/components/ui/page-back-link";

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
    <AdminPageShell className="gap-4">
      <PageBackLink href="/admin/shop">Volver a gestión de tienda</PageBackLink>
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
