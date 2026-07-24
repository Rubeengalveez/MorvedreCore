"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Search, X } from "lucide-react";

export interface ShopFiltersProps {
  categories: string[];
  activeCategory?: string;
  search?: string;
}

export function ShopFilters({ categories, activeCategory, search }: ShopFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFilters = Boolean(activeCategory || search);

  function changeCategory(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("category");
    } else {
      params.set("category", value);
    }
    const query = params.toString();
    router.push((query ? `/shop?${query}` : "/shop") as Route);
  }

  return (
    <form
      action="/shop"
      className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border"
    >
      <div className="relative flex min-h-14 items-center">
        <label htmlFor="shop-search" className="sr-only">
          Buscar productos
        </label>
        <Search
          className="text-ink-500 pointer-events-none absolute left-4 h-5 w-5"
          aria-hidden="true"
        />
        <input
          id="shop-search"
          name="q"
          type="search"
          autoComplete="off"
          defaultValue={search ?? ""}
          placeholder="Buscar camisetas, gorros…"
          className="text-pool-deep placeholder:text-ink-400 focus-visible:ring-pool-blue h-14 min-w-0 flex-1 bg-transparent pr-3 pl-12 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset"
        />
        <button
          type="submit"
          className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue mr-2 inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Buscar productos"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="border-ink-200 bg-paper-sunk/45 flex min-h-13 items-center gap-2 border-t px-3">
        <Filter className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
        <label htmlFor="shop-category" className="text-pool-deep shrink-0 text-sm font-extrabold">
          Categoría
        </label>
        <select
          id="shop-category"
          name="category"
          defaultValue={activeCategory ?? "all"}
          onChange={(event) => changeCategory(event.currentTarget.value)}
          className="border-ink-200 bg-paper text-pool-deep focus-visible:ring-pool-blue ml-auto min-h-10 min-w-0 flex-1 rounded-xl border px-3 text-sm font-bold outline-none focus-visible:ring-2"
        >
          <option value="all">Todos los productos</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {hasFilters ? (
          <Link
            href={"/shop" as Route}
            className="text-ink-500 hover:bg-paper-card hover:text-goggle-red focus-visible:ring-pool-blue inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Quitar filtros"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </form>
  );
}
