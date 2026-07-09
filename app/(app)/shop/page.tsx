import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { Box, Search, Tag } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopProducts, getShopCategories } from "@/server/queries/shop";
import { LanePattern } from "@/components/ui/lane-pattern";
import { CapTile } from "@/components/ui/cap-tile";
import { Tienda } from "@/components/brand/pictograms";
import { PageShell } from "@/components/ui/page-shell";
import { formatCents } from "@/lib/domain/shop";
import { CartButton } from "./_components/cart-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tienda - Morvedre Core",
  description: "Catalogo de productos del club.",
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

  const [products, categories] = await Promise.all([
    getShopProducts({ category, search, availableOnly: true }),
    getShopCategories(),
  ]);

  return (
    <div className="relative w-full max-w-full overflow-x-hidden">
      <LanePattern as="div" className="absolute inset-0 opacity-70" />
      <PageShell className="gap-3">
        <header className="bg-pool-deep text-paper shadow-elev-3 relative overflow-hidden rounded-md p-3.5">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--pool-blue),var(--ball-gold),var(--action))]" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-paper/62 text-xs font-extrabold tracking-[0.08em] uppercase">
                Tienda del club
              </p>
              <h1 className="font-display text-paper mt-1 text-[1.75rem] leading-none font-extrabold">
                Tienda Morvedre
              </h1>
              <p className="text-paper/72 mt-2 text-sm leading-snug font-semibold">
                Material, ropa y pedidos del club
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="bg-paper/10 ring-paper/15 flex h-12 w-12 items-center justify-center rounded-md ring-1">
                <Tienda className="h-7 w-7" accent="var(--ball-gold)" />
              </div>
              <CartButton />
            </div>
          </div>
        </header>

        <form action="/shop" className="relative">
          <Search className="text-ink-500 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            name="q"
            defaultValue={search ?? ""}
            placeholder="Buscar en la tienda"
            className="border-ink-300 bg-paper-card text-pool-deep shadow-elev-1 placeholder:text-ink-500 focus:border-pool-blue focus:ring-pool-blue/20 h-11 w-full rounded-md border pr-3 pl-9 text-base font-semibold outline-none focus:ring-2"
          />
          {category ? <input type="hidden" name="category" value={category} /> : null}
        </form>

        {categories.length > 0 ? (
          <div className="no-scrollbar -mx-1 flex w-full max-w-full gap-2 overflow-x-auto px-1 pb-1">
            <CategoryLink href="/shop" active={!category} label="Todas" />
            {categories.map((c) => (
              <CategoryLink
                key={c}
                href={`/shop?category=${encodeURIComponent(c)}`}
                active={category === c}
                label={c}
                icon={<Tag className="h-4 w-4" aria-hidden="true" />}
              />
            ))}
          </div>
        ) : null}

        {products.length === 0 ? (
          <div className="border-ink-300 bg-paper-card rounded-md border border-dashed p-6 text-center">
            <Box className="text-ink-300 mx-auto h-8 w-8" aria-hidden="true" />
            <p className="text-ink-600 mt-2 text-sm">
              No hay productos disponibles{category ? ` en ${category}` : ""}.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2.5 min-[430px]:gap-3">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}
      </PageShell>
    </div>
  );
}

function ProductCard({ product }: { product: ShopProduct }) {
  return (
    <Link
      href={`/shop/${product.id}` as Route}
      className="group border-ink-200 bg-paper-card shadow-elev-1 hover:border-pool-blue hover:shadow-elev-3 flex h-full min-h-[226px] flex-col overflow-hidden rounded-md border transition-all"
    >
      <div className="bg-pool-foam relative aspect-square w-full overflow-hidden">
        {product.image_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image_url}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div className="from-pool-deep/42 absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t to-transparent" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--pool-foam),var(--paper))]">
            <CapTile number={1} teamColor="var(--pool-deep)" size="md" />
          </div>
        )}
        <span className="bg-paper/92 text-pool-deep shadow-elev-1 absolute top-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-sm px-2 py-1 text-[0.66rem] font-extrabold tracking-[0.06em] uppercase">
          {product.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className="text-pool-deep line-clamp-2 min-h-[2.25rem] text-[0.92rem] leading-tight font-extrabold">
          {product.title}
        </p>
        <p className="text-ink-600 line-clamp-2 text-[0.76rem] leading-snug font-medium">
          {product.description}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <span className="text-pool-deep font-mono text-[1.02rem] leading-none font-extrabold">
            {formatCents(product.price_cents, product.currency)}
          </span>
          <span className="bg-pool-foam text-pool-blue rounded-sm px-1.5 py-1 text-[0.62rem] font-extrabold tracking-[0.06em] uppercase">
            Club
          </span>
        </div>
      </div>
    </Link>
  );
}

function CategoryLink({
  href,
  active,
  label,
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href as Route}
      className={
        "touch-target inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md border px-3.5 text-sm font-extrabold transition-colors " +
        (active
          ? "border-pool-deep bg-pool-deep text-paper shadow-sm"
          : "border-ink-300 bg-paper-card text-pool-deep hover:bg-pool-foam")
      }
    >
      {icon}
      {label}
    </Link>
  );
}
