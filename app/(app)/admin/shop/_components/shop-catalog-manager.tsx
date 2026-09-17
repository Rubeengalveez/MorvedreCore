"use client";

import Link from "next/link";
import type { Route } from "next";
import { Eye, EyeOff, Pencil, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/domain/shop";
import { setShopProductAvailability } from "@/server/actions/admin/shop";
import type { ShopProduct } from "@/server/queries/shop";

export function ShopCatalogManager({ products }: { products: ShopProduct[] }) {
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const visibleProducts = useMemo(
    () => products.filter((product) => product.title.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"))),
    [products, search],
  );

  function changeAvailability(product: ShopProduct) {
    setError(null);
    startTransition(async () => {
      try {
        await setShopProductAvailability({ product_id: product.id, available: !product.available });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Ha habido un problema.");
      }
    });
  }

  return (
    <section aria-labelledby="catalogo-title" className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-pool-blue text-xs font-extrabold tracking-wide uppercase">Catálogo</p>
          <h2 id="catalogo-title" className="text-pool-deep text-xl font-extrabold">Productos publicados</h2>
          <p className="text-ink-600 mt-1 text-sm">Oculta un producto cuando no se pueda pedir; conserva así su historial.</p>
        </div>
        <label className="relative block w-full sm:w-64">
          <span className="sr-only">Buscar producto</span>
          <Search className="text-ink-500 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" aria-hidden="true" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto" className="pl-9" />
        </label>
      </div>
      {error ? <p role="alert" className="border-danger/25 bg-danger/5 text-danger mt-3 rounded-xl border p-3 text-sm font-semibold">{error}</p> : null}
      <ul className="mt-4 divide-ink-200 divide-y">
        {visibleProducts.length === 0 ? <li className="text-ink-600 py-5 text-sm font-semibold">No hay productos que coincidan.</li> : visibleProducts.map((product) => (
          <li key={product.id} className="flex min-h-16 items-center gap-3 py-3">
            <div className="bg-pool-foam text-pool-deep flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xs font-extrabold">
              {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : product.title.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-pool-deep truncate font-extrabold">{product.title}</p>
              <p className="text-ink-600 text-sm">{product.category} · {formatCents(product.price_cents, product.currency)} · {product.available ? "Visible" : "Oculto"}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button asChild variant="outline" size="icon" aria-label={`Editar ${product.title}`}><Link href={`/admin/shop/products/${product.id}/edit` as Route}><Pencil className="h-4 w-4" aria-hidden="true" /></Link></Button>
              <Button type="button" variant="outline" size="icon" disabled={pending} onClick={() => changeAvailability(product)} aria-label={product.available ? `Ocultar ${product.title}` : `Mostrar ${product.title}`}>
                {product.available ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </div>
          </li>
        ))}</ul>
    </section>
  );
}
