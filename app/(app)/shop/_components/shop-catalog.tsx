"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { ArrowRight, Camera, PackageOpen, Search, SlidersHorizontal, X } from "lucide-react";
import type { ShopProduct } from "@/server/queries/shop";
import { matchesShopSearch, productSearchText, shopMoney } from "@/lib/domain/shop-management";
import { shopProductType } from "@/lib/domain/shop-catalog";
import { shopControl, shopSecondary } from "@/components/shop/shop-ui";
import { cn } from "@/lib/utils/cn";

export function ShopCatalog({
  products,
  initialQuery = "",
  initialCategory = "",
  familyPending = 0,
}: {
  products: ShopProduct[];
  initialQuery?: string;
  initialCategory?: string;
  familyPending?: number;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory === "all" ? "" : initialCategory);
  const [filters, setFilters] = useState(Boolean(category));
  const types = [...new Set(products.map((product) => shopProductType(product.category)))];
  const visible = products.filter(
    (product) =>
      matchesShopSearch(productSearchText(product), query) &&
      (!category || shopProductType(product.category) === category),
  );
  function remember() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    window.history.replaceState(null, "", `/shop${params.size ? `?${params}` : ""}`);
  }
  return (
    <>
      {familyPending > 0 ? (
        <Link
          href="/shop/parents/pending"
          className="border-pool-deep/65 text-pool-deep flex min-h-14 items-center justify-between gap-3 rounded-xl border-2 bg-amber-100 p-3 font-bold"
        >
          <span>
            {familyPending}{" "}
            {familyPending === 1 ? "pedido familiar por aprobar" : "pedidos familiares por aprobar"}
          </span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}
      <section aria-label="Buscar productos" className="space-y-3">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="text-pool-deep pointer-events-none absolute top-4 left-3 h-5 w-5"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Buscar productos"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar producto…"
              className={`${shopControl} pr-3 pl-10`}
            />
          </div>
          <button
            type="button"
            aria-label={category ? "Filtros, un filtro aplicado" : "Filtros"}
            aria-expanded={filters}
            aria-controls="shop-catalog-filters"
            onClick={() => setFilters(!filters)}
            className={cn(
              shopSecondary,
              "min-h-14 px-3",
              category || filters ? "border-pool-deep bg-pool-deep text-white" : "bg-white",
            )}
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Filtros</span>
            {category ? (
              <span className="bg-ball-gold text-pool-deep rounded px-1.5">1</span>
            ) : null}
          </button>
        </div>
        {filters ? (
          <div
            id="shop-catalog-filters"
            className="border-pool-deep/65 space-y-3 rounded-xl border-2 bg-white p-3"
          >
            <label htmlFor="shop-type" className="text-pool-deep block font-extrabold">
              Tipo de producto
            </label>
            <select
              id="shop-type"
              className={shopControl}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Todos los productos</option>
              {types.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            {category ? (
              <button type="button" className={shopSecondary} onClick={() => setCategory("")}>
                <X className="h-4 w-4" aria-hidden="true" />
                Quitar filtro
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-pool-deep text-xl font-extrabold">Equipación del club</h2>
        <span
          role="status"
          className="border-pool-deep/65 text-pool-deep rounded-lg border bg-white px-2.5 py-1 text-sm font-bold whitespace-nowrap"
        >
          {visible.length} {visible.length === 1 ? "producto" : "productos"}
        </span>
      </div>
      {visible.length ? (
        <ul className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3">
          {visible.map((product, index) => (
            <li key={product.id} className="min-w-0">
              <Link
                href={
                  `/shop/${product.id}${query || category ? `?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(category ? { category } : {}) })}` : ""}` as Route
                }
                onClick={remember}
                className="border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue flex h-full flex-col overflow-hidden rounded-2xl border-2 bg-white focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-slate-100">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt=""
                      fill
                      sizes="(max-width: 767px) 45vw, 240px"
                      priority={index < 2}
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <PackageOpen className="h-12 w-12 text-slate-600" aria-hidden="true" />
                    </span>
                  )}
                  {product.images.length > 1 ? (
                    <span className="border-pool-deep/65 absolute right-2 bottom-2 flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-sm font-bold">
                      <Camera className="h-4 w-4" aria-hidden="true" />
                      {product.images.length}
                      <span className="sr-only"> fotos</span>
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-2 px-3 pt-1 pb-3">
                  <span className="text-sm font-bold text-slate-600">
                    {shopProductType(product.category)}
                  </span>
                  <h3 className="text-base leading-snug font-extrabold [overflow-wrap:anywhere]">
                    {product.title}
                  </h3>
                  <div className="mt-auto flex items-center justify-between gap-1 pt-2">
                    <span className="text-xl font-extrabold whitespace-nowrap tabular-nums">
                      {shopMoney(product.price_cents)}
                    </span>
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50"
                      aria-hidden="true"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-pool-deep/65 text-pool-deep space-y-3 rounded-2xl border-2 bg-white p-6 text-center">
          <PackageOpen className="mx-auto h-10 w-10" aria-hidden="true" />
          <h2 className="text-xl font-extrabold">
            {products.length ? "No encontramos ese producto" : "Pronto habrá productos"}
          </h2>
          {products.length ? (
            <button
              type="button"
              className={shopSecondary}
              onClick={() => {
                setQuery("");
                setCategory("");
              }}
            >
              Ver todos los productos
            </button>
          ) : (
            <p>La equipación aparecerá aquí cuando esté disponible.</p>
          )}
        </div>
      )}
    </>
  );
}
