import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { ArrowLeft, Package, ShieldCheck, Truck } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopProduct } from "@/server/queries/shop";
import { formatCents } from "@/lib/domain/shop";
import { LanePattern } from "@/components/ui/lane-pattern";
import { AddToCartButton } from "./_components/add-to-cart-button";
import { ProductGallery } from "./_components/product-gallery";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getShopProduct(id);
  if (!product) return { title: "Producto - Morvedre Core" };
  return { title: `${product.title} - Morvedre Core` };
}

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const product = await getShopProduct(id);
  if (!product) notFound();

  const sizeOptions = product.sizes.length > 0 ? product.sizes : ["Unica"];

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0 opacity-70" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 py-3 sm:px-4">
        <Link
          href={"/shop" as Route}
          className="text-pool-blue inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm font-extrabold hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Tienda
        </Link>

        <article className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-md border">
          <ProductGallery
            title={product.title}
            images={product.images.map((image) => ({
              id: image.id,
              url: image.url,
              alt: image.alt,
              is_cover: image.is_cover,
            }))}
          />

          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-pool-blue text-xs font-extrabold tracking-[0.08em] uppercase">
                  {product.category}
                </p>
                <h1 className="text-pool-deep mt-1 text-[1.35rem] leading-tight font-extrabold break-words">
                  {product.title}
                </h1>
              </div>
              {product.available ? (
                <span className="bg-success/10 text-success shrink-0 rounded-sm px-2 py-1 text-[0.68rem] font-extrabold tracking-[0.06em] uppercase">
                  Disponible
                </span>
              ) : null}
            </div>

            <div className="bg-paper-sunk flex items-end justify-between gap-3 rounded-md px-3 py-3">
              <div>
                <p className="text-ink-500 text-[0.68rem] font-extrabold tracking-[0.08em] uppercase">
                  Precio club
                </p>
                <p className="text-pool-deep mt-1 font-mono text-[1.55rem] leading-none font-extrabold">
                  {formatCents(product.price_cents, product.currency)}
                </p>
              </div>
              {product.stock !== null ? (
                <span className="text-ink-600 text-right text-xs leading-tight font-bold">
                  {product.stock > 0 ? `${product.stock} unidades` : "Sin stock"}
                </span>
              ) : (
                <span className="text-ink-600 text-right text-xs leading-tight font-bold">
                  Bajo pedido
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <TrustItem icon={<ShieldCheck className="h-4 w-4" />} label="Club" />
              <TrustItem icon={<Package className="h-4 w-4" />} label="Pedido" />
              <TrustItem icon={<Truck className="h-4 w-4" />} label="Entrega" />
            </div>

            <section className="flex flex-col gap-1.5">
              <h2 className="text-pool-deep text-sm font-extrabold">Descripcion</h2>
              <p className="text-ink-700 text-[0.95rem] leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </section>

            <AddToCartButton
              productId={product.id}
              available={product.available}
              maxPerOrder={product.max_per_order}
              sizes={sizeOptions}
            />
            {!product.available ? (
              <p className="border-ink-300 bg-paper text-ink-600 rounded-md border p-3 text-center text-sm font-extrabold">
                Ahora mismo no esta disponible.
              </p>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}

function TrustItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="border-ink-200 bg-paper text-pool-deep flex min-h-11 flex-col items-center justify-center gap-1 rounded-md border text-center text-xs font-extrabold">
      <span className="text-pool-blue">{icon}</span>
      {label}
    </div>
  );
}
