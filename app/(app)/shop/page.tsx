import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import type { ReactNode } from "react";
import { Box, Camera, ChevronRight, PackageOpen, ShieldCheck, ShoppingBag } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getPendingShopOrdersForParent,
  getShopCategories,
  getShopProducts,
} from "@/server/queries/shop";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { formatCents } from "@/lib/domain/shop";
import { FloatingCartButton } from "./_components/floating-cart-button";
import { ShopFilters } from "./_components/shop-filters";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tienda — Morvedre Core",
  description: "Equipación y material oficial del Waterpolo Morvedre.",
};

interface ShopSearchParams {
  category?: string;
  q?: string;
}

type ShopProduct = Awaited<ReturnType<typeof getShopProducts>>[number];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const sp = await searchParams;
  const category = sp.category && sp.category !== "all" ? sp.category : undefined;
  const search = sp.q;

  const [products, categories, familyOrders] = await Promise.all([
    getShopProducts({ category, search, availableOnly: true }),
    getShopCategories(),
    ctx.linkedProfiles.length > 0
      ? getPendingShopOrdersForParent(ctx.ownProfile.id)
      : Promise.resolve([]),
  ]);

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <FloatingCartButton profileId={ctx.ownProfile.id} />
      <PageHeader
        eyebrow="Vestuario del club"
        title="Tienda Morvedre"
        description="Productos bajo pedido, preparados por el club."
        icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />}
        className="pr-14 sm:pr-36"
      />

      <nav
        aria-label="Gestiones de compra"
        className="border-ink-200 bg-paper-card shadow-elev-1 divide-ink-200 divide-y overflow-hidden rounded-2xl border"
      >
        <ShopShortcut
          href="/shop/orders"
          icon={<PackageOpen className="h-5 w-5" aria-hidden="true" />}
          title="Mis pedidos"
          detail="Seguimiento, preparación y entrega"
        />
        {ctx.linkedProfiles.length > 0 ? (
          <ShopShortcut
            href="/shop/parents/pending"
            icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
            title="Compras familiares"
            detail={
              familyOrders.length > 0
                ? `${familyOrders.length} ${familyOrders.length === 1 ? "pedido por revisar" : "pedidos por revisar"}`
                : "No tienes pedidos pendientes"
            }
            count={familyOrders.length}
          />
        ) : null}
      </nav>

      <section aria-labelledby="shop-products-heading">
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
              Colección del club
            </p>
            <h2
              id="shop-products-heading"
              className="font-display text-pool-deep text-2xl font-extrabold"
            >
              Productos
            </h2>
          </div>
          <span className="text-ink-500 text-sm font-semibold tabular-nums">{products.length}</span>
        </div>

        <ShopFilters categories={categories} activeCategory={category} search={search} />

        {products.length === 0 ? (
          <div className="border-ink-200 bg-paper-card mt-3 flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center">
            <Box className="text-ink-400 h-8 w-8" aria-hidden="true" />
            <p className="text-pool-deep mt-3 text-base font-extrabold">
              No hay productos disponibles
            </p>
            <p className="text-ink-500 mt-1 text-sm">Prueba con otra categoría o búsqueda.</p>
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
            {products.map((product) => (
              <li key={product.id} className="content-auto min-w-0">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}

function ProductCard({ product }: { product: ShopProduct }) {
  const variantText = product.sizes.length > 1 ? `${product.sizes.length} tallas` : "Talla única";
  return (
    <Link
      href={`/shop/${product.id}` as Route}
      className="border-ink-300 bg-paper-card shadow-elev-1 group focus-visible:ring-pool-blue hover:border-pool-blue/50 hover:shadow-elev-2 block h-full touch-manipulation overflow-hidden rounded-xl border transition-[border-color,box-shadow,transform] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none"
    >
      <div className="bg-paper-sunk relative aspect-[4/5] overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.title}
            width={600}
            height={750}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none"
          />
        ) : (
          <div className="bg-pool-foam text-pool-deep flex h-full items-center justify-center">
            <ShoppingBag className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
        {product.images.length > 1 ? (
          <span className="bg-pool-deep/90 text-paper absolute right-2 bottom-2 inline-flex min-h-7 items-center gap-1 rounded-full px-2 text-xs font-extrabold">
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            {product.images.length}
          </span>
        ) : null}
        <span className="bg-paper/95 text-pool-deep absolute top-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md px-2 py-1 text-xs font-extrabold tracking-wide uppercase shadow-sm">
          {product.category}
        </span>
      </div>
      <div className="flex min-h-32 flex-col p-3">
        <h3 className="text-pool-deep line-clamp-2 text-base leading-snug font-extrabold">
          {product.title}
        </h3>
        <p className="text-ink-500 mt-1 text-xs font-semibold">{variantText}</p>
        <div className="border-ink-200 mt-auto border-t pt-3">
          <span className="text-pool-deep block font-mono text-lg font-extrabold whitespace-nowrap tabular-nums sm:text-xl">
            {formatCents(product.price_cents, product.currency)}
          </span>
          {product.personalization_enabled ? (
            <span className="text-pool-blue mt-1 block truncate text-xs font-extrabold">
              Personalizable
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function ShopShortcut({
  href,
  icon,
  title,
  detail,
  count,
}: {
  href: Route;
  icon: ReactNode;
  title: string;
  detail: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-pool-foam/40 focus-visible:ring-pool-blue group flex min-h-16 touch-manipulation items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
    >
      <span className="bg-pool-foam text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-pool-deep block text-base font-extrabold">{title}</span>
        <span className="text-ink-500 block truncate text-sm font-semibold">{detail}</span>
      </span>
      {count != null && count > 0 ? (
        <span className="bg-ball-gold text-pool-deep inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-extrabold tabular-nums">
          {count}
        </span>
      ) : null}
      <ChevronRight
        className="text-ink-400 group-hover:text-pool-blue h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  );
}
