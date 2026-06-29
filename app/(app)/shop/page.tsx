import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ShoppingCart, Tag, Box } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopProducts, getShopCategories } from "@/server/queries/shop";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CapTile } from "@/components/ui/cap-tile";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Tienda } from "@/components/brand/pictograms";
import { formatCents } from "@/lib/domain/shop";
import { CartButton } from "./_components/cart-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tienda — Morvedre Core",
  description: "Catálogo de productos del club.",
};

interface ShopSearchParams {
  category?: string;
  q?: string;
}

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
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PictogramBadge pictogram={Tienda} color="var(--pool-deep)" size="md" />
            <div>
              <Eyebrow>Tienda del club</Eyebrow>
              <h1 className="font-display text-2xl font-extrabold leading-tight text-pool-deep">
                Catálogo
              </h1>
            </div>
          </div>
          <CartButton />
        </header>

        {categories.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link
              href={"/shop" as Route}
              className={
                "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-xs font-bold transition-colors " +
                (!category
                  ? "border-pool-deep bg-pool-deep text-paper shadow-sm"
                  : "border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam")
              }
            >
              Todas
            </Link>
            {categories.map((c) => (
              <Link
                key={c}
                href={`/shop?category=${encodeURIComponent(c)}` as Route}
                className={
                  "inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3.5 text-xs font-bold transition-colors " +
                  (category === c
                    ? "border-pool-deep bg-pool-deep text-paper shadow-sm"
                    : "border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam")
                }
              >
                <Tag className="h-3 w-3" aria-hidden="true" />
                {c}
              </Link>
            ))}
          </div>
        ) : null}

        {products.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink-300 bg-paper-card p-6 text-center">
            <Box className="mx-auto h-8 w-8 text-ink-300" aria-hidden="true" />
            <p className="mt-2 text-sm text-ink-600">
              No hay productos disponibles{category ? ` en ${category}` : ""}.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2.5">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/shop/${p.id}` as Route}
                  className="group flex h-full flex-col overflow-hidden rounded-md border border-ink-300 bg-paper-card shadow-elev-1 transition-shadow hover:shadow-elev-2"
                >
                  {p.image_url ? (
                    <div className="aspect-square w-full overflow-hidden bg-pool-foam">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-pool-deep/10 to-pool-teal/10">
                      <CapTile number={1} teamColor="var(--pool-deep)" size="md" />
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5 p-2.5">
                    <p className="line-clamp-1 text-sm font-extrabold text-pool-deep">
                      {p.title}
                    </p>
                    <p className="line-clamp-2 text-[10px] leading-tight text-ink-600">
                      {p.description}
                    </p>
                    <p className="mt-1 font-mono text-base font-extrabold text-pool-deep">
                      {formatCents(p.price_cents, p.currency)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

void ShoppingCart;
