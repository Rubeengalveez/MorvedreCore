"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Download,
  Eye,
  EyeOff,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { ShopProduct } from "@/server/queries/shop";
import {
  isActiveShopOrder,
  matchesShopSearch,
  orderSearchText,
  productSearchText,
  shopMoney,
  shopListHref,
  type ManagedShopOrder,
  type ShopListState,
} from "@/lib/domain/shop-management";
import { SHOP_PRODUCT_TYPES, shopProductType } from "@/lib/domain/shop-catalog";
import { setShopProductAvailability } from "@/server/actions/admin/shop";
import { shopControl, shopPrimary, shopSecondary, ShopError, ShopField } from "./shop-ui";
import { ShopDecisionSheet } from "./shop-decision-sheet";
import { ShopOrderCard } from "./shop-order-card";

export function ShopManagement({
  orders,
  products,
  loadError,
  initialState = {},
  initialTab,
}: {
  orders: ManagedShopOrder[];
  products: ShopProduct[];
  loadError?: string;
  initialState?: ShopListState;
  initialTab?: "orders" | "products";
}) {
  const [tab, setTab] = useState<"orders" | "products">(
    initialTab ?? (initialState.view === "orders" ? "orders" : "products"),
  );
  const [history, setHistory] = useState(initialState.state === "delivered");
  const [hidden, setHidden] = useState(initialState.state === "hidden");
  const [query, setQuery] = useState(initialState.q ?? "");
  const [category, setCategory] = useState(initialState.category ?? "");
  const [productFilter, setProductFilter] = useState(initialState.product ?? "");
  const [typeFilter, setTypeFilter] = useState(initialState.type ?? "");
  const [filters, setFilters] = useState(initialState.filters === "1");
  const [pdfChoice, setPdfChoice] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = orders.filter(isActiveShopOrder);
  const delivered = orders
    .filter((order) => order.status === "delivered")
    .sort((a, b) => (b.delivered_at ?? "").localeCompare(a.delivered_at ?? ""));
  const visibleOrders = (history ? delivered : active).filter(
    (order) =>
      matchesShopSearch(orderSearchText(order), query) &&
      (!category || order.category_label === category) &&
      (!productFilter || order.items.some((item) => item.product_id === productFilter)) &&
      (!typeFilter ||
        order.items.some(
          (item) => shopProductType(item.product_category ?? "Accesorios") === typeFilter,
        )),
  );
  const visibleProducts = products.filter(
    (product) =>
      product.available !== hidden &&
      matchesShopSearch(productSearchText(product), query) &&
      (!typeFilter || shopProductType(product.category) === typeFilter) &&
      (!productFilter || product.sizes.includes(productFilter)),
  );
  const selectedIds = active.filter((order) => selection.has(order.id)).map((order) => order.id);
  const appliedFilters =
    Number(Boolean(typeFilter)) +
    Number(Boolean(productFilter)) +
    Number(tab === "orders" && Boolean(category));
  const returnHref = shopListHref({
    view: tab,
    state: tab === "orders" ? (history ? "delivered" : "") : hidden ? "hidden" : "",
    q: query,
    category: tab === "orders" ? category : "",
    product: productFilter,
    type: typeFilter,
    filters: filters ? "1" : "",
  });
  useEffect(() => {
    try {
      const key = `shop-scroll:${window.location.pathname}${window.location.search}`;
      const position = sessionStorage.getItem(key);
      if (position !== null) {
        requestAnimationFrame(() =>
          window.scrollTo({ top: Number(position), behavior: "instant" }),
        );
        sessionStorage.removeItem(key);
      }
    } catch {}
  }, []);
  useEffect(() => {
    window.history.replaceState(null, "", returnHref);
  }, [returnHref]);
  function changeTab(next: "orders" | "products") {
    setTab(next);
    setQuery("");
    setCategory("");
    setProductFilter("");
    setTypeFilter("");
    setSelecting(false);
    setError(null);
  }
  function toggle(id: string) {
    setSelection((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function downloadPdf(ids?: string[]) {
    if (downloading) return;
    setError(null);
    setDownloading(true);
    try {
      const response = await fetch("/api/shop/orders/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "No pudimos preparar el PDF.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "pedidos-pendientes-morvedre.pdf";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setSelecting(false);
      setSelection(new Set());
      setPdfChoice(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos descargar el PDF.");
    } finally {
      setDownloading(false);
    }
  }
  const orderProducts = [
    ...new Map(
      orders.flatMap((order) =>
        order.items.map((item) => [item.product_id, item.product_title ?? "Producto"] as const),
      ),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "es"));
  const ages = [
    ...new Set(
      orders
        .map((order) => order.category_label)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
  const sizes = [...new Set(products.flatMap((product) => product.sizes))];
  const allVisibleSelected =
    visibleOrders.length > 0 && visibleOrders.every((order) => selection.has(order.id));
  return (
    <div className={`text-pool-deep space-y-4 ${selecting ? "pb-48" : ""}`}>
      <header className="border-pool-deep/70 flex items-center gap-3 rounded-2xl border-2 bg-white p-4">
        <span className="bg-pool-deep flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white">
          <ShoppingBag aria-hidden="true" />
        </span>
        <div>
          <p className="text-pool-blue text-sm font-bold">Panel de gestión</p>
          <h1 className="text-2xl font-extrabold">Tienda del club</h1>
        </div>
      </header>
      <nav aria-label="Gestión de tienda" className="grid grid-cols-2 gap-3">
        {(
          [
            ["products", "Productos", Package],
            ["orders", "Pedidos", ShoppingBag],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            type="button"
            key={id}
            aria-pressed={tab === id}
            onClick={() => changeTab(id)}
            className={`${shopPrimary} ${tab !== id ? "!text-pool-deep !bg-white" : ""}`}
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
            {label}
          </button>
        ))}
      </nav>
      <button
        type="button"
        className={`${shopSecondary} !bg-pool-foam w-full`}
        disabled={!active.length || downloading}
        onClick={() => {
          setPdfChoice(true);
          setError(null);
        }}
      >
        <Download aria-hidden="true" className="h-5 w-5" />
        Descargar PDF pedidos
      </button>
      {loadError && <ShopError>{loadError}</ShopError>}
      <section
        className="border-pool-deep/70 space-y-3 rounded-2xl border-2 bg-white p-3"
        aria-label={tab === "orders" ? "Pedidos de la tienda" : "Catálogo"}
      >
        <div className="flex gap-2">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">
              {tab === "orders" ? "Buscar persona, categoría o producto" : "Buscar producto"}
            </span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-4 left-3 h-5 w-5"
            />
            <input
              type="search"
              value={query}
              maxLength={120}
              onChange={(event) => setQuery(event.target.value)}
              className={`${shopControl} !pl-10 [&::-webkit-search-cancel-button]:hidden ${query ? "!pr-12" : ""}`}
              placeholder={tab === "orders" ? "Nombre o producto…" : "Buscar producto…"}
            />
            {query && (
              <button
                type="button"
                aria-label="Borrar búsqueda"
                className="absolute top-1 right-1 flex h-12 w-12 items-center justify-center rounded-xl focus-visible:outline-2"
                onClick={() => setQuery("")}
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            )}
          </label>
          <button
            type="button"
            aria-expanded={filters}
            aria-controls="shop-filters"
            onClick={() => setFilters(!filters)}
            className={`${shopSecondary} shrink-0 !px-3 ${filters || appliedFilters ? "!bg-pool-deep !text-white" : "!bg-pool-foam"}`}
            aria-label={`Filtros${appliedFilters ? `, ${appliedFilters} activos` : ""}`}
          >
            <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
            {appliedFilters ? (
              <span className="font-extrabold">{appliedFilters}</span>
            ) : (
              <span className="sr-only">Filtros</span>
            )}
          </button>
        </div>
        {filters && (
          <div
            id="shop-filters"
            className="border-pool-deep/65 bg-pool-foam space-y-3 rounded-xl border-2 p-3"
          >
            <ShopField label="Tipo de producto" htmlFor="shop-type">
              <select
                id="shop-type"
                className={shopControl}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                {SHOP_PRODUCT_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </ShopField>
            <ShopField
              label={tab === "orders" ? "Producto" : "Talla"}
              htmlFor="shop-product-filter"
            >
              <select
                id="shop-product-filter"
                className={shopControl}
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
              >
                <option value="">
                  {tab === "orders" ? "Todos los productos" : "Todas las tallas"}
                </option>
                {tab === "orders"
                  ? orderProducts.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))
                  : sizes.map((size) => <option key={size}>{size}</option>)}
              </select>
            </ShopField>
            {tab === "orders" && (
              <ShopField label="Categoría" htmlFor="shop-age">
                <select
                  id="shop-age"
                  className={shopControl}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {ages.map((age) => (
                    <option key={age}>{age}</option>
                  ))}
                </select>
              </ShopField>
            )}
            {appliedFilters > 0 && (
              <button
                type="button"
                className={`${shopSecondary} w-full`}
                onClick={() => {
                  setCategory("");
                  setProductFilter("");
                  setTypeFilter("");
                }}
              >
                Quitar filtros
              </button>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {(tab === "orders"
            ? ([
                [false, "Pendientes", active.length],
                [true, "Entregados", delivered.length],
              ] as const)
            : ([
                [false, "Publicados", products.filter((p) => p.available).length],
                [true, "Ocultos", products.filter((p) => !p.available).length],
              ] as const)
          ).map(([value, label, count]) => (
            <button
              type="button"
              key={label}
              aria-pressed={(tab === "orders" ? history : hidden) === value}
              onClick={() => {
                if (tab === "orders") {
                  setHistory(value);
                  setSelecting(false);
                } else setHidden(value);
                setError(null);
              }}
              className={`border-pool-deep/65 focus-visible:outline-pool-blue grid min-h-12 grid-cols-[1fr_auto] items-center gap-1 rounded-xl border-2 px-1 text-sm font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 ${(tab === "orders" ? history : hidden) === value ? "border-pool-deep bg-pool-foam" : "bg-white"}`}
            >
              <span>{label}</span>
              <span className="bg-pool-deep min-w-6 shrink-0 rounded-lg px-0.5 py-0.5 text-sm font-extrabold text-white tabular-nums">
                {count}
              </span>
            </button>
          ))}
        </div>
        {tab === "products" && (
          <Link className={`${shopPrimary} w-full`} href={"/admin/shop/products/new" as Route}>
            <Plus aria-hidden="true" className="h-5 w-5" />
            Añadir producto
          </Link>
        )}
        {selecting && (
          <div className="border-pool-deep rounded-xl border-2 bg-blue-50 p-3">
            <p className="font-extrabold">Toca los pedidos que quieres descargar</p>
            <button
              type="button"
              className={`${shopSecondary} mt-2 w-full`}
              onClick={() => {
                setSelecting(false);
                setSelection(new Set());
              }}
            >
              Salir de la selección
            </button>
          </div>
        )}
        {error && !pdfChoice && <ShopError>{error}</ShopError>}
      </section>
      {selecting && (
        <div className="border-pool-deep bg-pool-foam fixed bottom-[calc(var(--bottom-nav-height)+.75rem)] left-1/2 z-40 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 space-y-2 rounded-2xl border-2 p-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <p className="font-extrabold" role="status">
              {selectedIds.length} seleccionados
            </p>
            <button
              type="button"
              className={`${shopSecondary} !px-2 text-sm`}
              onClick={() =>
                setSelection((previous) => {
                  const next = new Set(previous);
                  for (const order of visibleOrders) {
                    if (allVisibleSelected) next.delete(order.id);
                    else next.add(order.id);
                  }
                  return next;
                })
              }
            >
              {allVisibleSelected ? "Desmarcar visibles" : "Marcar visibles"}
            </button>
          </div>
          <button
            type="button"
            className={`${shopPrimary} w-full`}
            disabled={!selectedIds.length || downloading}
            onClick={() => void downloadPdf(selectedIds)}
          >
            {downloading ? "Preparando PDF…" : `Descargar PDF (${selectedIds.length})`}
          </button>
        </div>
      )}
      <div role="status" className="sr-only">
        {tab === "orders" ? visibleOrders.length : visibleProducts.length} resultados
      </div>
      <div className="space-y-3">
        {tab === "orders"
          ? visibleOrders.map((order) => (
              <ShopOrderCard
                key={order.id}
                order={order}
                selecting={selecting}
                selected={selection.has(order.id)}
                onSelect={() => toggle(order.id)}
                historyHref={`/admin/shop/people/${order.requested_by}?returnTo=${encodeURIComponent(returnHref)}`}
              />
            ))
          : visibleProducts.map((product) => (
              <ShopProductCard key={product.id} product={product} />
            ))}
        {!(tab === "orders" ? visibleOrders.length : visibleProducts.length) && (
          <div className="border-pool-deep/70 rounded-2xl border-2 bg-white px-5 py-8 text-center">
            <Package aria-hidden="true" className="text-pool-blue mx-auto mb-3 h-10 w-10" />
            <p className="text-lg font-extrabold">
              {query || appliedFilters
                ? "No hay resultados con estos filtros"
                : tab === "products"
                  ? hidden
                    ? "No tienes productos ocultos"
                    : "Aún no hay productos publicados"
                  : history
                    ? "Aún no hay pedidos entregados"
                    : "No tienes pedidos pendientes"}
            </p>
          </div>
        )}
      </div>
      <ShopDecisionSheet
        open={pdfChoice}
        onOpenChange={setPdfChoice}
        title="Descargar PDF pedidos"
        summary="Solo pedidos pendientes"
        description="Los entregados no se incluyen. Elige qué pedidos quieres descargar."
        icon="saved"
        pending={downloading}
        error={error}
        actions={[
          {
            label: "Todos los pedidos",
            detail: `${active.length} pendientes`,
            tone: "primary",
            onClick: () => downloadPdf(),
          },
          {
            label: "Elegir pedidos para el PDF",
            tone: "secondary",
            onClick: () => {
              setPdfChoice(false);
              changeTab("orders");
              setHistory(false);
              setSelecting(true);
              setSelection(new Set());
            },
          },
          { label: "Volver", tone: "subtle", onClick: () => setPdfChoice(false) },
        ]}
      />
    </div>
  );
}

function ShopProductCard({ product }: { product: ShopProduct }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        await setShopProductAvailability({ product_id: product.id, available: !product.available });
        setConfirm(false);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No pudimos guardar el cambio.");
      }
    });
  }
  return (
    <article
      className={`border-pool-deep/70 space-y-3 rounded-2xl border-2 p-4 ${product.available ? "bg-white" : "bg-slate-100"}`}
    >
      <div className="flex items-start gap-3">
        <div className="border-pool-deep/50 bg-pool-foam flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt=""
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : (
            <Package aria-hidden="true" className="h-9 w-9" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg leading-snug font-extrabold break-words">{product.title}</h2>
          <p className="mt-1 text-sm font-semibold">{product.category}</p>
          {!product.available && (
            <span className="border-pool-deep mt-1 inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-sm font-bold">
              <EyeOff aria-hidden="true" className="h-4 w-4" />
              Oculto en la tienda
            </span>
          )}
          <p className="mt-1 text-lg font-extrabold">{shopMoney(product.price_cents)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/admin/shop/products/${product.id}/edit` as Route}
          className={`${shopSecondary} !bg-pool-foam`}
        >
          <Pencil aria-hidden="true" className="h-5 w-5" />
          Editar
        </Link>
        <button
          type="button"
          className={`${shopSecondary} ${product.available ? "!bg-slate-100" : "!bg-pool-deep !text-white"}`}
          onClick={() => {
            setError(null);
            setConfirm(true);
          }}
          disabled={pending}
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : product.available ? (
            <EyeOff aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Eye aria-hidden="true" className="h-5 w-5" />
          )}
          {product.available ? "Ocultar" : "Publicar"}
        </button>
      </div>
      <ShopDecisionSheet
        open={confirm}
        onOpenChange={setConfirm}
        title={product.available ? "¿Ocultar este producto?" : "¿Publicar este producto?"}
        summary={product.title}
        description={
          product.available
            ? "Dejará de aparecer en la tienda. Seguirá en Productos → Ocultos y podrás publicarlo otra vez. Sus pedidos se conservan."
            : "Volverá a aparecer en la tienda y las familias podrán pedirlo."
        }
        icon="saved"
        pending={pending}
        error={error}
        actions={[
          {
            label: product.available ? "Sí, ocultar" : "Sí, publicar",
            tone: "primary",
            onClick: toggle,
          },
          { label: "Volver", tone: "secondary", onClick: () => setConfirm(false) },
        ]}
      />
    </article>
  );
}
