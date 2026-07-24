import { notFound, redirect } from "next/navigation";
import { PackageOpen } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { createClient } from "@/lib/supabase/server";
import { getShopProduct } from "@/server/queries/shop";
import { ShopEditorForm } from "../../../_components/shop-editor-form";
import { PageBackLink } from "@/components/ui/page-back-link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Editar producto — Morvedre Core",
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

export default async function EditShopProductPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  if (!(await isAdmin(ctx.activeProfile.id))) redirect("/dashboard");
  const { id } = await params;
  const product = await getShopProduct(id);
  if (!product) notFound();

  return (
    <AdminPageShell className="gap-4">
      <PageBackLink href="/admin/shop">Volver a gestión de tienda</PageBackLink>
      <AdminPageHeader
        eyebrow="Catálogo de tienda"
        title={product.title}
        description="Edita la información, disponibilidad y variantes del producto."
        icon={<PackageOpen className="h-6 w-6" aria-hidden="true" />}
      />
      <ShopEditorForm
        mode="edit"
        productId={product.id}
        initial={{
          title: product.title,
          description: product.description,
          category: product.category,
          price_eur: product.price_cents / 100,
          currency: product.currency,
          image_url: product.image_url,
          images: product.images.map((image) => ({
            id: image.id,
            url: image.url,
            is_cover: image.is_cover,
            sort_order: image.sort_order,
          })),
          sizes: product.sizes,
          available: product.available,
          max_per_order: product.max_per_order,
          personalization_enabled: product.personalization_enabled,
          personalization_label: product.personalization_label,
          personalization_max_length: product.personalization_max_length,
        }}
      />
    </AdminPageShell>
  );
}
