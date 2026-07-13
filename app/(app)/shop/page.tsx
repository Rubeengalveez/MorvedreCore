import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Box, PackageOpen, Search, ShoppingBag } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopProducts, getShopCategories } from "@/server/queries/shop";
import { PageShell } from "@/components/ui/page-shell";
import { formatCents } from "@/lib/domain/shop";
import { CartButton } from "./_components/cart-button";

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

  const [products, categories] = await Promise.all([
    getShopProducts({ category, search, availableOnly: true }),
    getShopCategories(),
  ]);

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <header className="border-ink-300 border-b pb-5">
        <p className="text-pool-blue text-xs font-extrabold tracking-[0.14em] uppercase">
          Vestuario del club
        </p>
        <h1 className="font-display text-pool-deep mt-1 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
          Tienda Morvedre
        </h1>
        <p className="text-ink-600 mt-2 max-w-lg text-base leading-relaxed">
          Elige el producto, configura sus opciones y envía una solicitud cuando lo tengas claro.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <CartButton />
          <Link
            href={"/shop/orders" as Route}
            className="border-ink-300 bg-paper-card text-pool-deep hover:border-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center gap-2 rounded-lg border px-4 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <PackageOpen className="h-5 w-5" aria-hidden="true" />
            Mis pedidos
          </Link>
        </div>
      </header>

      <form
        action="/shop"
        className="border-ink-200 bg-paper-card shadow-elev-1 relative rounded-2xl border"
      >
        <label htmlFor="shop-search" className="sr-only">
          Buscar productos
        </label>
        <Search
          className="text-ink-500 pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          id="shop-search"
          name="q"
          type="search"
          autoComplete="off"
          defaultValue={search ?? ""}
          placeholder="Buscar camisetas, gorros…"
          className="text-pool-deep placeholder:text-ink-400 focus-visible:ring-pool-blue h-14 w-full rounded-2xl bg-transparent pr-4 pl-12 text-base font-semibold outline-none focus-visible:ring-2"
        />
        {category ? <input type="hidden" name="category" value={category} /> : null}
      </form>

      {categories.length > 0 ? (
        <nav
          aria-label="Categorías de producto"
          className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          <div className="flex w-max gap-2">
            <CategoryLink href="/shop" active={!category} label="Todo" />
            {categories.map((item) => (
              <CategoryLink
                key={item}
                href={`/shop?category=${encodeURIComponent(item)}`}
                active={category === item}
                label={item}
              />
            ))}
          </div>
        </nav>
      ) : null}

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

        {products.length === 0 ? (
          <div className="border-ink-200 bg-paper-card flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center">
            <Box className="text-ink-400 h-8 w-8" aria-hidden="true" />
            <p className="text-pool-deep mt-3 text-base font-extrabold">
              No hay productos disponibles
            </p>
            <p className="text-ink-500 mt-1 text-sm">Prueba con otra categoría o búsqueda.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4">
            {products.map((product) => (
              <li key={product.id} className="min-w-0">
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.title}
            width={600}
            height={750}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none"
          />
        ) : (
          <div className="bg-pool-foam text-pool-deep flex h-full items-center justify-center">
            <ShoppingBag className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
        <span className="bg-paper/95 text-pool-deep absolute top-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md px-2 py-1 text-xs font-extrabold tracking-wide uppercase shadow-sm">
          {product.category}
        </span>
      </div>
      <div className="flex min-h-32 flex-col p-3">
        <h3 className="text-pool-deep line-clamp-2 text-base leading-snug font-extrabold">
          {product.title}
        </h3>
        <p className="text-ink-500 mt-1 text-xs font-semibold">{variantText}</p>
        <div className="border-ink-200 mt-auto flex items-end justify-between gap-2 border-t pt-3">
          <span className="text-pool-deep font-mono text-xl font-extrabold tabular-nums">
            {formatCents(product.price_cents, product.currency)}
          </span>
          {product.personalization_enabled ? (
            <span className="text-pool-blue text-xs font-extrabold">Personalizable</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function CategoryLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href as Route}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "bg-pool-deep text-paper focus-visible:ring-pool-blue inline-flex min-h-11 touch-manipulation items-center rounded-full px-4 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
          : "border-ink-200 bg-paper-card text-ink-700 hover:border-pool-blue/40 hover:text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-11 touch-manipulation items-center rounded-full border px-4 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      }
    >
      {label}
    </Link>
  );
}
