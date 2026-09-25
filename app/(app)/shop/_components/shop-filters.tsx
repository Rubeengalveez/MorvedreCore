"use client";

import type { FormEvent } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter, Search } from "lucide-react";

export interface ShopFiltersProps {
  categories: string[];
  activeCategory?: string;
  search?: string;
}

export function ShopFilters({ categories, activeCategory, search }: ShopFiltersProps) {
  const router = useRouter();
  const hasFilters = Boolean(activeCategory || search?.trim());

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get("q") ?? "").trim();
    const category = String(form.get("category") ?? "all");
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== "all") params.set("category", category);
    router.push((params.size ? `/shop?${params}` : "/shop") as Route);
  }

  return (
    <form
      onSubmit={submitFilters}
      role="search"
      aria-label="Buscar en la tienda"
      className="border-ink-300 bg-paper-card shadow-elev-1 flex flex-col gap-3 rounded-2xl border p-3.5"
    >
      <div>
        <label htmlFor="shop-search" className="text-pool-deep mb-1.5 block text-sm font-extrabold">
          Buscar producto
        </label>
        <div className="flex gap-2">
          <input
            id="shop-search"
            key={search ?? ""}
            name="q"
            type="search"
            autoComplete="off"
            defaultValue={search ?? ""}
            placeholder="Ejemplo: gorro…"
            className="border-ink-300 bg-paper text-pool-deep placeholder:text-ink-500 focus-visible:ring-pool-blue h-12 min-w-0 flex-1 rounded-xl border px-3 text-base font-semibold outline-none focus-visible:ring-2"
          />
          <button
            type="submit"
            className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue inline-flex min-h-12 shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Buscar
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="shop-category"
          className="text-pool-deep mb-1.5 flex items-center gap-1.5 text-sm font-extrabold"
        >
          <Filter className="text-pool-blue h-4 w-4" aria-hidden="true" />
          Categoría
        </label>
        <div className="flex gap-2">
          <select
            id="shop-category"
            name="category"
            value={activeCategory ?? "all"}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="border-ink-300 bg-paper text-pool-deep focus-visible:ring-pool-blue min-h-12 min-w-0 flex-1 rounded-xl border px-3 text-base font-semibold outline-none focus-visible:ring-2"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {hasFilters ? (
            <Link
              href={"/shop" as Route}
              className="border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 shrink-0 touch-manipulation items-center justify-center rounded-xl border px-3 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Limpiar
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
