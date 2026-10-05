import { notFound, redirect } from "next/navigation";

import { AdminPageShell } from "@/components/admin/admin-page";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { requirePermission } from "@/server/actions/admin/_helpers";
import { getShopProduct } from "@/server/queries/shop";
import { ShopEditorForm } from "../../../_components/shop-editor-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Editar producto — Morvedre Core",
};

export default async function EditShopProductPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  await requirePermission("manage_shop");
  const { id } = await params;
  const product = await getShopProduct(id);
  if (!product) notFound();

  return (
    <AdminPageShell className="gap-4">
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
          personalization_enabled: product.personalization_enabled,
          personalization_label: product.personalization_label,
          personalization_max_length: product.personalization_max_length,
        }}
      />
    </AdminPageShell>
  );
}
