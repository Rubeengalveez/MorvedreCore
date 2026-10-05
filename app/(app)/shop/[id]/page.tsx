import { redirect, notFound } from "next/navigation";
import type { Route } from "next";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopProduct } from "@/server/queries/shop";
import { shopMoney } from "@/lib/domain/shop-management";
import { PageBackLink } from "@/components/ui/page-back-link";
import { PageShell } from "@/components/ui/page-shell";
import { ShopNavigation } from "@/components/shop/shop-navigation";
import { ShopSection } from "@/components/shop/shop-ui";
import { ShopContact } from "@/components/shop/shop-contact";
import { AddToCartButton } from "./_components/add-to-cart-button";
import { ProductGallery } from "./_components/product-gallery";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const product = await getShopProduct((await params).id);
  return { title: `${product?.title ?? "Producto"} — Morvedre Core` };
}
export default async function ShopDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const product = await getShopProduct((await params).id);
  if (!product || !product.available) notFound();
  const filters = await searchParams;
  const backParams = new URLSearchParams();
  if (typeof filters.q === "string") backParams.set("q", filters.q.slice(0, 200));
  if (typeof filters.category === "string")
    backParams.set("category", filters.category.slice(0, 40));
  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageBackLink href={`/shop${backParams.size ? `?${backParams}` : ""}` as Route}>
        Volver a productos
      </PageBackLink>
      <ShopNavigation profileId={ctx.ownProfile.id} active="products" />
      <article className="border-pool-deep/65 overflow-hidden rounded-2xl border-2 bg-white">
        <ProductGallery title={product.title} images={product.images} />
        <header className="space-y-2 p-4">
          <p className="text-sm font-bold text-slate-600">{product.category}</p>
          <h1 className="text-pool-deep text-2xl leading-tight font-extrabold [overflow-wrap:anywhere]">
            {product.title}
          </h1>
          <p className="text-pool-deep text-3xl font-extrabold tabular-nums">
            {shopMoney(product.price_cents)}
          </p>
        </header>
      </article>
      <ShopSection title="Detalles">
        <p className="text-pool-deep text-[1.0625rem] leading-relaxed font-semibold whitespace-pre-line">
          {product.description}
        </p>
      </ShopSection>
      <ShopContact
        message={`Hola Sol, tengo una duda sobre ${product.title} de la tienda de Morvedre Core.`}
      />
      <ShopSection title="Prepara tu producto">
        <AddToCartButton
          profileId={ctx.ownProfile.id}
          productId={product.id}
          available={product.available}
          sizes={product.sizes}
          personalizationEnabled={product.personalization_enabled}
          personalizationLabel={product.personalization_label}
          personalizationMaxLength={product.personalization_max_length}
        />
      </ShopSection>
    </PageShell>
  );
}
